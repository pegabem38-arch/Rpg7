import React, { useState } from 'react';
import { X, Database, Copy, Check, RefreshCw, Key, ExternalLink } from 'lucide-react';
import {
  getStoredSupabaseCredentials,
  saveSupabaseCredentials,
  resetSupabaseClient,
  SUPABASE_SQL_SCHEMA,
  getSupabaseClient
} from '../lib/supabase';
import { store } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const creds = getStoredSupabaseCredentials();
  const [url, setUrl] = useState(creds.url);
  const [anonKey, setAnonKey] = useState(creds.anonKey);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(url.trim(), anonKey.trim());
    resetSupabaseClient();

    const client = getSupabaseClient();
    if (client) {
      setStatusMsg('✅ Cliente Supabase configurado com sucesso!');
    } else {
      setStatusMsg('ℹ️ Chaves salvas. Usando armazenamento local responsivo e pronto para Supabase.');
    }

    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const handleResetData = () => {
    if (confirm('Deseja restaurar todos os dados iniciais do aplicativo?')) {
      store.resetDemoData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Integração com Supabase
            </h3>
            <p className="text-xs text-neutral-500">
              Conecte o seu projeto Supabase ou utilize o schema SQL.
            </p>
          </div>
        </div>

        {statusMsg && (
          <div className="my-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            {statusMsg}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSaveCredentials} className="space-y-3 my-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              placeholder="https://xyz.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Supabase Anon Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-colors"
          >
            Salvar Chaves do Supabase
          </button>
        </form>

        {/* SQL Schema Copy Box */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 my-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-500" /> Schema SQL para Criar Tabelas
            </span>
            <button
              onClick={handleCopySchema}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-xs text-neutral-700 dark:text-neutral-200 font-bold hover:bg-neutral-100 flex items-center gap-1"
            >
              {copiedSchema ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copiar SQL
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Copie o código SQL das tabelas (profiles, followers, posts, stories, reels, chats, messages, notifications) e cole no SQL Editor do seu painel Supabase.
          </p>
        </div>

        {/* Reset Data */}
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <button
            onClick={handleResetData}
            className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Restaurar Dados de Demonstração
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
