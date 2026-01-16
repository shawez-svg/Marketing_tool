"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { FileText, CheckCircle, Clock, TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  // Mock data
  const stats = {
    totalGenerated: 47,
    totalApproved: 32,
    totalPosted: 18,
    totalPending: 14,
    approvalRate: 68,
  };

  const platformBreakdown = [
    { platform: "LinkedIn", count: 12, color: "bg-blue-600" },
    { platform: "Twitter", count: 18, color: "bg-sky-500" },
    { platform: "Instagram", count: 10, color: "bg-pink-600" },
    { platform: "Facebook", count: 5, color: "bg-blue-700" },
    { platform: "TikTok", count: 2, color: "bg-black" },
  ];

  const postedContent = [
    {
      id: "1",
      platform: "LinkedIn",
      content: "After 10 years in the marketing industry...",
      postedAt: "2026-01-14 9:00 AM",
      engagement: { likes: 45, comments: 12, shares: 8 },
    },
    {
      id: "2",
      platform: "Twitter",
      content: "AI isn't replacing marketers...",
      postedAt: "2026-01-14 3:00 PM",
      engagement: { likes: 128, comments: 23, shares: 34 },
    },
    {
      id: "3",
      platform: "Instagram",
      content: "Behind the scenes: How we create...",
      postedAt: "2026-01-13 7:00 PM",
      engagement: { likes: 234, comments: 45, shares: 12 },
    },
  ];

  const upcomingPosts = [
    { platform: "LinkedIn", content: "5 ways to improve your marketing ROI...", scheduledFor: "Jan 15, 11:00 AM" },
    { platform: "Twitter", content: "Marketing automation tip of the day...", scheduledFor: "Jan 15, 2:00 PM" },
    { platform: "Instagram", content: "Customer success story spotlight...", scheduledFor: "Jan 16, 8:00 PM" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="mt-2 text-gray-600">
            Track your content performance and campaign metrics
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
                <p className="text-sm font-medium text-gray-600">Posted</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">{stats.totalPosted}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-400" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="mt-2 text-3xl font-bold text-orange-600">{stats.totalPending}</p>
              </div>
              <Clock className="h-10 w-10 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Approval Rate */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Approval Rate</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-green-600 transition-all duration-300"
                  style={{ width: `${stats.approvalRate}%` }}
                />
              </div>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.approvalRate}%</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {stats.totalApproved} out of {stats.totalGenerated} posts approved
          </p>
        </div>

        {/* Platform Breakdown */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Posts by Platform</h2>
          <div className="space-y-4">
            {platformBreakdown.map((item) => (
              <div key={item.platform} className="flex items-center">
                <span className="w-24 text-sm text-gray-700">{item.platform}</span>
                <div className="flex-1">
                  <div className="h-8 overflow-hidden rounded-lg bg-gray-100">
                    <div
                      className={`h-full ${item.color} flex items-center justify-end px-3 text-sm font-medium text-white transition-all duration-300`}
                      style={{ width: `${(item.count / stats.totalGenerated) * 100}%` }}
                    >
                      {item.count}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Posted Content */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Posted Content</h2>
          <div className="space-y-4">
            {postedContent.map((post) => (
              <div
                key={post.id}
                className="border-l-4 border-blue-600 bg-blue-50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white">
                        {post.platform}
                      </span>
                      <span className="text-xs text-gray-600">{post.postedAt}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{post.content}</p>
                    <div className="mt-3 flex space-x-4 text-xs text-gray-600">
                      <span>❤️ {post.engagement.likes} likes</span>
                      <span>💬 {post.engagement.comments} comments</span>
                      <span>🔄 {post.engagement.shares} shares</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Posts */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Upcoming Posts (Next 7 Days)
          </h2>
          <div className="space-y-3">
            {upcomingPosts.map((post, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      {post.platform}
                    </span>
                    <p className="text-sm text-gray-700">{post.content}</p>
                  </div>
                </div>
                <span className="ml-4 text-xs text-gray-500">{post.scheduledFor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
