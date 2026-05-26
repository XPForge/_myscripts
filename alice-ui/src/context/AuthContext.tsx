import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthMember } from "../services/authService";
import {
  createMember,
  findMemberByEmail,
  loadSessionMember,
  validateCredentials,
  clearSession,
  persistSession,
} from "../services/authService";

type AuthMode = "login" | "signup";

type AuthContextValue = {
  user: AuthMember | null;
  isAuthenticated: boolean;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  login: (email: string, password: string) => { success: true } | { success: false; error: string };
  register: (
    email: string,
    name: string,
    password: string
  ) => { success: true } | { success: false; error: string };
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthMember | null>(() => loadSessionMember());
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const login: AuthContextValue["login"] = (email, password) => {
    const member = validateCredentials(email, password);
    if (!member) {
      return { success: false, error: "Invalid email address or password." };
    }
    persistSession({ userId: member.id });
    setUser(member);
    return { success: true };
  };

  const register: AuthContextValue["register"] = (email, name, password) => {
    const existing = findMemberByEmail(email);
    if (existing) {
      return { success: false, error: "An account already exists with that email." };
    }
    const member = createMember(email, name, password);
    setUser(member);
    return { success: true };
  };

  const logout = () => {
    clearSession();
    setUser(null);
    setAuthMode("login");
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      authMode,
      setAuthMode,
      login,
      register,
      logout,
    }),
    [user, authMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
