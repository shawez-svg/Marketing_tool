"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { Edit, RefreshCw, CheckCircle } from "lucide-react";

type Platform = "linkedin" | "twitter" | "instagram" | "facebook" | "tiktok";

interface Post {
  id: string;
  platform: Platform;
  content: string;
  tags: string[];
  suggestedTime: string;
  pillar: string;
}

export default function ContentPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | "all">("all");

  // Mock data
  const posts: Post[] = [
    {
      id: "1",
      platform: "linkedin",
      content: "After 10 years in the marketing industry, I've learned that automation isn't about replacing humans—it's about amplifying their creativity. Here's how AI is changing the game...",
      tags: ["#MarketingAutomation", "#AI", "#ThoughtLeadership"],
      suggestedTime: "Mon, 9:00 AM",
      pillar: "Thought Leadership"
    },
    {
      id: "2",
      platform: "linkedin",
      content: "5 ways to improve your marketing ROI with AI-powered automation:\n\n1. Personalized email campaigns\n2. Predictive analytics\n3. Content optimization\n4. Lead scoring\n5. Real-time reporting\n\nWhich one are you implementing first?",
      tags: ["#MarketingTips", "#ROI", "#Automation"],
      suggestedTime: "Wed, 11:00 AM",
      pillar: "Educational"
    },
    {
      id: "3",
      platform: "twitter",
      content: "AI isn't replacing marketers.\n\nIt's making great marketers unstoppable.\n\nThe future belongs to those who know how to use both creativity AND automation. 🚀",
      tags: ["#AI", "#Marketing"],
      suggestedTime: "Tue, 3:00 PM",
      pillar: "Thought Leadership"
    },
    {
      id: "4",
      platform: "instagram",
      content: "Behind the scenes: How we create personalized campaigns for 10,000+ customers simultaneously 👀\n\nSwipe to see the magic ➡️\n\n#MarketingAutomation #BehindTheScenes #TechLife",
      tags: ["#MarketingAutomation", "#BehindTheScenes", "#TechLife"],
      suggestedTime: "Thu, 7:00 PM",
      pillar: "Behind-the-Scenes"
    },
  ];

  const platforms: { name: Platform; label: string; color: string }[] = [
    { name: "linkedin", label: "LinkedIn", color: "bg-blue-600" },
    { name: "twitter", label: "Twitter/X", color: "bg-sky-500" },
    { name: "instagram", label: "Instagram", color: "bg-pink-600" },
    { name: "facebook", label: "Facebook", color: "bg-blue-700" },
    { name: "tiktok", label: "TikTok", color: "bg-black" },
  ];

  const filteredPosts = selectedPlatform === "all"
    ? posts
    : posts.filter(post => post.platform === selectedPlatform);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Library</h1>
          <p className="mt-2 text-gray-600">
            AI-generated content organized by platform
          </p>
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
            All Platforms
          </button>
          {platforms.map((platform) => (
            <button
              key={platform.name}
              onClick={() => setSelectedPlatform(platform.name)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedPlatform === platform.name
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {platform.label}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {filteredPosts.map((post) => {
            const platform = platforms.find(p => p.name === post.platform);

            return (
              <div
                key={post.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Platform Badge */}
                <div className="mb-4 flex items-center justify-between">
                  <span className={`rounded-full ${platform?.color} px-3 py-1 text-xs font-medium text-white`}>
                    {platform?.label}
                  </span>
                  <span className="text-xs text-gray-500">{post.pillar}</span>
                </div>

                {/* Content */}
                <p className="mb-4 whitespace-pre-line text-gray-700">
                  {post.content}
                </p>

                {/* Tags */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Suggested Time */}
                <p className="mb-4 text-sm text-gray-500">
                  📅 Suggested: {post.suggestedTime}
                </p>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button className="flex flex-1 items-center justify-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button className="flex flex-1 items-center justify-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <RefreshCw className="h-4 w-4" />
                    <span>Regenerate</span>
                  </button>
                  <button className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12">
            <p className="text-gray-500">No content available for this platform</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
