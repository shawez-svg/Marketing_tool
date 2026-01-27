"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { contentApi, Post } from "@/lib/content-api";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
  AlertCircle,
  Calendar,
  BarChart3,
  RefreshCw,
} from "lucide-react";

const platformColors: Record<string, string> = {
  linkedin: "bg-blue-600",
  twitter: "bg-sky-500",
  instagram: "bg-pink-600",
  facebook: "bg-blue-700",
  tiktok: "bg-black",
};

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);

    try {
      const allPosts = await contentApi.getPosts();
      setPosts(allPosts);
    } catch (err: any) {
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    totalGenerated: posts.length,
    totalApproved: posts.filter((p) => p.status === "approved").length,
    totalPosted: posts.filter((p) => p.status === "posted").length,
    totalScheduled: posts.filter((p) => p.status === "scheduled").length,
    totalDraft: posts.filter((p) => p.status === "draft").length,
    totalRejected: posts.filter((p) => p.status === "rejected").length,
    approvalRate: posts.length > 0
      ? Math.round(
          ((posts.filter((p) => ["approved", "scheduled", "posted"].includes(p.status)).length) /
            posts.length) *
            100
        )
      : 0,
  };

  // Platform breakdown
  const platformBreakdown = Object.entries(
    posts.reduce((acc, post) => {
      acc[post.platform] = (acc[post.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([platform, count]) => ({
    platform,
    label: platformLabels[platform] || platform,
    count,
    color: platformColors[platform] || "bg-gray-600",
  })).sort((a, b) => b.count - a.count);

  // Posted content
  const postedContent = posts
    .filter((p) => p.status === "posted")
    .sort((a, b) => new Date(b.posted_at || 0).getTime() - new Date(a.posted_at || 0).getTime())
    .slice(0, 5);

  // Scheduled/upcoming posts
  const upcomingPosts = posts
    .filter((p) => p.status === "scheduled")
    .sort((a, b) => new Date(a.scheduled_time || 0).getTime() - new Date(b.scheduled_time || 0).getTime())
    .slice(0, 5);

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-lg text-gray-600">Loading analytics...</p>
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
          <button
            onClick={() => router.push("/content")}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Generate Content First
          </button>
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
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="mt-2 text-gray-600">
              Track your content performance and campaign metrics
            </p>
          </div>
          <button
            onClick={loadPosts}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Generated</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalGenerated}</p>
              </div>
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{stats.totalApproved}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">{stats.totalScheduled}</p>
              </div>
              <Calendar className="h-10 w-10 text-blue-400" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Posted</p>
                <p className="mt-2 text-3xl font-bold text-purple-600">{stats.totalPosted}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-400" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Drafts</p>
                <p className="mt-2 text-3xl font-bold text-orange-600">{stats.totalDraft}</p>
              </div>
              <Clock className="h-10 w-10 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Approval Rate & Platform Breakdown - Side by Side */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Approval Rate */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Approval Rate</h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
                    style={{ width: `${stats.approvalRate}%` }}
                  />
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.approvalRate}%</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {stats.totalApproved + stats.totalScheduled + stats.totalPosted} out of {stats.totalGenerated} posts approved
            </p>
          </div>

          {/* Platform Breakdown */}
          {platformBreakdown.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Posts by Platform</h2>
              </div>
              <div className="space-y-3">
                {platformBreakdown.map((item) => (
                  <div key={item.platform} className="flex items-center">
                    <span className="w-24 text-sm text-gray-700">{item.label}</span>
                    <div className="flex-1">
                      <div className="h-6 overflow-hidden rounded-lg bg-gray-100">
                        <div
                          className={`h-full ${item.color} flex items-center justify-end px-2 text-xs font-medium text-white transition-all duration-300`}
                          style={{
                            width: `${Math.max((item.count / stats.totalGenerated) * 100, 15)}%`,
                          }}
                        >
                          {item.count}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Posted Content */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Posted Content</h2>
            {postedContent.length > 0 ? (
              <div className="space-y-4">
                {postedContent.map((post) => (
                  <div
                    key={post.id}
                    className={`border-l-4 p-4 ${
                      platformColors[post.platform]?.replace("bg-", "border-") || "border-gray-600"
                    } bg-gray-50`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium text-white ${
                              platformColors[post.platform] || "bg-gray-600"
                            }`}
                          >
                            {platformLabels[post.platform] || post.platform}
                          </span>
                          <span className="text-xs text-gray-600">{formatDate(post.posted_at)}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-700">{post.content_text}</p>
                        {post.content_pillar && (
                          <span className="mt-2 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                            {post.content_pillar}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mb-2 opacity-50" />
                <p>No posted content yet</p>
                <button
                  onClick={() => router.push("/approval")}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Post Content
                </button>
              </div>
            )}
          </div>

          {/* Upcoming Posts */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Upcoming Scheduled Posts</h2>
            {upcomingPosts.length > 0 ? (
              <div className="space-y-3">
                {upcomingPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium text-white ${
                            platformColors[post.platform] || "bg-gray-600"
                          }`}
                        >
                          {platformLabels[post.platform] || post.platform}
                        </span>
                        <p className="line-clamp-1 text-sm text-gray-700">{post.content_text}</p>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center text-xs text-blue-600">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatDate(post.scheduled_time)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mb-2 opacity-50" />
                <p>No scheduled posts</p>
                <button
                  onClick={() => router.push("/approval")}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Schedule Content
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Pillar Distribution */}
        {posts.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Content Pillar Distribution</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(
                posts.reduce((acc, post) => {
                  const pillar = post.content_pillar || "Uncategorized";
                  acc[pillar] = (acc[pillar] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([pillar, count]) => (
                <div
                  key={pillar}
                  className="flex items-center space-x-2 rounded-lg bg-gray-100 px-4 py-2"
                >
                  <span className="font-medium text-gray-800">{pillar}</span>
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => router.push("/content")}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Generate More Content
          </button>
          <button
            onClick={() => router.push("/approval")}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Manage Approvals
          </button>
          <button
            onClick={() => router.push("/strategy")}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            View Strategy
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
