import { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

type AuthMode = 'login' | 'register';
type AuthView = 'form' | 'otp';

type PendingAuth = {
  mode: AuthMode;
  email: string;
  password: string;
};

interface AuthPageProps {
  onAuthSuccess?: () => void;
  initialMode?: AuthMode;
}

export default function AuthPage({ onAuthSuccess, initialMode = 'login' }: AuthPageProps) {
  const { login, register } = useAuth();
  const { showError } = useNotifications();
  const [mode, setMode] = useState<AuthMode>(initialMode);
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        try {
          await login(formData.email, formData.password);
          onAuthSuccess?.();
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : null;
          console.error("Erro no login:", err);
          showError("Erro no login", message ?? "Credenciais inválidas. Verifica o email e palavra-passe.");
          return;
        }
      } else {
        if (!formData.email || !formData.password) {
          showError("Campos obrigatórios", "Preenche email e palavra-passe");
          return;
        }
        if (formData.password.length < 6) {
          showError("Palavra-passe muito curta", "A palavra-passe deve ter pelo menos 6 caracteres");
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          showError("Palavras-passe diferentes", "As palavras-passe não coincidem");
          return;
        }
        try {
          await register(formData.email, formData.password);
          onAuthSuccess?.();
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : null;
          console.error("Erro no registo:", err);
          showError("Erro no registo", message ?? "Não foi possível criar a conta. Tenta novamente.");
          return;
        }
      }
    } catch (error) {
      console.error('Erro na autenticacao:', error);
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
      showError("Sessão expirada", "Recomeça o processo de autenticação.");
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
      console.error('Erro na autenticacao:', error);
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
    setFormData({ email: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="min-h-[100svh] bg-[#F9FAF5] text-[#1A1C19] flex flex-col font-manrope"
      style={{ padding: "1.5rem 1.5rem calc(1rem + env(safe-area-inset-bottom))" }}
    >
      {/* Header - igual ao Onboarding */}
      <div className="flex items-center justify-between mb-5">
        <div className="w-10 h-10">
          {mode === 'register' && view === 'form' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-10 h-10 rounded-full border border-[#e7e9e4] flex items-center justify-center text-[#1B4332] hover:bg-[#f3f4ef] transition"
              aria-label="Voltar"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
          )}
        </div>
        <span className="font-noto-serif italic font-bold text-[#1B4332] text-lg">HopOn</span>
        <div className="w-10" />
      </div>

      <main className="flex-1 max-w-md mx-auto w-full flex flex-col justify-center pb-4">
        {view === 'form' ? (
          <>
            {/* Header */}
            <header className="mb-8">
              <h2 className="text-[1.75rem] font-noto-serif italic text-[#012d1d] leading-tight">
                {mode === 'login' ? 'Inicia sessão na tua conta' : 'Criar uma nova conta'}
              </h2>
              {mode === 'login' && (
                <p className="text-[#414844] text-base mt-2">Bem-vindo de volta a HopOn.</p>
              )}
            </header>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-[#717973] px-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full h-14 px-4 bg-[#edeee9] border-none rounded-lg text-[#1A1C19] placeholder:text-[#717973]/50 focus:outline-none focus:ring-2 focus:ring-[#012d1d]/25 transition-all"
                  placeholder="exemplo@email.com"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[0.7rem] font-semibold uppercase tracking-wider text-[#717973]">
                    Palavra-passe
                  </label>
                  {mode === 'login' && (
                    <button type="button" className="text-sm font-bold text-[#006c48]">
                      Esqueceste-te?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full h-14 px-4 pr-12 bg-[#edeee9] border-none rounded-lg text-[#1A1C19] placeholder:text-[#717973]/50 focus:outline-none focus:ring-2 focus:ring-[#012d1d]/25 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#1A1C19] transition-colors p-1"
                    aria-label={showPassword ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                  >
                    <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>

              {/* Confirm password (register only) */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-[#717973] px-1">
                    Confirmar Palavra-passe
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="w-full h-14 px-4 pr-12 bg-[#edeee9] border-none rounded-lg text-[#1A1C19] placeholder:text-[#717973]/50 focus:outline-none focus:ring-2 focus:ring-[#012d1d]/25 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717973] hover:text-[#1A1C19] transition-colors p-1"
                      aria-label={showConfirmPassword ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                    >
                      <span className="material-symbols-outlined text-xl">{showConfirmPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-[#52B788] text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-[#52B788]/20 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Iniciar Sessão' : 'Criar Conta'}</span>
                    <span className="material-symbols-outlined text-lg">east</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 py-6 mt-2">
              <div className="h-px flex-grow bg-[#e7e9e4]" />
              <span className="text-[0.7rem] font-medium text-[#717973] uppercase tracking-widest whitespace-nowrap">
                Ou continua com
              </span>
              <div className="h-px flex-grow bg-[#e7e9e4]" />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={() => {
                const apiBase = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';
                window.location.href = `${apiBase}/api/v1/auth/google`;
              }}
              className="w-full h-14 flex items-center justify-center gap-3 bg-white border border-[#c1c8c2]/30 rounded-lg hover:bg-[#f3f4ef] transition-colors active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="font-bold text-[#1A1C19]">Continuar com Google</span>
            </button>

            {/* Switch mode */}
            <footer className="mt-8 text-center">
              <p className="text-[#414844]">
                {mode === 'login' ? "Não tens conta? " : "Já tens conta? "}
                <button
                  type="button"
                  onClick={switchMode}
                  disabled={isLoading}
                  className="text-[#006c48] font-bold underline underline-offset-4 decoration-[#006c48]/30 hover:decoration-[#006c48] transition-all disabled:opacity-50"
                >
                  {mode === 'login' ? 'Criar Conta' : 'Iniciar Sessão'}
                </button>
              </p>
            </footer>
          </>
        ) : (
          /* OTP view */
          <form onSubmit={handleOtpSubmit} className="flex flex-col items-center gap-8 mt-16">
            <div className="text-center space-y-2">
              <h2 className="text-[1.75rem] font-noto-serif italic text-[#012d1d] leading-tight">
                Verificar código
              </h2>
              <p className="text-[#414844]">
                Enviámos um código para{" "}
                <span className="font-semibold text-[#1A1C19]">
                  {pendingAuth?.email || formData.email}
                </span>
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
                  aria-label={`Código OTP dígito ${index + 1}`}
                  className="w-12 h-14 bg-[#edeee9] rounded-lg text-center text-lg font-bold text-[#1A1C19] focus:outline-none focus:ring-2 focus:ring-[#012d1d]/25 transition-all"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                />
              ))}
            </div>

            {otpError && <p className="text-sm text-[#ba1a1a]">{otpError}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-[#52B788] text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-[#52B788]/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : "Confirmar código"}
            </button>

            <div className="flex flex-col gap-2 text-sm text-[#414844] text-center">
              <button
                type="button"
                onClick={handleResendCode}
                className="font-bold text-[#1A1C19] hover:underline"
              >
                Reenviar código
              </button>
              <button
                type="button"
                onClick={() => { setView('form'); setPendingAuth(null); }}
                className="hover:underline"
              >
                Rever dados de contacto
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
