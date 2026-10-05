import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  UserPlus, 
  Briefcase, 
  User, 
  Rocket, 
  Building, 
  Check, 
  Upload, 
  Camera, 
  ShieldCheck, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Profile, ProfileType } from '../types';
import { store } from '../services/store';
import { 
  GoogleUser, 
  deriveProfileFromGoogle,
  clearStoredGoogleUser 
} from '../services/googleAuth';
import { GoogleLogo } from './GoogleSignInModal';
import { compressImage } from '../utils/imageCompressor';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
];

interface OnboardingProfileViewProps {
  googleUser: GoogleUser;
  existingProfiles?: Profile[];
  onCreated: (newProfileId?: string) => void;
  onSelectExisting?: (profileId: string) => void;
  onLogout?: () => void;
}

export const OnboardingProfileView: React.FC<OnboardingProfileViewProps> = ({ 
  googleUser, 
  existingProfiles = [],
  onCreated,
  onSelectExisting,
  onLogout 
}) => {
  const derived = deriveProfileFromGoogle(googleUser);

  // Form Fields pre-filled with Google account data
  const hasExisting = existingProfiles.length > 0;
  const [fullName, setFullName] = useState(hasExisting ? '' : (derived.fullName || 'João'));
  const [username, setUsername] = useState(hasExisting ? '' : (derived.username || 'joao'));
  const [avatarUrl, setAvatarUrl] = useState(derived.avatarUrl || AVATAR_PRESETS[0]);
  const [bio, setBio] = useState('Bem-vindo ao meu perfil no RPG!');
  const [website, setWebsite] = useState('');
  const [profileType, setProfileType] = useState<ProfileType>('pessoal');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleLogout = () => {
    clearStoredGoogleUser();
    if (onLogout) onLogout();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
    if (!cleanUsername) {
      setErrorMsg('Por favor, informe um nome de usuário válido (@username).');
      return;
    }
    if (!fullName.trim()) {
      setErrorMsg('Por favor, informe seu nome de exibição.');
      return;
    }

    const newProf = store.createProfile({
      full_name: fullName.trim(),
      username: cleanUsername,
      avatar_url: avatarUrl,
      bio: bio.trim(),
      website: website.trim(),
      profile_type: profileType,
      google_email: googleUser.email,
      google_name: googleUser.name,
      user_id: googleUser.google_id
    });

    onCreated(newProf.id);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-rose-500 selection:text-white">
      {/* Background radial highlight */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 my-8">
        
        {/* Master Google Account Banner */}
        <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              {googleUser.picture ? (
                <img 
                  src={googleUser.picture} 
                  alt={googleUser.name} 
                  className="w-10 h-10 rounded-full object-cover border border-neutral-600 shadow" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-neutral-300" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow">
                <GoogleLogo />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>{googleUser.name}</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3 h-3" /> Conta Google Conectada
                </span>
              </div>
              <div className="text-xs text-neutral-400 font-mono">
                {googleUser.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="self-end sm:self-center inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-red-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-neutral-700/50"
            title="Trocar conta Google"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Trocar conta</span>
          </button>
        </div>

        {/* Existing profiles notice for multi-device */}
        {hasExisting && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-300">
                  Outro Dispositivo Conectado
                </h3>
                <p className="text-xs text-neutral-300 mt-1">
                  Crie um novo perfil para este dispositivo abaixo, ou se preferir, selecione um perfil já existente da sua conta:
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {existingProfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectExisting?.(p.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-white transition-all active:scale-95 shadow-sm"
                    >
                      {p.avatar_url && (
                        <img src={p.avatar_url} alt={p.username} className="w-4 h-4 rounded-full object-cover" />
                      )}
                      <span>Entrar como @{p.username}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Heading */}
        <div className="text-left mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{hasExisting ? 'Criar Novo Perfil para este Dispositivo' : 'Crie seu Primeiro Perfil'}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {hasExisting ? 'Criar Novo Perfil' : 'Configure seu perfil no RPG'}
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            {hasExisting 
              ? 'Preencha os dados abaixo para criar um novo perfil ou personagem neste dispositivo.' 
              : 'Com esta conta Google, você pode criar quantos perfis quiser depois sem precisar fazer login novamente.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Foto de Perfil
            </label>
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <img
                  src={avatarUrl}
                  alt="Preview"
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-rose-500/40 border-2 border-neutral-900 shadow-md"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                  title="Fazer upload de foto"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded-lg border border-neutral-700 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Enviar do dispositivo
                  </button>

                  {googleUser.picture && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(googleUser.picture!)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded-lg border border-neutral-700 transition-colors"
                    >
                      <GoogleLogo />
                      Usar foto Google
                    </button>
                  )}
                </div>

                {/* Preset Avatars */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(preset)}
                      className={`relative rounded-full transition-transform shrink-0 ${
                        avatarUrl === preset ? 'ring-2 ring-rose-500 scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={preset} className="w-7 h-7 rounded-full object-cover" alt="preset" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Tipo de Perfil Inicial
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'pessoal', label: 'Pessoal', icon: User, desc: 'Amigos & Fotos' },
                { type: 'criador', label: 'Criador', icon: Sparkles, desc: 'Vídeos & Curtas' },
                { type: 'profissional', label: 'RPG / Gamer', icon: Rocket, desc: 'Comunidades' },
                { type: 'empresa', label: 'Negócios', icon: Building, desc: 'Empresa & Vendas' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = profileType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setProfileType(item.type as ProfileType)}
                    className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/10 text-white ring-1 ring-rose-500'
                        : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-rose-400' : 'text-neutral-500'}`} />
                    <span className="text-xs font-bold text-neutral-200">{item.label}</span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name & Username Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Nome Completo / Exibição *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: João Silva ou Cavaleiro Negro"
                required
                className="w-full px-3.5 py-2.5 bg-neutral-800/80 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Nome de Usuário (@username) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-neutral-500 text-sm font-semibold select-none">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                  placeholder="usuario"
                  required
                  className="w-full pl-8 pr-3.5 py-2.5 bg-neutral-800/80 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Biografia
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Escreva algo sobre você ou seu personagem..."
              className="w-full px-3.5 py-2.5 bg-neutral-800/80 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold rounded-2xl shadow-xl shadow-rose-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <UserPlus className="w-5 h-5" />
            <span>Criar Meu Perfil e Entrar</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
};
