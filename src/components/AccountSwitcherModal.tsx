import React, { useState, useRef } from 'react';
import { 
  X, 
  Plus, 
  Check, 
  User, 
  Briefcase, 
  Sparkles, 
  Building2, 
  Upload, 
  ShieldCheck, 
  LogOut,
  Camera,
  Layers,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Crown
} from 'lucide-react';
import { Profile, ProfileType } from '../types';
import { store } from '../services/store';
import { 
  getStoredGoogleUser, 
  clearStoredGoogleUser,
  ADMIN_EMAIL 
} from '../services/googleAuth';
import { GoogleLogo } from './GoogleSignInModal';
import { compressImage } from '../utils/imageCompressor';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  activeProfile?: Profile | null;
  onSelectProfile: (id: string) => void;
  onGoogleLogout?: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
];

export const AccountSwitcherModal: React.FC<Props> = ({
  isOpen,
  onClose,
  profiles,
  activeProfile,
  onSelectProfile,
  onGoogleLogout
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [profileType, setProfileType] = useState<ProfileType>('pessoal');
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0]);
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);

  const googleUser = getStoredGoogleUser();
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 400, 0.8);
        setAvatarUrl(compressed);
      } catch {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setAvatarUrl(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
    if (!cleanUsername) {
      setErrorMsg('Informe um nome de usuário válido (@username).');
      return;
    }
    if (!fullName.trim()) {
      setErrorMsg('Informe o nome de exibição do perfil.');
      return;
    }

    // Check if username already exists
    if (profiles.some((p) => p.username === cleanUsername)) {
      setErrorMsg(`O @${cleanUsername} já está em uso. Escolha outro.`);
      return;
    }

    const newProf = store.createProfile({
      username: cleanUsername,
      full_name: fullName.trim(),
      avatar_url: avatarUrl || PRESET_AVATARS[0],
      bio: bio.trim(),
      website: website.trim(),
      profile_type: profileType,
      google_email: googleUser?.email,
      google_name: googleUser?.name,
      user_id: googleUser?.google_id
    });

    onSelectProfile(newProf.id);
    setIsCreating(false);
    // Reset form
    setUsername('');
    setFullName('');
    setBio('');
    setWebsite('');
    onClose();
  };

  const handleLogoutGoogle = () => {
    store.handleUserLogout();
    clearStoredGoogleUser();
    onClose();
    if (onGoogleLogout) {
      onGoogleLogout();
    } else {
      window.location.reload();
    }
  };

  const getBadgeIcon = (type: ProfileType) => {
    switch (type) {
      case 'profissional': return <Briefcase className="w-3 h-3 text-blue-500" />;
      case 'criador': return <Sparkles className="w-3 h-3 text-purple-500" />;
      case 'empresa': return <Building2 className="w-3 h-3 text-emerald-500" />;
      default: return <User className="w-3 h-3 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isCreating ? (
          /* Profile List & Switcher */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                Alternar Perfis
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Alterne entre seus perfis ou adicione um novo a qualquer momento.
              </p>
            </div>

            {/* Logged Google Account Banner */}
            {googleUser && (
              <div className="bg-neutral-100 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/60 rounded-2xl p-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="relative shrink-0">
                    <img
                      src={googleUser.picture || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(googleUser.email)}`}
                      alt="Google User"
                      className="w-8 h-8 rounded-full object-cover border border-neutral-300 dark:border-neutral-700"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                      <GoogleLogo />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate flex items-center gap-1.5">
                      <span className="truncate">{googleUser.name}</span>
                      {googleUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? (
                        <span className="shrink-0 text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-black uppercase flex items-center gap-0.5 shadow-sm">
                          <Crown className="w-2.5 h-2.5" /> Admin Geral
                        </span>
                      ) : (
                        <span className="shrink-0 text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-300/40 dark:border-emerald-800/40">
                          Gmail Ativo
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate font-mono">
                      {googleUser.email}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogoutGoogle}
                  className="shrink-0 ml-2 text-xs text-neutral-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg flex items-center gap-1"
                  title="Sair da conta Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Sair</span>
                </button>
              </div>
            )}

            {/* Profiles List */}
            <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-72">
              {profiles.map((p) => {
                const isActive = Boolean(activeProfile && p.id === activeProfile.id);

                return (
                  <div
                    key={p.id}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-500/10 shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProfile(p.id);
                        onClose();
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={p.avatar_url}
                          alt={p.username}
                          className="w-11 h-11 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-900 rounded-full p-0.5 shadow-sm border border-neutral-200 dark:border-neutral-700">
                          {getBadgeIcon(p.profile_type)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                            {p.full_name}
                          </span>
                          {p.verified && (
                            <span className="text-blue-500 text-xs font-bold">✓</span>
                          )}
                          {p.banned && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-red-600 text-white">
                              Banido
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate">
                          @{p.username}
                        </div>
                        <div className="text-[10px] text-neutral-400 capitalize">
                          Perfil {p.profile_type}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {isActive && (
                        <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileToDelete(p);
                        }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Excluir este perfil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create New Profile Button (NO Google prompt, just form!) */}
            <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-full py-3 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all border border-neutral-300 dark:border-neutral-700 shadow-sm"
              >
                <Plus className="w-4 h-4 text-rose-500" />
                <span>Criar Novo Perfil</span>
              </button>
            </div>
          </div>
        ) : (
          /* Create New Profile Form (Instantly creates under current Google account) */
          <div className="flex flex-col flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-colors"
                title="Voltar para lista de perfis"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Criar Novo Perfil
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Vinculado à sua conta: <span className="font-mono text-rose-500">{googleUser?.email}</span>
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateProfile} className="space-y-4">
              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Foto do Perfil
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={avatarUrl}
                    alt="Preview"
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-rose-500/40 border border-neutral-300 dark:border-neutral-700"
                  />
                  <div className="flex-1">
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Enviar imagem
                    </button>
                    <div className="flex items-center gap-1.5 mt-2 overflow-x-auto py-0.5">
                      {PRESET_AVATARS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatarUrl(preset)}
                          className={`rounded-full shrink-0 transition-transform ${
                            avatarUrl === preset ? 'ring-2 ring-rose-500 scale-105' : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={preset} className="w-6 h-6 rounded-full object-cover" alt="preset" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Names */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Nome Completo / Exibição *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: João Gamer ou Loja Oficial"
                    required
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Nome de Usuário (@username) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-neutral-400 text-sm font-semibold select-none">
                      @
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                      placeholder="novoperfil"
                      required
                      className="w-full pl-8 pr-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Profile Type */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Tipo de Perfil
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'pessoal', label: 'Pessoal', icon: User },
                    { type: 'criador', label: 'Criador', icon: Sparkles },
                    { type: 'profissional', label: 'RPG / Gamer', icon: Briefcase },
                    { type: 'empresa', label: 'Empresa', icon: Building2 },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = profileType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setProfileType(item.type as ProfileType)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Biografia (opcional)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  placeholder="Descrição deste perfil..."
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Perfil</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Delete Profile Confirmation Modal */}
      {profileToDelete && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-red-200 dark:border-red-900/60 relative text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-800/40 shadow-sm">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
              Excluir Perfil?
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-3">
              Tem certeza que deseja apagar o perfil <span className="font-bold text-red-500">@{profileToDelete.username}</span> ({profileToDelete.full_name})?
            </p>

            <div className="bg-red-50 dark:bg-red-950/40 rounded-2xl p-3 border border-red-200/80 dark:border-red-800/40 text-left mb-4 text-[11px] text-red-700 dark:text-red-300 space-y-1">
              <p className="font-semibold">⚠️ Esta ação é permanente:</p>
              <ul className="list-disc list-inside space-y-0.5 text-neutral-600 dark:text-neutral-400 text-[10px]">
                <li>Todas as publicações e fotos deste perfil serão apagadas</li>
                <li>Stories e curtas associados serão removidos</li>
                {profiles.length <= 1 && (
                  <li className="text-amber-600 dark:text-amber-400 font-semibold">
                    Este é o seu único perfil. Ao excluí-lo, você será redirecionado para criar um novo perfil para continuar.
                  </li>
                )}
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = profileToDelete.id;
                  const res = store.deleteProfile(idToDelete);
                  setProfileToDelete(null);
                  if (res.remainingCount === 0) {
                    onClose();
                  } else {
                    const active = store.getActiveProfile();
                    if (active) onSelectProfile(active.id);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md shadow-red-600/30 transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
