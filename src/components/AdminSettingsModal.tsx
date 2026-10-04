import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  X, 
  Search, 
  CheckCircle, 
  Ban, 
  RotateCcw, 
  User, 
  AlertTriangle,
  Award,
  ExternalLink,
  Crown,
  ShieldAlert,
  Flag,
  Trash2,
  Eye,
  Check,
  Clock,
  Filter
} from 'lucide-react';
import { store } from '../services/store';
import { Profile, ProfileReport } from '../types';
import { ADMIN_EMAIL, isAppAdmin, GoogleUser } from '../services/googleAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: GoogleUser | null;
  onOpenProfile: (profileId: string) => void;
}

export const AdminSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenProfile
}) => {
  const [mainTab, setMainTab] = useState<'users' | 'reports'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'banned' | 'unverified'>('all');
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [banPromptProfile, setBanPromptProfile] = useState<Profile | null>(null);
  const [banReason, setBanReason] = useState('Violação das diretrizes da comunidade');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const hasAccess = isAppAdmin(currentUser?.email);

  useEffect(() => {
    if (isOpen && hasAccess) {
      store.loadAllProfilesForAdmin();
      store.loadReportsForAdmin();
    }
    return store.subscribe(() => setTick((t) => t + 1));
  }, [isOpen, hasAccess]);

  if (!isOpen) return null;
  if (!hasAccess) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 text-center border border-red-500/30 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-neutral-900 dark:text-white mb-2">
            Acesso Restrito ao Administrador
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-6">
            Esta configuração é exclusiva para a administração do aplicativo.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs hover:opacity-90"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const allProfiles = store.getAllProfiles();
  const verifiedCount = allProfiles.filter((p) => p.verified).length;
  const bannedCount = allProfiles.filter((p) => p.banned).length;

  const reports = store.getReports();
  const pendingReportsCount = store.getPendingReportsCount();
  const resolvedReportsCount = reports.filter((r) => r.status === 'resolved').length;

  const filteredProfiles = allProfiles.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q || 
      p.username.toLowerCase().includes(q) || 
      p.full_name.toLowerCase().includes(q) || 
      (p.google_email && p.google_email.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filter === 'verified') return !!p.verified;
    if (filter === 'banned') return !!p.banned;
    if (filter === 'unverified') return !p.verified && !p.banned;
    return true;
  });

  const filteredReports = reports.filter((r) => {
    if (reportFilter === 'all') return true;
    return r.status === reportFilter;
  });

  const showFeedback = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleToggleVerified = (profile: Profile) => {
    const newStatus = store.toggleVerifyProfile(profile.id);
    showFeedback(
      newStatus
        ? `Selo de verificado concedido para @${profile.username}!`
        : `Selo de verificado removido de @${profile.username}.`
    );
  };

  const handleConfirmBan = () => {
    if (!banPromptProfile) return;
    store.toggleBanProfile(banPromptProfile.id, banReason);
    showFeedback(`Usuário @${banPromptProfile.username} foi BANIDO com sucesso.`);
    setBanPromptProfile(null);
    setBanReason('Violação das diretrizes da comunidade');
  };

  const handleUnban = (profile: Profile) => {
    store.toggleBanProfile(profile.id);
    showFeedback(`Usuário @${profile.username} foi DESBANIDO.`);
  };

  const handleBanFromReport = (report: ProfileReport) => {
    store.resolveReport(report.id, 'ban');
    showFeedback(`Usuário denunciado (@${report.reported_profile?.username || 'perfil'}) foi BANIDO e denúncia resolvida.`);
  };

  const handleDismissReport = (reportId: string) => {
    store.resolveReport(reportId, 'dismiss');
    showFeedback('Denúncia descartada como improcedente.');
  };

  const handleResolveReport = (reportId: string) => {
    store.resolveReport(reportId, 'resolve');
    showFeedback('Denúncia marcada como resolvida.');
  };

  const handleDeleteReport = (reportId: string) => {
    store.deleteReport(reportId);
    showFeedback('Registro de denúncia excluído.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        
        {/* Header with Admin Badge */}
        <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-neutral-900 dark:text-white">
                  Painel do Administrador Geral
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Admin Master
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Logado com: <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{currentUser?.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-950 px-4 sm:px-6 pt-2">
          <button
            onClick={() => setMainTab('users')}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              mainTab === 'users'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Gerenciar Usuários ({allProfiles.length})</span>
          </button>

          <button
            onClick={() => setMainTab('reports')}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all relative ${
              mainTab === 'reports'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Central de Denúncias</span>
            {pendingReportsCount > 0 ? (
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-red-600 text-white animate-pulse shadow-sm">
                {pendingReportsCount} pendentes
              </span>
            ) : (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                {reports.length}
              </span>
            )}
          </button>
        </div>

        {/* Action feedback toast */}
        {actionNotice && (
          <div className="bg-emerald-500 text-white text-xs font-bold py-2 px-4 text-center animate-in slide-in-from-top duration-200 shadow-md">
            {actionNotice}
          </div>
        )}

        {mainTab === 'reports' ? (
          <>
            {/* Report Metric Cards */}
            <div className="grid grid-cols-3 gap-3 p-4 sm:px-6 bg-neutral-50 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800">
              <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Total Denúncias</span>
                  <p className="text-xl font-black text-neutral-900 dark:text-white">{reports.length}</p>
                </div>
                <ShieldAlert className="w-6 h-6 text-neutral-400" />
              </div>

              <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-red-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-red-500">Pendentes</span>
                  <p className="text-xl font-black text-red-500">{pendingReportsCount}</p>
                </div>
                <Clock className="w-6 h-6 text-red-500" />
              </div>

              <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-500">Resolvidas</span>
                  <p className="text-xl font-black text-emerald-500">{resolvedReportsCount}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
            </div>

            {/* Report Filters */}
            <div className="p-4 sm:px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: `Todas (${reports.length})` },
                    { id: 'pending', label: `Pendentes (${pendingReportsCount})` },
                    { id: 'resolved', label: `Resolvidas (${resolvedReportsCount})` },
                    { id: 'dismissed', label: `Descartadas (${reports.filter(r => r.status === 'dismissed').length})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setReportFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      reportFilter === tab.id
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reports List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {filteredReports.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    Nenhuma denúncia pendente nesta seção!
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Todas as denúncias enviadas pelos perfis aparecem aqui com detalhes para você analisar e tomar decisões.
                  </p>
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isPending = report.status === 'pending';
                  const isResolved = report.status === 'resolved';

                  return (
                    <div
                      key={report.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                        isPending
                          ? 'bg-red-50/40 dark:bg-red-950/15 border-red-200 dark:border-red-900/60 shadow-sm'
                          : isResolved
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40'
                          : 'bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800 opacity-75'
                      }`}
                    >
                      {/* Report Header: Reporter and Reported Profiles */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Status Badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isPending
                                ? 'bg-red-500 text-white shadow-sm'
                                : isResolved
                                ? 'bg-emerald-600 text-white'
                                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                            }`}
                          >
                            {isPending ? '⚠️ Pendente' : isResolved ? '✓ Resolvida' : '✖ Descartada'}
                          </span>

                          {/* Reason Tag */}
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            {report.reason_label}
                          </span>

                          {/* Date */}
                          <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(report.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>

                        {/* Delete Report Button */}
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors self-end sm:self-auto"
                          title="Excluir relatório"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Profiles Row: Who reported WHO */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-neutral-900/80 p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80">
                        {/* Reported Profile */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={report.reported_profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover border-2 border-red-500 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider block">
                                Perfil Denunciado
                              </span>
                              <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate">
                                @{report.reported_profile?.username || 'desconhecido'}
                              </span>
                              <span className="text-[10px] text-neutral-500 truncate block">
                                {report.reported_profile?.full_name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {report.reported_profile?.banned && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-600 text-white">
                                Banido
                              </span>
                            )}
                            <button
                              onClick={() => {
                                onClose();
                                onOpenProfile(report.reported_profile_id);
                              }}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-neutral-800"
                              title="Abrir perfil denunciado"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Reporter Profile */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/50 dark:border-neutral-800/50">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={report.reporter_profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover border-2 border-neutral-400 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">
                                Denunciante (Quem enviou)
                              </span>
                              <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate">
                                @{report.reporter_profile?.username || 'desconhecido'}
                              </span>
                              <span className="text-[10px] text-neutral-500 truncate block">
                                {report.reporter_profile?.full_name}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              onClose();
                              onOpenProfile(report.reporter_profile_id);
                            }}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-neutral-800"
                            title="Abrir perfil do denunciante"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Description Body */}
                      <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          Descrição do Ocorrido:
                        </span>
                        <p className="text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                          "{report.description}"
                        </p>
                      </div>

                      {/* Decision / Action Buttons for Admin */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          {report.reported_profile && !report.reported_profile.banned && (
                            <button
                              onClick={() => handleBanFromReport(report)}
                              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Banir Usuário Denunciado</span>
                            </button>
                          )}

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleResolveReport(report.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Marcar como Resolvido</span>
                              </button>

                              <button
                                onClick={() => handleDismissReport(report.id)}
                                className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-xs transition-colors"
                              >
                                Descartar Denúncia
                              </button>
                            </>
                          )}
                        </div>

                        {report.action_taken === 'banned' && (
                          <span className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Punição aplicada: Usuário banido
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            {/* Admin Metric Cards */}
            <div className="grid grid-cols-3 gap-3 p-4 sm:px-6 bg-neutral-50 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800">
              <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Total Usuários</span>
                  <p className="text-xl font-black text-neutral-900 dark:text-white">{allProfiles.length}</p>
                </div>
                <User className="w-6 h-6 text-neutral-400" />
              </div>

              <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-blue-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-500">Verificados</span>
                  <p className="text-xl font-black text-blue-500">{verifiedCount}</p>
                </div>
                <Award className="w-6 h-6 text-blue-500" />
              </div>

              <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-red-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-red-500">Banidos</span>
                  <p className="text-xl font-black text-red-500">{bannedCount}</p>
                </div>
                <Ban className="w-6 h-6 text-red-500" />
              </div>
            </div>

            {/* Filter bar & Search */}
            <div className="p-4 sm:px-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar por @username, nome ou e-mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 border border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(
                  [
                    { id: 'all', label: 'Todos' },
                    { id: 'verified', label: 'Verificados' },
                    { id: 'banned', label: 'Banidos' },
                    { id: 'unverified', label: 'Sem Selo' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      filter === tab.id
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* User Management List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {filteredProfiles.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-xs">
                  Nenhum perfil encontrado para o filtro aplicado.
                </div>
              ) : (
                filteredProfiles.map((p) => {
                  const isAdminProfile = p.google_email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

                  return (
                    <div
                      key={p.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        p.banned
                          ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                          : p.verified
                          ? 'bg-blue-50/40 dark:bg-blue-950/15 border-blue-200 dark:border-blue-900/40'
                          : 'bg-white dark:bg-neutral-900/80 border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={p.avatar_url}
                          alt={p.username}
                          className="w-11 h-11 rounded-full object-cover border-2 border-neutral-300 dark:border-neutral-700 shrink-0"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                              {p.full_name}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              @{p.username}
                            </span>

                            {p.verified && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                                ✓ Verificado
                              </span>
                            )}

                            {p.banned && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-sm">
                                <Ban className="w-2.5 h-2.5" /> Banido
                              </span>
                            )}

                            {isAdminProfile && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                                👑 Admin
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                            {p.google_email && (
                              <span className="font-mono text-[10px] truncate max-w-[180px] sm:max-w-none text-neutral-400">
                                {p.google_email}
                              </span>
                            )}
                            <span>•</span>
                            <span>{p.posts_count} posts</span>
                            <span>•</span>
                            <span>{p.followers_count} seguidores</span>
                          </div>

                          {p.banned && p.ban_reason && (
                            <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold">
                              Motivo do ban: "{p.ban_reason}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions for this user */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => {
                            onClose();
                            onOpenProfile(p.id);
                          }}
                          className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          title="Ver Perfil"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        {/* Toggle Verified Button */}
                        <button
                          onClick={() => handleToggleVerified(p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            p.verified
                              ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{p.verified ? 'Remover Selo' : 'Dar Verificado'}</span>
                        </button>

                        {/* Toggle Ban Button (Don't allow banning own admin profile) */}
                        {isAdminProfile ? (
                          <span className="text-[10px] font-bold text-amber-500 px-2 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
                            Protegido
                          </span>
                        ) : p.banned ? (
                          <button
                            onClick={() => handleUnban(p)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Desbanir</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setBanPromptProfile(p)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 bg-red-500/10 hover:bg-red-600 text-red-600 hover:text-white transition-all border border-red-300 dark:border-red-800/60"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Banir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Modal Footer with quick instructions */}
        <div className="p-3 sm:px-6 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-neutral-500 text-[11px]">
          <span>⚡ As alterações de verificação e banimento entram em vigor imediatamente.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs"
          >
            Concluir
          </button>
        </div>
      </div>

      {/* Confirmation Modal to Ban User */}
      {banPromptProfile && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full p-6 text-center border border-red-500/30 shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 flex items-center justify-center mx-auto shadow-md">
              <Ban className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Banir @{banPromptProfile.username}?
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Ao banir este perfil, ele não poderá publicar posts, stories, curtas nem comentar.
              </p>
            </div>

            <div className="text-left space-y-1">
              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                Motivo da Suspensão:
              </label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Ex: Conduta imprópria, spam, etc."
                className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBanPromptProfile(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBan}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors"
              >
                Confirmar Banimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
