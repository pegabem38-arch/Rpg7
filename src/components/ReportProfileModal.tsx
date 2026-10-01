import React, { useState } from 'react';
import { ShieldAlert, X, AlertTriangle, CheckCircle, Flag, Send, Lock } from 'lucide-react';
import { Profile, ReportReason } from '../types';
import { store } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reportedProfile: Profile | null;
}

const REPORT_REASONS: { id: ReportReason; label: string; desc: string; icon: string }[] = [
  {
    id: 'harassment',
    label: 'Assédio ou Intimidação',
    desc: 'Mensagens agressivas, perseguição, xingamentos ou humilhação.',
    icon: '🚨'
  },
  {
    id: 'hate_speech',
    label: 'Discurso de Ódio ou Preconceito',
    desc: 'Ofensas direcionadas, intolerância ou injúria.',
    icon: '🤬'
  },
  {
    id: 'inappropriate_content',
    label: 'Conteúdo Impróprio ou Explícito',
    desc: 'Publicações de nudez, imagens perturbadoras ou ilícitas.',
    icon: '🔞'
  },
  {
    id: 'fake_profile',
    label: 'Perfil Falso ou Golpe / Phishing',
    desc: 'Se passando por outra pessoa, golpe ou venda de contas falsas.',
    icon: '👤'
  },
  {
    id: 'spam',
    label: 'Spam ou Divulgação Invasiva',
    desc: 'Envio excessivo de links, propaganda em massa ou bots.',
    icon: '🤖'
  },
  {
    id: 'violence',
    label: 'Ameaça de Violência ou Autolesão',
    desc: 'Incentivo ao perigo ou ameaças à integridade de terceiros.',
    icon: '⚠️'
  },
  {
    id: 'other',
    label: 'Outro Motivo',
    desc: 'Outra violação das diretrizes e convivência do RPG.',
    icon: '📝'
  }
];

export const ReportProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  reportedProfile
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('harassment');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !reportedProfile) return null;

  const currentReasonObj = REPORT_REASONS.find((r) => r.id === selectedReason) || REPORT_REASONS[0];

  const handleSendReport = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!description.trim() || description.trim().length < 5) {
      setErrorMessage('Por favor, informe uma descrição detalhada (mínimo 5 caracteres) do que aconteceu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = store.createReport({
        reported_profile_id: reportedProfile.id,
        reason: selectedReason,
        reason_label: currentReasonObj.label,
        description: description.trim()
      });

      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage('Ocorreu um erro ao enviar a denúncia. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('harassment');
    setDescription('');
    setErrorMessage(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-rose-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-1.5">
                Denunciar Perfil
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Encaminhado diretamente ao administrador geral
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                Denúncia Enviada ao Administrador!
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 max-w-sm mx-auto leading-relaxed">
                Sua denúncia sobre <span className="font-bold text-rose-500">@{reportedProfile.username}</span> foi registrada com prioridade no painel administrativo. O administrador analisará o histórico, posts e contexto para tomar as medidas e punições necessárias.
              </p>

              <div className="p-3 bg-neutral-100 dark:bg-neutral-800/80 rounded-2xl text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2 max-w-sm mx-auto">
                <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Esta denúncia é 100% anônima para o usuário denunciado.</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs hover:opacity-90 shadow-sm"
                >
                  Concluir
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendReport} className="space-y-4">
              {/* Target Profile Card */}
              <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <img
                  src={reportedProfile.avatar_url}
                  alt={reportedProfile.username}
                  className="w-12 h-12 rounded-full object-cover border-2 border-rose-500 shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate">
                    {reportedProfile.full_name}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block truncate">
                    @{reportedProfile.username}
                  </span>
                  <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider block mt-0.5">
                    Perfil a ser denunciado
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-300 text-xs rounded-xl flex items-center gap-2 border border-red-200 dark:border-red-900 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Reasons Selection */}
              <div>
                <label className="block text-xs font-bold text-neutral-900 dark:text-white mb-2">
                  Qual é o motivo da denúncia?
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {REPORT_REASONS.map((r) => {
                    const isSelected = selectedReason === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedReason(r.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
                            : 'bg-white dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{r.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold ${isSelected ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>
                            {r.label}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5">
                            {r.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-bold text-neutral-900 dark:text-white mb-1.5">
                  Descreva o que aconteceu em detalhes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explique o que o usuário fez, envie links, menções ou contexto para que o administrador possa verificar o caso..."
                  className="w-full p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl text-xs text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                  required
                />
                <span className="text-[10px] text-neutral-400 block mt-1">
                  Mínimo de 5 caracteres. Seja claro e objetivo.
                </span>
              </div>

              {/* Privacy Notice */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 flex items-center gap-2">
                <Lock className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>O administrador receberá o relatório completo. O perfil denunciado nunca saberá sua identidade.</span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20 transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Enviando...' : 'Enviar Denúncia'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
