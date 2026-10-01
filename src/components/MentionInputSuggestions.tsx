import React from 'react';
import { Profile } from '../types';
import { AtSign } from 'lucide-react';

interface MentionInputSuggestionsProps {
  suggestions: Profile[];
  onSelect: (profile: Profile) => void;
  className?: string;
}

export const MentionInputSuggestions: React.FC<MentionInputSuggestionsProps> = ({
  suggestions,
  onSelect,
  className = ''
}) => {
  if (suggestions.length === 0) return null;

  return (
    <div
      className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden z-30 max-h-52 overflow-y-auto ${className}`}
    >
      <div className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-bold text-neutral-500 flex items-center gap-1">
        <AtSign className="w-3 h-3 text-rose-500" />
        <span>Marcar usuário</span>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
        {suggestions.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(profile);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-rose-50 dark:hover:bg-neutral-800 transition-colors group cursor-pointer"
          >
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="w-7 h-7 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 leading-tight">
                <span className="text-xs font-bold text-neutral-900 dark:text-white group-hover:text-rose-500">
                  @{profile.username}
                </span>
                {profile.verified && <span className="text-blue-500 text-[10px]">✓</span>}
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate block">
                {profile.full_name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
