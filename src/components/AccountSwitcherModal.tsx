import React, { useState, useRef } from 'react';
import { X, Plus, Check, User, Briefcase, Sparkles, Building2, Globe, Upload } from 'lucide-react';
import { Profile, ProfileType } from '../types';
import { store } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  activeProfile: Profile;
  onSelectProfile: (id: string) => void;
}

export const AccountSwitcherModal: React.FC<Props> = ({
  isOpen,
  onClose,
  profiles,
  activeProfile,
  onSelectProfile
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [profileType, setProfileType] = useState<ProfileType>('pessoal');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');

  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim()) return;

    const newProf = store.createProfile({
      username: username.trim(),
      full_name: fullName.trim(),
      avatar_url: avatarUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      bio: bio.trim(),
      website: website.trim(),
      profile_type: profileType
    });

    onSelectProfile(newProf.id);
    setIsCreating(false);
    onClose();
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        {!isCreating ? (
          <div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
              Alternar Perfis
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
              Gerencie múltiplos perfis (pessoal, profissional, etc.) na mesma conta.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {profiles.map((p) => {
                const isActive = p.id === activeProfile.id;

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProfile(p.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      isActive
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                        : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={p.avatar_url}
                        alt={p.username}
                        className="w-11 h-11 rounded-full object-cover border border-neutral-300 dark:border-neutral-700"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-sm text-neutral-900 dark:text-white">
                          <span>{p.full_name}</span>
                          {p.verified && <span className="text-blue-500 text-xs">✓</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <span>@{p.username}</span>
                          <span className="flex items-center gap-0.5 px-1.5 py-0.2 bg-neutral-200/70 dark:bg-neutral-800 text-[10px] rounded uppercase font-semibold">
                            {getBadgeIcon(p.profile_type)} {p.profile_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsCreating(true)}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-rose-400 dark:border-rose-600 text-rose-600 dark:text-rose-400 font-semibold text-sm hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Perfil Independente</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateProfile} className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Novo Perfil
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Crie um perfil pessoal ou profissional separado.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Nome de Usuário (@handle)
              </label>
              <input
                type="text"
                required
                placeholder="ex: lucas_design"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Nome Completo / Título do Perfil
              </label>
              <input
                type="text"
                required
                placeholder="ex: Lucas Studio & Design"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Tipo do Perfil
              </label>
              <select
                value={profileType}
                onChange={(e) => setProfileType(e.target.value as ProfileType)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              >
                <option value="pessoal">Pessoal 👤</option>
                <option value="profissional">Profissional / Portfólio 💼</option>
                <option value="criador">Criador de Conteúdo 🚀</option>
                <option value="empresa">Empresa / Negócio 🏢</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Foto de Perfil (Avatar)
              </label>
              <input
                type="file"
                ref={avatarFileInputRef}
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <img
                  src={avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'}
                  alt="Prévia"
                  className="w-12 h-12 rounded-full object-cover border-2 border-rose-500 shadow"
                />
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-xl text-xs font-bold border border-neutral-300 dark:border-neutral-700 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-rose-500" />
                  <span>Escolher do Celular</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Biografia (Bio)
              </label>
              <textarea
                rows={2}
                placeholder="Breve descrição do seu perfil..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold text-sm shadow-md hover:opacity-95"
              >
                Criar Perfil
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
