"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { contentApi, Post } from "@/lib/content-api";
import { strategyApi } from "@/lib/strategy-api";
import { settingsApi } from "@/lib/settings-api";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Edit,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Sparkles,
  Calendar,
  Trash2,
  Save,
  X,
  Info,
  ArrowRight,
  Send,
  Clock,
  Link2,
} from "lucide-react";

// Get current month name
const getCurrentMonthInfo = () => {
  const now = new Date();
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    name: monthName,
    dateRange: `${formatDate(startOfMonth)} - ${formatDate(endOfMonth)}`,
    daysRemaining: Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  };
};

type Platform = "linkedin" | "twitter" | "instagram" | "facebook" | "tiktok";

const platforms: { name: Platform; label: string; color: string }[] = [
  { name: "linkedin", label: "LinkedIn", color: "bg-blue-600" },
  { name: "twitter", label: "Twitter/X", color: "bg-sky-500" },
  { name: "instagram", label: "Instagram", color: "bg-pink-600" },
  { name: "facebook", label: "Facebook", color: "bg-blue-700" },
  { name: "tiktok", label: "TikTok", color: "bg-black" },
];

export default function ContentPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | "all">("all");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategyId, setStrategyId] = useState<string | null>(null);

  // Connected accounts
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Platform selection for generation
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedPlatformsForGeneration, setSelectedPlatformsForGeneration] = useState<string[]>([]);
  const [postsPerPlatform, setPostsPerPlatform] = useState(3);

  // Edit mode
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Regenerating specific post
  const [regeneratingPostId, setRegeneratingPostId] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
    loadConnectedAccounts();
  }, []);

  const loadConnectedAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const result = await settingsApi.getConnectedAccounts();
      const accounts = result.accounts || [];
      setConnectedAccounts(accounts.map((a) => a.toLowerCase()));
      // Pre-select connected accounts for generation
      setSelectedPlatformsForGeneration(accounts.map((a) => a.toLowerCase()));
    } catch (err) {
      console.error("Failed to load connected accounts:", err);
      // Default to all platforms if can't load
      setConnectedAccounts([]);
      setSelectedPlatformsForGeneration(platforms.map((p) => p.name));
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadContent = async () => {
    setLoading(true);
    setError(null);

    try {
      // First try to get strategy
      const strategy = await strategyApi.getLatestStrategy();
      setStrategyId(strategy.id);

      // Get posts for this strategy
      const strategyPosts = await contentApi.getPostsByStrategy(strategy.id);
      setPosts(strategyPosts);

      // Don't auto-generate - let user select platforms first
    } catch (err: any) {
      if (err.response?.status === 404) {
        // No strategy found
        setError("No marketing strategy found. Complete an interview first.");
      } else {
        setError("Failed to load content. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const openGenerateModal = () => {
    // Pre-select connected accounts, or all if none connected
    if (connectedAccounts.length > 0) {
      setSelectedPlatformsForGeneration(connectedAccounts);
    } else {
      setSelectedPlatformsForGeneration(platforms.map((p) => p.name));
    }
    setShowGenerateModal(true);
  };

  const togglePlatformSelection = (platform: string) => {
    setSelectedPlatformsForGeneration((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const generateContent = async (stratId?: string, selectedPlatforms?: string[]) => {
    const id = stratId || strategyId;
    if (!id) {
      setError("No strategy found. Complete an interview first.");
      return;
    }

    const platformsToGenerate = selectedPlatforms || selectedPlatformsForGeneration;
    if (platformsToGenerate.length === 0) {
      setError("Please select at least one platform.");
      return;
    }

    setShowGenerateModal(false);
    setGenerating(true);
    setError(null);

    try {
      const newPosts = await contentApi.generateContent({
        strategy_id: id,
        platforms: platformsToGenerate,
        posts_per_platform: postsPerPlatform,
      });
      setPosts((prev) => [...prev, ...newPosts]);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to generate content.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (postId: string) => {
    try {
      const updated = await contentApi.approvePost(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    } catch (err) {
      console.error("Failed to approve post:", err);
    }
  };

  const handleReject = async (postId: string) => {
    try {
      const updated = await contentApi.rejectPost(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    } catch (err) {
      console.error("Failed to reject post:", err);
    }
  };

  const handleRegenerate = async (postId: string) => {
    setRegeneratingPostId(postId);
    try {
      const updated = await contentApi.regeneratePost(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    } catch (err) {
      console.error("Failed to regenerate post:", err);
    } finally {
      setRegeneratingPostId(null);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content_text);
  };

  const handleSaveEdit = async () => {
    if (!editingPostId) return;

    try {
      const updated = await contentApi.updatePost(editingPostId, {
        content_text: editContent,
      });
      setPosts((prev) => prev.map((p) => (p.id === editingPostId ? updated : p)));
      setEditingPostId(null);
      setEditContent("");
    } catch (err) {
      console.error("Failed to save post:", err);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      await contentApi.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  const formatSuggestedTime = (isoString: string | null) => {
    if (!isoString) return "Not set";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      draft: { color: "bg-gray-200 text-gray-700", label: "Draft" },
      approved: { color: "bg-green-100 text-green-700", label: "Approved" },
      rejected: { color: "bg-red-100 text-red-700", label: "Rejected" },
      scheduled: { color: "bg-blue-100 text-blue-700", label: "Scheduled" },
      posted: { color: "bg-purple-100 text-purple-700", label: "Posted" },
      failed: { color: "bg-red-200 text-red-800", label: "Failed" },
    };
    return badges[status] || badges.draft;
  };

  const filteredPosts =
    selectedPlatform === "all"
      ? posts
      : posts.filter((post) => post.platform === selectedPlatform);

  if (loading || generating) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-lg text-gray-600">
            {generating ? "Generating content for your brand..." : "Loading content..."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (error && posts.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="mt-4 text-lg text-gray-700">{error}</p>
          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => router.push("/interview")}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
            >
              Start Interview
            </button>
            <button
              onClick={() => router.push("/strategy")}
              className="rounded-lg border px-6 py-2 hover:bg-gray-50"
            >
              View Strategy
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content Library</h1>
            <p className="mt-2 text-gray-600">
              AI-generated content for your current month's marketing strategy
            </p>
          </div>
          <button
            onClick={openGenerateModal}
            disabled={generating}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>Generate Content</span>
          </button>
        </div>

        {/* Current Month Banner */}
        {(() => {
          const monthInfo = getCurrentMonthInfo();
          return (
            <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-900">
                      Your {monthInfo.name} Marketing Content
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Content generated for this month's marketing strategy ({monthInfo.dateRange})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{monthInfo.daysRemaining}</p>
                  <p className="text-xs text-gray-500">days left this month</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Connected Accounts Banner */}
        {!loadingAccounts && (
          <div className={`rounded-lg border p-4 ${
            connectedAccounts.length > 0
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link2 className={`h-5 w-5 ${
                  connectedAccounts.length > 0 ? "text-green-600" : "text-amber-600"
                }`} />
                <div>
                  <h3 className={`font-semibold ${
                    connectedAccounts.length > 0 ? "text-green-800" : "text-amber-800"
                  }`}>
                    {connectedAccounts.length > 0
                      ? `${connectedAccounts.length} Connected Account${connectedAccounts.length > 1 ? "s" : ""}`
                      : "No Connected Accounts"}
                  </h3>
                  <p className={`text-sm ${
                    connectedAccounts.length > 0 ? "text-green-700" : "text-amber-700"
                  }`}>
                    {connectedAccounts.length > 0
                      ? `Content will be generated for: ${connectedAccounts.map((a) => a.charAt(0).toUpperCase() + a.slice(1)).join(", ")}`
                      : "Connect your social accounts in Settings to generate and post content"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/settings")}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Manage Accounts
              </button>
            </div>
          </div>
        )}

        {/* Posting Guidance */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start space-x-3">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-800">How Posting Works</h3>
              <ul className="mt-2 space-y-2 text-sm text-amber-700">
                <li className="flex items-start">
                  <ArrowRight className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    <strong>Approve</strong> your content first, then go to the{" "}
                    <span className="font-medium">Approval & Posting</span> page
                  </span>
                </li>
                <li className="flex items-start">
                  <Send className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    Click <strong>"Post Now"</strong> to publish immediately to your connected social
                    media accounts
                  </span>
                </li>
                <li className="flex items-start">
                  <Clock className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    Click <strong>"Schedule"</strong> to set a specific date and time for automatic
                    posting
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Total Posts</p>
            <p className="text-2xl font-bold">{posts.length}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Drafts</p>
            <p className="text-2xl font-bold text-gray-600">
              {posts.filter((p) => p.status === "draft").length}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-green-600">
              {posts.filter((p) => p.status === "approved").length}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Scheduled</p>
            <p className="text-2xl font-bold text-blue-600">
              {posts.filter((p) => p.status === "scheduled").length}
            </p>
          </div>
        </div>

        {/* Platform Filter Tabs */}
        <div className="flex space-x-2 overflow-x-auto border-b border-gray-200 pb-2">
          <button
            onClick={() => setSelectedPlatform("all")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedPlatform === "all"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Platforms ({posts.length})
          </button>
          {platforms.map((platform) => {
            const count = posts.filter((p) => p.platform === platform.name).length;
            return (
              <button
                key={platform.name}
                onClick={() => setSelectedPlatform(platform.name)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedPlatform === platform.name
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {platform.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {filteredPosts.map((post) => {
            const platform = platforms.find((p) => p.name === post.platform);
            const statusBadge = getStatusBadge(post.status);
            const isEditing = editingPostId === post.id;
            const isRegenerating = regeneratingPostId === post.id;

            return (
              <div
                key={post.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`rounded-full ${platform?.color} px-3 py-1 text-xs font-medium text-white`}
                    >
                      {platform?.label}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-xs ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{post.content_pillar}</span>
                </div>

                {/* Content */}
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="mb-4 w-full rounded-lg border p-3 text-gray-700 focus:border-blue-500 focus:outline-none"
                    rows={6}
                  />
                ) : (
                  <p className="mb-4 whitespace-pre-line text-gray-700">
                    {isRegenerating ? (
                      <span className="flex items-center text-gray-400">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating...
                      </span>
                    ) : (
                      post.content_text
                    )}
                  </p>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                      >
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Suggested Time */}
                <div className="mb-4 flex items-center text-sm text-gray-500">
                  <Calendar className="mr-1 h-4 w-4" />
                  Suggested: {formatSuggestedTime(post.suggested_time)}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center space-x-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => setEditingPostId(null)}
                        className="flex items-center space-x-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(post)}
                        className="flex items-center space-x-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleRegenerate(post.id)}
                        disabled={isRegenerating}
                        className="flex items-center space-x-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
                        <span>Regenerate</span>
                      </button>
                      {post.status === "draft" && (
                        <>
                          <button
                            onClick={() => handleApprove(post.id)}
                            className="flex items-center space-x-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(post.id)}
                            className="flex items-center space-x-1 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="flex items-center space-x-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12">
            <Sparkles className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">
              {posts.length === 0 ? "No content generated yet" : "No content available for this platform"}
            </p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {posts.length === 0
                ? "Select your platforms and generate AI-powered content"
                : "Generate content for this platform or select a different filter"}
            </p>
            <button
              onClick={openGenerateModal}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Content</span>
            </button>
          </div>
        )}

        {/* Navigation to Approval */}
        {posts.filter((p) => p.status === "approved").length > 0 && (
          <div className="flex flex-col items-center space-y-3">
            <button
              onClick={() => router.push("/approval")}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              <Send className="h-5 w-5" />
              <span>
                Go to Posting - {posts.filter((p) => p.status === "approved").length} posts ready
              </span>
            </button>
            <p className="text-sm text-gray-500">
              Post or schedule your approved content to social media
            </p>
          </div>
        )}

        {/* Generate Content Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Generate Content</h3>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-4 text-sm text-gray-600">
                Select the platforms you want to generate content for. Only connected platforms
                can be used for actual posting.
              </p>

              {/* Platform Selection */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Select Platforms
                </label>
                <div className="space-y-2">
                  {platforms.map((platform) => {
                    const isConnected = connectedAccounts.includes(platform.name);
                    const isSelected = selectedPlatformsForGeneration.includes(platform.name);

                    return (
                      <div
                        key={platform.name}
                        onClick={() => togglePlatformSelection(platform.name)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${platform.color}`}
                          >
                            <span className="text-sm font-bold text-white">
                              {platform.label.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{platform.label}</span>
                            {isConnected ? (
                              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                Connected
                              </span>
                            ) : (
                              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                Not Connected
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          className={`h-5 w-5 rounded border-2 ${
                            isSelected
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Posts Per Platform */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Posts per Platform
                </label>
                <select
                  value={postsPerPlatform}
                  onChange={(e) => setPostsPerPlatform(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value={1}>1 post</option>
                  <option value={2}>2 posts</option>
                  <option value={3}>3 posts</option>
                  <option value={5}>5 posts</option>
                  <option value={10}>10 posts</option>
                </select>
              </div>

              {/* Summary */}
              <div className="mb-6 rounded-lg bg-gray-50 p-3">
                <p className="text-sm text-gray-600">
                  Will generate{" "}
                  <span className="font-semibold text-gray-900">
                    {selectedPlatformsForGeneration.length * postsPerPlatform} posts
                  </span>{" "}
                  across{" "}
                  <span className="font-semibold text-gray-900">
                    {selectedPlatformsForGeneration.length} platform
                    {selectedPlatformsForGeneration.length !== 1 ? "s" : ""}
                  </span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => generateContent()}
                  disabled={selectedPlatformsForGeneration.length === 0}
                  className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Content</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
