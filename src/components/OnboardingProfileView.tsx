import React, { useState, useRef } from 'react';
import { Sparkles, UserPlus, Image, Globe, Briefcase, User, Rocket, Building, Check, Upload, Camera } from 'lucide-react';
import { ProfileType } from '../types';
import { store } from '../services/store';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
];

interface OnboardingProfileViewProps {
  onCreated: () => void;
}

export const OnboardingProfileView: React.FC<OnboardingProfileViewProps> = ({ onCreated }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_PRESETS[0]);
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [profileType, setProfileType] = useState<ProfileType>('pessoal');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) return;

    store.createProfile({
      full_name: fullName.trim(),
      username: username.trim(),
      avatar_url: avatarUrl.trim() || AVATAR_PRESETS[0],
      bio: bio.trim(),
      website: website.trim(),
      profile_type: profileType,
    });

    onCreated();
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 sm:p-6 text-white font-sans">
      <div className="max-w-lg w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Top Gradient Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white font-bold shadow-lg shadow-rose-500/25 mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Bem-vindo ao InstaConnect
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Nenhum perfil encontrado. Crie o seu primeiro perfil para publicar, compartilhar stories, reels e conversar.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* Avatar Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Foto de Perfil
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row items-center gap-4 mb-3">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <img
                  src={avatarUrl}
                  alt="Avatar Prévia"
                  className="w-20 h-20 rounded-full object-cover border-2 border-rose-500 shadow-xl"
                />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4" />
                  <span>Escolher Foto do Celular</span>
                </button>
                <p className="text-[10px] text-neutral-400">
                  Ou insira a URL / escolha um avatar abaixo:
                </p>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {AVATAR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(preset)}
                  className={`relative rounded-full overflow-hidden flex-shrink-0 transition-transform ${
                    avatarUrl === preset ? 'ring-2 ring-rose-500 scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={preset} alt="" className="w-9 h-9 object-cover" />
                  {avatarUrl === preset && (
                    <div className="absolute inset-0 bg-rose-500/30 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Full Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Ana Maria"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Nome de Usuário (@) *
              </label>
              <input
                type="text"
                required
                placeholder="anamaria"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Biografia / Apresentação
            </label>
            <textarea
              rows={2}
              placeholder="Escreva algo sobre você..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Link ou Website (Opcional)
            </label>
            <input
              type="url"
              placeholder="https://meusite.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Profile Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Tipo do Perfil
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'pessoal', label: 'Pessoal', icon: User },
                { type: 'profissional', label: 'Profissional', icon: Briefcase },
                { type: 'criador', label: 'Criador', icon: Rocket },
                { type: 'empresa', label: 'Empresa', icon: Building },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = profileType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setProfileType(item.type as ProfileType)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                        : 'border-neutral-800 bg-neutral-800/60 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!fullName.trim() || !username.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 text-white font-extrabold text-sm shadow-xl shadow-rose-500/20 hover:opacity-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2 mt-4"
          >
            <UserPlus className="w-5 h-5" />
            <span>Criar Meu Perfil e Entrar</span>
          </button>
        </form>
      </div>
    </div>
  );
};
