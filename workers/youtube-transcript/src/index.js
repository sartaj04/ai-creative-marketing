/**
 * Cloudflare Worker: YouTube Transcript Proxy
 *
 * Fetches YouTube video page, extracts caption tracks from the
 * embedded ytInitialPlayerResponse, then fetches the captions XML
 * and returns plain text.
 *
 * Cloudflare Worker IPs are CDN IPs, not cloud-compute IPs,
 * so YouTube does not block them.
 *
 * Usage: GET /?v=VIDEO_ID[&lang=en]
 * Auth:  x-api-key header must match the API_KEY secret
 */

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "x-api-key, content-type",
        },
      });
    }

    // Auth check
    if (env.API_KEY) {
      const key = request.headers.get("x-api-key");
      if (key !== env.API_KEY) {
        return json({ error: "Unauthorized" }, 401);
      }
    }

    const url = new URL(request.url);
    const videoId = url.searchParams.get("v");
    const preferredLang = url.searchParams.get("lang") || "en";

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return json({ error: "Missing or invalid video ID. Pass ?v=VIDEO_ID" }, 400);
    }

    try {
      const transcript = await fetchTranscript(videoId, preferredLang);
      return json({ transcript, video_id: videoId });
    } catch (err) {
      return json({ error: err.message }, 422);
    }
  },
};

async function fetchTranscript(videoId, preferredLang) {
  // 1. Fetch the YouTube watch page
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pageRes = await fetch(watchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!pageRes.ok) {
    throw new Error(`YouTube returned ${pageRes.status}`);
  }

  const html = await pageRes.text();

  // 2. Extract ytInitialPlayerResponse JSON
  const playerResponse = extractPlayerResponse(html);
  if (!playerResponse) {
    throw new Error("Could not extract player response from YouTube page");
  }

  // 3. Get caption tracks
  const captionTracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No captions available for this video");
  }

  // 4. Pick the best caption track (prefer requested language)
  let track = captionTracks.find((t) =>
    t.languageCode?.startsWith(preferredLang)
  );
  if (!track) {
    // Fall back to first available (usually auto-generated English)
    track = captionTracks[0];
  }

  // 5. Fetch the captions XML
  let captionsUrl = track.baseUrl;
  // Request JSON3 format for easier parsing
  if (!captionsUrl.includes("fmt=")) {
    captionsUrl += "&fmt=json3";
  }

  const capsRes = await fetch(captionsUrl);
  if (!capsRes.ok) {
    throw new Error(`Failed to fetch captions: ${capsRes.status}`);
  }

  const capsData = await capsRes.json();

  // 6. Extract text from JSON3 format
  const events = capsData.events || [];
  const segments = [];

  for (const event of events) {
    if (event.segs) {
      const text = event.segs.map((s) => s.utf8 || "").join("");
      if (text.trim()) {
        segments.push(text.trim());
      }
    }
  }

  if (segments.length === 0) {
    throw new Error("Transcript is empty");
  }

  // Join and clean up
  let transcript = segments.join(" ");
  transcript = transcript.replace(/\s+/g, " ").trim();

  // Limit to 15000 chars (same as backend limit)
  if (transcript.length > 15000) {
    transcript = transcript.substring(0, 15000) + "...";
  }

  return transcript;
}

function extractPlayerResponse(html) {
  // Try var ytInitialPlayerResponse = {...};
  const patterns = [
    /var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\});/s,
    /ytInitialPlayerResponse\s*=\s*(\{.+?\});/s,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        continue;
      }
    }
  }

  // Try extracting from within ytInitialData or script tags
  // The player response is sometimes embedded differently
  const scriptPattern =
    /ytInitialPlayerResponse\s*=\s*(\{.*?"captions".*?\});/s;
  const scriptMatch = html.match(scriptPattern);
  if (scriptMatch) {
    try {
      return JSON.parse(scriptMatch[1]);
    } catch {
      // fall through
    }
  }

  return null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
