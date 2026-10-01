import React, { useState, useEffect } from 'react';
import { X, Search, UserCheck, UserPlus } from 'lucide-react';
import { Profile } from '../types';
import { store } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: 'Seguidores' | 'Seguindo';
  profiles: Profile[];
  onOpenProfile: (profileId: string) => void;
}

export const FollowListModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  profiles,
  onOpenProfile
}) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    return store.subscribe(() => setTick((t) => t + 1));
  }, []);

  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = profiles.filter(
    (p) =>
      p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative max-h-[80vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">
          {title} ({profiles.length})
        </h3>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-neutral-400">
              Nenhum perfil encontrado.
            </div>
          ) : (
            filtered.map((p) => {
              const isFollowing = store.isFollowing(p.id);
              const isSelf = p.id === store.getActiveProfile().id;

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <div
                    onClick={() => {
                      onOpenProfile(p.id);
                      onClose();
                    }}
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <img
                      src={p.avatar_url}
                      alt={p.username}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 font-bold text-xs text-neutral-900 dark:text-white truncate">
                        <span>{p.username}</span>
                        {p.verified && <span className="text-blue-500 text-[10px]">✓</span>}
                      </div>
                      <span className="text-[11px] text-neutral-500 truncate block">
                        {p.full_name}
                      </span>
                    </div>
                  </div>

                  {!isSelf && (
                    <button
                      onClick={() => {
                        store.toggleFollow(p.id);
                        setTick((t) => t + 1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                        isFollowing
                          ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                          : 'bg-rose-500 text-white shadow-sm'
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
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
