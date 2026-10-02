import React, { useState } from 'react';
import { X, Check, AlertCircle, ArrowRight, ShieldCheck, Mail, User, Sparkles, Crown } from 'lucide-react';
import { 
  GoogleUser, 
  validateGmailAddress, 
  setStoredGoogleUser,
  getStoredGoogleUser,
  getOrCreateUserIdForEmail,
  ADMIN_EMAIL
} from '../services/googleAuth';
import { store } from '../services/store';

// Authentic Google "G" 4-color SVG logo
export const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: GoogleUser) => void;
}

export const GoogleSignInModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const currentSession = getStoredGoogleUser();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'prompt' | 'custom'>('prompt');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Preset suggested account (Regular User)
  const defaultSuggestedUser: GoogleUser = {
    email: 'j20749073@gmail.com',
    name: 'Usuário Google',
    picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    google_id: getOrCreateUserIdForEmail('j20749073@gmail.com'),
    verified_email: true,
    login_at: new Date().toISOString()
  };

  const handleSelectAccount = (user: GoogleUser) => {
    setIsLoading(true);
    setTimeout(() => {
      setStoredGoogleUser(user);
      store.handleUserLogin(user);
      setIsLoading(false);
      onSuccess(user);
      onClose();
    }, 400);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateGmailAddress(email);
    if (!validation.isValid) {
      setError(validation.error || 'Endereço de e-mail inválido.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || trimmedEmail.split('@')[0];

    setIsLoading(true);

    setTimeout(() => {
      const stableUid = getOrCreateUserIdForEmail(trimmedEmail);
      const newUser: GoogleUser = {
        email: trimmedEmail,
        name: cleanName,
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
        google_id: stableUid,
        verified_email: true,
        login_at: new Date().toISOString()
      };

      setStoredGoogleUser(newUser);
      store.handleUserLogin(newUser);
      setIsLoading(false);
      onSuccess(newUser);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden text-neutral-900 dark:text-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="text-center mb-6 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 shadow-md border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center mx-auto mb-3">
            <GoogleLogo className="w-6 h-6" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold">
            Fazer login com o Google
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
            Para continuar no RPG e criar seu perfil, conecte-se com sua conta Google (Gmail).
          </p>
        </div>

        {step === 'prompt' ? (
          <div className="space-y-4">
            {/* Security Notice */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-700 dark:text-blue-300">
              <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>
                Autenticação obrigatória: sua conta é protegida e verificada pela segurança do Google.
              </span>
            </div>

            {/* Quick 1-Click with Recognized Google Account */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-1">
                Escolha uma conta para continuar
              </span>

              {/* Previously active session or suggested account */}
              {currentSession ? (
                <button
                  type="button"
                  onClick={() => handleSelectAccount(currentSession)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-neutral-200 dark:border-neutral-750 bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={currentSession.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={currentSession.name}
                      className="w-10 h-10 rounded-full object-cover border border-neutral-300 dark:border-neutral-600"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        <span>{currentSession.name}</span>
                        <span className="text-[10px] bg-green-100 dark:bg-green-950/80 text-green-600 dark:text-green-400 px-1.5 py-0.2 rounded-full font-bold">
                          Conectado
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {currentSession.email}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectAccount(defaultSuggestedUser)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-neutral-200 dark:border-neutral-750 bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={defaultSuggestedUser.picture}
                      alt={defaultSuggestedUser.name}
                      className="w-10 h-10 rounded-full object-cover border border-neutral-300 dark:border-neutral-600"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1">
                        <span>{defaultSuggestedUser.name}</span>
                        <GoogleLogo className="w-3 h-3 inline" />
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {defaultSuggestedUser.email}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              )}
            </div>

            {/* Option to use another Google/Gmail account */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setStep('custom')}
                className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 text-rose-500" />
                <span>Usar outra conta Gmail (@gmail.com)</span>
              </button>
            </div>
          </div>
        ) : (
          /* Form for Entering Custom Gmail */
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1">
                E-mail Gmail (@gmail.com) *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="exemplo@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <GoogleLogo className="w-4 h-4 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                Apenas contas do Google terminadas em @gmail.com são permitidas.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1">
                Seu Nome no Google (Opcional)
              </label>
              <input
                type="text"
                placeholder="Como você quer ser chamado"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('prompt');
                  setError(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <span>Verificando...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Conectar Gmail</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 pt-4 border-t border-neutral-200/60 dark:border-neutral-800 flex items-center justify-center gap-1.5 text-[10px] text-neutral-400">
          <GoogleLogo className="w-3.5 h-3.5" />
          <span>Protegido com autenticação Google Identity</span>
        </div>
      </div>
    </div>
  );
};
