"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { settingsApi, ConnectedAccountsResponse } from "@/lib/settings-api";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Globe,
  Building,
  ArrowRight,
  Sparkles,
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

interface CompanyInfo {
  name: string;
  description: string;
  industry: string;
  products_services?: string[];
  target_audience?: string;
  unique_value?: string;
  company_size?: string;
  location?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
}

interface UserProfile {
  name: string;
  email: string;
  companyWebsite: string;
  companyInfo?: CompanyInfo;
  profileComplete: boolean;
}

export default function SettingsPage() {
  const router = useRouter();

  // Profile setup state
  const [profileName, setProfileName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [isFetchingCompany, setIsFetchingCompany] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Check if profile is already set up
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  // Connected accounts state
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
      // Check for existing profile in localStorage
      const demoUser = localStorage.getItem("demoUser");
      const savedProfile = localStorage.getItem("userProfile");

      if (demoUser) {
        const userData = JSON.parse(demoUser);
        if (savedProfile) {
          const profileData = JSON.parse(savedProfile);
          setProfile(profileData);
          setProfileName(profileData.name || "");
          setCompanyWebsite(profileData.companyWebsite || "");
          setCompanyInfo(profileData.companyInfo || null);
          setIsProfileComplete(profileData.profileComplete || false);
        } else {
          // New user - pre-fill email
          setProfile({
            name: "",
            email: userData.email,
            companyWebsite: "",
            profileComplete: false,
          });
        }
      }

      // Load connected accounts
      try {
        const accountsData = await settingsApi.getConnectedAccounts();
        setConnectedAccounts(accountsData);
      } catch (err) {
        // API might not be available
        console.error("Failed to load connected accounts:", err);
      }
    } catch (err: any) {
      setError("Failed to load settings. Please try again.");
      console.error("Settings load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyInfo = async () => {
    if (!companyWebsite) {
      setFetchError("Please enter a company website");
      return;
    }

    // Basic URL validation
    let url = companyWebsite;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    setIsFetchingCompany(true);
    setFetchError(null);

    try {
      // Call the real API to fetch company info using AI
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/profile/fetch-company-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ website_url: url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to fetch company information");
      }

      const data = await response.json();

      // Map API response to CompanyInfo interface
      const fetchedInfo: CompanyInfo = {
        name: data.company_name || "Unknown Company",
        description: data.description || "",
        industry: data.industry || "Unknown",
        products_services: data.products_services || [],
        target_audience: data.target_audience || "",
        unique_value: data.unique_value || "",
        company_size: data.company_size || "",
        location: data.location || "",
        social: data.social_media || {},
      };

      setCompanyInfo(fetchedInfo);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to fetch company information. Please check the URL.";
      setFetchError(errorMessage);
      console.error("Company fetch error:", err);
    } finally {
      setIsFetchingCompany(false);
    }
  };

  const saveProfile = () => {
    if (!profileName.trim()) {
      setFetchError("Please enter your name");
      return;
    }

    const demoUser = localStorage.getItem("demoUser");
    const email = demoUser ? JSON.parse(demoUser).email : "";

    const updatedProfile: UserProfile = {
      name: profileName,
      email: email,
      companyWebsite: companyWebsite,
      companyInfo: companyInfo || undefined,
      profileComplete: true,
    };

    localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
    setProfile(updatedProfile);
    setIsProfileComplete(true);
  };

  const continueToInterview = () => {
    saveProfile();
    router.push("/interview");
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

  // Get email from demo user
  const demoUser = localStorage.getItem("demoUser");
  const userEmail = demoUser ? JSON.parse(demoUser).email : "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings & Profile</h1>
          <p className="mt-2 text-gray-600">
            Set up your profile and manage connected social media accounts
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

        {/* Profile Setup Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center text-xl font-semibold text-gray-900">
            <User className="mr-2 h-5 w-5" />
            Profile Setup
            {isProfileComplete && (
              <span className="ml-2 flex items-center text-sm font-normal text-green-600">
                <CheckCircle className="mr-1 h-4 w-4" />
                Complete
              </span>
            )}
          </h2>

          <div className="space-y-5">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>

            {/* Email Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex items-center px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50">
                <Mail className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-700">{userEmail || "Not set"}</span>
              </div>
            </div>

            {/* Company Website Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Website
              </label>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={fetchCompanyInfo}
                  disabled={isFetchingCompany || !companyWebsite}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isFetchingCompany ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Fetch Info
                    </>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter your company website to automatically fetch business information
              </p>
            </div>

            {fetchError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {fetchError}
              </div>
            )}

            {/* Company Info Display */}
            {isFetchingCompany && (
              <div className="p-6 rounded-lg border border-blue-200 bg-blue-50">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-3" />
                  <span className="text-blue-700 font-medium">
                    Fetching company information...
                  </span>
                </div>
              </div>
            )}

            {companyInfo && !isFetchingCompany && (
              <div className="p-5 rounded-lg border border-green-200 bg-green-50">
                <div className="flex items-start">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                    <Building className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900">{companyInfo.name}</h3>
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 ml-2" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{companyInfo.description}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                        {companyInfo.industry}
                      </span>
                      {companyInfo.company_size && (
                        <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">
                          {companyInfo.company_size}
                        </span>
                      )}
                      {companyInfo.location && (
                        <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">
                          📍 {companyInfo.location}
                        </span>
                      )}
                    </div>

                    {companyInfo.target_audience && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-500">Target Audience</p>
                        <p className="text-sm text-gray-700">{companyInfo.target_audience}</p>
                      </div>
                    )}

                    {companyInfo.products_services && companyInfo.products_services.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-500">Products & Services</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {companyInfo.products_services.slice(0, 5).map((item, idx) => (
                            <span key={idx} className="bg-white text-gray-600 px-2 py-0.5 rounded text-xs border border-gray-200">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {companyInfo.unique_value && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-500">Unique Value</p>
                        <p className="text-sm text-gray-700 italic">"{companyInfo.unique_value}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={continueToInterview}
                disabled={!profileName.trim()}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                Save & Continue to Brand Interview
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <p className="text-center text-xs text-gray-500 mt-2">
                You can update your profile anytime
              </p>
            </div>
          </div>
        </div>

        {/* Profile Summary (if complete) */}
        {isProfileComplete && profile && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center text-xl font-semibold text-gray-900">
              <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
              Profile Summary
            </h2>
            <div className="flex items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-lg font-medium text-gray-900">{profile.name}</p>
                <p className="flex items-center text-sm text-gray-500">
                  <Mail className="mr-1 h-4 w-4" />
                  {profile.email}
                </p>
                {profile.companyWebsite && (
                  <p className="flex items-center text-sm text-blue-600 mt-1">
                    <Globe className="mr-1 h-4 w-4" />
                    {profile.companyWebsite}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

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
      </div>
    </DashboardLayout>
  );
}
