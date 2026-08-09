import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default fallback values or read from localStorage / process.env
const SUPABASE_STORAGE_KEY_URL = 'instaconnect_supabase_url';
const SUPABASE_STORAGE_KEY_ANON = 'instaconnect_supabase_anon_key';

export function getStoredSupabaseCredentials() {
  const url = localStorage.getItem(SUPABASE_STORAGE_KEY_URL) || (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const anonKey = localStorage.getItem(SUPABASE_STORAGE_KEY_ANON) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (url) localStorage.setItem(SUPABASE_STORAGE_KEY_URL, url);
  else localStorage.removeItem(SUPABASE_STORAGE_KEY_URL);

  if (anonKey) localStorage.setItem(SUPABASE_STORAGE_KEY_ANON, anonKey);
  else localStorage.removeItem(SUPABASE_STORAGE_KEY_ANON);
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseCredentials();
  if (!url || !anonKey) return null;

  if (!cachedClient) {
    try {
      cachedClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (e) {
      console.error('Erro ao inicializar cliente Supabase:', e);
      return null;
    }
  }
  return cachedClient;
}

export function resetSupabaseClient() {
  cachedClient = null;
}

// SQL Schema Generator string for Supabase database setup
export const SUPABASE_SQL_SCHEMA = `-- SCHEMA COMPLETO PARA INSTACONNECT NO SUPABASE

-- 1. Tabela de Perfis
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  avatar_url text,
  bio text default '',
  website text default '',
  profile_type text default 'pessoal',
  verified boolean default false,
  followers_count integer default 0,
  following_count integer default 0,
  posts_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Seguidores
create table if not exists public.followers (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

-- 3. Tabela de Publicações (Posts)
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text default 'image',
  caption text default '',
  location text default '',
  youtube_track jsonb,
  likes_count integer default 0,
  comments_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabela de Stories
create table if not exists public.stories (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text default 'image',
  youtube_track jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default timezone('utc'::text, now() + interval '24 hours') not null
);

-- 5. Tabela de Reações em Stories
create table if not exists public.story_reactions (
  id uuid default gen_random_uuid() primary key,
  story_id uuid references public.stories(id) on delete cascade,
  from_profile_id uuid references public.profiles(id) on delete cascade,
  reaction_type text check (reaction_type in ('emoji', 'text')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tabela de Reels
create table if not exists public.reels (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  video_url text not null,
  caption text default '',
  youtube_track jsonb,
  likes_count integer default 0,
  comments_count integer default 0,
  shares_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Tabela de Conversas (Chats) e Grupos
create table if not exists public.chats (
  id uuid default gen_random_uuid() primary key,
  is_group boolean default false,
  name text,
  avatar_url text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Tabela de Participantes de Conversas
create table if not exists public.chat_participants (
  chat_id uuid references public.chats(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (chat_id, profile_id)
);

-- 9. Tabela de Mensagens
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  text text default '',
  media_url text,
  youtube_track jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Tabela de Notificações
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_profile_id uuid references public.profiles(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  content text not null,
  target_id text,
  target_media_url text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Supabase Realtime nas tabelas principais
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.story_reactions;
`;
