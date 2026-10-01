import React from 'react';
import { store } from '../services/store';

interface MentionTextProps {
  text: string;
  onOpenProfile?: (profileId: string) => void;
  className?: string;
  mentionClassName?: string;
}

export const MentionText: React.FC<MentionTextProps> = ({
  text,
  onOpenProfile,
  className = '',
  mentionClassName = 'text-rose-500 dark:text-rose-400 font-semibold hover:underline cursor-pointer inline-flex items-center gap-0.5'
}) => {
  if (!text) return null;

  // Regex to split by @username or #hashtag or URL
  // Group 1: @username
  // Group 2: #hashtag
  const regex = /(@[a-zA-Z0-9._]+|#[a-zA-Z0-9_]+)/g;
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const username = part.slice(1);
          const profile = store.getProfileByUsername(username);

          return (
            <span
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                if (profile && onOpenProfile) {
                  onOpenProfile(profile.id);
                } else if (onOpenProfile) {
                  // Fallback: search profile or navigate if exists
                  const found = store.getProfileByUsername(username);
                  if (found) onOpenProfile(found.id);
                }
              }}
              className={mentionClassName}
              title={profile ? `Ver perfil de @${profile.username} (${profile.full_name})` : `@${username}`}
            >
              {part}
            </span>
          );
        }

        if (part.startsWith('#')) {
          return (
            <span
              key={index}
              className="text-blue-500 dark:text-blue-400 font-medium hover:underline cursor-pointer"
            >
              {part}
            </span>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};
