import { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import AppName from '../components/ui/AppName';

type AuthMode = 'login' | 'register';
type AuthView = 'form' | 'otp';

type PendingAuth = {
  mode: AuthMode;
  email: string;
  password: string;
};

interface AuthPageProps {
  onAuthSuccess?: () => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const { login, register } = useAuth();
  const { showError } = useNotifications();
  const [mode, setMode] = useState<AuthMode>('login');
  const [view, setView] = useState<AuthView>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
  const otpLength = 6;
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(otpLength).fill(''));
  const [otpError, setOtpError] = useState<string | null>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (view === 'otp') return;

    setIsLoading(true);
    setOtpError(null);

    try {
      if (mode === 'login') {
        if (!formData.email || !formData.password) {
          showError("Campos obrigatórios", "Preenche email e palavra-passe");
          return;
        }
        await login(formData.email, formData.password);
        onAuthSuccess?.();
        return;
      } else {
        if (formData.password !== formData.confirmPassword) {
          showError("Palavras-passe diferentes", "As palavras-passe não coincidem");
          return;
        }
      }
      setPendingAuth({
        mode,
        email: formData.email,
        password: formData.password,
      });
      setView('otp');
      setOtpDigits(Array(otpLength).fill(''));
    } catch (error) {
      console.error('Erro na autenticação:', error);
      showError("Erro na autenticação", "Tenta novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    setOtpError(null);
    if (value && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && otpRefs.current[index - 1]) {
      event.preventDefault();
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpDigits.some((digit) => !digit)) {
      setOtpError("Introduz o código completo");
      return;
    }
    if (!pendingAuth) {
      showError("Erro", "Recomeça o processo de autenticação.");
      setView('form');
      return;
    }

    setIsLoading(true);
    try {
      if (pendingAuth.mode === 'login') {
        await login(pendingAuth.email, pendingAuth.password);
      } else {
        await register(pendingAuth.email, pendingAuth.password);
      }
      onAuthSuccess?.();
      setView('form');
      setPendingAuth(null);
    } catch (error) {
      console.error('Erro na autenticação:', error);
      showError("Erro na autenticação", "Tenta novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    setOtpDigits(Array(otpLength).fill(''));
    setOtpError("Enviámos um novo código.");
    otpRefs.current[0]?.focus();
  };

  const switchMode = () => {
    setMode(prev => prev === 'login' ? 'register' : 'login');
    setView('form');
    setPendingAuth(null);
    setOtpDigits(Array(otpLength).fill(''));
    setOtpError(null);
    setFormData({
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-10 w-[28rem] h-[28rem] bg-pink-500/20 blur-[180px]" />
        <div className="absolute top-32 right-0 w-[24rem] h-[24rem] bg-purple-500/20 blur-[160px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-amber-200/15 blur-[200px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-5 py-8 flex flex-col md:flex-row md:items-center gap-10">
        <section className="flex-1 text-center md:text-left space-y-4">
          <p className="text-xs uppercase tracking-[0.45em] text-white/60">Ready to</p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight">HOPON</h1>
          <p className="text-base text-white/70 max-w-md mx-auto md:mx-0">
            Your everyday ride made easy. Entra e encontra boleias pensadas para o teu ritmo.
          </p>
        </section>

        <div className="flex-1 w-full max-w-md">
          <div className="bg-white text-gray-900 rounded-[28px] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
            {view === 'form' ? (
              <>
                <div className="text-center mb-6 space-y-1.5">
                  <AppName className="text-2xl font-black text-gray-900" />
                  <p className="text-sm text-gray-500">
                    {mode === 'login'
                      ? 'Inicia sessão na tua conta'
                      : 'Cria uma nova conta'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-4">
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Email ou telemóvel
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
                      placeholder="o.teu.email@exemplo.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Palavra-passe
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
                      placeholder="A tua palavra-passe"
                      required
                    />
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                        Confirmar palavra-passe
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
                        placeholder="Confirma a palavra-passe"
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#FFE29F] via-[#FFA99F] to-[#FF719A] text-black font-semibold shadow-[0_20px_45px_rgba(255,113,154,0.35)] transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading && (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    )}
                    {isLoading
                      ? 'A processar...'
                      : mode === 'login' ? 'Iniciar Sessão' : 'Criar Conta'}
                  </button>
                </form>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-3 text-xs uppercase text-gray-400">
                    <span className="flex-1 h-px bg-gray-200" />
                    ou continua com
                    <span className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="grid gap-2">
                    <button
                      type="button"
                      className="w-full h-11 rounded-2xl border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#34A853] text-white text-xs font-bold flex items-center justify-center">G</span>
                      Google
                    </button>
                    <button
                      type="button"
                      className="w-full h-11 rounded-2xl border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">A</span>
                      Apple
                    </button>
                  </div>
                </div>

                <div className="mt-5 pt-5 text-center border-t border-gray-100 space-y-2.5">
                  <p className="text-sm text-gray-500">
                    {mode === 'login'
                      ? 'Não tens conta?'
                      : 'Já tens conta?'}
                  </p>
                  <button
                    type="button"
                    onClick={switchMode}
                    disabled={isLoading}
                    className="w-full h-11 rounded-2xl border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {mode === 'login' ? 'Criar Conta' : 'Iniciar Sessão'}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleOtpSubmit} className="grid gap-4 text-center">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Verificação</p>
                  <h2 className="text-2xl font-bold text-gray-900">Introduz o código</h2>
                  <p className="text-sm text-gray-500">
                    Enviámos um código para <span className="font-semibold">{pendingAuth?.email || formData.email}</span>
                  </p>
                </div>
                <div className="flex justify-center gap-2">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="w-10 h-12 rounded-2xl border border-gray-300 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-gray-900"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    />
                  ))}
                </div>
                {otpError && <p className="text-xs text-red-500">{otpError}</p>}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#FFE29F] via-[#FFA99F] to-[#FF719A] text-black font-semibold shadow-[0_20px_45px_rgba(255,113,154,0.35)] transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading && (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  )}
                  Confirmar código
                </button>
                <div className="flex flex-col gap-2 text-sm text-gray-500">
                  <button type="button" onClick={handleResendCode} className="text-gray-800 font-semibold hover:underline">
                    Reenviar código
                  </button>
                  <button type="button" onClick={() => { setView('form'); setPendingAuth(null); }} className="hover:underline">
                    Rever dados de contacto
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
