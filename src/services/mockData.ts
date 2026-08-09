import { Profile, Post, Story, Reel, Chat, AppNotification, YoutubeTrack } from '../types';

export const YOUTUBE_PRESET_TRACKS: YoutubeTrack[] = [
  {
    id: 'yt-1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    youtube_url: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ',
    youtube_id: '4NRXx6U8ABQ',
    start_time_seconds: 45,
    cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'yt-2',
    title: 'Lofi Chill Beats to Relax',
    artist: 'Lofi Girl',
    youtube_url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    youtube_id: 'jfKfPfyJRdk',
    start_time_seconds: 120,
    cover_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'yt-3',
    title: 'Viva La Vida',
    artist: 'Coldplay',
    youtube_url: 'https://www.youtube.com/watch?v=dvgZkm1xWPE',
    youtube_id: 'dvgZkm1xWPE',
    start_time_seconds: 30,
    cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'yt-4',
    title: 'Flowers',
    artist: 'Miley Cyrus',
    youtube_url: 'https://www.youtube.com/watch?v=G7KNmW9a75Y',
    youtube_id: 'G7KNmW9a75Y',
    start_time_seconds: 60,
    cover_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'yt-5',
    title: 'Bossa Nova Sunset',
    artist: 'Samba & Jazz Lounge',
    youtube_url: 'https://www.youtube.com/watch?v=18JQUYgpOlw',
    youtube_id: '18JQUYgpOlw',
    start_time_seconds: 0,
    cover_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_PROFILES: Profile[] = [];

export const INITIAL_STORIES: Story[] = [];

export const INITIAL_POSTS: Post[] = [];

export const INITIAL_REELS: Reel[] = [];

export const INITIAL_CHATS: Chat[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

