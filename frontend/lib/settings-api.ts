import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface SocialAccount {
  platform: string;
  connected: boolean;
  username?: string;
  profile_url?: string;
}

export interface UserSettings {
  auto_approval_enabled: boolean;
  auto_approval_platforms: string[];
  default_posting_time: string | null;
  timezone: string;
}

export interface ConnectedAccountsResponse {
  accounts: string[];
  email?: string;
  message?: string;
  error?: string;
}

export const settingsApi = {
  // Get connected social media accounts
  getConnectedAccounts: async (): Promise<ConnectedAccountsResponse> => {
    const response = await api.get("/api/content/accounts/connected");
    return response.data;
  },

  // Get user profile info (placeholder for now)
  getUserProfile: async (): Promise<{ name: string; email: string }> => {
    // This would come from auth in production
    return {
      name: "Development User",
      email: "dev@example.com",
    };
  },

  // Get Late dashboard URL for connecting social accounts
  getLateConnectUrl: (): string => {
    return "https://app.getlate.dev/accounts";
  },
};
