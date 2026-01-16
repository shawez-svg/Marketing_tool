"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { Send, Calendar, X, Settings as SettingsIcon } from "lucide-react";

type PostStatus = "draft" | "approved" | "scheduled" | "posted" | "rejected";

interface Post {
  id: string;
  platform: string;
  content: string;
  status: PostStatus;
  scheduledTime?: string;
}

export default function ApprovalPage() {
  const [selectedStatus, setSelectedStatus] = useState<PostStatus | "all">("all");
  const [autoApproval, setAutoApproval] = useState(false);

  // Mock data
  const posts: Post[] = [
    {
      id: "1",
      platform: "LinkedIn",
      content: "After 10 years in the marketing industry...",
      status: "draft",
    },
    {
      id: "2",
      platform: "Twitter",
      content: "AI isn't replacing marketers. It's making great marketers unstoppable.",
      status: "approved",
    },
    {
      id: "3",
      platform: "Instagram",
      content: "Behind the scenes: How we create personalized campaigns...",
      status: "scheduled",
      scheduledTime: "2026-01-15 10:00 AM",
    },
    {
      id: "4",
      platform: "LinkedIn",
      content: "5 ways to improve your marketing ROI with AI...",
      status: "posted",
    },
  ];

  const statusOptions: { value: PostStatus | "all"; label: string; count: number }[] = [
    { value: "all", label: "All", count: posts.length },
    { value: "draft", label: "Draft", count: posts.filter(p => p.status === "draft").length },
    { value: "approved", label: "Approved", count: posts.filter(p => p.status === "approved").length },
    { value: "scheduled", label: "Scheduled", count: posts.filter(p => p.status === "scheduled").length },
    { value: "posted", label: "Posted", count: posts.filter(p => p.status === "posted").length },
    { value: "rejected", label: "Rejected", count: posts.filter(p => p.status === "rejected").length },
  ];

  const filteredPosts = selectedStatus === "all"
    ? posts
    : posts.filter(post => post.status === selectedStatus);

  const getStatusColor = (status: PostStatus) => {
    const colors = {
      draft: "bg-gray-100 text-gray-700",
      approved: "bg-green-100 text-green-700",
      scheduled: "bg-blue-100 text-blue-700",
      posted: "bg-purple-100 text-purple-700",
      rejected: "bg-red-100 text-red-700",
    };
    return colors[status];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Approval & Posting</h1>
            <p className="mt-2 text-gray-600">
              Review, approve, and schedule your content
            </p>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-900">Auto-Approval</h3>
                <p className="text-sm text-gray-500">
                  Automatically approve and schedule generated content
                </p>
              </div>
            </div>
            <button
              onClick={() => setAutoApproval(!autoApproval)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoApproval ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoApproval ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex space-x-2 overflow-x-auto">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedStatus === option.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span>{option.label}</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {option.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content Queue */}
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Platform and Status */}
                  <div className="mb-3 flex items-center space-x-3">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {post.platform}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(post.status)}`}>
                      {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </span>
                    {post.scheduledTime && (
                      <span className="text-sm text-gray-500">
                        📅 {post.scheduledTime}
                      </span>
                    )}
                  </div>

                  {/* Content Preview */}
                  <p className="mb-4 text-gray-700">{post.content}</p>

                  {/* Actions */}
                  {post.status === "draft" && (
                    <div className="flex space-x-2">
                      <button className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                        <Send className="h-4 w-4" />
                        <span>Post Now</span>
                      </button>
                      <button className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Calendar className="h-4 w-4" />
                        <span>Schedule</span>
                      </button>
                      <button className="flex items-center space-x-2 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                        <X className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {post.status === "approved" && (
                    <div className="flex space-x-2">
                      <button className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                        <Send className="h-4 w-4" />
                        <span>Post Now</span>
                      </button>
                      <button className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Calendar className="h-4 w-4" />
                        <span>Schedule</span>
                      </button>
                    </div>
                  )}

                  {post.status === "scheduled" && (
                    <div className="flex space-x-2">
                      <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        Edit Schedule
                      </button>
                      <button className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                        Cancel
                      </button>
                    </div>
                  )}

                  {post.status === "posted" && (
                    <div className="text-sm text-gray-500">
                      ✓ Successfully posted
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12">
            <p className="text-gray-500">No posts with this status</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
