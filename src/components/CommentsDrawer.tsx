import React, { useState } from 'react';
import { X, Send, Heart } from 'lucide-react';
import { Comment } from '../types';
import { store } from '../services/store';

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

  if (!isOpen) return null;

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    store.addComment(postId, newCommentText.trim());
    setNewCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-t-3xl md:rounded-2xl p-4 md:p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[80vh] md:max-h-[600px]">
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
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <img
                  src={c.profile.avatar_url}
                  alt={c.profile.username}
                  onClick={() => {
                    if (onOpenProfile) {
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
                        if (onOpenProfile) {
                          onClose();
                          onOpenProfile(c.profile_id);
                        }
                      }}
                      className="font-bold text-xs text-neutral-900 dark:text-white block cursor-pointer hover:text-rose-500 transition-colors"
                    >
                      @{c.profile.username}
                    </span>
                    <p className="text-xs text-neutral-800 dark:text-neutral-200 mt-0.5 whitespace-pre-wrap">
                      {c.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-2 text-[10px] text-neutral-400">
                    <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button className="hover:text-neutral-600 dark:hover:text-neutral-200 font-semibold">
                      Responder
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <img
            src={store.getActiveProfile().avatar_url}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
          <input
            type="text"
            placeholder="Adicione um comentário..."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            className="flex-1 px-3 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim()}
            className="p-2 text-rose-500 disabled:opacity-30 font-bold hover:scale-105 transition-transform"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
