import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, start_time, duration, course_id } = await req.json();

    if (!topic || !start_time || !duration || !course_id) {
      throw new Error('Missing required fields');
    }

    // Get Zoom access token
    const ZOOM_ACCOUNT_ID = Deno.env.get('ZOOM_ACCOUNT_ID');
    const ZOOM_CLIENT_ID = Deno.env.get('ZOOM_CLIENT_ID');
    const ZOOM_CLIENT_SECRET = Deno.env.get('ZOOM_CLIENT_SECRET');

    if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
      throw new Error('Zoom credentials not configured');
    }

    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`;
    const credentials = btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`);
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Zoom token');
    }

    const { access_token } = await tokenResponse.json();

    // Create Zoom meeting
    const meetingResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        type: 2, // Scheduled meeting
        start_time,
        duration,
        timezone: 'America/Lima',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 0,
          audio: 'both',
          auto_recording: 'cloud',
        },
      }),
    });

    if (!meetingResponse.ok) {
      const errorText = await meetingResponse.text();
      console.error('Zoom API error:', errorText);
      throw new Error('Failed to create Zoom meeting');
    }

    const meetingData = await meetingResponse.json();

    // Get user from request
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Save to database
    const { data: savedMeeting, error: dbError } = await supabaseClient
      .from('zoom_meetings')
      .insert({
        course_id,
        meeting_id: meetingData.id.toString(),
        topic: meetingData.topic,
        start_time: meetingData.start_time,
        duration: meetingData.duration,
        join_url: meetingData.join_url,
        password: meetingData.password,
        created_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save meeting to database');
    }

    return new Response(JSON.stringify(savedMeeting), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in zoom-create-meeting:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
