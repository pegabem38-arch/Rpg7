import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary Global
 * Captura qualquer falha imprevista no ciclo de vida dos componentes,
 * evitando tela branca ou interrupções no navegador.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary capturou uma falha não tratada:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleSoftReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleHardReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] w-full bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black text-white">
                {this.props.fallbackTitle || 'Instabilidade momentânea contornada'}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                O aplicativo isolou uma discrepância no carregamento para manter sua navegação segura.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 text-left">
                <span className="text-[10px] font-mono text-rose-400 break-all">
                  {this.state.error.message}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleSoftReset}
                className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition-colors"
              >
                Tentar Novamente
              </button>
              <button
                type="button"
                onClick={this.handleHardReset}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg transition-transform active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
