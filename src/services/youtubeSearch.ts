import { YoutubeTrack } from '../types';

export interface YouTubeSearchResult {
  id: string; // YouTube video ID
  title: string;
  artist: string;
  thumbnail: string;
  duration?: string;
  youtube_url: string;
  preview_audio_url?: string;
}

export const POPULAR_MUSIC_CATEGORIES = [
  { id: 'top', label: '🔥 Em Alta', query: 'músicas mais tocadas brasil' },
  { id: 'sertanejo', label: '🤠 Sertanejo', query: 'sertanejo mais tocadas' },
  { id: 'rock', label: '🎸 Rock', query: 'rock classics hits' },
  { id: 'pop', label: '🎧 Pop', query: 'pop hits' },
  { id: 'funk', label: '🎤 Funk', query: 'funk brasil mais tocadas' },
  { id: 'mpb', label: '🎹 MPB', query: 'mpb melhores classicos' },
  { id: 'gospel', label: '🙏 Gospel', query: 'gospel louvores mais tocados' },
  { id: 'lofi', label: '✨ Lofi & Relax', query: 'lofi hip hop chill beats' },
];

export const POPULAR_ARTISTS = [
  'Henrique e Juliano',
  'Coldplay',
  'Marília Mendonça',
  'Jorge & Mateus',
  'Linkin Park',
  'Ana Castela',
  'Queen',
  'Alok',
  'The Weeknd',
  'Matuê',
  'Billie Eilish',
  'Gusttavo Lima'
];

// Fallback curated tracks if network is totally offline
export const CURATED_TRACKS: YouTubeSearchResult[] = [
  {
    id: '9Vt4XguN2-A',
    title: 'ÚLTIMA SAUDADE (Ao Vivo)',
    artist: 'Henrique e Juliano',
    duration: '2:35',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
    youtube_url: 'https://www.youtube.com/watch?v=9Vt4XguN2-A'
  },
  {
    id: 'dvgZkm1xWPE',
    title: 'Viva La Vida (Official Video)',
    artist: 'Coldplay',
    duration: '4:03',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
    youtube_url: 'https://www.youtube.com/watch?v=dvgZkm1xWPE'
  },
  {
    id: '4NRXx6U8ABQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    duration: '3:20',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80',
    youtube_url: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ'
  },
  {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Chill Beats to Relax/Study',
    artist: 'Lofi Girl',
    duration: '3:45',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
    youtube_url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk'
  },
  {
    id: 'G7KNmW9a75Y',
    title: 'Flowers',
    artist: 'Miley Cyrus',
    duration: '3:21',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
    youtube_url: 'https://www.youtube.com/watch?v=G7KNmW9a75Y'
  },
  {
    id: '18JQUYgpOlw',
    title: 'Bossa Nova Sunset Lounge',
    artist: 'Samba & Jazz Lounge',
    duration: '3:50',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80',
    youtube_url: 'https://www.youtube.com/watch?v=18JQUYgpOlw'
  }
];

export async function searchYouTubeTracks(query: string): Promise<YouTubeSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return CURATED_TRACKS;
  }

  // 1. Try backend YouTube proxy route
  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results;
      }
    }
  } catch (err) {
    console.warn('Backend YouTube search endpoint failed, using fallback:', err);
  }

  // 2. Client fallback via iTunes search for metadata + preview audio
  try {
    const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=song&limit=12`);
    if (itunesRes.ok) {
      const itunesData = await itunesRes.json();
      if (itunesData.results && itunesData.results.length > 0) {
        return itunesData.results.map((item: any, idx: number) => ({
          id: `itunes-${item.trackId || idx}`,
          title: item.trackName || trimmed,
          artist: item.artistName || 'Artista',
          thumbnail: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '400x400bb') : '',
          duration: item.trackTimeMillis ? `${Math.floor(item.trackTimeMillis / 60000)}:${Math.floor((item.trackTimeMillis % 60000) / 1000).toString().padStart(2, '0')}` : '3:30',
          youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.artistName} - ${item.trackName}`)}`,
          preview_audio_url: item.previewUrl
        }));
      }
    }
  } catch (itunesErr) {
    console.warn('iTunes fallback search error:', itunesErr);
  }

  // 3. Filter curated tracks
  const lower = trimmed.toLowerCase();
  const matchedCurated = CURATED_TRACKS.filter(
    (t) => t.title.toLowerCase().includes(lower) || t.artist.toLowerCase().includes(lower)
  );
  if (matchedCurated.length > 0) {
    return matchedCurated;
  }

  return CURATED_TRACKS;
}

export async function fetchYouTubeSuggestions(query: string): Promise<string[]> {
  if (!query.trim()) return [];

  try {
    const res = await fetch(`/api/youtube/suggest?q=${encodeURIComponent(query.trim())}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.suggestions)) {
        return data.suggestions;
      }
    }
  } catch {
    // ignore
  }

  return [];
}

export function convertToYoutubeTrack(
  item: YouTubeSearchResult, 
  startTimeSeconds: number = 30,
  durationSeconds: number = 30
): YoutubeTrack {
  let ytId = item.id;
  let ytUrl = item.youtube_url || `https://www.youtube.com/watch?v=${ytId}`;

  // If ID starts with itunes-, extract or keep
  if (ytId.startsWith('itunes-')) {
    // Generate a fallback embed search or placeholder
    ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.artist} ${item.title}`)}`;
  }

  return {
    id: `yt-${item.id}-${Date.now()}`,
    title: item.title,
    artist: item.artist,
    youtube_url: ytUrl,
    youtube_id: ytId,
    start_time_seconds: startTimeSeconds,
    duration_seconds: durationSeconds,
    cover_url: item.thumbnail
  };
}
