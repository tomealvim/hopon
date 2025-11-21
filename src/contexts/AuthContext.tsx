import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User, UserProfile } from "../pages/types/user";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: UserProfile) => void;
  hasCompletedProfile: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "hopon_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar utilizador do localStorage ao iniciar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch (err) {
        console.error("Erro ao carregar utilizador:", err);
      }
    }
    setIsLoading(false);
  }, []);

  // Guardar utilizador no localStorage quando mudar
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = async (email: string, _password: string) => {
    // Simulação de login (sem backend)
    // TODO: substituir por chamada à API quando existir (backend)
    // No login, a conta já existe, por isso carregamos o perfil completo
    const mockUser: User = {
      id: `user_${Date.now()}`,
      email,
      profile: {
        name: "João Silva",
        username: "joaosilva",
        phone: "+351 912 345 678",
        contactEmail: email,
        avatarUrl: undefined,
        address: "Amadora, Quinta da Fonte",
        schedule: {
          days: [
            {
              day: "segunda",
              blocks: [
                { id: "1", start: "09:00", end: "11:00", title: "PF I-T", room: "TA-A127" }
              ]
            }
          ]
        },
        createdAt: new Date().toISOString()
      }
    };
    setUser(mockUser);
  };

  const register = async (email: string, _password: string) => {
    // Simulação de registo (sem backend)
    // Criar conta apenas com email - o perfil será completado no ProfileSetupPage
    const mockUser: User = {
      id: `user_${Date.now()}`,
      email,
    };
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (profile: UserProfile) => {
    if (!user) return;
    setUser({ ...user, profile });
  };

  const hasCompletedProfile = !!(user?.profile);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        hasCompletedProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}

