export type ProfileType = 'pessoal' | 'profissional' | 'criador' | 'empresa';

export interface Profile {
  id: string;
  user_id: string; // Belongs to auth user
  google_email?: string;
  google_name?: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  website?: string;
  profile_type: ProfileType;
  verified?: boolean;
  banned?: boolean;
  banned_at?: string;
  ban_reason?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
}

export interface YoutubeTrack {
  id: string;
  title: string;
  artist: string;
  youtube_url: string; // or video ID
  youtube_id: string;
  start_time_seconds: number; // e.g. 90 for 1m30s
  duration_seconds?: number; // snippet duration in seconds (e.g. 15, 30, 45, 60)
  cover_url?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  profile_id: string;
  profile: Profile;
  text: string;
  created_at: string;
  likes_count: number;
  is_liked?: boolean;
}

export interface Post {
  id: string;
  profile_id: string;
  profile: Profile;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string;
  location?: string;
  youtube_track?: YoutubeTrack;
  likes_count: number;
  comments_count: number;
  reposts_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  is_reposted?: boolean;
  repost_of?: Post;
  repost_caption?: string;
  created_at: string;
  comments?: Comment[];
}

export interface Story {
  id: string;
  profile_id: string;
  profile: Profile;
  media_url: string;
  media_type: 'image' | 'video';
  youtube_track?: YoutubeTrack;
  created_at: string;
  expires_at?: string; // Expira automaticamente em 24h (ou antes se o autor deletar)
  viewed?: boolean;
  repost_of_post?: Post;
  repost_of_story?: Story;
}

export interface StoryReaction {
  id: string;
  story_id: string;
  from_profile_id: string;
  from_profile: Profile;
  reaction_type: 'emoji' | 'text';
  content: string; // e.g. "❤️" or "Incrível esse lugar!"
  created_at: string;
}

export interface Reel {
  id: string;
  profile_id: string;
  profile: Profile;
  video_url: string;
  caption: string;
  youtube_track?: YoutubeTrack;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_liked?: boolean;
  is_saved?: boolean;
  created_at: string;
}

export interface GroupMember {
  profile_id: string;
  profile: Profile;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  avatar_url?: string;
  created_by: string;
  admin_ids?: string[];
  created_at: string;
  member_profile_ids: string[];
  group_ids: string[];
}

export interface Chat {
  id: string;
  is_group: boolean;
  name?: string; // For groups
  avatar_url?: string; // For groups
  created_by?: string;
  admin_ids?: string[];
  participants: Profile[]; // Including current user
  members?: GroupMember[]; // Extra metadata for groups
  community_id?: string; // If this group belongs to a community
  is_announcement?: boolean;
  last_message?: {
    text: string;
    sender_id: string;
    sender_name: string;
    created_at: string;
  };
  unread_count: number;
  updated_at: string;
}

export interface DirectMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_profile: Profile;
  text: string;
  media_url?: string;
  media_type?: 'image' | 'audio' | 'video';
  audio_url?: string;
  audio_duration?: number;
  story_ref?: {
    story_id: string;
    media_url: string;
  };
  youtube_track?: YoutubeTrack;
  created_at: string;
  is_read: boolean;
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'story_reaction' | 'direct_message' | 'repost' | 'mention';

export interface AppNotification {
  id: string;
  recipient_profile_id: string;
  actor_profile: Profile;
  type: NotificationType;
  content: string; // e.g. "curtiu a sua publicação", "reagiu 🔥 ao seu story", "começou a seguir você"
  target_id?: string; // post_id, story_id, chat_id
  target_media_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface FollowerRelation {
  follower_id: string; // Profile who follows
  following_id: string; // Profile being followed
  created_at: string;
}

export interface Account {
  user_id: string;
  email: string;
  profiles: Profile[];
  active_profile_id: string;
}

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'inappropriate_content'
  | 'fake_profile'
  | 'violence'
  | 'other';

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface ProfileReport {
  id: string;
  reported_profile_id: string;
  reported_profile?: Profile;
  reporter_profile_id: string;
  reporter_profile?: Profile;
  reason: ReportReason;
  reason_label: string;
  description: string;
  created_at: string;
  status: ReportStatus;
  admin_notes?: string;
  action_taken?: 'banned' | 'warned' | 'dismissed' | 'none';
}
