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
        // Modo registo - validações
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
          // Registar diretamente sem OTP (OTP será implementado depois)
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
    <div className="relative min-h-screen bg-white text-gray-900 overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-10 w-[28rem] h-[28rem] bg-gray-300/8 blur-[180px]" />
        <div className="absolute top-32 right-0 w-[24rem] h-[24rem] bg-gray-300/8 blur-[160px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-gray-200/10 blur-[200px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-5 flex flex-col md:flex-row items-center justify-center gap-6 py-4">
        <section className="flex-1 text-center md:text-left space-y-2">
          <p className="text-xs uppercase tracking-[0.45em] text-gray-500">Ready to</p>
          <h1 className="text-3xl md:text-4xl font-black leading-tight text-gray-900">HOPON</h1>
          <p className="text-sm text-gray-600 max-w-md mx-auto md:mx-0">
            Your everyday ride made easy. Entra e encontra boleias pensadas para o teu ritmo.
          </p>
        </section>

        <div className="flex-1 w-full max-w-md">
          <div className="bg-white text-gray-900 rounded-[28px] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
            {view === 'form' ? (
              <>
                <div className="text-center mb-4 space-y-1">
                  <AppName className="text-xl font-black text-gray-900" />
                  <p className="text-xs text-gray-500">
                    {mode === 'login'
                      ? 'Inicia sessão na tua conta'
                      : 'Cria uma nova conta'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-3">
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      Email ou telemóvel
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
                      placeholder="o.teu.email@exemplo.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                      Palavra-passe
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
                      placeholder="A tua palavra-passe"
                      required
                    />
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                        Confirmar palavra-passe
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
                        placeholder="Confirma a palavra-passe"
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-2xl bg-gray-900 text-white font-semibold transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading && (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {isLoading
                      ? 'A processar...'
                      : mode === 'login' ? 'Iniciar Sessão' : 'Criar Conta'}
                  </button>
                </form>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-3 text-xs uppercase text-gray-400">
                    <span className="flex-1 h-px bg-gray-200" />
                    ou continua com
                    <span className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="grid gap-2">
                    <button
                      type="button"
                      className="w-full h-10 rounded-2xl border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#34A853] text-white text-xs font-bold flex items-center justify-center">G</span>
                      Google
                    </button>
                    <button
                      type="button"
                      className="w-full h-10 rounded-2xl border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">A</span>
                      Apple
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 text-center border-t border-gray-100 space-y-2">
                  <p className="text-xs text-gray-500">
                    {mode === 'login'
                      ? 'Não tens conta?'
                      : 'Já tens conta?'}
                  </p>
                  <button
                    type="button"
                    onClick={switchMode}
                    disabled={isLoading}
                    className="w-full h-10 rounded-2xl border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {mode === 'login' ? 'Criar Conta' : 'Iniciar Sessão'}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleOtpSubmit} className="grid gap-3 text-center">
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-[0.5em] text-gray-400">Verificação</p>
                  <h2 className="text-xl font-bold text-gray-900">Introduz o código</h2>
                  <p className="text-xs text-gray-500">
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
                      aria-label={`Código OTP dígito ${index + 1}`}
                      title={`Código OTP dígito ${index + 1}`}
                      className="w-10 h-11 rounded-2xl border border-gray-300 text-center text-base font-semibold focus:outline-none focus:ring-2 focus:ring-gray-900"
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
                  className="w-full h-11 rounded-2xl bg-gray-900 text-white font-semibold transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading && (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  )}
                  Confirmar código
                </button>
                <div className="flex flex-col gap-1.5 text-xs text-gray-500">
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
