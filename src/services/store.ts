import {
  Profile, Post, Story, StoryReaction, Reel, Chat, DirectMessage, AppNotification,
  FollowerRelation, YoutubeTrack, ProfileType, Community, ProfileReport, ReportReason, ReportStatus
} from '../types';
import {
  INITIAL_PROFILES, INITIAL_POSTS, INITIAL_STORIES, INITIAL_REELS,
  INITIAL_CHATS, INITIAL_NOTIFICATIONS
} from './mockData';
import { getSupabaseClient } from '../lib/supabase';
import { getStoredGoogleUser, ADMIN_EMAIL, isAppAdmin, GoogleUser, getOrCreateUserIdForEmail } from './googleAuth';
import { compressImage, convertToPermanentDataUrl } from '../utils/imageCompressor';
import { imageCache } from './imageCache';

const LOCAL_STORAGE_KEY = 'rpg_state_v2';

export function isValidUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface StoreState {
  profiles: Profile[];
  activeProfileId: string;
  posts: Post[];
  stories: Story[];
  storyReactions: StoryReaction[];
  reels: Reel[];
  chats: Chat[];
  communities: Community[];
  messages: Record<string, DirectMessage[]>; // chatId -> messages
  notifications: AppNotification[];
  followers: FollowerRelation[];
  savedPostIds: string[];
  reports: ProfileReport[];
}

// Initial seed
function getInitialState(): StoreState {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem('instaconnect_state_v2');
  let state: StoreState = {
    profiles: [],
    activeProfileId: '',
    posts: [],
    stories: [],
    storyReactions: [],
    reels: [],
    chats: [],
    communities: [],
    messages: {},
    notifications: [],
    followers: [],
    savedPostIds: [],
    reports: []
  };

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.profiles)) {
        state = parsed;
      }
    } catch (e) {
      console.error('Erro ao carregar estado local, carregando padrões:', e);
    }
  }

  // Load dedicated backup keys so posts/profiles never disappear on reload
  try {
    const savedPosts = localStorage.getItem('rpg_posts_v2');
    if (savedPosts) {
      const parsedPosts = JSON.parse(savedPosts);
      if (Array.isArray(parsedPosts) && parsedPosts.length > 0) {
        const existingIds = new Set(state.posts.map((p) => p.id));
        for (const p of parsedPosts) {
          if (!existingIds.has(p.id)) {
            state.posts.push(p);
            existingIds.add(p.id);
          }
        }
      }
    }
  } catch (e) {}

  try {
    const currentGoogleUser = getStoredGoogleUser();
    const currentUid = currentGoogleUser?.google_id;
    const currentEmail = currentGoogleUser?.email?.toLowerCase();

    // Filtra perfis em state.profiles para garantir que apenas os do usuário autenticado sejam mantidos
    if (currentGoogleUser && state.profiles.length > 0) {
      state.profiles = state.profiles.filter((p) => {
        if (!p) return false;
        const matchesUid = Boolean(currentUid && p.user_id && p.user_id === currentUid);
        const matchesEmail = Boolean(currentEmail && p.google_email && p.google_email.toLowerCase() === currentEmail);
        return matchesUid || matchesEmail;
      });
    } else if (!currentGoogleUser) {
      state.profiles = [];
      state.activeProfileId = '';
    }

    // Carrega backup dedicado exclusivamente para a conta autenticada
    if (currentGoogleUser) {
      const userKey = currentUid || currentEmail;
      const userSaved = localStorage.getItem('rpg_profiles_' + userKey);
      if (userSaved) {
        const parsedProfiles = JSON.parse(userSaved);
        if (Array.isArray(parsedProfiles) && parsedProfiles.length > 0) {
          const existingIds = new Set(state.profiles.map((p) => p.id));
          for (const p of parsedProfiles) {
            if (!existingIds.has(p.id)) {
              state.profiles.push(p);
              existingIds.add(p.id);
            }
          }
        }
      }
    }
  } catch (e) {}

  try {
    const savedFollowers = localStorage.getItem('rpg_followers_v2');
    if (savedFollowers) {
      const parsedFollowers = JSON.parse(savedFollowers);
      if (Array.isArray(parsedFollowers) && parsedFollowers.length > 0) {
        state.followers = parsedFollowers;
      }
    }
  } catch (e) {}

  try {
    const savedReports = localStorage.getItem('rpg_reports_v2');
    if (savedReports) {
      const parsedReports = JSON.parse(savedReports);
      if (Array.isArray(parsedReports)) {
        state.reports = parsedReports;
      }
    }
  } catch (e) {}

  if (!Array.isArray(state.reports)) {
    state.reports = [];
  }

  // Valida que o activeProfileId pertence a um perfil desta conta
  if (state.profiles.length > 0) {
    const activeBelongs = state.profiles.some((p) => p.id === state.activeProfileId);
    if (!activeBelongs) {
      state.activeProfileId = state.profiles[0].id;
    }
  } else {
    state.activeProfileId = '';
  }

  if (!Array.isArray(state.communities)) {
    state.communities = [];
  }

  return state;
}


class Store {
  private state: StoreState = getInitialState();
  private publicProfilesCache: Map<string, Profile> = new Map();
  private listeners: Set<() => void> = new Set();
  private isSqlSynced: boolean = false;
  private isSqlSyncing: boolean = true;
  private sqlSyncPromise: Promise<void> | null = null;

  constructor() {
    this.sanitizeFollowers();
    this.sanitizePostAuthors();
    this.recalculateProfileCounts();
    // Salva e pré-carrega imediatamente todas as imagens Base64 na memória RAM
    this.prewarmImageCache();
    this.setupSupabaseRealtime();
  }

  public prewarmImageCache() {
    if (this.state.posts && this.state.posts.length > 0) {
      imageCache.cachePosts(this.state.posts);
    }
    if (this.state.profiles && this.state.profiles.length > 0) {
      imageCache.cacheProfiles(this.state.profiles);
    }
    if (this.state.stories && this.state.stories.length > 0) {
      imageCache.cacheStories(this.state.stories);
    }
  }

  private saveState() {
    try {
      const currentGoogleUser = getStoredGoogleUser();
      const myProfs = this.getProfiles();
      if (currentGoogleUser && myProfs.length > 0) {
        const userKey = currentGoogleUser.google_id || currentGoogleUser.email.toLowerCase();
        try {
          localStorage.setItem('rpg_profiles_' + userKey, JSON.stringify(myProfs));
        } catch {}
      }

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
        localStorage.setItem('rpg_posts_v2', JSON.stringify((this.state.posts || []).slice(0, 50)));
        localStorage.setItem('rpg_profiles_v2', JSON.stringify(myProfs));
        localStorage.setItem('rpg_followers_v2', JSON.stringify(this.state.followers || []));
        localStorage.setItem('rpg_reports_v2', JSON.stringify(this.state.reports || []));
      } catch (e) {
        console.warn('Armazenamento local excedeu quota. Limpando chaves antigas e salvando dados compactados...', e);
        try {
          localStorage.removeItem('instaconnect_state_v2');
          localStorage.removeItem('rpg_state');
          localStorage.removeItem('supabase.auth.token');

          const compacted = this.getCompactedState();
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(compacted));
        } catch (err2) {
          console.warn('Aviso: Armazenamento local do navegador sem espaço disponível.', err2);
        }
      }
    } catch (globalErr) {
      console.warn('Erro ao salvar estado:', globalErr);
    }
    this.notify();
  }

  private getCompactedState(): StoreState {
    const compactedMessages: Record<string, DirectMessage[]> = {};
    for (const [chatId, msgs] of Object.entries(this.state.messages || {})) {
      // Keep only latest 30 messages per conversation in local storage
      const sliced = msgs.slice(-30);
      compactedMessages[chatId] = sliced.map((m, idx) => {
        // For messages older than the last 5, strip huge base64 media data to save space
        if (idx < sliced.length - 5 && m.media_url && m.media_url.startsWith('data:') && m.media_url.length > 50000) {
          return {
            ...m,
            media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80'
          };
        }
        return m;
      });
    }

    return {
      ...this.state,
      messages: compactedMessages,
      notifications: (this.state.notifications || []).slice(0, 30),
      stories: this.state.stories || [],
      posts: this.state.posts || []
    };
  }

  private getMinimalState(): StoreState {
    const minimalMessages: Record<string, DirectMessage[]> = {};
    for (const [chatId, msgs] of Object.entries(this.state.messages || {})) {
      // Keep only latest 10 messages without heavy data URLs
      minimalMessages[chatId] = msgs.slice(-10).map((m) => ({
        ...m,
        media_url: m.media_url && m.media_url.startsWith('data:') ? undefined : m.media_url
      }));
    }

    return {
      ...this.state,
      messages: minimalMessages,
      notifications: (this.state.notifications || []).slice(0, 10),
      stories: this.state.stories || [],
      posts: (this.state.posts || []).map((p) => ({
        ...p,
        media_url: p.media_url && p.media_url.startsWith('data:')
          ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80'
          : p.media_url
      }))
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notify() {
    this.listeners.forEach((fn) => fn());
  }

  public isSqlReady(): boolean {
    return this.isSqlSynced;
  }

  public isSqlLoading(): boolean {
    return this.isSqlSyncing;
  }

  public async waitForSqlSync(): Promise<void> {
    if (this.sqlSyncPromise) {
      try {
        await this.sqlSyncPromise;
      } catch {}
    }
  }

  // --- SUPABASE REALTIME SYNC & BACKGROUND SYNC ---
  private setupSupabaseRealtime() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      this.isSqlSyncing = false;
      this.isSqlSynced = true;
      return;
    }

    // Processamento Assíncrono: sincroniza com o banco de dados SQL
    this.sqlSyncPromise = this.syncInitialDataFromSupabase()
      .catch((err) => {
        console.warn('Falha na sincronização SQL com Supabase:', err);
      })
      .finally(() => {
        this.isSqlSyncing = false;
        this.isSqlSynced = true;
        this.notify();
      });

    try {
      supabase
        .channel('rpg-realtime-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newRow = payload.new as any;
          if (!newRow || !newRow.chat_id || !newRow.id) return;
          const currentMsgs = this.state.messages[newRow.chat_id] || [];
          if (currentMsgs.some((m) => m.id === newRow.id)) return;

          const sender = this.state.profiles.find((p) => p.id === newRow.sender_id);
          const incomingMsg: DirectMessage = {
            id: newRow.id,
            chat_id: newRow.chat_id,
            sender_id: newRow.sender_id,
            sender_profile: sender,
            text: newRow.text || '',
            media_url: newRow.media_url,
            youtube_track: newRow.youtube_track,
            created_at: newRow.created_at || new Date().toISOString(),
            is_read: newRow.is_read || false
          };

          if (!this.state.messages[newRow.chat_id]) {
            this.state.messages[newRow.chat_id] = [];
          }
          this.state.messages[newRow.chat_id].push(incomingMsg);
          this.saveState();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
          const notifRow = payload.new as any;
          if (!notifRow || notifRow.recipient_profile_id !== this.state.activeProfileId) return;
          if (this.state.notifications.some((n) => n.id === notifRow.id)) return;

          const actor = this.state.profiles.find((p) => p.id === notifRow.actor_profile_id);
          this.state.notifications.unshift({
            id: notifRow.id,
            recipient_profile_id: notifRow.recipient_profile_id,
            actor_profile: actor,
            type: notifRow.type,
            content: notifRow.content,
            target_id: notifRow.target_id,
            target_media_url: notifRow.target_media_url,
            is_read: false,
            created_at: notifRow.created_at || new Date().toISOString()
          });
          this.saveState();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'followers' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as any;
            if (row && row.follower_id && row.following_id) {
              const exists = this.state.followers.some(
                (f) => f.follower_id === row.follower_id && f.following_id === row.following_id
              );
              if (!exists) {
                this.state.followers.push({
                  follower_id: row.follower_id,
                  following_id: row.following_id,
                  created_at: row.created_at || new Date().toISOString()
                });
                this.sanitizeFollowers();
                this.saveState();
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as any;
            if (oldRow && oldRow.follower_id && oldRow.following_id) {
              this.state.followers = this.state.followers.filter(
                (f) => !(f.follower_id === oldRow.follower_id && f.following_id === oldRow.following_id)
              );
              this.sanitizeFollowers();
              this.saveState();
            }
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Supabase Realtime não configurado ou tabelas ainda não criadas:', e);
    }
  }

  private async syncInitialDataFromSupabase() {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // 1. Consulta ao Supabase filtrada estritamente no backend pelo ID do usuário autenticado
      const currentGoogleUser = getStoredGoogleUser();
      if (currentGoogleUser) {
        const currentUid = currentGoogleUser.google_id;
        const currentEmail = currentGoogleUser.email?.toLowerCase();

        let myRemoteProfiles: any[] | null = null;
        let profErr: any = null;

        if (currentUid && isValidUUID(currentUid)) {
          const res = await supabase.from('profiles').select('*').eq('user_id', currentUid);
          myRemoteProfiles = res.data;
          profErr = res.error;
        }

        if ((!myRemoteProfiles || myRemoteProfiles.length === 0) && currentEmail) {
          try {
            const res = await supabase.from('profiles').select('*').eq('google_email', currentEmail);
            if (!res.error && res.data && res.data.length > 0) {
              myRemoteProfiles = res.data;
            }
          } catch {}
        }

        if (!profErr && myRemoteProfiles && myRemoteProfiles.length > 0) {
          let changed = false;
          myRemoteProfiles.forEach((rp: any) => {
            const existingIdx = this.state.profiles.findIndex((p) => p.id === rp.id);
            if (existingIdx === -1) {
              this.state.profiles.push(rp);
              changed = true;
            } else {
              this.state.profiles[existingIdx] = {
                ...this.state.profiles[existingIdx],
                ...rp
              };
              changed = true;
            }
          });
          if (changed) {
            const myProfs = this.getProfiles();
            if (!this.state.activeProfileId && myProfs.length > 0) {
              this.state.activeProfileId = myProfs[0].id;
            }
            this.saveState();
          }
          imageCache.cacheProfiles(myRemoteProfiles);
        }
      }

      // 2. Check & Sync posts from Supabase table so publications never disappear on reload
      const { data: remotePosts, error: postErr } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!postErr && remotePosts && remotePosts.length > 0) {
        let postChanged = false;

        // Pré-carrega perfis de autores remotos para exibir seus nomes/avatares nos posts do Feed
        const missingAuthorIds = Array.from(
          new Set(
            remotePosts
              .map((rp: any) => rp.profile_id)
              .filter((pid: string) => pid && !this.publicProfilesCache.has(pid))
          )
        );

        if (missingAuthorIds.length > 0) {
          try {
            const { data: fetchedAuthors } = await supabase
              .from('profiles')
              .select('id, user_id, username, full_name, avatar_url, bio, website, profile_type, verified, followers_count, following_count, posts_count, created_at')
              .in('id', missingAuthorIds);

            if (fetchedAuthors && fetchedAuthors.length > 0) {
              for (const fa of fetchedAuthors) {
                this.publicProfilesCache.set(fa.id, fa);
              }
              imageCache.cacheProfiles(fetchedAuthors);
            }
          } catch {}
        }

        remotePosts.forEach((rp: any) => {
          const existingIdx = this.state.posts.findIndex((p) => p.id === rp.id);
          // O autor DEVE corresponder estritamente ao profile_id do post!
          const realAuthor = this.getProfileById(rp.profile_id);
          const author: Profile = realAuthor || {
            id: rp.profile_id,
            user_id: rp.profile_id,
            username: 'aventureiro',
            full_name: 'Aventureiro',
            avatar_url: '',
            bio: '',
            profile_type: 'pessoal',
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
            created_at: rp.created_at || new Date().toISOString(),
            verified: false
          };

          const mappedPost: Post = {
            id: rp.id,
            profile_id: rp.profile_id,
            profile: author,
            media_url: rp.media_url,
            media_type: rp.media_type || 'image',
            caption: rp.caption || '',
            location: rp.location || '',
            youtube_track: rp.youtube_track,
            likes_count: rp.likes_count || 0,
            comments_count: rp.comments_count || 0,
            is_liked: false,
            is_saved: (this.state.savedPostIds || []).includes(rp.id),
            created_at: rp.created_at || new Date().toISOString(),
            comments: []
          };

          if (existingIdx === -1) {
            this.state.posts.push(mappedPost);
            postChanged = true;
          } else {
            const currentPost = this.state.posts[existingIdx];
            if (currentPost.profile_id !== rp.profile_id) {
              currentPost.profile_id = rp.profile_id;
              currentPost.profile = author;
              postChanged = true;
            } else if (!currentPost.profile || currentPost.profile.id !== rp.profile_id) {
              currentPost.profile = author;
              postChanged = true;
            }
            if (currentPost.media_url !== rp.media_url) {
              currentPost.media_url = rp.media_url;
              postChanged = true;
            }
          }
        });

        if (postChanged) {
          this.state.posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          this.recalculateProfileCounts();
          this.saveState();
        }
        // Salva imagens Base64 de todos os posts do SQL diretamente na memória RAM
        imageCache.cachePosts(remotePosts);
      }

      // 3. Check & Sync followers from Supabase table so follows never disappear on reload
      const { data: remoteFollowers, error: followersErr } = await supabase
        .from('followers')
        .select('*')
        .limit(1000);

      if (!followersErr && remoteFollowers && remoteFollowers.length > 0) {
        let followersChanged = false;
        for (const rf of remoteFollowers) {
          // Apenas aceita relações entre perfis que realmente existem atualmente no app
          const followerExists = this.state.profiles.some((p) => p.id === rf.follower_id);
          const followingExists = this.state.profiles.some((p) => p.id === rf.following_id);

          // Se um dos perfis não existe ou é um perfil seguindo a si mesmo, limpa do Supabase!
          if (!followerExists || !followingExists || rf.follower_id === rf.following_id) {
            Promise.resolve(
              supabase.from('followers').delete().match({
                follower_id: rf.follower_id,
                following_id: rf.following_id
              })
            ).catch(() => {});
            continue;
          }

          const exists = this.state.followers.some(
            (f) => f.follower_id === rf.follower_id && f.following_id === rf.following_id
          );
          if (!exists) {
            this.state.followers.push({
              follower_id: rf.follower_id,
              following_id: rf.following_id,
              created_at: rf.created_at || new Date().toISOString()
            });
            followersChanged = true;
          }
        }

        this.sanitizeFollowers();
        this.saveState();
      }
    } catch (err) {
      console.warn('Erro ao sincronizar dados com o Supabase:', err);
    }
  }

  public async saveProfileToSupabase(profile: Profile) {
    const supabase = getSupabaseClient();
    if (!supabase || !profile) return;
    try {
      // 1. Garantir que o ID é um UUID válido
      if (!isValidUUID(profile.id)) {
        profile.id = generateUUID();
      }

      // 2. Upsert do perfil utilizando o ID único do perfil
      const payload: Record<string, any> = {
        id: profile.id,
        user_id: profile.user_id,
        username: profile.username.toLowerCase(),
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio || '',
        website: profile.website || '',
        profile_type: profile.profile_type || 'pessoal',
        verified: profile.verified || false,
        followers_count: profile.followers_count || 0,
        following_count: profile.following_count || 0,
        posts_count: profile.posts_count || 0,
        created_at: profile.created_at || new Date().toISOString()
      };
      if (profile.google_email) payload.google_email = profile.google_email;
      if (profile.google_name) payload.google_name = profile.google_name;

      let { error } = await supabase.from('profiles').upsert(payload);
      if (error && (error as any).code === 'PGRST204') {
        // Schema cache não possui google_email/google_name, salva com colunas essenciais
        delete payload.google_email;
        delete payload.google_name;
        const retry = await supabase.from('profiles').upsert(payload);
        error = retry.error;
      }

      if (error) {
        console.warn('Aviso ao sincronizar perfil no Supabase:', error);
      }
    } catch (e) {
      console.warn('Erro ao salvar perfil no Supabase:', e);
    }
  }

  public async savePostToSupabase(post: Post) {
    const supabase = getSupabaseClient();
    if (!supabase || !post || !post.profile_id) return;
    try {
      // 1. Garantir que o perfil autor exista com segurança no Supabase antes de inserir o post
      // NUNCA fazer fallback para this.getActiveProfile() se o post pertencer a outro autor!
      const author = post.profile && post.profile.id === post.profile_id
        ? post.profile
        : this.state.profiles.find((p) => p.id === post.profile_id);

      if (author) {
        await this.saveProfileToSupabase(author);
      }

      // 2. Garantir que o post.id seja um UUID válido
      if (!isValidUUID(post.id)) {
        post.id = generateUUID();
      }

      // 3. Garante que o media_url esteja convertido para Base64 Data URL permanente antes do upsert
      const permanentMedia = await convertToPermanentDataUrl(post.media_url);
      post.media_url = permanentMedia;

      const { error } = await supabase.from('posts').upsert({
        id: post.id,
        profile_id: post.profile_id,
        media_url: permanentMedia,
        media_type: post.media_type || 'image',
        caption: post.caption || '',
        location: post.location || '',
        youtube_track: post.youtube_track || null,
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        created_at: post.created_at || new Date().toISOString()
      });
      if (error) {
        console.warn('Aviso ao salvar publicação no Supabase:', error);
      }
    } catch (e) {
      console.warn('Erro ao salvar publicação no Supabase:', e);
    }
  }

  // --- PROFILES & ACCOUNT CONTEXT ---
  /**
   * Retorna estritamente os perfis pertencentes ao usuário autenticado.
   * Contas diferentes NUNCA podem visualizar os perfis umas das outras.
   */
  public getProfiles(): Profile[] {
    const currentGoogleUser = getStoredGoogleUser();
    if (!currentGoogleUser) return [];

    const currentUid = currentGoogleUser.google_id;
    const currentEmail = currentGoogleUser.email?.toLowerCase();

    return (this.state.profiles || []).filter((p) => {
      if (!p) return false;
      // Perfil deve pertencer estritamente a este usuário (UID ou e-mail)
      const matchesUid = Boolean(currentUid && p.user_id && p.user_id === currentUid);
      const matchesEmail = Boolean(currentEmail && p.google_email && p.google_email.toLowerCase() === currentEmail);
      
      // Dados antigos ou sem dono NÃO são expostos a usuários comuns
      return matchesUid || matchesEmail;
    });
  }

  public getActiveProfile(): Profile | undefined {
    const myProfiles = this.getProfiles();
    if (myProfiles.length === 0) return undefined;

    // Se o activeProfileId atual pertence ao usuário autenticado, usa ele
    const active = myProfiles.find((p) => p.id === this.state.activeProfileId);
    if (active) return active;

    // Fallback seguro: primeiro perfil DO PRÓPRIO USUÁRIO
    return myProfiles[0];
  }

  public switchProfile(profileId: string): boolean {
    const myProfiles = this.getProfiles();
    const target = myProfiles.find((p) => p.id === profileId);
    if (target) {
      this.state.activeProfileId = target.id;
      this.saveState();
      return true;
    }
    console.warn('Bloqueado: Não é permitido alternar para um perfil de outra conta.');
    return false;
  }

  public createProfile(data: {
    username: string;
    full_name: string;
    avatar_url: string;
    bio: string;
    website?: string;
    profile_type: ProfileType;
    google_email?: string;
    google_name?: string;
    user_id?: string;
  }): Profile {
    const currentGoogleUser = getStoredGoogleUser();
    const cleanEmail = (data.google_email || currentGoogleUser?.email || '').trim().toLowerCase();
    const finalUserId = data.user_id || currentGoogleUser?.google_id || (cleanEmail ? getOrCreateUserIdForEmail(cleanEmail) : generateUUID());
    const finalGoogleName = data.google_name || currentGoogleUser?.name;

    const newProfile: Profile = {
      id: generateUUID(),
      user_id: finalUserId,
      google_email: cleanEmail,
      google_name: finalGoogleName,
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
    this.state.activeProfileId = newProfile.id; // Alterna automaticamente para o perfil recém-criado
    this.saveState();
    this.saveProfileToSupabase(newProfile);
    return newProfile;
  }

  public handleUserLogout() {
    const currentGoogleUser = getStoredGoogleUser();
    if (currentGoogleUser) {
      // 1. Salva com segurança todos os perfis da conta no backup isolado antes de deslogar
      const myProfs = this.getProfiles();
      const userKey = currentGoogleUser.google_id || currentGoogleUser.email?.toLowerCase();
      if (userKey && myProfs.length > 0) {
        try {
          localStorage.setItem('rpg_profiles_' + userKey, JSON.stringify(myProfs));
        } catch {}
      }

      // 2. Remove da memória ativa os perfis da conta que acabou de sair
      const currentUid = currentGoogleUser.google_id;
      const currentEmail = currentGoogleUser.email?.toLowerCase();
      this.state.profiles = (this.state.profiles || []).filter(
        (p) => !(p.user_id === currentUid || (currentEmail && p.google_email?.toLowerCase() === currentEmail))
      );
    }

    this.state.activeProfileId = '';

    // Salva o estado sem sobrescrever a chave de perfis do usuário
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
      localStorage.setItem('rpg_posts_v2', JSON.stringify((this.state.posts || []).slice(0, 50)));
      localStorage.setItem('rpg_profiles_v2', JSON.stringify([]));
    } catch {}

    this.notify();
  }

  public async handleUserLogin(user: GoogleUser) {
    const cleanEmail = user.email.trim().toLowerCase();
    const uid = user.google_id || getOrCreateUserIdForEmail(cleanEmail);

    // 1. Carrega backup local salvo para este usuário específico
    const userStorageKey = 'rpg_profiles_' + (uid || cleanEmail);
    const userSaved = localStorage.getItem(userStorageKey);
    if (userSaved) {
      try {
        const parsed = JSON.parse(userSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const cp of parsed) {
            if (!this.state.profiles.some((p) => p.id === cp.id)) {
              this.state.profiles.push(cp);
            }
          }
        }
      } catch {}
    }

    // 2. Define o activeProfileId para um perfil pertencente a esta conta
    const myProfiles = this.getProfiles();
    if (myProfiles.length > 0) {
      this.state.activeProfileId = myProfiles[0].id;
    } else {
      this.state.activeProfileId = '';
    }

    this.saveState();
    this.notify();

    // 3. Consulta ao Supabase com filtro obrigatório no backend por UID do usuário autenticado
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let remoteProfs: any[] | null = null;
        if (uid && isValidUUID(uid)) {
          const res = await supabase.from('profiles').select('*').eq('user_id', uid);
          remoteProfs = res.data;
        }

        if ((!remoteProfs || remoteProfs.length === 0) && cleanEmail) {
          try {
            const res = await supabase.from('profiles').select('*').eq('google_email', cleanEmail);
            if (!res.error && res.data && res.data.length > 0) {
              remoteProfs = res.data;
            }
          } catch {}
        }

        if (remoteProfs && remoteProfs.length > 0) {
          for (const rp of remoteProfs) {
            const idx = this.state.profiles.findIndex((p) => p.id === rp.id);
            if (idx === -1) {
              this.state.profiles.push(rp);
            } else {
              this.state.profiles[idx] = { ...this.state.profiles[idx], ...rp };
            }
          }
          const updatedMyProfiles = this.getProfiles();
          if (updatedMyProfiles.length > 0 && !this.state.activeProfileId) {
            this.state.activeProfileId = updatedMyProfiles[0].id;
          }
          this.saveState();
          this.notify();
          imageCache.cacheProfiles(remoteProfs);
        }
      } catch (err) {
        console.warn('Erro ao carregar perfis do usuário no Supabase:', err);
      }
    }
  }

  public getProfileById(profileIdOrUsername?: string): Profile | undefined {
    if (!profileIdOrUsername) return undefined;
    const target = profileIdOrUsername.toLowerCase().trim();

    // 1. Busca nos perfis do usuário
    const myProfile = this.state.profiles.find(
      (p) => p.id === target || p.username.toLowerCase() === target
    );
    if (myProfile) return myProfile;

    // 2. Busca no cache de perfis públicos
    const publicProfile = Array.from(this.publicProfilesCache.values()).find(
      (p) => p.id === target || p.username.toLowerCase() === target
    );
    if (publicProfile) return publicProfile;

    // 3. Busca em posts/stories carregados
    const postWithAuthor = this.state.posts.find(
      (p) => p.profile_id === target || p.profile?.username?.toLowerCase() === target
    );
    if (postWithAuthor?.profile) return postWithAuthor.profile;

    return undefined;
  }

  public getDiscoverableProfiles(): Profile[] {
    const activeProfile = this.getActiveProfile();
    const myId = activeProfile?.id;
    const list: Profile[] = [];
    const seen = new Set<string>();

    if (myId) seen.add(myId);

    // Perfis do cache público
    for (const p of this.publicProfilesCache.values()) {
      if (!seen.has(p.id) && p.google_email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        seen.add(p.id);
        list.push(p);
      }
    }

    // Autores de posts já carregados
    for (const post of this.state.posts) {
      if (post.profile && !seen.has(post.profile.id) && post.profile.id !== myId) {
        if (post.profile.google_email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
          seen.add(post.profile.id);
          list.push(post.profile);
        }
      }
    }

    return list;
  }

  public getAllProfilesForAdmin(): Profile[] {
    const currentGoogleUser = getStoredGoogleUser();
    if (!isAppAdmin(currentGoogleUser?.email)) return [];
    return this.state.profiles;
  }

  public updateActiveProfile(data: Partial<Profile>) {
    const active = this.getActiveProfile();
    if (!active) return;

    const currentGoogleUser = getStoredGoogleUser();
    if (!currentGoogleUser) return;
    const currentUid = currentGoogleUser.google_id;
    const currentEmail = currentGoogleUser.email?.toLowerCase();
    const isOwner = (currentUid && active.user_id === currentUid) || (currentEmail && active.google_email?.toLowerCase() === currentEmail);
    if (!isOwner) {
      console.warn('Bloqueado: Não é permitido alterar um perfil de outra conta.');
      return;
    }

    const activeId = active.id;
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

    if (data.avatar_url && activeId) {
      imageCache.set(`avatar_${activeId}`, data.avatar_url);
      imageCache.set(data.avatar_url, data.avatar_url);
    }

    this.saveState();
    if (updated) {
      this.saveProfileToSupabase(updated);
    }
  }

  public getAllProfiles(): Profile[] {
    return this.getProfiles();
  }

  public isProfileBanned(profileId?: string): boolean {
    const id = profileId || this.state.activeProfileId;
    const profile = this.state.profiles.find((p) => p.id === id);
    return !!profile?.banned;
  }

  public updateProfileById(profileId: string, data: Partial<Profile>): Profile | null {
    const currentGoogleUser = getStoredGoogleUser();
    const isAdmin = isAppAdmin(currentGoogleUser?.email);
    const currentUid = currentGoogleUser?.google_id;
    const currentEmail = currentGoogleUser?.email?.toLowerCase();

    const targetProfile = this.state.profiles.find((p) => p.id === profileId);
    if (!targetProfile) return null;

    const isOwner = (currentUid && targetProfile.user_id === currentUid) || (currentEmail && targetProfile.google_email?.toLowerCase() === currentEmail);
    if (!isOwner && !isAdmin) {
      console.warn('Bloqueado: Não é permitido alterar um perfil de outra conta.');
      return null;
    }

    let updatedProfile: Profile | null = null;
    this.state.profiles = this.state.profiles.map((p) => {
      if (p.id === profileId) {
        updatedProfile = { ...p, ...data };
        return updatedProfile;
      }
      return p;
    });

    if (updatedProfile) {
      const pSnap = updatedProfile as Profile;
      this.state.posts = this.state.posts.map((post) => {
        if (post.profile_id === profileId) {
          return { ...post, profile: { ...post.profile, ...data } };
        }
        return post;
      });
      this.state.stories = this.state.stories.map((story) => {
        if (story.profile_id === profileId) {
          return { ...story, profile: { ...story.profile, ...data } };
        }
        return story;
      });
      this.state.reels = this.state.reels.map((reel) => {
        if (reel.profile_id === profileId) {
          return { ...reel, profile: { ...reel.profile, ...data } };
        }
        return reel;
      });
      if (data.avatar_url) {
        imageCache.set(`avatar_${profileId}`, data.avatar_url);
        imageCache.set(data.avatar_url, data.avatar_url);
      }
      this.saveState();
    }
    return updatedProfile;
  }

  public toggleVerifyProfile(profileId: string): boolean {
    const profile = this.state.profiles.find((p) => p.id === profileId);
    if (!profile) return false;
    const newStatus = !profile.verified;
    this.updateProfileById(profileId, { verified: newStatus });
    return newStatus;
  }

  public toggleBanProfile(profileId: string, reason?: string): boolean {
    const profile = this.state.profiles.find((p) => p.id === profileId);
    if (!profile) return false;
    const newStatus = !profile.banned;
    this.updateProfileById(profileId, {
      banned: newStatus,
      banned_at: newStatus ? new Date().toISOString() : undefined,
      ban_reason: newStatus ? (reason || 'Violação das regras e diretrizes da comunidade') : undefined
    });
    return newStatus;
  }

  // --- REPORTS SYSTEM (Denúncias) ---
  public createReport(data: {
    reported_profile_id: string;
    reason: ReportReason;
    reason_label: string;
    description: string;
  }): { success: boolean; message: string; reportId?: string } {
    const activeProfile = this.getActiveProfile();
    if (!activeProfile) {
      return { success: false, message: 'Você precisa estar logado para enviar uma denúncia.' };
    }

    const reportedProfile = this.state.profiles.find(
      (p) => p.id === data.reported_profile_id || p.username === data.reported_profile_id
    );
    if (!reportedProfile) {
      return { success: false, message: 'Perfil denunciado não encontrado.' };
    }

    if (activeProfile.id === reportedProfile.id || activeProfile.username.toLowerCase() === reportedProfile.username.toLowerCase()) {
      return { success: false, message: 'Você não pode denunciar o seu próprio perfil.' };
    }

    if (!data.description || data.description.trim().length < 5) {
      return { success: false, message: 'Por favor, forneça mais detalhes sobre o ocorrido.' };
    }

    const newReport: ProfileReport = {
      id: generateUUID(),
      reported_profile_id: reportedProfile.id,
      reported_profile: reportedProfile,
      reporter_profile_id: activeProfile.id,
      reporter_profile: activeProfile,
      reason: data.reason,
      reason_label: data.reason_label,
      description: data.description.trim(),
      created_at: new Date().toISOString(),
      status: 'pending',
      action_taken: 'none'
    };

    if (!Array.isArray(this.state.reports)) {
      this.state.reports = [];
    }

    this.state.reports.unshift(newReport);
    this.saveState();

    // Sincroniza com Supabase se a tabela reports estiver configurada
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(
        supabase.from('reports').upsert({
          id: newReport.id,
          reported_profile_id: newReport.reported_profile_id,
          reporter_profile_id: newReport.reporter_profile_id,
          reason: newReport.reason,
          reason_label: newReport.reason_label,
          description: newReport.description,
          status: newReport.status,
          created_at: newReport.created_at
        })
      ).catch(() => {});
    }

    return { success: true, message: 'Denúncia enviada com sucesso para a administração.', reportId: newReport.id };
  }

  public getReports(): ProfileReport[] {
    const currentGoogleUser = getStoredGoogleUser();
    const isAdmin = isAppAdmin(currentGoogleUser?.email);
    if (!isAdmin) {
      return [];
    }

    return (this.state.reports || []).map((r) => {
      const reported = this.state.profiles.find((p) => p.id === r.reported_profile_id) || r.reported_profile;
      const reporter = this.state.profiles.find((p) => p.id === r.reporter_profile_id) || r.reporter_profile;
      return {
        ...r,
        reported_profile: reported,
        reporter_profile: reporter
      };
    });
  }

  public getPendingReportsCount(): number {
    const currentGoogleUser = getStoredGoogleUser();
    const isAdmin = isAppAdmin(currentGoogleUser?.email);
    if (!isAdmin) return 0;
    return (this.state.reports || []).filter((r) => r.status === 'pending').length;
  }

  public resolveReport(
    reportId: string,
    action: 'ban' | 'dismiss' | 'resolve',
    adminNotes?: string
  ): boolean {
    const report = (this.state.reports || []).find((r) => r.id === reportId);
    if (!report) return false;

    if (action === 'ban') {
      const banReason = `Denúncia aceita [${report.reason_label}]: ${report.description.slice(0, 100)}`;
      this.toggleBanProfile(report.reported_profile_id, banReason);
      report.action_taken = 'banned';
      report.status = 'resolved';
    } else if (action === 'dismiss') {
      report.action_taken = 'dismissed';
      report.status = 'dismissed';
    } else if (action === 'resolve') {
      report.action_taken = 'warned';
      report.status = 'resolved';
    }

    if (adminNotes) {
      report.admin_notes = adminNotes;
    }

    this.saveState();

    // Sincroniza resolução com Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(
        supabase.from('reports').update({
          status: report.status,
          action_taken: report.action_taken,
          admin_notes: report.admin_notes || null
        }).eq('id', report.id)
      ).catch(() => {});
    }

    return true;
  }

  public deleteReport(reportId: string): boolean {
    if (!this.state.reports) return false;
    this.state.reports = this.state.reports.filter((r) => r.id !== reportId);
    this.saveState();

    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(supabase.from('reports').delete().eq('id', reportId)).catch(() => {});
    }
    return true;
  }

  public getProfileByUsername(username: string): Profile | undefined {
    if (!username) return undefined;
    const cleanUsername = username.replace(/^@/, '').toLowerCase().trim();
    const currentGoogleUser = getStoredGoogleUser();
    const isAdmin = isAppAdmin(currentGoogleUser?.email);
    const profile = this.state.profiles.find(
      (p) => p.username.toLowerCase() === cleanUsername
    );
    if (!profile) return undefined;
    if (!isAdmin && profile.google_email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return undefined;
    }
    return profile;
  }

  public searchProfilesForMention(query: string): Profile[] {
    const currentGoogleUser = getStoredGoogleUser();
    const isAdmin = isAppAdmin(currentGoogleUser?.email);
    const visibleProfiles = isAdmin
      ? this.state.profiles
      : this.state.profiles.filter((p) => p.google_email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase());

    const q = query.replace(/^@/, '').toLowerCase().trim();
    if (!q) return visibleProfiles.slice(0, 6);
    return visibleProfiles
      .filter((p) => p.username.toLowerCase().includes(q) || p.full_name.toLowerCase().includes(q))
      .slice(0, 6);
  }

  public extractMentions(text: string): string[] {
    if (!text) return [];
    const matches = text.match(/@([a-zA-Z0-9._]+)/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.replace('@', '').toLowerCase())));
  }

  public notifyMentions(text: string, context: { type: 'post' | 'comment'; targetId: string; mediaUrl?: string }) {
    const usernames = this.extractMentions(text);
    if (usernames.length === 0) return;
    const activeProfile = this.getActiveProfile();

    usernames.forEach((username) => {
      const targetProfile = this.getProfileByUsername(username);
      if (targetProfile && targetProfile.id !== activeProfile.id) {
        this.addNotification({
          recipient_profile_id: targetProfile.id,
          actor_profile: activeProfile,
          type: 'mention',
          content: context.type === 'post'
            ? 'marcou você em uma publicação.'
            : 'marcou você em um comentário.',
          target_id: context.targetId,
          target_media_url: context.mediaUrl
        });
      }
    });
  }

  public deleteProfile(profileId: string): { success: boolean; remainingCount: number } {
    const currentGoogleUser = getStoredGoogleUser();
    if (!currentGoogleUser) return { success: false, remainingCount: 0 };

    const currentUid = currentGoogleUser.google_id;
    const currentEmail = currentGoogleUser.email?.toLowerCase();
    const isAdmin = isAppAdmin(currentEmail);

    const profileToDelete = this.state.profiles.find((p) => p.id === profileId);
    if (!profileToDelete) {
      return { success: false, remainingCount: this.getProfiles().length };
    }

    const isOwner = (currentUid && profileToDelete.user_id === currentUid) || (currentEmail && profileToDelete.google_email?.toLowerCase() === currentEmail);
    if (!isOwner && !isAdmin) {
      console.warn('Bloqueado: Não é permitido excluir o perfil de outro usuário.');
      return { success: false, remainingCount: this.getProfiles().length };
    }

    // 1. Remove profile from list
    this.state.profiles = this.state.profiles.filter((p) => p.id !== profileId);

    // 2. Remove posts created by this profile
    this.state.posts = this.state.posts.filter((p) => p.profile_id !== profileId);

    // 3. Remove stories created by this profile
    this.state.stories = this.state.stories.filter((s) => s.profile_id !== profileId);

    // 4. Remove reels created by this profile
    this.state.reels = this.state.reels.filter((r) => r.profile_id !== profileId);

    // 5. Remove followers/following relations
    this.state.followers = this.state.followers.filter(
      (f) => f.follower_id !== profileId && f.following_id !== profileId
    );

    // 6. Clean notifications
    this.state.notifications = this.state.notifications.filter(
      (n) => n.recipient_profile_id !== profileId && n.actor_profile?.id !== profileId
    );

    // 7. If the deleted profile was the active one, switch to another profile belonging to this account
    const remainingMyProfiles = this.getProfiles();
    if (this.state.activeProfileId === profileId) {
      this.state.activeProfileId = remainingMyProfiles.length > 0 ? remainingMyProfiles[0].id : '';
    }

    // 8. Save state
    if (currentGoogleUser) {
      const userKey = currentGoogleUser.google_id || currentGoogleUser.email?.toLowerCase();
      if (userKey) {
        try {
          localStorage.setItem('rpg_profiles_' + userKey, JSON.stringify(remainingMyProfiles));
        } catch {}
      }
    }
    this.saveState();

    // 9. Sync deletion with Supabase if connected
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(supabase.from('profiles').delete().eq('id', profileId)).catch(() => {});
      Promise.resolve(supabase.from('posts').delete().eq('profile_id', profileId)).catch(() => {});
      Promise.resolve(supabase.from('stories').delete().eq('profile_id', profileId)).catch(() => {});
      Promise.resolve(supabase.from('reels').delete().eq('profile_id', profileId)).catch(() => {});
    }

    return { success: true, remainingCount: remainingMyProfiles.length };
  }

  // --- FOLLOW SYSTEM ---
  public isFollowing(targetProfileId: string, followerId?: string): boolean {
    const activeId = followerId || this.state.activeProfileId;
    if (!activeId || !targetProfileId) return false;
    const activeProf = this.state.profiles.find((p) => p.id === activeId || p.username === activeId) || this.getActiveProfile();
    const targetProf = this.state.profiles.find((p) => p.id === targetProfileId || p.username === targetProfileId);
    if (!activeProf || !targetProf) return false;
    if (activeProf.id === targetProf.id || activeProf.username.toLowerCase() === targetProf.username.toLowerCase()) return false;

    return this.state.followers.some(
      (f) => f.follower_id === activeProf.id && f.following_id === targetProf.id
    );
  }

  public sanitizeFollowers() {
    if (!this.state.profiles || this.state.profiles.length === 0) {
      this.state.followers = [];
      return;
    }

    const seen = new Set<string>();
    const cleanFollowers: FollowerRelation[] = [];

    // Filtra apenas relações válidas entre perfis existentes reais
    for (const f of this.state.followers || []) {
      if (!f.follower_id || !f.following_id) continue;
      if (f.follower_id === f.following_id) continue;

      const followerProf = this.state.profiles.find(
        (p) => p.id === f.follower_id || (p.username && p.username.toLowerCase() === f.follower_id.toLowerCase())
      );
      const followingProf = this.state.profiles.find(
        (p) => p.id === f.following_id || (p.username && p.username.toLowerCase() === f.following_id.toLowerCase())
      );

      // Regra obrigatória: Ambos os perfis DEVEM existir na lista de perfis do app
      if (followerProf && followingProf) {
        // Regra 1: O mesmo perfil NUNCA pode seguir a si mesmo
        if (
          followerProf.id === followingProf.id ||
          (followerProf.username &&
            followingProf.username &&
            followerProf.username.toLowerCase() === followingProf.username.toLowerCase())
        ) {
          continue;
        }

        // Normaliza para os IDs canônicos
        const normFollowerId = followerProf.id;
        const normFollowingId = followingProf.id;
        const key = `${normFollowerId}:${normFollowingId}`;

        if (!seen.has(key)) {
          seen.add(key);
          cleanFollowers.push({
            follower_id: normFollowerId,
            following_id: normFollowingId,
            created_at: f.created_at || new Date().toISOString()
          });
        }
      }
      // Relações órfãs (com perfis que não existem mais ou dados fantasmas) são descartadas automaticamente aqui
    }

    this.state.followers = cleanFollowers;

    // Recalcula contadores exatos para manter integridade matemática absoluta
    const maxPossibleFollowers = Math.max(0, this.state.profiles.length - 1);
    for (const p of this.state.profiles || []) {
      const actualFollowers = this.state.followers.filter(
        (f) => f.following_id === p.id && f.follower_id !== p.id
      ).length;
      const actualFollowing = this.state.followers.filter(
        (f) => f.follower_id === p.id && f.following_id !== p.id
      ).length;

      p.followers_count = Math.min(actualFollowers, maxPossibleFollowers);
      p.following_count = Math.min(actualFollowing, maxPossibleFollowers);
    }
  }

  public sanitizePostAuthors() {
    const activeProfile = this.getActiveProfile();
    for (const post of this.state.posts || []) {
      if (!post) continue;
      if (post.profile_id) {
        const correctAuthor = this.state.profiles.find((p) => p.id === post.profile_id);
        if (correctAuthor) {
          post.profile = correctAuthor;
        } else if (activeProfile && post.profile_id !== activeProfile.id && post.profile?.id === activeProfile.id) {
          // Desassocia do perfil ativo caso o post pertença a outro profile_id
          post.profile = {
            id: post.profile_id,
            user_id: post.profile_id,
            username: 'aventureiro',
            full_name: 'Aventureiro',
            avatar_url: '',
            bio: '',
            profile_type: 'pessoal',
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
            created_at: post.created_at || new Date().toISOString(),
            verified: false
          };
        }
      }
    }
  }

  public recalculateProfileCounts() {
    for (const p of this.state.profiles || []) {
      p.posts_count = (this.state.posts || []).filter((post) => post.profile_id === p.id).length;
    }
  }

  public toggleFollow(targetProfileId: string) {
    const activeProfile = this.getActiveProfile();
    const activeId = activeProfile?.id;
    if (!activeId || !targetProfileId) return;

    const targetProfile = this.state.profiles.find((p) => p.id === targetProfileId || p.username === targetProfileId);
    if (!targetProfile) return;

    const targetId = targetProfile.id;

    // Regra 1: O mesmo perfil NÃO pode seguir a si mesmo
    if (activeId === targetId || (activeProfile && targetProfile && activeProfile.username.toLowerCase() === targetProfile.username.toLowerCase())) {
      console.warn('Bloqueado: O mesmo perfil não pode seguir a si mesmo.');
      return;
    }

    const currentlyFollowing = this.isFollowing(targetId, activeId);

    // 1. ATUALIZAÇÃO OTIMISTA INSTANTÂNEA NO ESTADO LOCAL (ZERO ATRASO / 0ms)
    if (currentlyFollowing) {
      this.state.followers = this.state.followers.filter(
        (f) => !(f.follower_id === activeProfile.id && f.following_id === targetProfile.id)
      );
    } else {
      // Remove duplicatas preventivamente antes de adicionar
      this.state.followers = this.state.followers.filter(
        (f) => !(f.follower_id === activeProfile.id && f.following_id === targetProfile.id)
      );
      this.state.followers.push({
        follower_id: activeProfile.id,
        following_id: targetProfile.id,
        created_at: new Date().toISOString()
      });
    }

    // Atualiza contadores imediatamente no perfil ativo e no perfil alvo
    this.sanitizeFollowers();
    this.saveState(); // Notifica React na mesma hora sem nenhum delay!

    // 2. SINCRONIZAÇÃO EM SEGUNDO PLANO COM SUPABASE (Não bloqueia a UI nem o clique)
    (async () => {
      try {
        await this.saveProfileToSupabase(activeProfile);
        await this.saveProfileToSupabase(targetProfile);

        const supabase = getSupabaseClient();
        if (!supabase) return;

        if (currentlyFollowing) {
          const { error } = await supabase.from('followers').delete().match({
            follower_id: activeProfile.id,
            following_id: targetProfile.id
          });
          if (error) console.warn('Aviso ao remover seguidor no Supabase:', error);
        } else {
          const { error } = await supabase.from('followers').upsert({
            follower_id: activeProfile.id,
            following_id: targetProfile.id,
            created_at: new Date().toISOString()
          }, { onConflict: 'follower_id,following_id' });
          if (error) console.warn('Aviso ao persistir seguidor no Supabase:', error);

          this.addNotification({
            recipient_profile_id: targetProfile.id,
            actor_profile: activeProfile,
            type: 'follow',
            content: 'começou a seguir você.'
          });
        }
      } catch (err) {
        console.warn('Erro ao persistir seguidor no Supabase em segundo plano:', err);
      }
    })();
  }

  public getFollowers(profileId: string): Profile[] {
    const currentGoogleUser = getStoredGoogleUser();
    const isAdmin = isAppAdmin(currentGoogleUser?.email);
    const targetProf = this.state.profiles.find((p) => p.id === profileId || p.username === profileId);
    if (!targetProf) return [];

    const targetId = targetProf.id;
    const targetUsername = targetProf.username.toLowerCase();

    const followerIds = new Set(
      this.state.followers
        .filter((f) => f.following_id === targetId && f.follower_id !== targetId)
        .map((f) => f.follower_id)
    );

    return this.state.profiles.filter((p) => {
      // O próprio perfil NUNCA pode estar em sua lista de seguidores
      if (p.id === targetId || p.username.toLowerCase() === targetUsername) return false;
      if (!isAdmin && p.google_email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return false;
      return followerIds.has(p.id);
    });
  }

  public getFollowing(profileId: string): Profile[] {
    const currentGoogleUser = getStoredGoogleUser();
    const isAdmin = isAppAdmin(currentGoogleUser?.email);
    const targetProf = this.state.profiles.find((p) => p.id === profileId || p.username === profileId);
    if (!targetProf) return [];

    const targetId = targetProf.id;
    const targetUsername = targetProf.username.toLowerCase();

    const followingIds = new Set(
      this.state.followers
        .filter((f) => f.follower_id === targetId && f.following_id !== targetId)
        .map((f) => f.following_id)
    );

    return this.state.profiles.filter((p) => {
      // O próprio perfil NUNCA pode estar em sua lista de seguindo
      if (p.id === targetId || p.username.toLowerCase() === targetUsername) return false;
      if (!isAdmin && p.google_email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return false;
      return followingIds.has(p.id);
    });
  }

  // --- POSTS ---
  public getPosts(): Post[] {
    const currentGoogleUser = getStoredGoogleUser();
    const isAdmin = isAppAdmin(currentGoogleUser?.email);
    if (isAdmin) {
      return this.state.posts || [];
    }
    return (this.state.posts || []).filter(
      (p) => p && p.profile?.google_email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
    );
  }

  public async createPost(data: {
    media_url: string;
    media_type: 'image' | 'video';
    caption: string;
    location?: string;
    youtube_track?: YoutubeTrack;
  }): Promise<Post> {
    const activeProfile = this.getActiveProfile() || this.state.profiles[0];

    // Aplica exatamente a mesma lógica e conversão da foto de perfil:
    // Converte o arquivo bruto ou link temporário (blob:/File) para Base64 Data URL permanente via FileReader
    const finalMediaUrl = await convertToPermanentDataUrl(data.media_url);

    // Ensure active profile ID is a valid UUID and exists in Supabase before creating post
    if (activeProfile) {
      if (!isValidUUID(activeProfile.id)) {
        const oldId = activeProfile.id;
        const validId = generateUUID();
        activeProfile.id = validId;
        this.state.profiles.forEach((p) => {
          if (p.id === oldId) p.id = validId;
        });
        if (this.state.activeProfileId === oldId) {
          this.state.activeProfileId = validId;
        }
      }
      await this.saveProfileToSupabase(activeProfile);
    }

    const newPost: Post = {
      id: generateUUID(),
      profile_id: activeProfile?.id || generateUUID(),
      profile: activeProfile,
      media_url: finalMediaUrl,
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
    imageCache.set(`post_${newPost.id}`, newPost.media_url);
    imageCache.set(newPost.media_url, newPost.media_url);
    this.recalculateProfileCounts();
    this.notifyMentions(data.caption, {
      type: 'post',
      targetId: newPost.id,
      mediaUrl: newPost.media_url
    });
    this.saveState();

    // Persist post and its author profile to Supabase SQL tables
    await this.savePostToSupabase(newPost);

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
    const savedIds = Array.isArray(this.state.savedPostIds) ? this.state.savedPostIds : [];
    return (this.state.posts || []).filter((p) => p && savedIds.includes(p.id));
  }

  public repostPost(originalPostId: string, quoteCaption?: string): Post | null {
    const originalPost = (this.state.posts || []).find((p) => p && p.id === originalPostId);
    if (!originalPost) return null;

    const activeProfile = this.getActiveProfile();
    if (!activeProfile) return null;
    const targetPost = originalPost.repost_of || originalPost;

    // Check if current user already reposted this post
    const existingIndex = (this.state.posts || []).findIndex(
      (p) => p && p.profile_id === activeProfile.id && p.repost_of?.id === targetPost.id
    );

    if (existingIndex >= 0 && !quoteCaption) {
      // Toggle off / undo repost
      this.state.posts.splice(existingIndex, 1);
      targetPost.reposts_count = Math.max(0, (targetPost.reposts_count || 1) - 1);
      targetPost.is_reposted = false;
      this.saveState();
      return null;
    }

    targetPost.reposts_count = (targetPost.reposts_count || 0) + 1;
    targetPost.is_reposted = true;

    const newRepostPost: Post = {
      id: `repost-${Date.now()}`,
      profile_id: activeProfile.id,
      profile: activeProfile,
      media_url: targetPost.media_url,
      media_type: targetPost.media_type,
      caption: quoteCaption || targetPost.caption,
      repost_caption: quoteCaption || undefined,
      repost_of: targetPost,
      location: targetPost.location,
      youtube_track: targetPost.youtube_track,
      likes_count: 0,
      comments_count: 0,
      reposts_count: 0,
      is_liked: false,
      is_saved: false,
      is_reposted: true,
      created_at: new Date().toISOString(),
      comments: []
    };

    this.state.posts.unshift(newRepostPost);

    if (targetPost.profile_id !== activeProfile.id) {
      this.addNotification({
        recipient_profile_id: targetPost.profile_id,
        actor_profile: activeProfile,
        type: 'repost',
        content: quoteCaption
          ? `republicou seu post com comentário: "${quoteCaption.substring(0, 30)}..."`
          : 'republicou a sua publicação.',
        target_id: targetPost.id,
        target_media_url: targetPost.media_url
      });
    }

    this.saveState();
    return newRepostPost;
  }

  public isPostRepostedByMe(postId: string): boolean {
    const activeProfile = this.getActiveProfile();
    const targetPost = this.state.posts.find((p) => p.id === postId);
    const targetId = targetPost?.repost_of?.id || postId;
    return this.state.posts.some(
      (p) => p.profile_id === activeProfile.id && (p.repost_of?.id === targetId)
    );
  }

  public repostPostToStory(postId: string): Story | null {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return null;

    const targetPost = post.repost_of || post;
    const activeProfile = this.getActiveProfile();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const newStory: Story = {
      id: `story-repost-${Date.now()}`,
      profile_id: activeProfile.id,
      profile: activeProfile,
      media_url: targetPost.media_url,
      media_type: targetPost.media_type,
      youtube_track: targetPost.youtube_track,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      viewed: false,
      repost_of_post: targetPost
    };

    this.state.stories.unshift(newStory);

    if (targetPost.profile_id !== activeProfile.id) {
      this.addNotification({
        recipient_profile_id: targetPost.profile_id,
        actor_profile: activeProfile,
        type: 'repost',
        content: 'compartilhou a sua publicação no Story.',
        target_id: targetPost.id,
        target_media_url: targetPost.media_url
      });
    }

    this.saveState();
    return newStory;
  }

  public repostStoryToStory(storyId: string): Story | null {
    const story = this.state.stories.find((s) => s.id === storyId);
    if (!story) return null;

    const activeProfile = this.getActiveProfile();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const newStory: Story = {
      id: `story-repost-${Date.now()}`,
      profile_id: activeProfile.id,
      profile: activeProfile,
      media_url: story.media_url,
      media_type: story.media_type,
      youtube_track: story.youtube_track,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      viewed: false,
      repost_of_story: story
    };

    this.state.stories.unshift(newStory);

    if (story.profile_id !== activeProfile.id) {
      this.addNotification({
        recipient_profile_id: story.profile_id,
        actor_profile: activeProfile,
        type: 'repost',
        content: 'republicou o seu story.',
        target_id: story.id,
        target_media_url: story.media_url
      });
    }

    this.saveState();
    return newStory;
  }

  // --- CHAT WALLPAPERS (Per-Profile, Per-Chat) ---
  public getChatWallpaper(chatId: string, profileId?: string): string | null {
    if (!chatId) return null;
    const activeProf = profileId ? this.state.profiles.find((p) => p.id === profileId) : this.getActiveProfile();
    const pid = activeProf?.id;
    if (!pid) return null;

    try {
      const stored = localStorage.getItem('rpg_wallpapers_v1');
      if (stored) {
        const map = JSON.parse(stored);
        if (map[`${pid}_${chatId}`]) {
          return map[`${pid}_${chatId}`];
        }
        if (map[`${pid}_default`]) {
          return map[`${pid}_default`];
        }
      }
    } catch {}
    return null;
  }

  public setChatWallpaper(
    chatId: string,
    wallpaperUrl: string | null,
    applyToAll: boolean = false,
    profileId?: string
  ): void {
    if (!chatId) return;
    const activeProf = profileId ? this.state.profiles.find((p) => p.id === profileId) : this.getActiveProfile();
    const pid = activeProf?.id;
    if (!pid) return;

    try {
      const stored = localStorage.getItem('rpg_wallpapers_v1');
      const map: Record<string, string> = stored ? JSON.parse(stored) : {};

      const key = `${pid}_${chatId}`;
      if (!wallpaperUrl) {
        delete map[key];
        if (applyToAll) {
          delete map[`${pid}_default`];
        }
      } else {
        map[key] = wallpaperUrl;
        if (applyToAll) {
          map[`${pid}_default`] = wallpaperUrl;
        }
      }
      localStorage.setItem('rpg_wallpapers_v1', JSON.stringify(map));
      this.notify();
    } catch (e) {
      console.warn('Erro ao salvar papel de parede:', e);
    }
  }

  public deletePost(postId: string, requestingProfileId?: string): boolean {
    const activeProfile = this.getActiveProfile();
    const requesterId = requestingProfileId || activeProfile?.id;
    const index = this.state.posts.findIndex((p) => p.id === postId);
    if (index === -1) return false;

    const post = this.state.posts[index];
    const isOwner = 
      (requesterId && post.profile_id === requesterId) ||
      (activeProfile && post.profile_id === activeProfile.id) ||
      (activeProfile && post.profile && post.profile.id === activeProfile.id) ||
      (activeProfile && post.profile && post.profile.username && activeProfile.username && post.profile.username.toLowerCase() === activeProfile.username.toLowerCase()) ||
      (activeProfile && post.profile_id === activeProfile.username);

    // Só o usuário que publicou pode deletar!
    if (!isOwner) {
      console.warn('Apenas o autor que publicou o post tem permissão para excluí-lo.');
      return false;
    }

    this.state.posts.splice(index, 1);
    this.state.savedPostIds = this.state.savedPostIds.filter((id) => id !== postId);
    this.recalculateProfileCounts();

    this.saveState();

    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(supabase.from('posts').delete().eq('id', postId)).catch(() => {});
    }

    return true;
  }

  public deleteReel(reelId: string, requestingProfileId?: string): boolean {
    const activeProfile = this.getActiveProfile();
    const requesterId = requestingProfileId || activeProfile?.id;
    const reel = this.state.reels.find((r) => r.id === reelId);
    if (!reel) return false;

    const isOwner = 
      (requesterId && reel.profile_id === requesterId) ||
      (activeProfile && reel.profile_id === activeProfile.id) ||
      (activeProfile && reel.profile && reel.profile.id === activeProfile.id) ||
      (activeProfile && reel.profile && reel.profile.username && activeProfile.username && reel.profile.username.toLowerCase() === activeProfile.username.toLowerCase()) ||
      (activeProfile && reel.profile_id === activeProfile.username);

    // Só o usuário que publicou pode deletar!
    if (!isOwner) {
      console.warn('Apenas o autor que publicou o curta tem permissão para excluí-lo.');
      return false;
    }

    this.state.reels = this.state.reels.filter((r) => r.id !== reelId);
    this.saveState();
    return true;
  }

  public deleteStory(storyId: string, requestingProfileId?: string): boolean {
    const activeProfile = this.getActiveProfile();
    const requesterId = requestingProfileId || activeProfile?.id;
    const story = this.state.stories.find((s) => s.id === storyId);
    if (!story) return false;

    const isOwner = 
      (requesterId && story.profile_id === requesterId) ||
      (activeProfile && story.profile_id === activeProfile.id) ||
      (activeProfile && story.profile && story.profile.id === activeProfile.id) ||
      (activeProfile && story.profile && story.profile.username && activeProfile.username && story.profile.username.toLowerCase() === activeProfile.username.toLowerCase()) ||
      (activeProfile && story.profile_id === activeProfile.username);

    // Só o usuário que publicou pode deletar!
    if (!isOwner) {
      console.warn('Apenas o autor que publicou o story tem permissão para excluí-lo.');
      return false;
    }

    this.state.stories = this.state.stories.filter((s) => s.id !== storyId);
    this.saveState();
    return true;
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

    this.notifyMentions(text, {
      type: 'comment',
      targetId: post.id,
      mediaUrl: post.media_url
    });

    this.saveState();
  }

  // --- STORIES & STORY REACTIONS ---
  public getStories(): Story[] {
    const currentGoogleUser = getStoredGoogleUser();
    const isAdmin = isAppAdmin(currentGoogleUser?.email);
    const nowIso = new Date().toISOString();
    return (this.state.stories || []).filter((story) => {
      if (!story) return false;
      // Outras contas não podem ver a conta logada com cedrico124i@gmail.com
      if (!isAdmin && story.profile?.google_email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return false;
      }
      // Stories possuem limite automático de 24 horas (caso o autor não delete antes)
      if (story.expires_at) {
        return story.expires_at > nowIso;
      }
      const createdTime = new Date(story.created_at).getTime();
      if (!isNaN(createdTime)) {
        return Date.now() - createdTime < 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }

  public async createStory(data: {
    media_url: string;
    media_type: 'image' | 'video';
    youtube_track?: YoutubeTrack;
  }): Promise<Story> {
    const activeProfile = this.getActiveProfile() || this.state.profiles[0];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const finalMediaUrl = await convertToPermanentDataUrl(data.media_url);

    const newStory: Story = {
      id: generateUUID(),
      profile_id: activeProfile?.id || generateUUID(),
      profile: activeProfile,
      media_url: finalMediaUrl,
      media_type: data.media_type,
      youtube_track: data.youtube_track,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      viewed: false
    };

    this.state.stories.unshift(newStory);
    imageCache.set(`story_${newStory.id}`, newStory.media_url);
    imageCache.set(newStory.media_url, newStory.media_url);
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
    const currentGoogleUser = getStoredGoogleUser();
    const isAdmin = isAppAdmin(currentGoogleUser?.email);
    if (isAdmin) {
      return this.state.reels || [];
    }
    return (this.state.reels || []).filter(
      (r) => r && r.profile?.google_email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
    );
  }

  public async createReel(data: {
    video_url: string;
    caption: string;
    youtube_track?: YoutubeTrack;
  }): Promise<Reel> {
    const activeProfile = this.getActiveProfile() || this.state.profiles[0];
    const finalMediaUrl = await convertToPermanentDataUrl(data.video_url);

    const newReel: Reel = {
      id: generateUUID(),
      profile_id: activeProfile?.id || generateUUID(),
      profile: activeProfile,
      video_url: finalMediaUrl,
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
        content: 'curtiu o seu Curta.',
        target_id: reel.id
      });
    }

    this.saveState();
  }

  // --- DIRECT MESSAGES & GROUPS ---
  public getChats(): Chat[] {
    const activeId = this.state.activeProfileId;
    if (!this.state.chats || !Array.isArray(this.state.chats)) return [];
    return this.state.chats.filter((c) =>
      c && Array.isArray(c.participants) && c.participants.some((p) => p && p.id === activeId)
    );
  }

  public getOrCreateDirectChat(targetProfileId: string): Chat {
    const activeProfile = this.getActiveProfile();
    const targetProfile = this.state.profiles.find((p) => p && p.id === targetProfileId);

    if (!activeProfile) throw new Error('É necessário ter um perfil ativo para iniciar uma conversa.');
    if (!targetProfile) throw new Error('Perfil de destino não encontrado.');

    // Look for existing 1-on-1 chat
    const existing = (this.state.chats || []).find(
      (c) =>
        c &&
        !c.is_group &&
        Array.isArray(c.participants) &&
        c.participants.length === 2 &&
        c.participants.some((p) => p && p.id === activeProfile.id) &&
        c.participants.some((p) => p && p.id === targetProfileId)
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

  public createGroupChat(
    name: string,
    memberProfileIds: string[],
    avatarUrl?: string,
    communityId?: string,
    isAnnouncement?: boolean
  ): Chat {
    const activeProfile = this.getActiveProfile();
    const selectedProfiles = this.state.profiles.filter((p) => memberProfileIds.includes(p.id));
    const allParticipants = [activeProfile, ...selectedProfiles.filter((p) => p.id !== activeProfile.id)];

    const newGroup: Chat = {
      id: `chat-group-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      is_group: true,
      community_id: communityId,
      is_announcement: isAnnouncement,
      name: name || 'Novo Grupo',
      avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80',
      created_by: activeProfile.id,
      admin_ids: [activeProfile.id],
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

    if (communityId) {
      const comm = this.state.communities.find((c) => c.id === communityId);
      if (comm && !comm.group_ids.includes(newGroup.id)) {
        comm.group_ids.push(newGroup.id);
      }
    }

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

  // --- COMMUNITIES (COMUNIDADES COM MÚLTIPLOS GRUPOS) ---
  public getCommunities(): Community[] {
    const activeId = this.state.activeProfileId;
    if (!this.state.communities || !Array.isArray(this.state.communities)) return [];
    return this.state.communities.filter((c) =>
      c && (c.created_by === activeId || (Array.isArray(c.member_profile_ids) && c.member_profile_ids.includes(activeId)))
    );
  }

  public getCommunity(communityId: string): Community | undefined {
    return (this.state.communities || []).find((c) => c && c.id === communityId);
  }

  public getCommunityGroups(communityId: string): Chat[] {
    return (this.state.chats || []).filter((c) => c && c.community_id === communityId);
  }

  public createCommunity(data: {
    name: string;
    description: string;
    memberProfileIds: string[];
    avatarUrl?: string;
    initialGroupNames?: string[];
  }): { community: Community; defaultChat: Chat } {
    const activeProfile = this.getActiveProfile();
    const communityId = `comm-${Date.now()}`;
    const allMemberIds = Array.from(new Set([activeProfile.id, ...data.memberProfileIds]));

    const newCommunity: Community = {
      id: communityId,
      name: data.name.trim(),
      description: data.description.trim(),
      avatar_url: data.avatarUrl || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=300&auto=format&fit=crop&q=80',
      created_by: activeProfile.id,
      admin_ids: [activeProfile.id],
      created_at: new Date().toISOString(),
      member_profile_ids: allMemberIds,
      group_ids: []
    };

    if (!this.state.communities) {
      this.state.communities = [];
    }
    this.state.communities.unshift(newCommunity);

    // 1. Create default announcement group
    this.createGroupChat(
      `📢 Avisos - ${data.name.trim()}`,
      data.memberProfileIds,
      newCommunity.avatar_url,
      communityId,
      true
    );

    // 2. Create default general chat group
    const generalGroup = this.createGroupChat(
      `💬 Geral - ${data.name.trim()}`,
      data.memberProfileIds,
      newCommunity.avatar_url,
      communityId,
      false
    );

    // 3. Create any custom initial groups
    if (data.initialGroupNames && data.initialGroupNames.length > 0) {
      data.initialGroupNames.forEach((groupName) => {
        if (groupName.trim()) {
          this.createGroupChat(
            groupName.trim(),
            data.memberProfileIds,
            newCommunity.avatar_url,
            communityId,
            false
          );
        }
      });
    }

    // Notify members about community creation
    data.memberProfileIds.forEach((pid) => {
      if (pid !== activeProfile.id) {
        this.addNotification({
          recipient_profile_id: pid,
          actor_profile: activeProfile,
          type: 'direct_message',
          content: `adicionou você à comunidade "${data.name.trim()}".`,
          target_id: generalGroup.id
        });
      }
    });

    this.saveState();
    return { community: newCommunity, defaultChat: generalGroup };
  }

  public isGroupAdmin(chatId: string, profileId?: string): boolean {
    const chat = this.state.chats.find((c) => c.id === chatId);
    if (!chat || !chat.is_group) return false;
    const checkId = profileId || this.state.activeProfileId;
    if (chat.created_by === checkId) return true;
    if (chat.admin_ids && chat.admin_ids.includes(checkId)) return true;
    if (chat.members?.some((m) => m.profile_id === checkId && m.role === 'admin')) return true;
    if (chat.community_id) {
      const comm = this.getCommunity(chat.community_id);
      if (comm && (comm.created_by === checkId || (comm.admin_ids && comm.admin_ids.includes(checkId)))) {
        return true;
      }
    }
    return false;
  }

  public isGroupCreator(chatId: string, profileId?: string): boolean {
    const chat = this.state.chats.find((c) => c.id === chatId);
    if (!chat || !chat.is_group) return false;
    const checkId = profileId || this.state.activeProfileId;
    return chat.created_by === checkId;
  }

  public isCommunityCreator(communityId: string, profileId?: string): boolean {
    const comm = this.getCommunity(communityId);
    if (!comm) return false;
    const checkId = profileId || this.state.activeProfileId;
    return comm.created_by === checkId;
  }

  public toggleGroupAdmin(chatId: string, targetProfileId: string): { success: boolean; isNowAdmin: boolean } {
    const chat = this.state.chats.find((c) => c.id === chatId);
    if (!chat || !chat.is_group) return { success: false, isNowAdmin: false };

    const activeProfile = this.getActiveProfile();
    const isCallerAdmin = this.isGroupAdmin(chatId, activeProfile.id);
    const isCallerCreator = chat.created_by === activeProfile.id;

    if (!isCallerAdmin && !isCallerCreator) {
      return { success: false, isNowAdmin: false };
    }

    if (targetProfileId === chat.created_by) {
      return { success: false, isNowAdmin: true };
    }

    if (!chat.admin_ids) {
      chat.admin_ids = chat.created_by ? [chat.created_by] : [];
    }

    const currentlyAdmin =
      chat.admin_ids.includes(targetProfileId) ||
      chat.members?.some((m) => m.profile_id === targetProfileId && m.role === 'admin');

    const isNowAdmin = !currentlyAdmin;

    if (isNowAdmin) {
      if (!chat.admin_ids.includes(targetProfileId)) {
        chat.admin_ids.push(targetProfileId);
      }
    } else {
      chat.admin_ids = chat.admin_ids.filter((id) => id !== targetProfileId);
    }

    if (chat.members) {
      const mem = chat.members.find((m) => m.profile_id === targetProfileId);
      if (mem) {
        mem.role = isNowAdmin ? 'admin' : 'member';
      }
    }

    const targetUser = this.state.profiles.find((p) => p.id === targetProfileId);
    const targetName = targetUser?.full_name || 'Um membro';

    const actionText = isNowAdmin
      ? `🛡️ ${activeProfile.full_name} promoveu ${targetName} a administrador(a) do grupo.`
      : `ℹ️ ${activeProfile.full_name} removeu os privilégios de administrador de ${targetName}.`;

    const sysMsg: DirectMessage = {
      id: `msg-sys-${Date.now()}`,
      chat_id: chat.id,
      sender_id: activeProfile.id,
      sender_profile: activeProfile,
      text: actionText,
      created_at: new Date().toISOString(),
      is_read: true
    };
    if (!this.state.messages[chat.id]) {
      this.state.messages[chat.id] = [];
    }
    this.state.messages[chat.id].push(sysMsg);
    chat.last_message = {
      text: actionText,
      sender_id: activeProfile.id,
      sender_name: activeProfile.full_name,
      created_at: sysMsg.created_at
    };
    chat.updated_at = new Date().toISOString();

    this.addNotification({
      recipient_profile_id: targetProfileId,
      actor_profile: activeProfile,
      type: 'direct_message',
      content: isNowAdmin
        ? `promoveu você a Administrador(a) do grupo "${chat.name}".`
        : `removeu seus privilégios de Administrador no grupo "${chat.name}".`,
      target_id: chat.id
    });

    this.saveState();
    return { success: true, isNowAdmin };
  }

  public toggleCommunityAdmin(communityId: string, targetProfileId: string): { success: boolean; isNowAdmin: boolean } {
    const comm = this.getCommunity(communityId);
    if (!comm) return { success: false, isNowAdmin: false };

    const activeProfile = this.getActiveProfile();
    const isCallerCreator = comm.created_by === activeProfile.id;
    const isCallerAdmin = this.isCommunityAdmin(communityId, activeProfile.id);

    if (!isCallerCreator && !isCallerAdmin) {
      return { success: false, isNowAdmin: false };
    }

    if (targetProfileId === comm.created_by) {
      return { success: false, isNowAdmin: true };
    }

    if (!comm.admin_ids) {
      comm.admin_ids = comm.created_by ? [comm.created_by] : [];
    }

    const currentlyAdmin = comm.admin_ids.includes(targetProfileId);
    const isNowAdmin = !currentlyAdmin;

    if (isNowAdmin) {
      comm.admin_ids.push(targetProfileId);
    } else {
      comm.admin_ids = comm.admin_ids.filter((id) => id !== targetProfileId);
    }

    // Sync admin permission to community groups
    const communityGroups = this.getCommunityGroups(communityId);
    communityGroups.forEach((group) => {
      if (!group.admin_ids) group.admin_ids = group.created_by ? [group.created_by] : [];
      if (isNowAdmin) {
        if (!group.admin_ids.includes(targetProfileId)) {
          group.admin_ids.push(targetProfileId);
        }
        if (group.members) {
          const gm = group.members.find((m) => m.profile_id === targetProfileId);
          if (gm) gm.role = 'admin';
        }
      } else {
        group.admin_ids = group.admin_ids.filter((id) => id !== targetProfileId);
        if (group.members) {
          const gm = group.members.find((m) => m.profile_id === targetProfileId);
          if (gm) gm.role = 'member';
        }
      }
    });

    this.addNotification({
      recipient_profile_id: targetProfileId,
      actor_profile: activeProfile,
      type: 'direct_message',
      content: isNowAdmin
        ? `promoveu você a Administrador(a) da comunidade "${comm.name}".`
        : `removeu seus privilégios de Administrador na comunidade "${comm.name}".`,
      target_id: comm.id
    });

    this.saveState();
    return { success: true, isNowAdmin };
  }

  public isCommunityAdmin(communityId: string, profileId?: string): boolean {
    const comm = this.getCommunity(communityId);
    if (!comm) return false;
    const checkId = profileId || this.state.activeProfileId;
    return comm.created_by === checkId || (comm.admin_ids || []).includes(checkId);
  }

  public addGroupMembers(chatId: string, profileIds: string[]): boolean {
    const chat = this.state.chats.find((c) => c.id === chatId);
    if (!chat || !chat.is_group) return false;

    const activeProfile = this.getActiveProfile();
    if (!this.isGroupAdmin(chatId, activeProfile.id)) {
      return false;
    }

    const newProfiles = this.state.profiles.filter(
      (p) => profileIds.includes(p.id) && !chat.participants.some((cp) => cp.id === p.id)
    );
    if (newProfiles.length === 0) return false;

    chat.participants.push(...newProfiles);
    if (!chat.members) chat.members = [];
    newProfiles.forEach((p) => {
      chat.members!.push({
        profile_id: p.id,
        profile: p,
        role: 'member',
        joined_at: new Date().toISOString()
      });
    });

    if (chat.community_id) {
      const comm = this.getCommunity(chat.community_id);
      if (comm) {
        newProfiles.forEach((p) => {
          if (!comm.member_profile_ids.includes(p.id)) {
            comm.member_profile_ids.push(p.id);
          }
        });
      }
    }

    const names = newProfiles.map((p) => p.full_name).join(', ');
    const sysMsg: DirectMessage = {
      id: `msg-sys-${Date.now()}`,
      chat_id: chat.id,
      sender_id: activeProfile.id,
      sender_profile: activeProfile,
      text: `➕ ${activeProfile.full_name} adicionou ${names} ao grupo.`,
      created_at: new Date().toISOString(),
      is_read: true
    };
    if (!this.state.messages[chat.id]) {
      this.state.messages[chat.id] = [];
    }
    this.state.messages[chat.id].push(sysMsg);
    chat.last_message = {
      text: sysMsg.text,
      sender_id: activeProfile.id,
      sender_name: activeProfile.full_name,
      created_at: sysMsg.created_at
    };
    chat.updated_at = new Date().toISOString();

    newProfiles.forEach((p) => {
      this.addNotification({
        recipient_profile_id: p.id,
        actor_profile: activeProfile,
        type: 'direct_message',
        content: `adicionou você ao grupo "${chat.name}".`,
        target_id: chat.id
      });
    });

    this.saveState();
    return true;
  }

  public removeGroupMember(chatId: string, memberProfileId: string): boolean {
    const chat = this.state.chats.find((c) => c.id === chatId);
    if (!chat || !chat.is_group) return false;

    const activeProfile = this.getActiveProfile();
    const isSelf = memberProfileId === activeProfile.id;
    const isAdmin = this.isGroupAdmin(chatId, activeProfile.id);

    if (!isAdmin && !isSelf) {
      return false;
    }

    if (memberProfileId === chat.created_by && !isSelf) {
      return false;
    }

    const removedProfile = this.state.profiles.find((p) => p.id === memberProfileId) || chat.participants.find((p) => p.id === memberProfileId);
    chat.participants = chat.participants.filter((p) => p.id !== memberProfileId);
    if (chat.members) {
      chat.members = chat.members.filter((m) => m.profile_id !== memberProfileId);
    }
    if (chat.admin_ids) {
      chat.admin_ids = chat.admin_ids.filter((id) => id !== memberProfileId);
    }

    const memberName = removedProfile?.full_name || 'Um participante';
    const actionText = isSelf
      ? `🚪 ${memberName} saiu do grupo.`
      : `🚫 ${memberName} foi removido(a) do grupo por ${activeProfile.full_name}.`;

    const sysMsg: DirectMessage = {
      id: `msg-sys-${Date.now()}`,
      chat_id: chat.id,
      sender_id: activeProfile.id,
      sender_profile: activeProfile,
      text: actionText,
      created_at: new Date().toISOString(),
      is_read: true
    };
    if (!this.state.messages[chat.id]) {
      this.state.messages[chat.id] = [];
    }
    this.state.messages[chat.id].push(sysMsg);
    chat.last_message = {
      text: actionText,
      sender_id: activeProfile.id,
      sender_name: activeProfile.full_name,
      created_at: sysMsg.created_at
    };
    chat.updated_at = new Date().toISOString();

    if (!isSelf) {
      this.addNotification({
        recipient_profile_id: memberProfileId,
        actor_profile: activeProfile,
        type: 'direct_message',
        content: `removeu você do grupo "${chat.name}".`,
        target_id: chat.id
      });
    }

    this.saveState();
    return true;
  }

  public addCommunityMembers(communityId: string, profileIds: string[], addToAllGroups = true): boolean {
    const comm = this.getCommunity(communityId);
    if (!comm) return false;

    const activeProfile = this.getActiveProfile();
    if (!this.isCommunityAdmin(communityId, activeProfile.id)) {
      return false;
    }

    const newIds = profileIds.filter((id) => !comm.member_profile_ids.includes(id));
    if (newIds.length === 0) return false;

    comm.member_profile_ids.push(...newIds);

    if (addToAllGroups) {
      const communityGroups = this.getCommunityGroups(communityId);
      const newProfiles = this.state.profiles.filter((p) => newIds.includes(p.id));

      communityGroups.forEach((group) => {
        newProfiles.forEach((p) => {
          if (!group.participants.some((gp) => gp.id === p.id)) {
            group.participants.push(p);
            if (!group.members) group.members = [];
            group.members.push({
              profile_id: p.id,
              profile: p,
              role: 'member',
              joined_at: new Date().toISOString()
            });
          }
        });
      });
    }

    newIds.forEach((pid) => {
      this.addNotification({
        recipient_profile_id: pid,
        actor_profile: activeProfile,
        type: 'direct_message',
        content: `adicionou você à comunidade "${comm.name}".`,
        target_id: comm.id
      });
    });

    this.saveState();
    return true;
  }

  public removeCommunityMember(communityId: string, memberProfileId: string): boolean {
    const comm = this.getCommunity(communityId);
    if (!comm) return false;

    const activeProfile = this.getActiveProfile();
    const isSelf = memberProfileId === activeProfile.id;
    const isAdmin = this.isCommunityAdmin(communityId, activeProfile.id);

    if (!isAdmin && !isSelf) {
      return false;
    }

    if (memberProfileId === comm.created_by && !isSelf) {
      return false;
    }

    comm.member_profile_ids = comm.member_profile_ids.filter((id) => id !== memberProfileId);
    if (comm.admin_ids) {
      comm.admin_ids = comm.admin_ids.filter((id) => id !== memberProfileId);
    }

    // Also remove from all community groups
    const communityGroups = this.getCommunityGroups(communityId);
    communityGroups.forEach((group) => {
      group.participants = group.participants.filter((p) => p.id !== memberProfileId);
      if (group.members) {
        group.members = group.members.filter((m) => m.profile_id !== memberProfileId);
      }
      if (group.admin_ids) {
        group.admin_ids = group.admin_ids.filter((id) => id !== memberProfileId);
      }
    });

    if (!isSelf) {
      this.addNotification({
        recipient_profile_id: memberProfileId,
        actor_profile: activeProfile,
        type: 'direct_message',
        content: `removeu você da comunidade "${comm.name}" e de seus grupos.`,
        target_id: comm.id
      });
    }

    this.saveState();
    return true;
  }

  public deleteCommunity(communityId: string) {
    if (!this.state.communities) return;
    const index = this.state.communities.findIndex((c) => c.id === communityId);
    if (index !== -1) {
      this.state.communities.splice(index, 1);
      this.state.chats.forEach((c) => {
        if (c.community_id === communityId) {
          delete c.community_id;
        }
      });
      this.saveState();
    }
  }

  public getMessages(chatId: string): DirectMessage[] {
    return this.state.messages[chatId] || [];
  }

  public sendMessage(
    chatId: string,
    text: string,
    mediaUrl?: string,
    youtubeTrack?: YoutubeTrack,
    audioData?: { audio_url: string; duration?: number }
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
      media_type: audioData ? 'audio' : (mediaUrl ? 'image' : undefined),
      audio_url: audioData?.audio_url,
      audio_duration: audioData?.duration,
      youtube_track: youtubeTrack,
      created_at: new Date().toISOString(),
      is_read: false
    };

    if (!this.state.messages[chatId]) {
      this.state.messages[chatId] = [];
    }

    this.state.messages[chatId].push(newMsg);

    // Update Chat last message preview
    let previewText = text;
    if (audioData) {
      previewText = '🎙️ Mensagem de voz';
    } else if (mediaUrl && !text) {
      previewText = '📷 Foto';
    } else if (youtubeTrack && !text) {
      previewText = `🎵 ${youtubeTrack.title}`;
    }

    chat.last_message = {
      text: chat.is_group ? `${activeProfile.username}: ${previewText}` : previewText,
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
            ? `enviou no grupo ${chat.name}: ${previewText}`
            : `enviou: "${previewText.substring(0, 30)}"`,
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
    return (this.state.notifications || []).filter((n) => n && n.recipient_profile_id === activeId);
  }

  public getUnreadNotificationCount(): number {
    return this.getNotifications().filter((n) => n && !n.is_read).length;
  }

  public getUnreadChatCount(): number {
    return this.getChats().reduce((acc, chat) => acc + (chat?.unread_count || 0), 0);
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

  public deleteDirectMessage(chatId: string, messageId: string) {
    if (!this.state.messages[chatId]) return;
    this.state.messages[chatId] = this.state.messages[chatId].filter((m) => m.id !== messageId);

    const chat = this.state.chats.find((c) => c.id === chatId);
    if (chat) {
      const remaining = this.state.messages[chatId];
      if (remaining.length > 0) {
        const lastMsg = remaining[remaining.length - 1];
        let previewText = lastMsg.text;
        if (lastMsg.audio_url) previewText = '🎙️ Mensagem de voz';
        else if (lastMsg.media_url && !lastMsg.text) previewText = '📷 Foto';
        else if (lastMsg.youtube_track && !lastMsg.text) previewText = `🎵 ${lastMsg.youtube_track.title}`;

        chat.last_message = {
          text: chat.is_group ? `${lastMsg.sender_profile.username}: ${previewText}` : previewText,
          sender_id: lastMsg.sender_id,
          sender_name: lastMsg.sender_profile.full_name,
          created_at: lastMsg.created_at
        };
      } else {
        chat.last_message = undefined;
      }
    }
    this.saveState();
  }

  public clearChatMessages(chatId: string) {
    if (this.state.messages[chatId]) {
      this.state.messages[chatId] = [];
    }
    const chat = this.state.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.last_message = undefined;
    }
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
