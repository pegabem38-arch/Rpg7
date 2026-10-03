import React, { useState, useRef } from 'react';
import { X, Send, AtSign } from 'lucide-react';
import { Comment, Profile } from '../types';
import { store } from '../services/store';
import { MentionText } from './MentionText';
import { MentionInputSuggestions } from './MentionInputSuggestions';

interface Props {
  postId: string;
  comments: Comment[];
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: (profileId: string) => void;
}

export const CommentsDrawer: React.FC<Props> = ({
  postId,
  comments,
  isOpen,
  onClose,
  onOpenProfile
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<Profile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleInputChange = (text: string) => {
    setNewCommentText(text);

    // Check if currently typing a mention
    const words = text.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      const query = lastWord.substring(1);
      const matches = store.searchProfilesForMention(query);
      setMentionSuggestions(matches);
    } else {
      setMentionSuggestions([]);
    }
  };

  const handleSelectMention = (profile: Profile) => {
    const words = newCommentText.split(/\s+/);
    words.pop(); // Remove partial mention
    words.push(`@${profile.username} `);
    const updated = words.join(' ');
    setNewCommentText(updated);
    setMentionSuggestions([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    store.addComment(postId, newCommentText.trim());
    setNewCommentText('');
    setMentionSuggestions([]);
  };

  const handleReplyTo = (username: string) => {
    setNewCommentText((prev) => {
      const mention = `@${username} `;
      if (prev.includes(mention)) return prev;
      return `${mention}${prev}`;
    });
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-t-3xl md:rounded-2xl p-4 md:p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[80vh] md:max-h-[600px] relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 mb-3">
          <h4 className="font-bold text-base text-neutral-900 dark:text-white">
            Comentários ({comments.length})
          </h4>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-2">
          {comments.length === 0 ? (
            <div className="text-center py-10 text-neutral-400 text-xs">
              Seja o primeiro a comentar nesta publicação! ✨
            </div>
          ) : (
            comments.map((c) => {
              if (!c) return null;
              const commentAuthor = c.profile || (c.profile_id ? store.getProfileById(c.profile_id) : undefined) || {
                id: c.profile_id || 'unknown',
                username: 'usuario',
                avatar_url: ''
              };

              return (
                <div key={c.id} className="flex items-start gap-3">
                  <img
                    src={commentAuthor.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'}
                    alt={commentAuthor.username}
                    onClick={() => {
                      if (onOpenProfile && c.profile_id) {
                        onClose();
                        onOpenProfile(c.profile_id);
                      }
                    }}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="bg-neutral-100 dark:bg-neutral-800/80 p-2.5 rounded-2xl">
                      <span
                        onClick={() => {
                          if (onOpenProfile && c.profile_id) {
                            onClose();
                            onOpenProfile(c.profile_id);
                          }
                        }}
                        className="font-bold text-xs text-neutral-900 dark:text-white block cursor-pointer hover:text-rose-500 transition-colors"
                      >
                        @{commentAuthor.username || 'usuario'}
                      </span>
                      <p className="text-xs text-neutral-800 dark:text-neutral-200 mt-0.5 whitespace-pre-wrap leading-relaxed">
                        <MentionText text={c.text} onOpenProfile={onOpenProfile} />
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-2 text-[10px] text-neutral-400">
                      <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <button
                        onClick={() => handleReplyTo(commentAuthor.username || 'usuario')}
                        className="hover:text-rose-500 dark:hover:text-rose-400 font-semibold cursor-pointer"
                      >
                        Responder
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Autocomplete mention suggestions floating above input */}
        {mentionSuggestions.length > 0 && (
          <div className="mb-2">
            <MentionInputSuggestions
              suggestions={mentionSuggestions}
              onSelect={handleSelectMention}
            />
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <img
            src={store.getActiveProfile().avatar_url}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              placeholder="Adicione um comentário ou marque com @..."
              value={newCommentText}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full pl-3 pr-8 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="button"
              onClick={() => {
                const updated = newCommentText ? `${newCommentText} @` : '@';
                handleInputChange(updated);
                if (inputRef.current) inputRef.current.focus();
              }}
              title="Marcar alguém"
              className="absolute right-2.5 text-neutral-400 hover:text-rose-500 p-0.5 transition-colors"
            >
              <AtSign className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!newCommentText.trim()}
            className="p-2 text-rose-500 disabled:opacity-30 font-bold hover:scale-105 transition-transform cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
