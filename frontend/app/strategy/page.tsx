"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Target, Users, Megaphone, Edit } from "lucide-react";

export default function StrategyPage() {
  // Mock data - will be replaced with API data
  const strategy = {
    brandSummary: "A B2B SaaS company providing AI-powered marketing automation tools for small to medium businesses.",
    targetAudience: [
      "Marketing managers at SMBs",
      "Digital marketing agencies",
      "E-commerce business owners"
    ],
    recommendedChannels: [
      { name: "LinkedIn", reasoning: "Best for B2B audience, thought leadership content" },
      { name: "Twitter/X", reasoning: "Real-time engagement, industry news, tech audience" },
      { name: "Instagram", reasoning: "Visual content, behind-the-scenes, brand personality" }
    ],
    contentPillars: [
      "Marketing automation best practices",
      "AI in marketing",
      "Customer success stories",
      "Product updates and features"
    ],
    brandVoice: "Professional yet approachable, data-driven, helpful and educational",
    postingFrequency: {
      LinkedIn: "3-4 times per week",
      Twitter: "Daily (5-7 times per week)",
      Instagram: "2-3 times per week"
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marketing Strategy</h1>
            <p className="mt-2 text-gray-600">
              AI-generated strategy based on your brand interview
            </p>
          </div>
          <button className="flex items-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">
            <Edit className="h-4 w-4" />
            <span>Edit Strategy</span>
          </button>
        </div>

        {/* Brand Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Brand Profile</h2>
          </div>
          <p className="text-gray-700">{strategy.brandSummary}</p>
        </div>

        {/* Target Audience */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Target Audience</h2>
          </div>
          <ul className="space-y-2">
            {strategy.targetAudience.map((audience, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2 text-blue-600">•</span>
                <span className="text-gray-700">{audience}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended Channels */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center space-x-2">
            <Megaphone className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Recommended Channels</h2>
          </div>
          <div className="space-y-4">
            {strategy.recommendedChannels.map((channel, index) => (
              <div key={index} className="border-l-4 border-blue-600 bg-blue-50 p-4">
                <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{channel.reasoning}</p>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  Posting frequency: {strategy.postingFrequency[channel.name as keyof typeof strategy.postingFrequency]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Content Pillars */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Content Pillars</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {strategy.contentPillars.map((pillar, index) => (
              <div key={index} className="rounded-lg bg-gray-50 p-4 text-gray-700">
                {pillar}
              </div>
            ))}
          </div>
        </div>

        {/* Brand Voice */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Brand Voice & Tone</h2>
          <p className="text-gray-700">{strategy.brandVoice}</p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
            Generate Content Based on This Strategy
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
