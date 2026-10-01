import React, { useState } from 'react';
import { Repeat2, MessageSquare, Trash2, X, Check, Sparkles } from 'lucide-react';
import { Post } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  isReposted: boolean;
  onInstantRepost: () => void;
  onQuoteRepost: (caption: string) => void;
  onUndoRepost: () => void;
  onRepostToStory?: () => void;
}

export const RepostModal: React.FC<Props> = ({
  isOpen,
  onClose,
  post,
  isReposted,
  onInstantRepost,
  onQuoteRepost,
  onUndoRepost,
  onRepostToStory
}) => {
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteCaption, setQuoteCaption] = useState('');

  if (!isOpen) return null;

  const originalPost = post.repost_of || post;

  const handleSendQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteCaption.trim()) return;
    onQuoteRepost(quoteCaption.trim());
    setQuoteCaption('');
    setIsQuoting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Repeat2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white">
              Republicar Publicação
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Post Preview Card */}
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60">
          <img
            src={originalPost.media_url}
            alt=""
            className="w-14 h-14 rounded-xl object-cover border border-neutral-300 dark:border-neutral-600 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <img
                src={originalPost.profile.avatar_url}
                alt=""
                className="w-4 h-4 rounded-full object-cover"
              />
              <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                @{originalPost.profile.username}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {originalPost.caption || 'Publicação com foto'}
            </p>
          </div>
        </div>

        {isQuoting ? (
          /* Quoting form */
          <form onSubmit={handleSendQuote} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Seu comentário sobre a publicação:
              </label>
              <textarea
                value={quoteCaption}
                onChange={(e) => setQuoteCaption(e.target.value)}
                placeholder="Escreva o que você achou, citação ou reação..."
                rows={3}
                autoFocus
                className="w-full p-3 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsQuoting(false)}
                className="flex-1 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={!quoteCaption.trim()}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-md disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Repeat2 className="w-3.5 h-3.5" />
                <span>Republicar</span>
              </button>
            </div>
          </form>
        ) : (
          /* Choice actions */
          <div className="space-y-2">
            {isReposted ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onUndoRepost();
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Desfazer Republicação</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsQuoting(true)}
                  className="w-full p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span>Republicar com novo comentário</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onInstantRepost();
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                >
                  <Repeat2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Republicar Instantaneamente</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsQuoting(true)}
                  className="w-full p-3 rounded-2xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span>Republicar com Comentário</span>
                </button>
              </>
            )}

            {/* Repost to Story Option */}
            {onRepostToStory && (
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    onRepostToStory();
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Compartilhar no Story</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
