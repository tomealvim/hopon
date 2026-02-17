const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const STORAGE_KEY_TOKEN = "hopon_token";
const STORAGE_KEY_REFRESH = "hopon_refresh_token";

interface ApiOptions extends RequestInit {
  token?: string;
  skipRefresh?: boolean; // Para evitar loops infinitos no refresh
}

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  // Se já está a fazer refresh, esperar pela mesma promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH);
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh token inválido/expirado - limpar tudo
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_REFRESH);
        throw new Error("Refresh token inválido");
      }

      const data = await response.json();
      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken;

      // Guardar novos tokens
      localStorage.setItem(STORAGE_KEY_TOKEN, newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem(STORAGE_KEY_REFRESH, newRefreshToken);
      }

      return newAccessToken;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, skipRefresh = false, ...rest } = options;
  
  // Obter token do localStorage se não for passado explicitamente
  let storedToken = token || localStorage.getItem(STORAGE_KEY_TOKEN);

  const config: RequestInit = {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      ...headers,
    },
  };

  // Normalizar endpoint (garantir que começa com /)
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  let response = await fetch(`${API_URL}${cleanEndpoint}`, config);

  // Não tentar refresh em login/registo: 401 = credenciais inválidas, não sessão expirada
  const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register');
  const shouldTryRefresh = response.status === 401 && !skipRefresh && !endpoint.includes('/auth/refresh') && !isAuthEndpoint;

  if (shouldTryRefresh) {
    try {
      const newToken = await refreshAccessToken();
      // Retry com novo token
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${newToken}`,
      };
      response = await fetch(`${API_URL}${cleanEndpoint}`, config);
    } catch (refreshError) {
      // Refresh falhou - limpar tokens e lançar erro
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_REFRESH);
      throw new Error("Sessão expirada. Por favor, faz login novamente.");
    }
  }

  // Tentar fazer parse do JSON, mas tratar respostas vazias ou erros
  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage: string;
    if (typeof data === "object" && data !== null) {
      const obj = data as { message?: string | string[]; error?: string | { message?: string } };
      const nested = obj.error && typeof obj.error === "object" && "message" in obj.error
        ? (obj.error as { message: string }).message
        : null;
      const detail = typeof obj.error === "string" ? obj.error : nested;
      const msg = obj.message;
      errorMessage = detail ?? (msg ? (Array.isArray(msg) ? msg.join(", ") : msg) : `Erro ${response.status}`);
    } else {
      errorMessage = `Erro ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return data as T;
}