import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User, UserProfile, Vehicle, UserVerification } from "../pages/types/user";
import { apiRequest } from "../services/api";

type VehicleInput = {
  id?: string;
  brand: string;
  model: string;
  plate?: string;
  color?: string;
  imageUrl?: string;
  seats?: number;
  features: Vehicle["features"];
  fuelType?: string;
  avgConsumption?: number;
};

type ProfileUpdatePayload = Partial<UserProfile> & { phone?: string };

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: ProfileUpdatePayload) => Promise<void>;
  upsertVehicle: (vehicle: VehicleInput) => Promise<Vehicle | undefined>;
  removeVehicle: (vehicleId: string) => Promise<void>;
  setActiveVehicle: (vehicleId: string) => void;
  completeVerification: (channel: keyof UserVerification) => void;
  sendOtp: (purpose: "email" | "phone") => Promise<void>;
  verifyOtp: (purpose: "email" | "phone", code: string) => Promise<User>;
  hasCompletedProfile: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY_TOKEN = "hopon_token";
const STORAGE_KEY_REFRESH = "hopon_refresh_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar utilizador do localStorage ao iniciar
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Chamar endpoint /me para obter dados frescos
        const userData = await apiRequest<User>("/auth/me");
        setUser(userData);
      } catch (err) {
        console.error("Sessão inválida ou expirada:", err);
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_REFRESH);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await apiRequest<{ accessToken: string; refreshToken: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      
      localStorage.setItem(STORAGE_KEY_TOKEN, data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem(STORAGE_KEY_REFRESH, data.refreshToken);
      }
      setUser(data.user);
    } catch (err) {
      console.error("Login falhou:", err);
      throw err;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      // Nota: O backend espera 'name' e 'phone' (opcional) no DTO de registo
      // Como o AuthPage só tem email/password neste passo, enviamos defaults ou ajustamos o backend/frontend
      // Para o MVP funcionar, vou enviar "Novo Utilizador" como nome default
      // Não incluímos phone se não for fornecido (não enviar undefined)
      const payload: { email: string; password: string; name: string; phone?: string } = {
        email,
        password,
        name: "Novo Utilizador", // Placeholder até completar perfil
      };
      
      const data = await apiRequest<{ accessToken: string; refreshToken: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      localStorage.setItem(STORAGE_KEY_TOKEN, data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem(STORAGE_KEY_REFRESH, data.refreshToken);
      }
      setUser(data.user);
    } catch (err) {
      console.error("Registo falhou:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH);
      if (refreshToken) {
        // Tentar fazer logout no backend (não bloqueia se falhar)
        try {
          await apiRequest("/auth/logout", {
            method: "POST",
            body: JSON.stringify({ refreshToken }),
            skipRefresh: true, // Não tentar refresh se falhar
          });
        } catch (err) {
          console.error("Erro ao fazer logout no backend:", err);
        }
      }
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    } finally {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_REFRESH);
      setUser(null);
    }
  };

  const updateProfile = async (profile: ProfileUpdatePayload) => {
    if (!user) return;

    try {
      // Mapear campos para UpdateProfileDto do backend
      const updateData: {
        name?: string;
        username?: string;
        phone?: string;
        avatarUrl?: string;
        bio?: string;
        contactEmail?: string;
        schedule?: string;
        setupCompleted?: boolean;
      } = {};

      if (profile.name) updateData.name = profile.name;
      if (profile.username !== undefined) updateData.username = profile.username || undefined;
      if (profile.phone !== undefined) updateData.phone = profile.phone || undefined;
      if (profile.avatarUrl !== undefined) updateData.avatarUrl = profile.avatarUrl || undefined;
      if (profile.contactEmail !== undefined) updateData.contactEmail = profile.contactEmail || undefined;
      if (profile.schedule !== undefined) {
        updateData.schedule = typeof profile.schedule === "string" ? profile.schedule : JSON.stringify(profile.schedule);
      }
      if (profile.setupCompleted === true) updateData.setupCompleted = true;
      // bio pode ser adicionado depois se necessário

      const updatedUser = await apiRequest<User>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      setUser(updatedUser);
    } catch (err) {
      console.error("Atualização de perfil falhou:", err);
      throw err;
    }
  };

  const upsertVehicle = async (vehicle: VehicleInput) => {
    if (!user) return;
    const isEditing = Boolean(vehicle.id);
    const payload = {
      brand: vehicle.brand,
      model: vehicle.model,
      plate: vehicle.plate || undefined,
      color: vehicle.color || undefined,
      imageUrl: vehicle.imageUrl || undefined,
      seats: vehicle.seats,
      features: vehicle.features,
      fuelType: vehicle.fuelType || undefined,
      avgConsumption: vehicle.avgConsumption,
    };
    const endpoint = isEditing ? `/vehicles/${vehicle.id}` : "/vehicles";
    const method = isEditing ? "PATCH" : "POST";

    const savedVehicle = await apiRequest<Vehicle>(endpoint, {
      method,
      body: JSON.stringify(payload),
    });

    setUser(prev => {
      if (!prev) return prev;
      const current = prev.vehicles ?? [];
      const exists = current.some(existing => existing.id === savedVehicle.id);
      const nextVehicles = exists
        ? current.map(existing => (existing.id === savedVehicle.id ? savedVehicle : existing))
        : [...current, savedVehicle];
      const nextActiveVehicleId = prev.activeVehicleId ?? savedVehicle.id;
      return { ...prev, vehicles: nextVehicles, activeVehicleId: nextActiveVehicleId };
    });

    return savedVehicle;
  };

  const removeVehicle = async (vehicleId: string) => {
    if (!user) return;
    await apiRequest(`/vehicles/${vehicleId}`, { method: "DELETE" });
    setUser(prev => {
      if (!prev) return prev;
      const current = prev.vehicles ?? [];
      const nextVehicles = current.filter(v => v.id !== vehicleId);
      let nextActiveVehicleId = prev.activeVehicleId;
      if (prev.activeVehicleId === vehicleId) {
        nextActiveVehicleId = nextVehicles.length > 0 ? nextVehicles[0].id : undefined;
      }
      return { ...prev, vehicles: nextVehicles, activeVehicleId: nextActiveVehicleId };
    });
  };

  const setActiveVehicle = (vehicleId: string) => {
    if (!user?.vehicles?.some(vehicle => vehicle.id === vehicleId)) {
      return;
    }
    setUser(prev => (prev ? { ...prev, activeVehicleId: vehicleId } : prev));
  };

  const completeVerification = (channel: keyof UserVerification) => {
    if (!user) return;
    const current = user.verification ?? { email: false, phone: false };
    if (current[channel]) return;
    setUser({ ...user, verification: { ...current, [channel]: true } });
  };

  const sendOtp = async (purpose: "email" | "phone") => {
    await apiRequest("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ purpose }),
    });
  };

  const verifyOtp = async (purpose: "email" | "phone", code: string): Promise<User> => {
    const updatedUser = await apiRequest<User>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ purpose, code }),
    });
    setUser(updatedUser);
    return updatedUser;
  };

  const refresh = async () => {
    const updatedUser = await apiRequest<User>("/auth/me");
    setUser(updatedUser);
  };

  const hasCompletedProfile = user?.profile?.setupCompleted === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        upsertVehicle,
        removeVehicle,
        setActiveVehicle,
        completeVerification,
        sendOtp,
        verifyOtp,
        hasCompletedProfile,
        refresh,
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