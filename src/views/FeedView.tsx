import React, { useState } from 'react';
import { Plus, Sparkles, UserPlus, UserCheck, RefreshCw } from 'lucide-react';
import { Profile, Story, Post } from '../types';
import { store } from '../services/store';
import { FeedPost } from '../components/FeedPost';
import { StoryViewerModal } from '../components/StoryViewerModal';

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
  const posts = store.getPosts();
  const stories = store.getStories();
  const activeProfile = store.getActiveProfile();
  const allProfiles = store.getProfiles();

  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  // Suggestions excluding self
  const suggestions = allProfiles.filter((p) => p.id !== activeProfile.id);

  const handleOpenStory = (index: number) => {
    setSelectedStoryIndex(index);
    setStoryViewerOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Feed Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* STORIES BAR */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 shadow-sm overflow-x-auto no-scrollbar flex items-center gap-4">
          {/* Active User Add/View Story Circle */}
          {(() => {
            const activeStoryIndex = stories.findIndex((s) => s.profile_id === activeProfile.id);
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
                    <img
                      src={activeProfile.avatar_url}
                      alt={activeProfile.username}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-neutral-900 group-hover:scale-105 transition-transform"
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
                <span className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 max-w-16 truncate">
                  Seu story
                </span>
              </div>
            );
          })()}

          {/* Stories List */}
          {stories.map((story, idx) => (
            <div
              key={story.id}
              onClick={() => handleOpenStory(idx)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
            >
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 group-hover:scale-105 transition-transform">
                <img
                  src={story.profile.avatar_url}
                  alt={story.profile.username}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-neutral-900"
                />
              </div>
              <span className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 max-w-16 truncate">
                {story.profile.username}
              </span>
            </div>
          ))}
        </div>

        {/* POSTS LIST */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-500 mx-auto flex items-center justify-center font-bold text-lg">
                ✨
              </div>
              <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">
                Nenhuma publicação ainda
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Seja o primeiro a publicar fotos ou vídeos com músicas do YouTube para movimentar o seu InstaConnect!
              </p>
              <button
                onClick={onOpenCreateModal}
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold text-xs rounded-xl shadow-md hover:opacity-95 transition-opacity"
              >
                + Criar Primeira Publicação
              </button>
            </div>
          ) : (
            posts.map((post) => (
              <FeedPost
                key={post.id}
                post={post}
                onOpenProfile={onOpenProfile}
              />
            ))
          )}
        </div>
      </div>

      {/* DESKTOP RIGHT SIDEBAR (Sugestões para Você) */}
      <div className="hidden lg:block space-y-6">
        {/* Active Profile Card */}
        {activeProfile && (
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
            <div
              onClick={() => onOpenProfile(activeProfile.id)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <img
                src={activeProfile.avatar_url}
                alt={activeProfile.username}
                className="w-12 h-12 rounded-full object-cover border-2 border-rose-500/80"
              />
              <div>
                <div className="flex items-center gap-1 font-bold text-sm text-neutral-900 dark:text-white">
                  <span>@{activeProfile.username}</span>
                  {activeProfile.verified && <span className="text-blue-500 text-xs">✓</span>}
                </div>
                <span className="text-xs text-neutral-500 block truncate max-w-[140px]">
                  {activeProfile.full_name}
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

        {/* Suggestions List */}
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
                const isFollowing = store.isFollowing(p.id);

                return (
                  <div key={p.id} className="flex items-center justify-between">
                    <div
                      onClick={() => onOpenProfile(p.id)}
                      className="flex items-center gap-2.5 cursor-pointer min-w-0"
                    >
                      <img
                        src={p.avatar_url}
                        alt={p.username}
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
                      onClick={() => store.toggleFollow(p.id)}
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

        {/* Footer info */}
        <p className="text-[10px] text-neutral-400 px-2 leading-relaxed">
          InstaConnect © 2026 • Termos • Privacidade • Supabase Integrated • YouTube Music Powered
        </p>
      </div>

      {/* Story Viewer Modal */}
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
