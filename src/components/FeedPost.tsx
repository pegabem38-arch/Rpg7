import React, { useState } from 'react';
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal, MapPin, UserPlus, UserCheck, Trash2
} from 'lucide-react';
import { Post } from '../types';
import { store } from '../services/store';
import { YouTubePlayerChip } from './YouTubePlayerChip';
import { CommentsDrawer } from './CommentsDrawer';

interface Props {
  post: Post;
  onOpenProfile: (profileId: string) => void;
}

export const FeedPost: React.FC<Props> = ({ post, onOpenProfile }) => {
  const [showComments, setShowComments] = useState(false);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const isFollowing = store.isFollowing(post.profile_id);
  const activeProfile = store.getActiveProfile();
  const isSelf = post.profile_id === activeProfile.id;

  const handleDeletePost = () => {
    store.deletePost(post.id);
    setShowConfirmDelete(false);
    setShowMenu(false);
  };

  const handleLike = () => {
    store.toggleLikePost(post.id);
  };

  const handleDoubleTap = () => {
    if (!post.is_liked) {
      store.toggleLikePost(post.id);
    }
    setShowHeartOverlay(true);
    setTimeout(() => setShowHeartOverlay(false), 800);
  };

  const handleSave = () => {
    store.toggleSavePost(post.id);
  };

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.toggleFollow(post.profile_id);
  };

  return (
    <article className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm mb-6 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div
          onClick={() => onOpenProfile(post.profile_id)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img
            src={post.profile.avatar_url}
            alt={post.profile.username}
            className="w-10 h-10 rounded-full object-cover border-2 border-rose-500/80 group-hover:scale-105 transition-transform"
          />
          <div>
            <div className="flex items-center gap-1.5 font-bold text-sm text-neutral-900 dark:text-white group-hover:text-rose-500 transition-colors">
              <span>{post.profile.username}</span>
              {post.profile.verified && <span className="text-blue-500 text-xs">✓</span>}
            </div>
            {post.location && (
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-0.5">
                <MapPin className="w-3 h-3 text-rose-500" /> {post.location}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isSelf && (
            <button
              onClick={handleToggleFollow}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                isFollowing
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  : 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm'
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

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 z-30 w-44 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-150">
                {isSelf ? (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowConfirmDelete(true);
                    }}
                    className="w-full px-3 py-2 text-left font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Publicação</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowConfirmDelete(true);
                    }}
                    className="w-full px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span className="text-red-500 font-bold">Apagar do Feed</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Deleting Post */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-500 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-base text-neutral-900 dark:text-white">Excluir Publicação?</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Tem certeza que deseja apagar esta publicação? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePost}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-md transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YouTube Music Audio Badge if attached */}
      {post.youtube_track && (
        <div className="px-4 pb-2">
          <YouTubePlayerChip track={post.youtube_track} />
        </div>
      )}

      {/* Post Media with Double Tap Heart */}
      <div
        className="relative bg-black aspect-square sm:aspect-auto sm:max-h-[580px] overflow-hidden flex items-center justify-center cursor-pointer select-none"
        onDoubleClick={handleDoubleTap}
      >
        <img
          src={post.media_url}
          alt="Post Media"
          className="w-full h-full object-cover"
        />

        {showHeartOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 animate-in zoom-in-50 duration-200">
            <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-2xl animate-bounce" />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className="text-neutral-900 dark:text-white hover:scale-110 transition-transform"
            >
              <Heart
                className={`w-6 h-6 ${
                  post.is_liked ? 'text-rose-500 fill-rose-500' : 'text-neutral-900 dark:text-white'
                }`}
              />
            </button>

            <button
              onClick={() => setShowComments(true)}
              className="text-neutral-900 dark:text-white hover:scale-110 transition-transform"
            >
              <MessageCircle className="w-6 h-6" />
            </button>

            <button
              onClick={() => {
                const chat = store.getOrCreateDirectChat(post.profile_id);
                // Can trigger direct message
              }}
              className="text-neutral-900 dark:text-white hover:scale-110 transition-transform"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>

          <button
            onClick={handleSave}
            className="text-neutral-900 dark:text-white hover:scale-110 transition-transform"
          >
            <Bookmark
              className={`w-6 h-6 ${
                post.is_saved ? 'text-amber-500 fill-amber-500' : 'text-neutral-900 dark:text-white'
              }`}
            />
          </button>
        </div>

        {/* Likes Count */}
        <div className="font-bold text-xs text-neutral-900 dark:text-white mb-1.5">
          {post.likes_count.toLocaleString()} curtidas
        </div>

        {/* Caption */}
        <div className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed">
          <span
            onClick={() => onOpenProfile(post.profile_id)}
            className="font-bold mr-1.5 text-neutral-900 dark:text-white cursor-pointer hover:underline"
          >
            {post.profile.username}
          </span>
          {post.caption}
        </div>

        {/* Comments Snippet */}
        {post.comments_count > 0 && (
          <button
            onClick={() => setShowComments(true)}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mt-2 block font-medium"
          >
            Ver todos os {post.comments_count} comentários
          </button>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-neutral-400 uppercase font-medium mt-1.5 block">
          {new Date(post.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short'
          })}
        </span>
      </div>

      {/* Comments Drawer Modal */}
      <CommentsDrawer
        postId={post.id}
        comments={post.comments || []}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        onOpenProfile={onOpenProfile}
      />
    </article>
  );
};
