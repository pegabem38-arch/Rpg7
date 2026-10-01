import React, { useState, useRef, useEffect } from 'react';
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal, MapPin, UserPlus, UserCheck, Trash2, Repeat2, Music, Volume2, VolumeX, Flag, Image as ImageIcon
} from 'lucide-react';
import { Post } from '../types';
import { store } from '../services/store';
import { getStoredGoogleUser, isAppAdmin } from '../services/googleAuth';
import { CommentsDrawer } from './CommentsDrawer';
import { RepostModal } from './RepostModal';
import { MentionText } from './MentionText';
import { ReportProfileModal } from './ReportProfileModal';
import { CachedImage } from './CachedImage';

interface Props {
  post: Post;
  onOpenProfile: (profileId: string) => void;
}

export const FeedPost: React.FC<Props> = ({ post, onOpenProfile }) => {
  if (!post || !post.id) return null;

  const author = post.profile || store.getProfiles().find((p) => p.id === post.profile_id) || {
    id: post.profile_id || 'unknown',
    username: 'aventureiro',
    name: 'Aventureiro',
    avatar_url: '',
    role: 'user' as const,
    verified: false,
    banned: false
  };

  const [showComments, setShowComments] = useState(false);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [repostFeedback, setRepostFeedback] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const postContainerRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-play music when post enters viewport, stop when scrolled away
  useEffect(() => {
    if (!post.youtube_track || !postContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.35);
        }
      },
      {
        threshold: [0, 0.35, 0.7],
      }
    );

    observer.observe(postContainerRef.current);
    return () => observer.disconnect();
  }, [post.youtube_track]);

  const toggleVolume = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (iframeRef.current?.contentWindow) {
      if (nextMuted) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'mute', args: [] }),
          '*'
        );
      } else {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
          '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
          '*'
        );
      }
    }
  };

  const isFollowing = store.isFollowing(post.profile_id);
  const activeProfile = store.getActiveProfile();
  const isSelf = post.profile_id === activeProfile?.id || (author && activeProfile && author.username === activeProfile.username);
  const isReposted = store.isPostRepostedByMe(post.id);

  const handleInstantRepost = () => {
    store.repostPost(post.id);
    setRepostFeedback('Republicado no seu Feed! 🔁');
    setTimeout(() => setRepostFeedback(null), 2500);
  };

  const handleQuoteRepost = (caption: string) => {
    store.repostPost(post.id, caption);
    setRepostFeedback('Publicação republicada com comentário! 🔁');
    setTimeout(() => setRepostFeedback(null), 2500);
  };

  const handleUndoRepost = () => {
    store.repostPost(post.id);
    setRepostFeedback('Republicação desfeita.');
    setTimeout(() => setRepostFeedback(null), 2000);
  };

  const handleRepostToStory = () => {
    store.repostPostToStory(post.id);
    setRepostFeedback('Compartilhado no seu Story! ✨');
    setTimeout(() => setRepostFeedback(null), 2500);
  };

  const handleDeletePost = () => {
    if (!isSelf) return;
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
    <article ref={postContainerRef} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm mb-6 transition-all">
      {/* Repost Header Banner if this post was reposted */}
      {post.repost_of && (
        <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
            <Repeat2 className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
            <span
              onClick={() => onOpenProfile(post.profile_id)}
              className="font-bold hover:underline cursor-pointer text-neutral-900 dark:text-white"
            >
              @{post.profile.username}
            </span>
            <span className="text-neutral-400">republicou</span>
          </div>
          <span className="text-[10px] text-neutral-400">
            {new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        </div>
      )}

      {/* Quote commentary if present */}
      {post.repost_caption && (
        <div className="px-4 py-2.5 bg-emerald-500/5 dark:bg-emerald-950/20 border-b border-emerald-500/15 text-xs text-neutral-800 dark:text-neutral-200">
          <p className="font-medium italic leading-relaxed">
            "<MentionText text={post.repost_caption} onOpenProfile={onOpenProfile} />"
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div
          onClick={() => onOpenProfile(post.profile_id)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <CachedImage
            src={author.avatar_url}
            cacheKey={`avatar_${author.id}`}
            alt={author.username}
            className="w-10 h-10 rounded-full object-cover border-2 border-rose-500/80 group-hover:scale-105 transition-transform"
          />
          <div>
            <div className="flex items-center gap-1.5 font-bold text-sm text-neutral-900 dark:text-white group-hover:text-rose-500 transition-colors">
              <span>{author.username}</span>
              {author.verified && <span className="text-blue-500 text-xs font-bold">✓</span>}
              {post.profile.banned && (
                <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded uppercase">
                  Banido
                </span>
              )}
            </div>
            {post.location && (
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-0.5">
                <MapPin className="w-3 h-3 text-rose-500" /> {post.location}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 z-30 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-150">
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
                  <>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleSave();
                      }}
                      className="w-full px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                    >
                      <Bookmark className="w-4 h-4 text-neutral-400" />
                      <span>{post.is_saved ? 'Remover dos Salvos' : 'Salvar Publicação'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowReportModal(true);
                      }}
                      className="w-full px-3 py-2 text-left font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 border-t border-neutral-100 dark:border-neutral-700/60"
                    >
                      <Flag className="w-4 h-4 text-red-500" />
                      <span>Denunciar este perfil</span>
                    </button>
                  </>
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

      {/* Post Media with Double Tap Heart and Integrated Audio */}
      <div
        className="relative bg-neutral-900 aspect-square sm:aspect-auto sm:max-h-[580px] overflow-hidden flex items-center justify-center cursor-pointer select-none group/media"
        onDoubleClick={handleDoubleTap}
      >
        {/* CONDIÇÃO (IF): Se o caminho no SQL for vazio, nulo ou o arquivo local ainda não existir */}
        {(!post.media_url || typeof post.media_url !== 'string' || post.media_url.trim() === '' || post.media_url === 'null' || post.media_url === 'undefined') ? (
          <div key="post-placeholder" className="w-full h-full min-h-[320px] bg-neutral-800 dark:bg-neutral-800 flex flex-col items-center justify-center gap-2.5 text-neutral-400 select-none p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-neutral-700/50 flex items-center justify-center text-neutral-400 shadow-inner">
              <ImageIcon className="w-6 h-6 opacity-60" />
            </div>
            <p className="text-xs font-medium text-neutral-400">
              Mídia em carregamento ou indisponível
            </p>
          </div>
        ) : (
          <CachedImage
            key={`post-media-${post.id}`}
            src={post.media_url}
            cacheKey={`post_${post.id}`}
            alt="Post Media"
            preferBlobUrl={true}
            className="w-full h-full object-cover"
          />
        )}

        {showHeartOverlay && (
          <div key="heart-overlay" className="absolute inset-0 flex items-center justify-center bg-black/20 animate-in zoom-in-50 duration-200 pointer-events-none">
            <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-2xl animate-bounce" />
          </div>
        )}

        {/* Audio Player for Attached Music Track (Hidden iframe - No video visible!) */}
        {post.youtube_track && post.youtube_track.youtube_id && (
          <div key="post-audio-container">
            {isInView && (
              <iframe
                ref={iframeRef}
                key={`post-audio-${post.id}-${isMuted ? 'muted' : 'unmuted'}`}
                src={`https://www.youtube-nocookie.com/embed/${post.youtube_track.youtube_id}?enablejsapi=1&autoplay=1&mute=${isMuted ? 1 : 0}&start=${post.youtube_track.start_time_seconds || 0}&end=${(post.youtube_track.start_time_seconds || 0) + (post.youtube_track.duration_seconds || 30)}&loop=1&playlist=${post.youtube_track.youtube_id}&controls=0&playsinline=1`}
                title={post.youtube_track.title || 'Áudio'}
                className="absolute -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
                tabIndex={-1}
                aria-hidden="true"
                allow="autoplay; encrypted-media"
              />
            )}

            {/* Music Info Badge overlay on photo (bottom-left) */}
            <div
              onClick={toggleVolume}
              className="absolute bottom-3 left-3 z-20 flex items-center gap-2 max-w-[62%] sm:max-w-[70%] px-3 py-1.5 rounded-full bg-black/65 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-lg cursor-pointer transition-all active:scale-95 group/music"
              title={isMuted ? 'Música silenciada • Toque para ativar som' : 'Música tocando • Toque para silenciar'}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                <Music className={`w-3 h-3 ${!isMuted && isInView ? 'animate-bounce' : ''}`} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold truncate leading-tight text-white/95">
                  {post.youtube_track.title}
                </span>
                <span className="text-[9px] text-white/70 truncate flex items-center gap-1.5 leading-tight">
                  <span className="truncate">{post.youtube_track.artist}</span>
                  {!isMuted && isInView ? (
                    <span className="inline-flex items-end gap-0.5 h-2.5 flex-shrink-0">
                      <span className="w-0.5 h-1.5 bg-rose-400 animate-pulse"></span>
                      <span className="w-0.5 h-2.5 bg-rose-400 animate-pulse delay-75"></span>
                      <span className="w-0.5 h-2 bg-rose-400 animate-pulse delay-150"></span>
                    </span>
                  ) : (
                    <span className="text-rose-400 font-medium flex-shrink-0">
                      {isMuted ? '• Mudo' : '• Pausado'}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Volume Toggle Button on photo (bottom-right) */}
            <button
              type="button"
              onClick={toggleVolume}
              className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-lg transition-all active:scale-95"
              title={isMuted ? 'Ativar som' : 'Tirar som (Mudo)'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span className="text-[10px] font-bold text-white/90">Mudo</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-white/90">Som Ligado</span>
                </>
              )}
            </button>
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

            {/* Repost Button */}
            <button
              onClick={() => setShowRepostModal(true)}
              className={`hover:scale-110 transition-transform flex items-center gap-1 ${
                isReposted
                  ? 'text-emerald-500 font-bold'
                  : 'text-neutral-900 dark:text-white hover:text-emerald-500'
              }`}
              title="Republicar no Feed ou Story"
            >
              <Repeat2 className={`w-6 h-6 ${isReposted ? 'stroke-[2.5]' : ''}`} />
              {(post.reposts_count || 0) > 0 && (
                <span className="text-xs font-bold text-emerald-500">{post.reposts_count}</span>
              )}
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

        {/* Likes and Reposts Count */}
        <div className="flex items-center gap-3 font-bold text-xs text-neutral-900 dark:text-white mb-1.5">
          <span>{post.likes_count.toLocaleString()} curtidas</span>
          {(post.reposts_count || 0) > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
              <Repeat2 className="w-3.5 h-3.5 stroke-[2.2]" />
              {post.reposts_count} republicações
            </span>
          )}
        </div>

        {/* Caption */}
        <div className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed">
          <span
            onClick={() => onOpenProfile(post.profile_id)}
            className="font-bold mr-1.5 text-neutral-900 dark:text-white cursor-pointer hover:underline"
          >
            {post.profile.username}
          </span>
          <MentionText text={post.caption} onOpenProfile={onOpenProfile} />
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

      {/* Repost Feedback Toast */}
      {repostFeedback && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/90 text-white dark:bg-white/95 dark:text-neutral-900 text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <span>{repostFeedback}</span>
        </div>
      )}

      {/* Comments Drawer Modal */}
      <CommentsDrawer
        postId={post.id}
        comments={post.comments || []}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        onOpenProfile={onOpenProfile}
      />

      {/* Repost Modal */}
      <RepostModal
        isOpen={showRepostModal}
        onClose={() => setShowRepostModal(false)}
        post={post}
        isReposted={isReposted}
        onInstantRepost={handleInstantRepost}
        onQuoteRepost={handleQuoteRepost}
        onUndoRepost={handleUndoRepost}
        onRepostToStory={handleRepostToStory}
      />

      {/* Report Profile Modal */}
      <ReportProfileModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedProfile={post.profile}
      />
    </article>
  );
};
