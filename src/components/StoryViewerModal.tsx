import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Heart, Sparkles, Trash2, Repeat2, Music, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Story } from '../types';
import { store } from '../services/store';

interface Props {
  stories: Story[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: (profileId: string) => void;
}

const EMOJI_REACTIONS = ['❤️', '😂', '🔥', '😮', '😢', '👏', '🎉', '💯'];

export const StoryViewerModal: React.FC<Props> = ({
  stories,
  initialIndex,
  isOpen,
  onClose,
  onOpenProfile
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sentFeedback, setSentFeedback] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isStoryMuted, setIsStoryMuted] = useState(false);

  const currentStory = stories[currentIndex] || stories[0];
  const hasMusic = Boolean(currentStory?.youtube_track);
  const [isAudioReady, setIsAudioReady] = useState(!hasMusic);

  // Story playback duration:
  // If story has attached music, play for 15 seconds (or user selected duration if greater),
  // giving plenty of time to enjoy the song. Stories without music play for 7 seconds.
  const storyDurationSeconds = hasMusic
    ? Math.max(15, currentStory?.youtube_track?.duration_seconds || 15)
    : 7;

  // Reset index and progress whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const safeIndex = stories.length > 0 ? Math.max(0, Math.min(initialIndex, stories.length - 1)) : 0;
      setCurrentIndex(safeIndex);
      setProgress(0);
      setIsPaused(false);
      setMessageText('');
      setSentFeedback(null);
      setShowConfirmDelete(false);
      const firstStory = stories[safeIndex];
      setIsAudioReady(!firstStory?.youtube_track);
    }
  }, [isOpen]);

  // Audio readiness detection: Do not start story until music is loaded and buffered
  useEffect(() => {
    if (!isOpen || !hasMusic) {
      setIsAudioReady(true);
      return;
    }

    setIsAudioReady(false);

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        // YouTube API events indicating player is ready or playing/buffering
        if (
          data?.event === 'onReady' ||
          data?.info?.playerState === 1 || // Playing
          data?.info?.playerState === 3    // Buffering
        ) {
          setIsAudioReady(true);
        }
      } catch {
        // Ignore non-json messages
      }
    };

    window.addEventListener('message', handleMessage);

    // Fallback: If network is slow or postMessage blocked, start after 2.5s maximum
    const fallbackTimeout = setTimeout(() => {
      setIsAudioReady(true);
    }, 2500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(fallbackTimeout);
    };
  }, [isOpen, currentIndex, hasMusic, currentStory?.id]);

  // Progress timer interval - only starts ticking once music is ready and lasts for storyDurationSeconds!
  useEffect(() => {
    if (!isOpen || isPaused || stories.length === 0 || showConfirmDelete || (hasMusic && !isAudioReady)) return;

    // 100% total progress divided by total 100ms intervals (e.g. 15s = 150 intervals = 0.667% per tick)
    const stepIncrement = 100 / (storyDurationSeconds * 10);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + stepIncrement;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, showConfirmDelete, stories.length, hasMusic, isAudioReady, storyDurationSeconds]);

  // Advance story when progress reaches 100%
  useEffect(() => {
    if (progress >= 100 && isOpen && !isPaused && !showConfirmDelete) {
      if (currentIndex < stories.length - 1) {
        const nextStory = stories[currentIndex + 1];
        setIsAudioReady(!nextStory?.youtube_track);
        setCurrentIndex((c) => c + 1);
        setProgress(0);
      } else {
        onClose();
      }
    }
  }, [progress, currentIndex, stories.length, isOpen, isPaused, showConfirmDelete, onClose]);

  if (!isOpen || stories.length === 0) return null;
  if (!currentStory) return null;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      const nextStory = stories[currentIndex + 1];
      setIsAudioReady(!nextStory?.youtube_track);
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevStory = stories[currentIndex - 1];
      setIsAudioReady(!prevStory?.youtube_track);
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleConfirmDelete = () => {
    const targetId = currentStory.id;
    store.deleteStory(targetId);
    setShowConfirmDelete(false);

    if (stories.length <= 1) {
      onClose();
    } else {
      if (currentIndex >= stories.length - 1) {
        setCurrentIndex(Math.max(0, stories.length - 2));
      }
      setProgress(0);
      setIsPaused(false);
    }
  };

  const handleEmojiReaction = (emoji: string) => {
    store.reactToStory(currentStory.id, 'emoji', emoji);
    setSentFeedback(`Reagiu ${emoji}`);
    setTimeout(() => setSentFeedback(null), 2000);
  };

  const handleSendTextReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    store.reactToStory(currentStory.id, 'text', messageText.trim());
    setSentFeedback('Mensagem enviada no Direct! ✉️');
    setMessageText('');
    setTimeout(() => setSentFeedback(null), 2500);
  };

  const handleRepostStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.repostStoryToStory(currentStory.id);
    setSentFeedback('Story republicado no seu perfil! 🎉');
    setTimeout(() => setSentFeedback(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
      {/* Container aspect-ratio 9:16 story player */}
      <div
        className="relative w-full max-w-[440px] h-full md:h-[88vh] md:max-h-[820px] bg-neutral-900 md:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-neutral-800"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Story Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-1 mb-2">
            {stories.map((s, idx) => {
              let width = '0%';
              if (idx < currentIndex) width = '100%';
              else if (idx === currentIndex) width = `${progress}%`;

              return (
                <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear"
                    style={{ width }}
                  />
                </div>
              );
            })}
          </div>

          {/* User Header */}
          <div className="flex items-center justify-between">
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenProfile) {
                  onClose();
                  onOpenProfile(currentStory.profile_id);
                }
              }}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity group z-30"
            >
              <img
                src={currentStory.profile.avatar_url}
                alt={currentStory.profile.username}
                className="w-9 h-9 rounded-full object-cover border-2 border-rose-500 group-hover:scale-105 transition-transform"
              />
              <div className="text-white">
                <span className="font-bold text-sm block leading-none hover:underline">
                  @{currentStory.profile.username}
                </span>
                <span className="text-[10px] text-white/80 flex items-center gap-1.5 mt-0.5">
                  <span>{new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span className="text-rose-300 font-semibold">
                    {(() => {
                      const expiryTime = currentStory.expires_at
                        ? new Date(currentStory.expires_at).getTime()
                        : new Date(currentStory.created_at).getTime() + 24 * 60 * 60 * 1000;
                      const diffMs = expiryTime - Date.now();
                      if (diffMs <= 0) return 'Expirado';
                      const hours = Math.floor(diffMs / (1000 * 60 * 60));
                      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      if (hours > 0) return `Expira em ${hours}h ${mins}m`;
                      return `Expira em ${mins}m`;
                    })()}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentStory.youtube_track && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsStoryMuted(prev => !prev);
                  }}
                  className="text-white/90 hover:text-white p-1.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-transform hover:scale-110 z-30 flex items-center justify-center"
                  title={isStoryMuted ? 'Ativar som' : 'Silenciar áudio'}
                >
                  {isStoryMuted ? (
                    <VolumeX className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                  )}
                </button>
              )}

              {currentStory.profile_id !== store.getActiveProfile().id && (
                <button
                  type="button"
                  onClick={handleRepostStory}
                  className="text-white/80 hover:text-emerald-400 p-1.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-transform hover:scale-110 z-30"
                  title="Republicar no seu Story"
                >
                  <Repeat2 className="w-5 h-5 stroke-[2.2]" />
                </button>
              )}

              {currentStory.profile_id === store.getActiveProfile().id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsPaused(true);
                    setShowConfirmDelete(true);
                  }}
                  className="text-red-400 hover:text-red-300 p-1.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-transform hover:scale-110 z-30"
                  title="Excluir Story"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="text-white/80 hover:text-white p-1 rounded-full bg-black/40 backdrop-blur-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Repost attribution chip if story is a repost of a post */}
          {currentStory.repost_of_post && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenProfile) {
                  onClose();
                  onOpenProfile(currentStory.repost_of_post!.profile_id);
                }
              }}
              className="mt-2 bg-black/60 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 flex items-center gap-2.5 cursor-pointer hover:bg-black/80 transition-colors z-30"
            >
              <img
                src={currentStory.repost_of_post.profile.avatar_url}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-rose-500 shrink-0"
              />
              <div className="min-w-0 flex-1 text-white">
                <div className="flex items-center gap-1">
                  <Repeat2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="font-bold text-xs truncate">
                    Post de @{currentStory.repost_of_post.profile.username}
                  </span>
                </div>
                <p className="text-[10px] text-white/80 truncate">
                  {currentStory.repost_of_post.caption || 'Toque para ver a publicação'}
                </p>
              </div>
            </div>
          )}

          {/* Repost attribution chip if story is a repost of another story */}
          {currentStory.repost_of_story && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenProfile) {
                  onClose();
                  onOpenProfile(currentStory.repost_of_story!.profile_id);
                }
              }}
              className="mt-2 bg-black/60 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 flex items-center gap-2.5 cursor-pointer hover:bg-black/80 transition-colors z-30"
            >
              <img
                src={currentStory.repost_of_story.profile.avatar_url}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-rose-500 shrink-0"
              />
              <div className="min-w-0 flex-1 text-white">
                <div className="flex items-center gap-1">
                  <Repeat2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="font-bold text-xs truncate">
                    Story de @{currentStory.repost_of_story.profile.username}
                  </span>
                </div>
                <p className="text-[10px] text-white/80 truncate">
                  Toque para ver o perfil
                </p>
              </div>
            </div>
          )}

          {/* Music Track Badge on Story */}
          {currentStory.youtube_track && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsStoryMuted((prev) => !prev);
              }}
              className="mt-2 inline-flex items-center gap-2 max-w-[90%] px-3 py-1.5 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/20 text-white shadow-lg cursor-pointer transition-all active:scale-95"
              title={
                !isAudioReady
                  ? 'Carregando música...'
                  : isStoryMuted
                  ? 'Música silenciada • Toque para ativar som'
                  : 'Música tocando • Toque para silenciar'
              }
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                {!isAudioReady ? (
                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                ) : (
                  <Music className={`w-3 h-3 ${!isStoryMuted ? 'animate-bounce' : ''}`} />
                )}
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold truncate">
                  {currentStory.youtube_track.title}
                </span>
                <span className="text-[10px] text-white/70 truncate">
                  • {currentStory.youtube_track.artist}
                </span>
                {!isAudioReady ? (
                  <span className="text-[10px] text-rose-300 font-semibold animate-pulse ml-0.5">
                    • Carregando áudio...
                  </span>
                ) : !isStoryMuted ? (
                  <span className="inline-flex items-end gap-0.5 h-2.5 flex-shrink-0 ml-0.5">
                    <span className="w-0.5 h-1.5 bg-rose-400 animate-pulse"></span>
                    <span className="w-0.5 h-2.5 bg-rose-400 animate-pulse delay-75"></span>
                    <span className="w-0.5 h-2 bg-rose-400 animate-pulse delay-150"></span>
                  </span>
                ) : (
                  <span className="text-[10px] text-rose-400 font-semibold ml-0.5">• Mudo</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Media Background */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <img
            src={currentStory.media_url}
            alt="Story"
            className="w-full h-full object-cover"
          />

          {/* Hidden Story Music Audio Player - Starts playing on entry and stops on story finish */}
          {currentStory.youtube_track && isOpen && !showConfirmDelete && (
            <iframe
              key={`story-audio-${currentStory.id}-${isStoryMuted ? 'muted' : 'unmuted'}`}
              onLoad={() => {
                // Once iframe document loads, allow a brief moment for audio buffer then start story progression
                setTimeout(() => {
                  setIsAudioReady(true);
                }, 400);
              }}
              src={`https://www.youtube-nocookie.com/embed/${currentStory.youtube_track.youtube_id}?enablejsapi=1&autoplay=1&mute=${isStoryMuted ? 1 : 0}&start=${currentStory.youtube_track.start_time_seconds || 0}&end=${(currentStory.youtube_track.start_time_seconds || 0) + storyDurationSeconds}&loop=1&playlist=${currentStory.youtube_track.youtube_id}&controls=0&playsinline=1`}
              title={currentStory.youtube_track.title}
              className="absolute -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
              allow="autoplay; encrypted-media"
            />
          )}

          {/* Delete Confirmation Modal Overlay */}
          {showConfirmDelete && (
            <div
              className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-xs w-full text-center space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-500/40 text-red-500 mx-auto flex items-center justify-center">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">Excluir Story?</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Esta publicação será excluída permanentemente.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConfirmDelete(false);
                      setIsPaused(false);
                    }}
                    className="flex-1 py-2 rounded-xl border border-neutral-700 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmDelete();
                    }}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-colors"
                  >
                    Sim, Excluir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Toast Overlay */}
          {sentFeedback && (
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-30 bg-rose-600/90 text-white font-bold text-center py-3 px-4 rounded-2xl backdrop-blur-md shadow-2xl animate-bounce">
              {sentFeedback}
            </div>
          )}

          {/* Click Touch Targets for Previous / Next */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer"
          />
        </div>

        {/* Desktop Side Navigation Arrows */}
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="hidden md:flex absolute -left-14 lg:-left-16 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 z-30 transition-transform hover:scale-105"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={handleNext}
          className="hidden md:flex absolute -right-14 lg:-right-16 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-30 transition-transform hover:scale-105"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Bottom Reaction Toolbar */}
        <div className="z-20 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2.5">
          {/* Quick Emoji Bar */}
          <div className="flex items-center justify-between px-1 gap-1">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiReaction(emoji)}
                className="text-xl hover:scale-130 transition-transform p-1.5 rounded-full hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Text Reply Input */}
          <form onSubmit={handleSendTextReply} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Enviar mensagem para ${currentStory.profile.username}...`}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              className="flex-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-white placeholder-white/60 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="submit"
              disabled={!messageText.trim()}
              className="p-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white rounded-full transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
