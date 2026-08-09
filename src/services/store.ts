import {
  Profile, Post, Story, StoryReaction, Reel, Chat, DirectMessage, AppNotification,
  FollowerRelation, YoutubeTrack, ProfileType
} from '../types';
import {
  INITIAL_PROFILES, INITIAL_POSTS, INITIAL_STORIES, INITIAL_REELS,
  INITIAL_CHATS, INITIAL_NOTIFICATIONS
} from './mockData';
import { getSupabaseClient } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'instaconnect_state_v2';

interface StoreState {
  profiles: Profile[];
  activeProfileId: string;
  posts: Post[];
  stories: Story[];
  storyReactions: StoryReaction[];
  reels: Reel[];
  chats: Chat[];
  messages: Record<string, DirectMessage[]>; // chatId -> messages
  notifications: AppNotification[];
  followers: FollowerRelation[];
  savedPostIds: string[];
}

// Initial seed
function getInitialState(): StoreState {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.profiles)) {
        return parsed;
      }
    } catch (e) {
      console.error('Erro ao carregar estado local, carregando padrões:', e);
    }
  }

  return {
    profiles: [],
    activeProfileId: '',
    posts: [],
    stories: [],
    storyReactions: [],
    reels: [],
    chats: [],
    messages: {},
    notifications: [],
    followers: [],
    savedPostIds: []
  };
}


class Store {
  private state: StoreState = getInitialState();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.setupSupabaseRealtime();
  }

  private saveState() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Erro ao salvar estado:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify() {
    this.listeners.forEach((fn) => fn());
  }

  // --- SUPABASE REALTIME SYNC (Optional background sync when connected) ---
  private setupSupabaseRealtime() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const channel = supabase
        .channel('public-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          console.log('Realtime mensagem recebida via Supabase:', payload);
          // Auto sync message if received
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
          console.log('Realtime notificação recebida via Supabase:', payload);
        })
        .subscribe();
    } catch (e) {
      console.warn('Supabase Realtime não configurado:', e);
    }
  }

  // --- PROFILES & ACCOUNT CONTEXT ---
  public getProfiles(): Profile[] {
    return this.state.profiles;
  }

  public getActiveProfile(): Profile | undefined {
    const active = this.state.profiles.find((p) => p.id === this.state.activeProfileId);
    return active || this.state.profiles[0];
  }

  public switchProfile(profileId: string) {
    if (this.state.profiles.some((p) => p.id === profileId)) {
      this.state.activeProfileId = profileId;
      this.saveState();
    }
  }

  public createProfile(data: {
    username: string;
    full_name: string;
    avatar_url: string;
    bio: string;
    website?: string;
    profile_type: ProfileType;
  }): Profile {
    const activeUser = this.getActiveProfile();
    const newProfile: Profile = {
      id: `prof-${Date.now()}`,
      user_id: activeUser ? activeUser.user_id : `user-${Date.now()}`,
      username: data.username.toLowerCase().replace(/[^a-z0-9._]/g, ''),
      full_name: data.full_name,
      avatar_url: data.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      bio: data.bio || '',
      website: data.website || '',
      profile_type: data.profile_type,
      verified: false,
      followers_count: 0,
      following_count: 0,
      posts_count: 0,
      created_at: new Date().toISOString()
    };

    this.state.profiles.push(newProfile);
    this.state.activeProfileId = newProfile.id; // Automatically switch to newly created profile
    this.saveState();
    return newProfile;
  }

  public updateActiveProfile(data: Partial<Profile>) {
    const activeId = this.state.activeProfileId;
    this.state.profiles = this.state.profiles.map((p) => {
      if (p.id === activeId) {
        return { ...p, ...data };
      }
      return p;
    });

    // Update in posts, stories, reels, comments if avatar/name changed
    const updated = this.getActiveProfile();
    this.state.posts = this.state.posts.map((post) => {
      if (post.profile_id === activeId) {
        return { ...post, profile: updated };
      }
      return post;
    });

    this.saveState();
  }

  // --- FOLLOW SYSTEM ---
  public isFollowing(targetProfileId: string): boolean {
    const activeId = this.state.activeProfileId;
    return this.state.followers.some(
      (f) => f.follower_id === activeId && f.following_id === targetProfileId
    );
  }

  public toggleFollow(targetProfileId: string) {
    const activeId = this.state.activeProfileId;
    if (activeId === targetProfileId) return;

    const currentlyFollowing = this.isFollowing(targetProfileId);
    const activeProfile = this.getActiveProfile();
    const targetProfile = this.state.profiles.find((p) => p.id === targetProfileId);

    if (currentlyFollowing) {
      // Unfollow
      this.state.followers = this.state.followers.filter(
        (f) => !(f.follower_id === activeId && f.following_id === targetProfileId)
      );

      // Decrement counts
      if (activeProfile) activeProfile.following_count = Math.max(0, activeProfile.following_count - 1);
      if (targetProfile) targetProfile.followers_count = Math.max(0, targetProfile.followers_count - 1);
    } else {
      // Follow
      this.state.followers.push({
        follower_id: activeId,
        following_id: targetProfileId,
        created_at: new Date().toISOString()
      });

      // Increment counts
      if (activeProfile) activeProfile.following_count += 1;
      if (targetProfile) targetProfile.followers_count += 1;

      // Dispatch Notification to target user
      this.addNotification({
        recipient_profile_id: targetProfileId,
        actor_profile: activeProfile,
        type: 'follow',
        content: 'começou a seguir você.'
      });
    }

    this.saveState();
  }

  public getFollowers(profileId: string): Profile[] {
    const followerIds = this.state.followers
      .filter((f) => f.following_id === profileId)
      .map((f) => f.follower_id);
    return this.state.profiles.filter((p) => followerIds.includes(p.id));
  }

  public getFollowing(profileId: string): Profile[] {
    const followingIds = this.state.followers
      .filter((f) => f.follower_id === profileId)
      .map((f) => f.following_id);
    return this.state.profiles.filter((p) => followingIds.includes(p.id));
  }

  // --- POSTS ---
  public getPosts(): Post[] {
    return this.state.posts;
  }

  public createPost(data: {
    media_url: string;
    media_type: 'image' | 'video';
    caption: string;
    location?: string;
    youtube_track?: YoutubeTrack;
  }): Post {
    const activeProfile = this.getActiveProfile();
    const newPost: Post = {
      id: `post-${Date.now()}`,
      profile_id: activeProfile.id,
      profile: activeProfile,
      media_url: data.media_url,
      media_type: data.media_type,
      caption: data.caption,
      location: data.location || '',
      youtube_track: data.youtube_track,
      likes_count: 0,
      comments_count: 0,
      is_liked: false,
      is_saved: false,
      created_at: new Date().toISOString(),
      comments: []
    };

    this.state.posts.unshift(newPost);
    activeProfile.posts_count += 1;
    this.saveState();
    return newPost;
  }

  public toggleLikePost(postId: string) {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return;

    post.is_liked = !post.is_liked;
    post.likes_count += post.is_liked ? 1 : -1;

    if (post.is_liked && post.profile_id !== this.state.activeProfileId) {
      this.addNotification({
        recipient_profile_id: post.profile_id,
        actor_profile: this.getActiveProfile(),
        type: 'like',
        content: 'curtiu a sua publicação.',
        target_id: post.id,
        target_media_url: post.media_url
      });
    }

    this.saveState();
  }

  public toggleSavePost(postId: string) {
    const index = this.state.savedPostIds.indexOf(postId);
    if (index >= 0) {
      this.state.savedPostIds.splice(index, 1);
    } else {
      this.state.savedPostIds.push(postId);
    }

    const post = this.state.posts.find((p) => p.id === postId);
    if (post) post.is_saved = index < 0;

    this.saveState();
  }

  public getSavedPosts(): Post[] {
    return this.state.posts.filter((p) => this.state.savedPostIds.includes(p.id));
  }

  public deletePost(postId: string) {
    const index = this.state.posts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      const post = this.state.posts[index];
      this.state.posts.splice(index, 1);
      this.state.savedPostIds = this.state.savedPostIds.filter((id) => id !== postId);

      const profile = this.state.profiles.find((p) => p.id === post.profile_id);
      if (profile && profile.posts_count > 0) {
        profile.posts_count -= 1;
      }

      this.saveState();
    }
  }

  public deleteReel(reelId: string) {
    this.state.reels = this.state.reels.filter((r) => r.id !== reelId);
    this.saveState();
  }

  public deleteStory(storyId: string) {
    this.state.stories = this.state.stories.filter((s) => s.id !== storyId);
    this.saveState();
  }

  public addComment(postId: string, text: string) {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post || !text.trim()) return;

    const activeProfile = this.getActiveProfile();
    const newComment = {
      id: `c-${Date.now()}`,
      post_id: postId,
      profile_id: activeProfile.id,
      profile: activeProfile,
      text: text.trim(),
      created_at: new Date().toISOString(),
      likes_count: 0
    };

    if (!post.comments) post.comments = [];
    post.comments.push(newComment);
    post.comments_count += 1;

    if (post.profile_id !== activeProfile.id) {
      this.addNotification({
        recipient_profile_id: post.profile_id,
        actor_profile: activeProfile,
        type: 'comment',
        content: `comentou: "${text.substring(0, 30)}..." na sua publicação.`,
        target_id: post.id,
        target_media_url: post.media_url
      });
    }

    this.saveState();
  }

  // --- STORIES & STORY REACTIONS ---
  public getStories(): Story[] {
    const now = Date.now();
    return this.state.stories.filter((story) => {
      if (story.expires_at) {
        return new Date(story.expires_at).getTime() > now;
      }
      if (story.created_at) {
        const created = new Date(story.created_at).getTime();
        return now - created < 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }

  public createStory(data: {
    media_url: string;
    media_type: 'image' | 'video';
    youtube_track?: YoutubeTrack;
  }): Story {
    const activeProfile = this.getActiveProfile();
    const now = new Date();
    const newStory: Story = {
      id: `story-${Date.now()}`,
      profile_id: activeProfile.id,
      profile: activeProfile,
      media_url: data.media_url,
      media_type: data.media_type,
      youtube_track: data.youtube_track,
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(),
      viewed: false
    };

    this.state.stories.unshift(newStory);
    this.saveState();
    return newStory;
  }

  public reactToStory(storyId: string, reactionType: 'emoji' | 'text', content: string) {
    const story = this.state.stories.find((s) => s.id === storyId);
    if (!story) return;

    const activeProfile = this.getActiveProfile();
    const reaction: StoryReaction = {
      id: `sr-${Date.now()}`,
      story_id: storyId,
      from_profile_id: activeProfile.id,
      from_profile: activeProfile,
      reaction_type: reactionType,
      content,
      created_at: new Date().toISOString()
    };

    this.state.storyReactions.push(reaction);

    // If story belongs to another profile:
    if (story.profile_id !== activeProfile.id) {
      // 1. Dispatch notification
      this.addNotification({
        recipient_profile_id: story.profile_id,
        actor_profile: activeProfile,
        type: 'story_reaction',
        content: reactionType === 'emoji' ? `reagiu ${content} ao seu story.` : `respondeu ao seu story: "${content.substring(0, 30)}"`,
        target_id: story.id,
        target_media_url: story.media_url
      });

      // 2. Automatically send/create a direct message to story creator!
      const chat = this.getOrCreateDirectChat(story.profile_id);
      this.sendMessage(
        chat.id,
        reactionType === 'emoji' ? `Reagiu ${content} ao seu story` : content,
        story.media_url,
        story.youtube_track
      );
    }

    this.saveState();
  }

  // --- REELS ---
  public getReels(): Reel[] {
    return this.state.reels;
  }

  public createReel(data: {
    video_url: string;
    caption: string;
    youtube_track?: YoutubeTrack;
  }): Reel {
    const activeProfile = this.getActiveProfile();
    const newReel: Reel = {
      id: `reel-${Date.now()}`,
      profile_id: activeProfile.id,
      profile: activeProfile,
      video_url: data.video_url,
      caption: data.caption,
      youtube_track: data.youtube_track,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      is_liked: false,
      created_at: new Date().toISOString()
    };

    this.state.reels.unshift(newReel);
    this.saveState();
    return newReel;
  }

  public toggleLikeReel(reelId: string) {
    const reel = this.state.reels.find((r) => r.id === reelId);
    if (!reel) return;

    reel.is_liked = !reel.is_liked;
    reel.likes_count += reel.is_liked ? 1 : -1;

    if (reel.is_liked && reel.profile_id !== this.state.activeProfileId) {
      this.addNotification({
        recipient_profile_id: reel.profile_id,
        actor_profile: this.getActiveProfile(),
        type: 'like',
        content: 'curtiu o seu Reels.',
        target_id: reel.id
      });
    }

    this.saveState();
  }

  // --- DIRECT MESSAGES & GROUPS ---
  public getChats(): Chat[] {
    const activeId = this.state.activeProfileId;
    return this.state.chats.filter((c) =>
      c.participants.some((p) => p.id === activeId)
    );
  }

  public getOrCreateDirectChat(targetProfileId: string): Chat {
    const activeProfile = this.getActiveProfile();
    const targetProfile = this.state.profiles.find((p) => p.id === targetProfileId);

    if (!targetProfile) throw new Error('Perfil de destino não encontrado.');

    // Look for existing 1-on-1 chat
    const existing = this.state.chats.find(
      (c) =>
        !c.is_group &&
        c.participants.length === 2 &&
        c.participants.some((p) => p.id === activeProfile.id) &&
        c.participants.some((p) => p.id === targetProfileId)
    );

    if (existing) return existing;

    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      is_group: false,
      participants: [activeProfile, targetProfile],
      unread_count: 0,
      updated_at: new Date().toISOString()
    };

    this.state.chats.unshift(newChat);
    this.state.messages[newChat.id] = [];
    this.saveState();
    return newChat;
  }

  public createGroupChat(name: string, memberProfileIds: string[], avatarUrl?: string): Chat {
    const activeProfile = this.getActiveProfile();
    const selectedProfiles = this.state.profiles.filter((p) => memberProfileIds.includes(p.id));
    const allParticipants = [activeProfile, ...selectedProfiles.filter((p) => p.id !== activeProfile.id)];

    const newGroup: Chat = {
      id: `chat-group-${Date.now()}`,
      is_group: true,
      name: name || 'Novo Grupo',
      avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80',
      created_by: activeProfile.id,
      participants: allParticipants,
      members: allParticipants.map((p) => ({
        profile_id: p.id,
        profile: p,
        role: p.id === activeProfile.id ? 'admin' : 'member',
        joined_at: new Date().toISOString()
      })),
      last_message: {
        text: `${activeProfile.full_name} criou o grupo "${name}"`,
        sender_id: activeProfile.id,
        sender_name: activeProfile.full_name,
        created_at: new Date().toISOString()
      },
      unread_count: 0,
      updated_at: new Date().toISOString()
    };

    this.state.chats.unshift(newGroup);
    this.state.messages[newGroup.id] = [
      {
        id: `msg-sys-${Date.now()}`,
        chat_id: newGroup.id,
        sender_id: activeProfile.id,
        sender_profile: activeProfile,
        text: `🎉 Grupo "${name}" criado com sucesso.`,
        created_at: new Date().toISOString(),
        is_read: true
      }
    ];

    // Notify all members
    memberProfileIds.forEach((pid) => {
      if (pid !== activeProfile.id) {
        this.addNotification({
          recipient_profile_id: pid,
          actor_profile: activeProfile,
          type: 'direct_message',
          content: `adicionou você ao grupo "${name}".`,
          target_id: newGroup.id
        });
      }
    });

    this.saveState();
    return newGroup;
  }

  public getMessages(chatId: string): DirectMessage[] {
    return this.state.messages[chatId] || [];
  }

  public sendMessage(
    chatId: string,
    text: string,
    mediaUrl?: string,
    youtubeTrack?: YoutubeTrack
  ): DirectMessage {
    const chat = this.state.chats.find((c) => c.id === chatId);
    if (!chat) throw new Error('Conversa não encontrada.');

    const activeProfile = this.getActiveProfile();
    const newMsg: DirectMessage = {
      id: `msg-${Date.now()}`,
      chat_id: chatId,
      sender_id: activeProfile.id,
      sender_profile: activeProfile,
      text,
      media_url: mediaUrl,
      youtube_track: youtubeTrack,
      created_at: new Date().toISOString(),
      is_read: false
    };

    if (!this.state.messages[chatId]) {
      this.state.messages[chatId] = [];
    }

    this.state.messages[chatId].push(newMsg);

    // Update Chat last message
    chat.last_message = {
      text: chat.is_group ? `${activeProfile.username}: ${text || 'Mídia'}` : (text || 'Mídia'),
      sender_id: activeProfile.id,
      sender_name: activeProfile.full_name,
      created_at: newMsg.created_at
    };
    chat.updated_at = newMsg.created_at;

    // Dispatch direct message notifications to other participants
    chat.participants.forEach((p) => {
      if (p.id !== activeProfile.id) {
        this.addNotification({
          recipient_profile_id: p.id,
          actor_profile: activeProfile,
          type: 'direct_message',
          content: chat.is_group
            ? `enviou uma mensagem no grupo ${chat.name}`
            : `enviou uma mensagem: "${text.substring(0, 30)}..."`,
          target_id: chatId
        });
      }
    });

    this.saveState();
    return newMsg;
  }

  public markChatAsRead(chatId: string) {
    const chat = this.state.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.unread_count = 0;
      const msgs = this.state.messages[chatId];
      if (msgs) {
        msgs.forEach((m) => {
          m.is_read = true;
        });
      }
      this.saveState();
    }
  }

  // --- NOTIFICATIONS ---
  public getNotifications(): AppNotification[] {
    const activeId = this.state.activeProfileId;
    return this.state.notifications.filter((n) => n.recipient_profile_id === activeId);
  }

  public getUnreadNotificationCount(): number {
    return this.getNotifications().filter((n) => !n.is_read).length;
  }

  public getUnreadChatCount(): number {
    return this.getChats().reduce((acc, chat) => acc + (chat.unread_count || 0), 0);
  }

  private addNotification(data: {
    recipient_profile_id: string;
    actor_profile: Profile;
    type: AppNotification['type'];
    content: string;
    target_id?: string;
    target_media_url?: string;
  }) {
    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipient_profile_id: data.recipient_profile_id,
      actor_profile: data.actor_profile,
      type: data.type,
      content: data.content,
      target_id: data.target_id,
      target_media_url: data.target_media_url,
      is_read: false,
      created_at: new Date().toISOString()
    };

    this.state.notifications.unshift(notif);
  }

  public markNotificationAsRead(notifId: string) {
    const n = this.state.notifications.find((item) => item.id === notifId);
    if (n) {
      n.is_read = true;
      this.saveState();
    }
  }

  public markAllNotificationsAsRead() {
    const activeId = this.state.activeProfileId;
    this.state.notifications.forEach((n) => {
      if (n.recipient_profile_id === activeId) {
        n.is_read = true;
      }
    });
    this.saveState();
  }

  public deleteChat(chatId: string) {
    this.state.chats = this.state.chats.filter((c) => c.id !== chatId);
    delete this.state.messages[chatId];
    this.saveState();
  }

  public updateGroupChat(chatId: string, data: { name?: string; avatar_url?: string }) {
    const chat = this.state.chats.find((c) => c.id === chatId && c.is_group);
    if (!chat) return;

    if (data.name !== undefined) chat.name = data.name;
    if (data.avatar_url !== undefined) chat.avatar_url = data.avatar_url;

    chat.updated_at = new Date().toISOString();
    this.saveState();
  }

  public clearReadNotifications() {
    const activeId = this.state.activeProfileId;
    this.state.notifications = this.state.notifications.filter(
      (n) => !(n.recipient_profile_id === activeId && n.is_read)
    );
    this.saveState();
  }

  public clearAllNotifications() {
    const activeId = this.state.activeProfileId;
    this.state.notifications = this.state.notifications.filter(
      (n) => n.recipient_profile_id !== activeId
    );
    this.saveState();
  }

  public resetDemoData() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    this.state = getInitialState();
    this.notify();
  }
}

export const store = new Store();
