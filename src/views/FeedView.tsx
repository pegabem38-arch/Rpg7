import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, UserPlus, UserCheck, RefreshCw, Loader2, Image as ImageIcon } from 'lucide-react';
import { Profile, Story, Post } from '../types';
import { store } from '../services/store';
import { FeedPost } from '../components/FeedPost';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { CachedImage } from '../components/CachedImage';

interface Props {
  onOpenProfile: (profileId: string) => void;
  onOpenCreateModal: () => void;
  onOpenAccountSwitcher: () => void;
}

export const FeedView: React.FC<Props> = ({
  onOpenProfile,
  onOpenCreateModal,
  onOpenAccountSwitcher
}) => {
  const [, setTick] = useState(0);

  // 2. PROCESSAMENTO ASSÍNCRONO:
  // Controla o estado de espera da resposta inicial do banco de dados SQL
  const [isWaitingSql, setIsWaitingSql] = useState<boolean>(!store.isSqlReady());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTick((t) => t + 1);
      if (store.isSqlReady()) {
        setIsWaitingSql(false);
      }
    });

    let isMounted = true;

    // Se o banco de dados SQL ainda estiver em processo de consulta, aguarda a resposta
    if (!store.isSqlReady()) {
      store
        .waitForSqlSync()
        .then(() => {
          if (isMounted) setIsWaitingSql(false);
        })
        .catch(() => {
          if (isMounted) setIsWaitingSql(false);
        });

      // Timeout de segurança (máximo 1.8 segundos) para nunca travar a tela caso o SQL demore
      const safetyTimer = setTimeout(() => {
        if (isMounted) setIsWaitingSql(false);
      }, 1800);

      return () => {
        isMounted = false;
        clearTimeout(safetyTimer);
        unsubscribe();
      };
    }

    return unsubscribe;
  }, []);

  const posts = store.getPosts() || [];
  const stories = store.getStories() || [];
  const allProfiles = store.getProfiles() || [];

  // Fallback seguro de perfil ativo caso ainda esteja carregando
  const activeProfile = store.getActiveProfile() || allProfiles[0] || ({
    id: 'guest',
    user_id: 'guest',
    username: 'aventureiro',
    full_name: 'Aventureiro',
    avatar_url: '',
    bio: '',
    profile_type: 'pessoal' as const,
    followers_count: 0,
    following_count: 0,
    posts_count: 0,
    created_at: new Date().toISOString(),
    verified: false
  } as Profile);

  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  // Sugestões excluindo a si mesmo
  const suggestions = allProfiles.filter((p) => p && p.id && p.id !== activeProfile.id);

  const handleOpenStory = (index: number) => {
    setSelectedStoryIndex(index);
    setStoryViewerOpen(true);
  };

  // Filtra apenas posts íntegros para evitar quebra ao renderizar
  const validPosts = posts.filter((p) => p && p.id);

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Coluna Principal do Feed */}
      <div className="lg:col-span-2 space-y-6">
        {/* BARRA DE STORIES */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 shadow-sm overflow-x-auto no-scrollbar flex items-center gap-4">
          {/* Círculo do Usuário Ativo */}
          {(() => {
            const activeStoryIndex = stories.findIndex((s) => s && s.profile_id === activeProfile.id);
            const hasActiveStory = activeStoryIndex !== -1;

            return (
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
                <div
                  className="relative"
                  onClick={() => {
                    if (hasActiveStory) {
                      handleOpenStory(activeStoryIndex);
                    } else {
                      onOpenCreateModal();
                    }
                  }}
                >
                  <div className={`p-0.5 rounded-full ${hasActiveStory ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600' : ''}`}>
                    <CachedImage
                      src={activeProfile.avatar_url}
                      cacheKey={`avatar_${activeProfile.id}`}
                      alt={activeProfile.username || 'Seu Perfil'}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-neutral-900 group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCreateModal();
                    }}
                    className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-neutral-900 hover:scale-110 shadow"
                    title="Novo Story"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
                <span className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 max-w-[70px] truncate text-center">
                  Seu story
                </span>
              </div>
            );
          })()}

          {/* Lista de Stories de Amigos */}
          {stories.map((story, idx) => {
            if (!story || !story.id) return null;
            const author = story.profile || { username: 'amigo', avatar_url: '', id: story.profile_id };

            return (
              <div
                key={story.id}
                onClick={() => handleOpenStory(idx)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
              >
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 group-hover:scale-105 transition-transform">
                  <CachedImage
                    src={author.avatar_url}
                    cacheKey={`avatar_${author.id || story.profile_id}`}
                    alt={author.username}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-neutral-900"
                  />
                </div>
                <span className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 max-w-[70px] truncate text-center">
                  {author.username}
                </span>
              </div>
            );
          })}
        </div>

        {/* LISTA DE POSTAGENS */}
        <div className="space-y-6">
          {/* Se estiver aguardando o banco SQL responder, exibe skeleton / placeholder provisório */}
          {isWaitingSql ? (
            <div className="space-y-6">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-28 h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                    <div className="w-16 h-2 bg-neutral-100 dark:bg-neutral-800/60 rounded animate-pulse" />
                  </div>
                </div>
                {/* Quadrado cinza padrão / Placeholder da imagem do post */}
                <div className="w-full aspect-square bg-neutral-200 dark:bg-neutral-800/80 rounded-xl flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <Loader2 className="w-7 h-7 animate-spin text-rose-500" />
                  <span className="text-xs font-semibold">Carregando dados do banco SQL...</span>
                </div>
              </div>
            </div>
          ) : validPosts.length === 0 ? (
            /* Estado Vazio Seguro */
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-500 mx-auto flex items-center justify-center font-bold text-lg">
                ✨
              </div>
              <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                Nenhuma publicação ainda
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Seja o primeiro a publicar fotos ou vídeos com músicas para movimentar o seu RPG!
              </p>
              <button
                onClick={onOpenCreateModal}
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold text-xs rounded-xl shadow-md hover:opacity-95 transition-opacity"
              >
                + Criar Primeira Publicação
              </button>
            </div>
          ) : (
            validPosts.map((post) => (
              <FeedPost
                key={post.id}
                post={post}
                onOpenProfile={onOpenProfile}
              />
            ))
          )}
        </div>
      </div>

      {/* BARRA LATERAL DIREITA NO DESKTOP (Sugestões de Perfis) */}
      <div className="hidden lg:block space-y-6">
        {/* Cartão do Perfil Ativo */}
        {activeProfile && (
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
            <div
              onClick={() => onOpenProfile(activeProfile.id)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <CachedImage
                src={activeProfile.avatar_url}
                cacheKey={`avatar_${activeProfile.id}`}
                alt={activeProfile.username || ''}
                className="w-12 h-12 rounded-full object-cover border-2 border-rose-500/80"
              />
              <div>
                <div className="flex items-center gap-1 font-bold text-sm text-neutral-900 dark:text-white">
                  <span>@{activeProfile.username || 'aventureiro'}</span>
                  {activeProfile.verified && <span className="text-blue-500 text-xs">✓</span>}
                </div>
                <span className="text-xs text-neutral-500 block truncate max-w-[140px]">
                  {activeProfile.full_name || ''}
                </span>
              </div>
            </div>

            <button
              onClick={onOpenAccountSwitcher}
              className="text-xs font-bold text-rose-500 hover:text-rose-600"
            >
              Trocar
            </button>
          </div>
        )}

        {/* Lista de Sugestões */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Sugestões para você
            </span>
          </div>

          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-xs text-neutral-400">
                  Nenhum outro perfil cadastrado no momento.
                </p>
                <button
                  onClick={onOpenAccountSwitcher}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  + Criar outro perfil
                </button>
              </div>
            ) : (
              suggestions.slice(0, 5).map((p) => {
                if (!p || !p.id) return null;
                const isFollowing = store.isFollowing(p.id);

                return (
                  <div key={p.id} className="flex items-center justify-between">
                    <div
                      onClick={() => onOpenProfile(p.id)}
                      className="flex items-center gap-2.5 cursor-pointer min-w-0"
                    >
                      <CachedImage
                        src={p.avatar_url}
                        cacheKey={`avatar_${p.id}`}
                        alt={p.username || ''}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate">
                          @{p.username}
                        </span>
                        <span className="text-[10px] text-neutral-400 truncate block">
                          Sugerido para você
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        store.toggleFollow(p.id);
                        setTick((t) => t + 1);
                      }}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                        isFollowing
                          ? 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800'
                          : 'text-rose-500 hover:text-rose-600'
                      }`}
                    >
                      {isFollowing ? 'Seguindo' : 'Seguir'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-[10px] text-neutral-400 px-2 leading-relaxed">
          RPG © 2026 • Termos • Privacidade
        </p>
      </div>

      {/* Modal de Exibição de Stories */}
      <StoryViewerModal
        stories={stories}
        initialIndex={selectedStoryIndex}
        isOpen={storyViewerOpen}
        onClose={() => setStoryViewerOpen(false)}
        onOpenProfile={onOpenProfile}
      />
    </div>
  );
};
