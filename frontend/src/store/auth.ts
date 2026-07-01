import { create } from "zustand";
import api from "@/lib/api";

interface User {
  id: number;
  email: string;
  totp_enabled: boolean;
  email_otp_enabled: boolean;
}

interface LoginResult {
  otpRequired: boolean;
  methods?: string[];
  preauthToken?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyLoginOtp: (preauthToken: string, method: string, code: string) => Promise<void>;
  resendLoginOtp: (preauthToken: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

async function completeLogin(set: (partial: Partial<AuthState>) => void, accessToken: string) {
  localStorage.setItem("token", accessToken);
  set({ token: accessToken });
  const me = await api.get("/auth/me");
  set({ user: me.data });
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("token"),

  login: async (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const { data } = await api.post("/auth/token", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (data.otp_required) {
      return { otpRequired: true, methods: data.methods, preauthToken: data.preauth_token };
    }
    await completeLogin(set, data.access_token);
    return { otpRequired: false };
  },

  verifyLoginOtp: async (preauthToken, method, code) => {
    const { data } = await api.post("/auth/otp/verify", {
      preauth_token: preauthToken,
      method,
      code,
    });
    await completeLogin(set, data.access_token);
  },

  resendLoginOtp: async (preauthToken) => {
    await api.post("/auth/otp/resend", { preauth_token: preauthToken });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data });
    } catch {
      set({ user: null, token: null });
      localStorage.removeItem("token");
    }
  },
}));
