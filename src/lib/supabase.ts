import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project credentials provided
export const DEFAULT_SUPABASE_URL = 'https://rxdhxykrvivhlmgeyjfy.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_2ztmJGIVzEkPnPpF54-miQ_o-SKZfr4';

const SUPABASE_STORAGE_KEY_URL = 'rpg_supabase_url';
const SUPABASE_STORAGE_KEY_ANON = 'rpg_supabase_anon_key';

export function getStoredSupabaseCredentials() {
  const storedUrl = localStorage.getItem(SUPABASE_STORAGE_KEY_URL) || localStorage.getItem('instaconnect_supabase_url');
  const storedAnon = localStorage.getItem(SUPABASE_STORAGE_KEY_ANON) || localStorage.getItem('instaconnect_supabase_anon_key');

  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envAnon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  const url = (storedUrl && storedUrl.trim().length > 0)
    ? storedUrl.trim()
    : ((envUrl && envUrl.trim().length > 0) ? envUrl.trim() : DEFAULT_SUPABASE_URL);

  const anonKey = (storedAnon && storedAnon.trim().length > 0)
    ? storedAnon.trim()
    : ((envAnon && envAnon.trim().length > 0) ? envAnon.trim() : DEFAULT_SUPABASE_ANON_KEY);

  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (url) {
    localStorage.setItem(SUPABASE_STORAGE_KEY_URL, url);
  } else {
    localStorage.removeItem(SUPABASE_STORAGE_KEY_URL);
    localStorage.removeItem('instaconnect_supabase_url');
  }

  if (anonKey) {
    localStorage.setItem(SUPABASE_STORAGE_KEY_ANON, anonKey);
  } else {
    localStorage.removeItem(SUPABASE_STORAGE_KEY_ANON);
    localStorage.removeItem('instaconnect_supabase_anon_key');
  }
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

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; tablesExist?: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'URL ou chave do Supabase não configurada.' };
  }

  try {
    const { error } = await client.from('profiles').select('id').limit(1);
    if (error) {
      // 42P01: relation/table does not exist in Postgres yet
      // PGRST205: PostgREST could not find table in schema cache
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return {
          success: true,
          tablesExist: false,
          message: 'Conectado com sucesso ao Supabase! Porém, as tabelas ainda não foram criadas no banco de dados.'
        };
      }
      return {
        success: false,
        tablesExist: false,
        message: `Erro na resposta do Supabase: ${error.message}`
      };
    }
    return {
      success: true,
      tablesExist: true,
      message: 'Conexão ativa com o Supabase e tabelas prontas!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao conectar: ${err?.message || 'Falha de rede'}`
    };
  }
}

// SQL Schema Generator string for Supabase database setup
export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- SCHEMA COMPLETO PARA O APLICATIVO RPG NO SUPABASE
-- Cole este script no SQL Editor do seu projeto Supabase e clique em RUN
-- ========================================================

-- 1. Tabela de Perfis
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  google_email text,
  google_name text,
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
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_google_email on public.profiles(google_email);

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

-- 4. Tabela de Stories (expiram em 24h)
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

-- Configuração de Políticas de Segurança (Row Level Security) permissivas para uso do app
alter table public.profiles enable row level security;
drop policy if exists "Acesso público profiles" on public.profiles;
create policy "Acesso público profiles" on public.profiles for all using (true) with check (true);

alter table public.followers enable row level security;
drop policy if exists "Acesso público followers" on public.followers;
create policy "Acesso público followers" on public.followers for all using (true) with check (true);

alter table public.posts enable row level security;
drop policy if exists "Acesso público posts" on public.posts;
create policy "Acesso público posts" on public.posts for all using (true) with check (true);

alter table public.stories enable row level security;
drop policy if exists "Acesso público stories" on public.stories;
create policy "Acesso público stories" on public.stories for all using (true) with check (true);

alter table public.story_reactions enable row level security;
drop policy if exists "Acesso público story_reactions" on public.story_reactions;
create policy "Acesso público story_reactions" on public.story_reactions for all using (true) with check (true);

alter table public.reels enable row level security;
drop policy if exists "Acesso público reels" on public.reels;
create policy "Acesso público reels" on public.reels for all using (true) with check (true);

alter table public.chats enable row level security;
drop policy if exists "Acesso público chats" on public.chats;
create policy "Acesso público chats" on public.chats for all using (true) with check (true);

alter table public.chat_participants enable row level security;
drop policy if exists "Acesso público chat_participants" on public.chat_participants;
create policy "Acesso público chat_participants" on public.chat_participants for all using (true) with check (true);

alter table public.messages enable row level security;
drop policy if exists "Acesso público messages" on public.messages;
create policy "Acesso público messages" on public.messages for all using (true) with check (true);

alter table public.notifications enable row level security;
drop policy if exists "Acesso público notifications" on public.notifications;
create policy "Acesso público notifications" on public.notifications for all using (true) with check (true);

-- Habilitar Supabase Realtime nas tabelas principais
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.story_reactions;
`;
