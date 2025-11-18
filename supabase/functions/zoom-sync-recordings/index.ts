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
    const { meeting_id, course_id } = await req.json();

    if (!meeting_id || !course_id) {
      throw new Error('Meeting ID and Course ID are required');
    }

    console.log('Syncing recordings for meeting:', meeting_id);

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
      console.error('Failed to get Zoom token');
      throw new Error('Failed to get Zoom token');
    }

    const { access_token } = await tokenResponse.json();

    // Get recordings for the meeting
    const recordingsResponse = await fetch(
      `https://api.zoom.us/v2/meetings/${meeting_id}/recordings`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!recordingsResponse.ok) {
      if (recordingsResponse.status === 404) {
        console.log('No recordings found for meeting:', meeting_id);
        return new Response(JSON.stringify({ message: 'No recordings found', recordings: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Failed to get recordings');
    }

    const recordingsData = await recordingsResponse.json();
    console.log('Retrieved recordings data:', recordingsData);

    // Use service role to save recordings to database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process and save each recording file
    const savedRecordings = [];
    
    if (recordingsData.recording_files && recordingsData.recording_files.length > 0) {
      for (const recording of recordingsData.recording_files) {
        // Only save video recordings (not audio or chat files)
        if (recording.file_type === 'MP4' || recording.file_type === 'M4A') {
          const recordingData = {
            meeting_id: meeting_id.toString(),
            course_id,
            recording_id: recording.id,
            topic: recordingsData.topic,
            start_time: recordingsData.start_time,
            duration: recordingsData.duration,
            recording_count: recordingsData.recording_count || 1,
            share_url: recordingsData.share_url,
            recording_play_url: recording.play_url,
            download_url: recording.download_url,
            file_type: recording.file_type,
            file_size: recording.file_size,
          };

          // Upsert recording (insert or update if exists)
          const { data, error } = await supabaseAdmin
            .from('zoom_recordings')
            .upsert(recordingData, { onConflict: 'recording_id' })
            .select()
            .single();

          if (error) {
            console.error('Error saving recording:', error);
          } else {
            console.log('Saved recording:', data);
            savedRecordings.push(data);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Recordings synced successfully',
      recordings: savedRecordings,
      count: savedRecordings.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in zoom-sync-recordings:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
