import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";

// The favourite-song picker on someone's profile. Only for signed-in people (it used to be open to anyone, which made
// the site a free way to hammer Apple's search), and the search is kept to a sensible size.
// The parts of one of Apple's search results that the picker uses.
const toTrack = (t: any) => ({
  id: String(t.trackId),
  name: t.trackName,
  artist: t.artistName,
  album: t.collectionName,
  duration: t.trackTimeMillis,
  artwork: t.artworkUrl100,
  link: t.trackViewUrl,
  preview: t.previewUrl,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!req.session.userid) return res.status(401).json({ error: "Not logged in" });

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q || q.length > 100) return res.status(400).json({ error: 'Query parameter "q" is required (up to 100 characters)' });

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=10`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`iTunes API returned ${response.status}`);

    const data = await response.json();
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    const tracks = results.slice(0, 10).map(toTrack);

    return res.status(200).json({ tracks });
  } catch (error) {
    console.error("iTunes search error:", error);
    return res.status(500).json({ error: "Failed to search iTunes" });
  }
}

export default withSessionRoute(handler);
