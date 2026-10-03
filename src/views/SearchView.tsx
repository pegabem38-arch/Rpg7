import React, { useState, useEffect } from 'react';
import { Search, UserPlus, UserCheck, Sparkles, MapPin, Grid, Film } from 'lucide-react';
import { store } from '../services/store';
import { Profile } from '../types';
import { CachedImage } from '../components/CachedImage';

interface Props {
  onOpenProfile: (profileId: string) => void;
}

export const SearchView: React.FC<Props> = ({ onOpenProfile }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    return store.subscribe(() => setTick((t) => t + 1));
  }, []);

  const [query, setQuery] = useState('');
  const activeProfile = store.getActiveProfile();
  const allProfiles = store.getDiscoverableProfiles() || [];
  const posts = store.getPosts() || [];

  // Filter profiles based on search query
  const filteredProfiles = allProfiles.filter((p) => {
    if (!p) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const uname = (p.username || '').toLowerCase();
    const fname = (p.full_name || '').toLowerCase();
    const bioText = (p.bio || '').toLowerCase();
    return uname.includes(q) || fname.includes(q) || bioText.includes(q);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header & Search Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
            <Search className="w-6 h-6 text-rose-500" /> Explorar & Pesquisar Perfis
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Encontre amigos, criadores de conteúdo e perfis para seguir no RPG.
          </p>
        </div>

        {/* Input */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, @nome_de_usuario ou bio..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            autoFocus
          />
        </div>
      </div>

      {/* Profiles List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {query.trim() ? `Resultados (${filteredProfiles.length})` : 'Todos os Perfis'}
          </h3>
        </div>

        {filteredProfiles.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center text-xs text-neutral-400">
            Nenhum perfil encontrado para "{query}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredProfiles.map((p) => {
              if (!p || !p.id) return null;
              const isSelf = Boolean(activeProfile && p.id === activeProfile.id);
              const isFollowing = p.id ? store.isFollowing(p.id) : false;
              const pPosts = posts.filter((post) => post && post.profile_id === p.id);

              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 group"
                >
                  {/* Clickable Profile Info */}
                  <div
                    onClick={() => onOpenProfile(p.id)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  >
                    <CachedImage
                      src={p.avatar_url}
                      cacheKey={`avatar_${p.id}`}
                      alt={p.username || 'Perfil'}
                      className="w-12 h-12 rounded-full object-cover border-2 border-rose-500/70 group-hover:scale-105 transition-transform flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-neutral-900 dark:text-white group-hover:text-rose-500 transition-colors truncate">
                        <span>@{p.username || 'perfil'}</span>
                        {p.verified && <span className="text-blue-500 text-xs">✓</span>}
                      </div>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 block truncate">
                        {p.full_name || ''}
                      </span>
                      <div className="flex items-center gap-3 text-[10px] text-neutral-400 mt-1">
                        <span>
                          <strong className="text-neutral-700 dark:text-neutral-300">{p.followers_count || 0}</strong> seguidores
                        </span>
                        <span>
                          <strong className="text-neutral-700 dark:text-neutral-300">{pPosts.length}</strong> posts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Follow / Edit Button */}
                  <div className="flex-shrink-0">
                    {isSelf ? (
                      <button
                        onClick={() => onOpenProfile(p.id)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-200 transition-colors"
                      >
                        Meu Perfil
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          store.toggleFollow(p.id);
                          setTick((t) => t + 1);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                          isFollowing
                            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                            : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" /> Seguindo
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" /> Seguir
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
