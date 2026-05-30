import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getStoredAuth, logout as clearStoredAuth } from './api';
import type { StoredUserPayload } from '@zamio/ui';

interface AuthSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
  user: StoredUserPayload;
}

interface AuthState extends AuthSnapshot {
  isInitialized: boolean;
  isAuthenticated: boolean;
}

const defaultSnapshot: AuthSnapshot = {
  accessToken: null,
  refreshToken: null,
  user: null,
};

const initialState: AuthState = {
  ...defaultSnapshot,
  isInitialized: false,
  isAuthenticated: false,
};

interface AuthContextValue extends AuthState {
  login: (payload?: Partial<AuthSnapshot>) => void;
  logout: () => void;
  refreshFromStorage: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>(initialState);

  const applySnapshot = useCallback((snapshot: Partial<AuthSnapshot> | null | undefined) => {
    const stored = getStoredAuth();
    const nextSnapshot: AuthSnapshot = {
      accessToken: snapshot?.accessToken ?? stored.accessToken ?? null,
      refreshToken: snapshot?.refreshToken ?? stored.refreshToken ?? null,
      user: snapshot?.user ?? stored.user ?? null,
    };

    setState({
      ...nextSnapshot,
      isInitialized: true,
      isAuthenticated: Boolean(nextSnapshot.accessToken),
    });
  }, []);

  const refreshFromStorage = useCallback(() => {
    applySnapshot(defaultSnapshot);
  }, [applySnapshot]);

  useEffect(() => {
    refreshFromStorage();
  }, [refreshFromStorage]);

  const login = useCallback(
    (payload?: Partial<AuthSnapshot>) => {
      applySnapshot(payload ?? defaultSnapshot);
    },
    [applySnapshot],
  );

  const logout = useCallback(() => {
    clearStoredAuth();
    setState({
      ...defaultSnapshot,
      isInitialized: true,
      isAuthenticated: false,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      refreshFromStorage,
    }),
    [state, login, logout, refreshFromStorage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Get the artist ID from stored auth
 */
export const getArtistId = (): string | null => {
  const stored = getStoredAuth();
  const artistId = stored.user?.artist_id;
  return typeof artistId === 'string' ? artistId : null;
};

