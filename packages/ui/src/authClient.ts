import axios, { AxiosError, AxiosRequestConfig } from "axios";

const ACCESS_TOKEN_KEY = "zamio_access_token";
const REFRESH_TOKEN_KEY = "zamio_refresh_token";
const USER_PAYLOAD_KEY = "zamio_user_payload";

export type StoredUserPayload = Record<string, unknown> | null;

export interface JwtAuthResponse {
  access: string;
  refresh?: string;
  user?: Record<string, unknown>;
}

export interface PasswordLoginParams {
  email: string;
  password: string;
}

export const resolveApiBaseUrl = (): string => {
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_URL
  ) {
    return import.meta.env.VITE_API_URL;
  }
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL
  ) {
    return process.env.REACT_APP_API_URL;
  }
  // Use a relative API path when no explicit backend URL is configured.
  // This lets Vite proxy `/api` to the backend in local development.
  return "/";
};

const resolvedBaseUrl = resolveApiBaseUrl();

export const authApi = axios.create({
  baseURL: resolvedBaseUrl,
  withCredentials: false,
});

const getAccessToken = (): string | null =>
  typeof window === "undefined"
    ? null
    : window.localStorage.getItem(ACCESS_TOKEN_KEY);

const getRefreshToken = (): string | null =>
  typeof window === "undefined"
    ? null
    : window.localStorage.getItem(REFRESH_TOKEN_KEY);

export const saveTokens = (response: JwtAuthResponse) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, response.access);
  if (response.refresh) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh);
  }
  if (response.user) {
    window.localStorage.setItem(
      USER_PAYLOAD_KEY,
      JSON.stringify(response.user),
    );
  }
};

export const clearTokens = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_PAYLOAD_KEY);
};

export const getStoredUserPayload = (): StoredUserPayload => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_PAYLOAD_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUserPayload;
  } catch (_error) {
    return null;
  }
};

const refreshAuthToken = async (): Promise<string> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    throw new Error("Missing refresh token");
  }

  const refreshEndpoint = `${resolvedBaseUrl.replace(/\/$/, "")}/api/auth/token/refresh/`;
  const { data } = await axios.post<JwtAuthResponse>(refreshEndpoint, {
    refresh: refreshToken,
  });

  const nextTokens: JwtAuthResponse = {
    access: data.access,
    refresh: data.refresh || refreshToken,
    user: data.user,
  };

  saveTokens(nextTokens);
  return nextTokens.access;
};

authApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    // Check if this is a Django Token (no dots) or JWT (has dots)
    const isJWT = token.includes(".");
    const authHeader = isJWT ? `Bearer ${token}` : `Token ${token}`;
    config.headers.Authorization = authHeader;
  }
  return config;
});

authApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { config, response } = error;
    const originalRequest = config as AxiosRequestConfig & { _retry?: boolean };

    if (response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check if we have a refresh token (JWT) or Django Token (no refresh)
      const refreshToken = getRefreshToken();
      const accessToken = getAccessToken();
      const isDjangoToken = accessToken && !accessToken.includes(".");

      // Only attempt refresh if we have a refresh token (JWT flow)
      if (refreshToken && !isDjangoToken) {
        try {
          const newAccessToken = await refreshAuthToken();
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return authApi(originalRequest);
        } catch (refreshError) {
          clearTokens();
          // Redirect to login page
          if (typeof window !== "undefined") {
            window.location.href = "/signin";
          }
          return Promise.reject(refreshError);
        }
      } else {
        // Django Token expired or no refresh token - clear and redirect
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/signin";
        }
      }
    }

    return Promise.reject(error);
  },
);

export const loginWithPassword = async (credentials: PasswordLoginParams) => {
  const { data } = await authApi.post<JwtAuthResponse>(
    "/api/auth/token/",
    credentials,
  );
  saveTokens(data);
  return data;
};

export const legacyRoleLogin = async <T = unknown>(
  endpoint:
    | "/api/accounts/login-artist/"
    | "/api/accounts/login-station/"
    | "/api/accounts/login-admin/"
    | "/api/accounts/login-publisher/",
  payload: Record<string, unknown>,
) => {
  const { data } = await authApi.post<T>(endpoint, payload);
  return data;
};

export const getStoredAuth = () => ({
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
  user: getStoredUserPayload(),
});

export const logout = () => {
  clearTokens();
};

export type LegacyLoginResponse = {
  message?: string;
  data?: Record<string, unknown> | null;
};

export const persistLegacyLoginResponse = (payload: LegacyLoginResponse) => {
  if (!payload || !payload.data || typeof payload.data !== "object") {
    return;
  }
  const record = payload.data as Record<string, unknown>;
  const accessValue = record.access_token;
  if (typeof accessValue !== "string" || accessValue.length === 0) {
    return;
  }
  const refreshValue =
    typeof record.refresh_token === "string" ? record.refresh_token : undefined;
  saveTokens({
    access: accessValue,
    refresh: refreshValue,
    user: record,
  });
};

export default authApi;
