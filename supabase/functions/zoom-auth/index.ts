import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZOOM_ACCOUNT_ID = Deno.env.get('ZOOM_ACCOUNT_ID');
    const ZOOM_CLIENT_ID = Deno.env.get('ZOOM_CLIENT_ID');
    const ZOOM_CLIENT_SECRET = Deno.env.get('ZOOM_CLIENT_SECRET');

    if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
      throw new Error('Zoom credentials not configured');
    }

    // Get OAuth token using Server-to-Server OAuth
    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`;
    
    const credentials = btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`);
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoom OAuth error:', errorText);
      throw new Error(`Failed to get Zoom token: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({ access_token: data.access_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in zoom-auth:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
