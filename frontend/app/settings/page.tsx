"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { settingsApi, ConnectedAccountsResponse } from "@/lib/settings-api";
import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Link2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
  Info,
} from "lucide-react";

// Platform configuration with icons and colors
const platformConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  linkedin: { label: "LinkedIn", color: "text-blue-600", bgColor: "bg-blue-100" },
  twitter: { label: "Twitter/X", color: "text-sky-500", bgColor: "bg-sky-100" },
  instagram: { label: "Instagram", color: "text-pink-600", bgColor: "bg-pink-100" },
  facebook: { label: "Facebook", color: "text-blue-700", bgColor: "bg-blue-100" },
  tiktok: { label: "TikTok", color: "text-gray-900", bgColor: "bg-gray-100" },
  youtube: { label: "YouTube", color: "text-red-600", bgColor: "bg-red-100" },
  pinterest: { label: "Pinterest", color: "text-red-500", bgColor: "bg-red-100" },
};

// All supported platforms
const allPlatforms = ["linkedin", "twitter", "instagram", "facebook", "tiktok"];

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const [profileData, accountsData] = await Promise.all([
        settingsApi.getUserProfile(),
        settingsApi.getConnectedAccounts(),
      ]);

      setProfile(profileData);
      setConnectedAccounts(accountsData);
    } catch (err: any) {
      setError("Failed to load settings. Please try again.");
      console.error("Settings load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAccounts = async () => {
    setRefreshing(true);
    try {
      const accountsData = await settingsApi.getConnectedAccounts();
      setConnectedAccounts(accountsData);
    } catch (err) {
      console.error("Failed to refresh accounts:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const openAyrshareConnect = () => {
    window.open(settingsApi.getAyrshareConnectUrl(), "_blank");
  };

  const isConnected = (platform: string): boolean => {
    if (!connectedAccounts?.accounts) return false;
    return connectedAccounts.accounts.some(
      (acc) => acc.toLowerCase() === platform.toLowerCase()
    );
  };

  const connectedCount = connectedAccounts?.accounts?.length || 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your profile and connected social media accounts
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="ml-2 text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Profile Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center text-xl font-semibold text-gray-900">
            <User className="mr-2 h-5 w-5" />
            Profile
          </h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-lg font-medium text-gray-900">{profile?.name}</p>
                <p className="flex items-center text-sm text-gray-500">
                  <Mail className="mr-1 h-4 w-4" />
                  {profile?.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Connections Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center text-xl font-semibold text-gray-900">
              <Link2 className="mr-2 h-5 w-5" />
              Connected Social Accounts
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={refreshAccounts}
                disabled={refreshing}
                className="flex items-center rounded-lg border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`mr-1 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={openAyrshareConnect}
                className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                <ExternalLink className="mr-1 h-4 w-4" />
                Connect Accounts
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="ml-3">
                <h3 className="font-medium text-blue-800">How to Connect Your Accounts</h3>
                <p className="mt-1 text-sm text-blue-700">
                  Click "Connect Accounts" to open Ayrshare's dashboard where you can securely
                  link your social media accounts. Once connected, you'll be able to post
                  content directly to those platforms.
                </p>
              </div>
            </div>
          </div>

          {/* Connection Status Summary */}
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Connected Accounts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {connectedCount} / {allPlatforms.length}
                </p>
              </div>
              {connectedCount > 0 ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="mr-1 h-5 w-5" />
                  <span className="text-sm font-medium">Ready to post</span>
                </div>
              ) : (
                <div className="flex items-center text-amber-600">
                  <AlertCircle className="mr-1 h-5 w-5" />
                  <span className="text-sm font-medium">No accounts connected</span>
                </div>
              )}
            </div>
          </div>

          {/* Platform List */}
          <div className="space-y-3">
            {allPlatforms.map((platform) => {
              const config = platformConfig[platform] || {
                label: platform,
                color: "text-gray-600",
                bgColor: "bg-gray-100",
              };
              const connected = isConnected(platform);

              return (
                <div
                  key={platform}
                  className={`flex items-center justify-between rounded-lg border p-4 ${
                    connected ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bgColor}`}
                    >
                      <span className={`text-lg font-bold ${config.color}`}>
                        {config.label.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{config.label}</p>
                      <p className="text-sm text-gray-500">
                        {connected ? "Connected and ready" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <div>
                    {connected ? (
                      <span className="flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-500">
                        <XCircle className="mr-1 h-4 w-4" />
                        Not Connected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message from API */}
          {connectedAccounts?.message && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {connectedAccounts.message}
            </div>
          )}
        </div>

        {/* Content Generation Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Content Generation Platforms
          </h2>
          <p className="mb-4 text-gray-600">
            Content will be generated for the platforms you have connected. Connect more
            accounts to generate content for additional platforms.
          </p>

          {connectedCount > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                Currently generating content for:
              </p>
              <div className="flex flex-wrap gap-2">
                {connectedAccounts?.accounts?.map((account) => {
                  const config = platformConfig[account.toLowerCase()] || {
                    label: account,
                    color: "text-gray-600",
                    bgColor: "bg-gray-100",
                  };
                  return (
                    <span
                      key={account}
                      className={`rounded-full ${config.bgColor} px-3 py-1 text-sm font-medium ${config.color}`}
                    >
                      {config.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-gray-500">
                Connect at least one social account to start generating content.
              </p>
              <button
                onClick={openAyrshareConnect}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Connect Your First Account
              </button>
            </div>
          )}
        </div>

        {/* API Configuration Info (for development) */}
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Developer Info</h3>
          <p className="text-sm text-gray-500">
            Social media posting is powered by Ayrshare API. To enable real posting:
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-gray-500">
            <li>Sign up at ayrshare.com and get your API key</li>
            <li>Add AYRSHARE_API_KEY to your backend .env file</li>
            <li>Connect your social accounts in the Ayrshare dashboard</li>
            <li>Restart the backend server</li>
          </ol>
        </div>
      </div>
    </DashboardLayout>
  );
}
