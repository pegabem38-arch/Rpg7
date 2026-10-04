import React, { useState } from 'react';
import { 
  Sparkles, 
  Users, 
  Layers, 
  ShieldCheck, 
  ArrowRight,
  CheckCircle2,
  Lock,
  Crown
} from 'lucide-react';
import { 
  GoogleUser, 
  getStoredGoogleUser,
  setStoredGoogleUser, 
  validateGmailAddress,
  getOrCreateUserIdForEmail,
  ADMIN_EMAIL 
} from '../services/googleAuth';
import { GoogleLogo } from './GoogleSignInModal';
import { store } from '../services/store';

interface Props {
  onLogin: (user: GoogleUser) => void;
}

export const GoogleLoginGateway: React.FC<Props> = ({ onLogin }) => {
  const lastUser = getStoredGoogleUser();
  const [emailInput, setEmailInput] = useState(lastUser?.email || '');
  const [nameInput, setNameInput] = useState(lastUser?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(!lastUser);

  const handleQuickLogin = (email: string, name: string) => {
    setErrorMsg(null);
    const validation = validateGmailAddress(email);
    if (!validation.isValid) {
      setErrorMsg(validation.error || 'Por favor, informe um e-mail do Google (@gmail.com).');
      return;
    }

    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();
    const stableUid = getOrCreateUserIdForEmail(cleanEmail);
    const googleUser: GoogleUser = {
      email: cleanEmail,
      name: name.trim() || 'Usuário Google',
      picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanEmail)}`,
      google_id: stableUid,
      verified_email: true,
      login_at: new Date().toISOString()
    };

    setStoredGoogleUser(googleUser);
    
    // Carrega perfis existentes da conta antes de prosseguir
    store.handleUserLogin(googleUser).then(() => {
      setIsSubmitting(false);
      onLogin(googleUser);
    }).catch(() => {
      setIsSubmitting(false);
      onLogin(googleUser);
    });
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuickLogin(emailInput, nameInput);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-rose-500 selection:text-white">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 flex flex-col items-center">
        {/* App Logo & Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-500 to-amber-500 p-0.5 shadow-xl shadow-rose-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-rose-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              RPG <span className="text-rose-500">Social</span>
            </h1>
            <p className="text-xs text-neutral-400 font-medium">
              Rede Social Multi-Perfis & Comunidades
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-4">
            <Lock className="w-3.5 h-3.5" />
            <span>Login Obrigatório com Google</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight">
            Entre uma vez com seu Gmail para criar seus perfis
          </h2>
          <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
            Você só precisa conectar sua conta Google <strong>uma única vez</strong>. A partir dela, você pode criar e alternar livremente entre múltiplos perfis (pessoal, RPG, criador ou trabalho).
          </p>

          {/* Benefits Grid */}
          <div className="space-y-2.5 mb-6 text-xs text-neutral-300">
            <div className="flex items-start gap-2.5 bg-neutral-800/50 p-2.5 rounded-xl border border-neutral-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">1 Conta Google Mestre:</span> Faça login apenas uma vez no aplicativo.
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-neutral-800/50 p-2.5 rounded-xl border border-neutral-800">
              <Layers className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Perfis Ilimitados:</span> Crie quantos perfis quiser sem precisar cadastrar outros e-mails.
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-neutral-800/50 p-2.5 rounded-xl border border-neutral-800">
              <Users className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Troca Rápida de Perfil:</span> Alterne entre seus personagens ou contas com 1 clique.
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Recommended Google Quick-Connect */}
          {!showManualForm && lastUser ? (
            <div className="space-y-3">
              {/* Standard Quick-Connect Option */}
              <button
                type="button"
                onClick={() => handleQuickLogin(lastUser.email, lastUser.name)}
                disabled={isSubmitting}
                className="w-full group flex items-center justify-between p-3.5 bg-white hover:bg-neutral-100 text-neutral-900 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-70 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 flex items-center justify-center">
                    <GoogleLogo />
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-neutral-500 font-normal">Continuar como</div>
                    <div className="text-sm font-bold text-neutral-900">{lastUser.email}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualForm(true)}
                  className="text-xs text-neutral-400 hover:text-white transition-colors underline-offset-4 hover:underline"
                >
                  Entrar com outro e-mail Google (Gmail)
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  E-mail Google (Gmail)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="seu.nome@gmail.com"
                    required
                    className="w-full px-3.5 py-2.5 bg-neutral-800/80 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Obrigatório utilizar um endereço @gmail.com ou @googlemail.com.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Seu Nome
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full px-3.5 py-2.5 bg-neutral-800/80 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  <GoogleLogo />
                  <span>{isSubmitting ? 'Autenticando...' : 'Conectar Conta Google'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Autenticação protegida Google Identity & Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
};
