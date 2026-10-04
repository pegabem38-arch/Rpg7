import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Sparkles, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  className?: string;
  variant?: 'button' | 'banner';
}

export const PWAInstallButton: React.FC<Props> = ({ className = '', variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already installed or dismissed, hide
  if (isInstalled || isDismissed) {
    return null;
  }

  // Not ready on Android/Chrome yet and not iOS
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      await install();
    }
  };

  return (
    <>
      {variant === 'button' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 active:scale-95 transition-all ${className}`}
          title="Instalar RPG Social no dispositivo"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar App</span>
        </button>
      ) : (
        <div className={`relative overflow-hidden bg-gradient-to-r from-rose-950/40 via-neutral-900 to-purple-950/40 border border-rose-500/30 rounded-2xl p-3 shadow-lg ${className}`}>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800/60"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-3 pr-6">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Instale o RPG Social</span>
                <Sparkles className="w-3 h-3 text-amber-400" />
              </div>
              <p className="text-[11px] text-neutral-300 truncate">
                Acesse direto da tela inicial, em tela cheia e mais rápido.
              </p>
            </div>
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 shadow-md active:scale-95 transition-all"
            >
              Instalar
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 text-white relative shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-rose-400" />
            </div>

            <h3 className="text-lg font-black text-white mb-1">
              Instalar no iPhone / iPad
            </h3>
            <p className="text-xs text-neutral-400 mb-5">
              Siga os 3 passos simples abaixo no navegador Safari para adicionar o RPG à sua tela inicial:
            </p>

            <div className="space-y-3.5 text-xs text-neutral-300">
              <div className="flex items-start gap-3 bg-neutral-800/60 p-3 rounded-xl border border-neutral-700/60">
                <div className="w-6 h-6 rounded-lg bg-neutral-700 flex items-center justify-center shrink-0 text-white font-bold text-[11px]">
                  1
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Toque no botão</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-700 font-semibold text-white">
                    <Share className="w-3 h-3 text-blue-400" /> Compartilhar
                  </span>
                  <span>no menu inferior do Safari.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-800/60 p-3 rounded-xl border border-neutral-700/60">
                <div className="w-6 h-6 rounded-lg bg-neutral-700 flex items-center justify-center shrink-0 text-white font-bold text-[11px]">
                  2
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Role para baixo e selecione</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-700 font-semibold text-white">
                    <PlusSquare className="w-3 h-3 text-white" /> Adicionar à Tela de Início
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-800/60 p-3 rounded-xl border border-neutral-700/60">
                <div className="w-6 h-6 rounded-lg bg-neutral-700 flex items-center justify-center shrink-0 text-white font-bold text-[11px]">
                  3
                </div>
                <div>
                  <span>Toque em </span>
                  <strong className="text-white font-bold">Adicionar</strong>
                  <span> no canto superior direito para concluir.</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full mt-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 font-bold text-xs transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
