"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { strategyApi, Strategy, MonthlyPlan } from "@/lib/strategy-api";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  Users,
  Megaphone,
  Loader2,
  AlertCircle,
  RefreshCw,
  Lightbulb,
  Clock,
  Hash,
  MessageSquare,
  Calendar,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Helper function to get 90-day roadmap months
const get90DayRoadmap = () => {
  const today = new Date();
  const months = [];

  for (let i = 0; i < 3; i++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthName = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Calculate start and end dates for each month
    let startDate: Date;
    let endDate: Date;

    if (i === 0) {
      // Current month - starts from today
      startDate = today;
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
    } else {
      // Future months - full month
      startDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
    }

    const formatDate = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    months.push({
      month: i + 1,
      name: monthName,
      dateRange: `${formatDate(startDate)} - ${formatDate(endDate)}`,
      isCurrentMonth: i === 0,
      startDate,
      endDate,
    });
  }

  return months;
};

// Platform icons/colors for content plan
const platformConfig: Record<string, { color: string; bgColor: string }> = {
  instagram: { color: "text-pink-600", bgColor: "bg-pink-100" },
  linkedin: { color: "text-blue-700", bgColor: "bg-blue-100" },
  twitter: { color: "text-sky-500", bgColor: "bg-sky-100" },
  facebook: { color: "text-blue-600", bgColor: "bg-blue-100" },
  tiktok: { color: "text-gray-900", bgColor: "bg-gray-200" },
  blog: { color: "text-green-600", bgColor: "bg-green-100" },
};

// Generate content plan based on AI-generated calendar or fallback to defaults
const getMonthlyContentPlan = (
  monthIndex: number,
  recommendedChannels: any[] | undefined,
  contentCalendar?: Strategy["content_calendar"]
) => {
  // If we have AI-generated content calendar, use it
  if (contentCalendar?.months && contentCalendar.months[monthIndex]) {
    const monthData = contentCalendar.months[monthIndex];
    const contentPlan = monthData.platforms.map((p) => ({
      platform: p.platform,
      count: p.post_count,
      type: p.content_types,
      reasoning: p.reasoning,
    }));
    return {
      contentPlan,
      totalPosts: monthData.total_posts,
      focus: monthData.focus,
      keyGoals: monthData.key_goals,
      pillarDistribution: monthData.pillar_distribution,
    };
  }

  // Fallback: Default content volumes per platform per month (scale up each month)
  const baseVolumes: Record<string, number[]> = {
    instagram: [4, 6, 8],      // Start with 4, scale to 8
    linkedin: [3, 4, 5],       // Professional, less frequent
    twitter: [8, 12, 15],      // High frequency
    facebook: [3, 4, 5],       // Similar to LinkedIn
    tiktok: [3, 5, 6],         // Video content
    blog: [1, 2, 2],           // Long-form content
  };

  // If we have recommended channels, prioritize those
  const contentPlan: { platform: string; count: number; type: string; reasoning?: string }[] = [];

  if (recommendedChannels && recommendedChannels.length > 0) {
    recommendedChannels.forEach((channel) => {
      const platformName = channel.platform?.toLowerCase() || "";
      const volumes = baseVolumes[platformName];
      if (volumes) {
        // Primary channels get full volume, secondary get 70%
        const multiplier = channel.priority === "primary" ? 1 : 0.7;
        const count = Math.round(volumes[monthIndex] * multiplier);
        contentPlan.push({
          platform: channel.platform,
          count,
          type: getContentType(platformName),
        });
      }
    });
  } else {
    // Default plan if no channels specified
    contentPlan.push(
      { platform: "Instagram", count: baseVolumes.instagram[monthIndex], type: "Posts & Reels" },
      { platform: "LinkedIn", count: baseVolumes.linkedin[monthIndex], type: "Posts & Articles" },
      { platform: "Twitter", count: baseVolumes.twitter[monthIndex], type: "Tweets & Threads" }
    );
  }

  // Calculate total posts for the month
  const totalPosts = contentPlan.reduce((sum, item) => sum + item.count, 0);

  return { contentPlan, totalPosts };
};

const getContentType = (platform: string): string => {
  const types: Record<string, string> = {
    instagram: "Posts & Reels",
    linkedin: "Posts & Articles",
    twitter: "Tweets & Threads",
    facebook: "Posts & Stories",
    tiktok: "Short Videos",
    blog: "Blog Articles",
  };
  return types[platform] || "Posts";
};

// Month-specific focus areas
const getMonthFocus = (monthIndex: number, contentPillars: any[] | undefined) => {
  const focuses = [
    {
      title: "Foundation & Brand Awareness",
      goals: [
        "Establish consistent posting schedule",
        "Introduce your brand story and values",
        "Build initial audience engagement",
        "Test content formats to see what resonates",
      ],
      metrics: ["Follower growth", "Reach", "Engagement rate"],
    },
    {
      title: "Growth & Community Building",
      goals: [
        "Increase posting frequency",
        "Engage with audience through comments and DMs",
        "Collaborate with complementary brands",
        "Run engagement campaigns (polls, Q&As)",
      ],
      metrics: ["Engagement rate", "Comments", "Shares"],
    },
    {
      title: "Optimization & Conversion",
      goals: [
        "Analyze top-performing content",
        "Double down on winning formats",
        "Implement call-to-actions",
        "Drive traffic to website/offers",
      ],
      metrics: ["Click-through rate", "Conversions", "ROI"],
    },
  ];

  const focus = focuses[monthIndex] || focuses[0];

  // Add content pillars focus if available
  if (contentPillars && contentPillars.length > 0) {
    const pillarIndex = monthIndex % contentPillars.length;
    focus.goals.push(`Primary pillar focus: ${contentPillars[pillarIndex]?.pillar_name || "Educational content"}`);
  }

  return focus;
};

// Generate calendar days for a month
const generateCalendarDays = (
  startDate: Date,
  endDate: Date,
  totalPosts: number,
  platforms: { platform: string; count: number }[]
) => {
  const days = [];
  const currentDate = new Date(startDate);
  const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Distribute posts across the days (roughly)
  const postsPerDay = totalPosts / daysInPeriod;
  let accumulatedPosts = 0;
  let platformIndex = 0;

  // Get posting days (e.g., Mon, Wed, Fri)
  const postingDays = [1, 3, 5]; // Monday, Wednesday, Friday

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dayNum = currentDate.getDate();
    const isPostingDay = postingDays.includes(dayOfWeek);

    let postsForDay: { platform: string; type: string }[] = [];

    if (isPostingDay && accumulatedPosts < totalPosts) {
      // Assign 1-2 posts per posting day
      const numPosts = Math.min(2, Math.ceil(postsPerDay * 2));
      for (let i = 0; i < numPosts && accumulatedPosts < totalPosts; i++) {
        const platform = platforms[platformIndex % platforms.length];
        if (platform) {
          postsForDay.push({
            platform: platform.platform,
            type: platform.count > 0 ? "post" : "",
          });
          platformIndex++;
          accumulatedPosts++;
        }
      }
    }

    days.push({
      date: new Date(currentDate),
      dayNum,
      dayOfWeek,
      isCurrentMonth: true,
      posts: postsForDay,
      isToday: currentDate.toDateString() === new Date().toDateString(),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
};

export default function StrategyPage() {
  const router = useRouter();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<number[]>([0]); // Month 1 expanded by default

  const toggleMonthExpansion = (monthIndex: number) => {
    setExpandedMonths((prev) =>
      prev.includes(monthIndex)
        ? prev.filter((i) => i !== monthIndex)
        : [...prev, monthIndex]
    );
  };

  useEffect(() => {
    loadStrategy();
  }, []);

  const loadStrategy = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if there's a new interview that needs a strategy
      const currentInterviewId = localStorage.getItem("interviewId");
      console.log("[Strategy] Current interview ID:", currentInterviewId);

      // Try to get the latest strategy
      let data: Strategy | null = null;
      try {
        data = await strategyApi.getLatestStrategy();
        console.log("[Strategy] Got existing strategy:", data?.id);
      } catch (err: any) {
        console.log("[Strategy] Error getting latest:", err.response?.status, err.message);
        if (err.response?.status !== 404 && err.code !== "ERR_NETWORK") {
          throw err;
        }
      }

      // If we have a current interview ID and it doesn't match the strategy, generate new
      if (currentInterviewId) {
        if (!data || data.interview_id !== currentInterviewId) {
          console.log("[Strategy] Need to generate new strategy");
          setLoading(false);
          await generateStrategyFromInterview(currentInterviewId);
          return;
        }
      }

      if (data) {
        setStrategy(data);
      } else {
        setError("No strategy found. Complete an interview first.");
      }
    } catch (err: any) {
      console.error("[Strategy] Load error:", err);
      const isNetworkError = err.code === "ERR_NETWORK" || err.message?.includes("Network");
      setError(isNetworkError
        ? "Cannot connect to backend. Please ensure the server is running."
        : "Failed to load strategy. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateStrategyFromInterview = async (interviewId: string) => {
    setGenerating(true);
    setError(null);
    try {
      console.log("[Strategy] Generating for interview:", interviewId);
      const data = await strategyApi.generateStrategy(interviewId);
      console.log("[Strategy] Generated successfully:", data?.id);
      setStrategy(data);
    } catch (err: any) {
      console.error("[Strategy] Generation error:", err);
      const isNetworkError = err.code === "ERR_NETWORK" || err.message?.includes("Network");
      const errorMessage = isNetworkError
        ? "Cannot connect to backend. Please ensure the server is running."
        : err.response?.data?.detail || "Failed to generate strategy. Please try again.";
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  if (loading || generating) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-lg text-gray-600">
            {generating ? "Generating your marketing strategy..." : "Loading..."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !strategy) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="mt-4 text-lg text-gray-700">{error}</p>
          <button
            onClick={() => router.push("/interview")}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Start Interview
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (!strategy) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marketing Strategy</h1>
            <p className="mt-2 text-gray-600">AI-generated based on your interview</p>
          </div>
          <button
            onClick={() => {
              const id = localStorage.getItem("interviewId");
              if (id) generateStrategyFromInterview(id);
            }}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Regenerate</span>
          </button>
        </div>

        {/* Brand Profile & Target Audience - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Brand Summary */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Brand Profile</h2>
            </div>
            <p className="text-gray-700 whitespace-pre-line">{strategy.brand_summary}</p>
            {strategy.value_proposition && (
              <div className="mt-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4 border border-blue-100">
                <p className="font-medium text-blue-900">Value Proposition</p>
                <p className="mt-1 text-blue-800">{strategy.value_proposition}</p>
              </div>
            )}
          </div>

          {/* Target Audience */}
          {strategy.target_audience?.length > 0 && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900">Target Audience</h2>
              </div>
              <div className="space-y-3">
                {strategy.target_audience.map((audience, i) => (
                  <div key={i} className="rounded-lg bg-gradient-to-r from-gray-50 to-purple-50 p-4 border border-gray-100">
                    <h3 className="font-semibold text-gray-900">{audience.persona_name}</h3>
                    <p className="text-sm text-gray-600">{audience.demographics}</p>
                    {audience.pain_points?.length > 0 && (
                      <ul className="mt-2 list-inside list-disc text-sm text-gray-700">
                        {audience.pain_points.map((p, j) => <li key={j}>{p}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recommended Channels */}
        {strategy.recommended_channels?.length > 0 && (
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center space-x-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Recommended Channels</h2>
            </div>
            <div className="space-y-4">
              {strategy.recommended_channels.map((ch, i) => (
                <div key={i} className={`border-l-4 p-4 ${ch.priority === "primary" ? "border-blue-600 bg-blue-50" : "border-gray-400 bg-gray-50"}`}>
                  <div className="flex justify-between">
                    <h3 className="font-semibold text-gray-900">{ch.platform}</h3>
                    <span className={`rounded-full px-2 py-1 text-xs ${ch.priority === "primary" ? "bg-blue-200 text-blue-800" : "bg-gray-200"}`}>
                      {ch.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{ch.reasoning}</p>
                  <p className="mt-2 text-xs text-gray-500"><Clock className="inline h-3 w-3 mr-1" />{ch.posting_frequency}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Pillars */}
        {strategy.content_pillars?.length > 0 && (
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Content Pillars</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {strategy.content_pillars.map((pillar, i) => (
                <div key={i} className="rounded-lg bg-gray-50 p-4">
                  <div className="flex justify-between">
                    <h3 className="font-semibold text-gray-900">{pillar.pillar_name}</h3>
                    <span className="text-sm text-blue-600">{pillar.percentage}%</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Brand Voice */}
        {strategy.tone_and_voice?.brand_voice && (
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Brand Voice & Tone</h2>
            </div>
            <p className="text-gray-700">{strategy.tone_and_voice.brand_voice}</p>
            {strategy.tone_and_voice.tone_attributes?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {strategy.tone_and_voice.tone_attributes.map((attr, i) => (
                  <span key={i} className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">{attr}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hashtags */}
        {strategy.hashtag_strategy?.length > 0 && (
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center space-x-2">
              <Hash className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Hashtag Strategy</h2>
            </div>
            {strategy.hashtag_strategy.map((cat, i) => (
              <div key={i} className="mb-3">
                <p className="font-medium text-gray-900">{cat.category}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {cat.hashtags.map((tag, j) => (
                    <span key={j} className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-700">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 90-Day Marketing Roadmap */}
        <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
          <div className="mb-6 flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">90-Day Marketing Roadmap</h2>
            {strategy.content_calendar && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                AI-Generated
              </span>
            )}
          </div>
          {strategy.content_calendar?.strategy_summary && (
            <p className="mb-4 text-gray-700 italic border-l-4 border-blue-300 pl-4">
              {strategy.content_calendar.strategy_summary}
            </p>
          )}
          <p className="mb-6 text-gray-600">
            Your personalized 3-month strategy starting from{" "}
            <span className="font-semibold text-blue-600">
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          </p>

          <div className="space-y-4">
            {get90DayRoadmap().map((monthData, index) => {
              const defaultFocus = getMonthFocus(index, strategy.content_pillars);
              const calendarData = getMonthlyContentPlan(
                index,
                strategy.recommended_channels,
                strategy.content_calendar
              );
              const { contentPlan, totalPosts } = calendarData;
              const focus = {
                title: calendarData.focus || defaultFocus.title,
                goals: calendarData.keyGoals || defaultFocus.goals,
                metrics: defaultFocus.metrics,
              };
              const isExpanded = expandedMonths.includes(index);
              const calendarDays = generateCalendarDays(
                monthData.startDate,
                monthData.endDate,
                totalPosts,
                contentPlan
              );

              return (
                <div
                  key={index}
                  className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                    monthData.isCurrentMonth
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {/* Month Header - Clickable for expansion */}
                  <div
                    className={`p-5 cursor-pointer ${!monthData.isCurrentMonth ? "hover:bg-gray-50" : ""}`}
                    onClick={() => !monthData.isCurrentMonth && toggleMonthExpansion(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            monthData.isCurrentMonth ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {monthData.month}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{monthData.name}</h3>
                          <p className="text-sm text-gray-500">{monthData.dateRange}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {monthData.isCurrentMonth && (
                          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                            Current Month
                          </span>
                        )}
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          monthData.isCurrentMonth ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {totalPosts} posts
                        </span>
                        {!monthData.isCurrentMonth && (
                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Focus Title - Always visible */}
                    <div className="mt-3 flex items-center">
                      <ArrowRight className="mr-2 h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-gray-800">{focus.title}</span>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  {(monthData.isCurrentMonth || isExpanded) && (
                    <div className="border-t border-gray-200 p-5 bg-white">
                      {/* Calendar View */}
                      <div className="mb-6">
                        <p className="mb-3 text-sm font-semibold text-gray-800">
                          📅 Posting Calendar for {monthData.name}:
                        </p>
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                          {/* Calendar Header */}
                          <div className="grid grid-cols-7 bg-gray-100 text-center text-xs font-medium text-gray-600">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                              <div key={day} className="py-2 border-b border-gray-200">
                                {day}
                              </div>
                            ))}
                          </div>
                          {/* Calendar Days */}
                          <div className="grid grid-cols-7">
                            {/* Add empty cells for days before the month starts */}
                            {Array.from({ length: calendarDays[0]?.dayOfWeek || 0 }).map((_, i) => (
                              <div key={`empty-${i}`} className="h-20 border-b border-r border-gray-100 bg-gray-50" />
                            ))}
                            {calendarDays.map((day, i) => (
                              <div
                                key={i}
                                className={`h-20 p-1 border-b border-r border-gray-100 ${
                                  day.isToday ? "bg-blue-50 ring-2 ring-blue-500 ring-inset" : ""
                                }`}
                              >
                                <div className={`text-xs font-medium mb-1 ${
                                  day.isToday ? "text-blue-600" : "text-gray-500"
                                }`}>
                                  {day.dayNum}
                                </div>
                                <div className="space-y-0.5">
                                  {day.posts.slice(0, 2).map((post, j) => {
                                    const config = platformConfig[post.platform.toLowerCase()] || {
                                      bgColor: "bg-gray-200",
                                      color: "text-gray-600",
                                    };
                                    return (
                                      <div
                                        key={j}
                                        className={`text-xs px-1 py-0.5 rounded truncate ${config.bgColor} ${config.color}`}
                                        title={post.platform}
                                      >
                                        {post.platform.slice(0, 3)}
                                      </div>
                                    );
                                  })}
                                  {day.posts.length > 2 && (
                                    <div className="text-xs text-gray-400">
                                      +{day.posts.length - 2}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Platform Summary */}
                      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {contentPlan.map((item, i) => {
                          const config = platformConfig[item.platform.toLowerCase()] || {
                            color: "text-gray-600",
                            bgColor: "bg-gray-100",
                          };
                          return (
                            <div
                              key={i}
                              className={`rounded-lg p-3 ${config.bgColor} border border-opacity-20`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-semibold ${config.color}`}>
                                  {item.platform}
                                </span>
                                <span className={`text-xl font-bold ${config.color}`}>
                                  {item.count}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{item.type}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Goals */}
                      <div className="mb-4">
                        <p className="mb-2 text-sm font-medium text-gray-600">Key Goals:</p>
                        <ul className="space-y-1">
                          {focus.goals.map((goal, i) => (
                            <li key={i} className="flex items-start text-sm text-gray-700">
                              <CheckCircle2 className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                              {goal}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Metrics */}
                      <div>
                        <p className="mb-2 text-sm font-medium text-gray-600">Metrics to Track:</p>
                        <div className="flex flex-wrap gap-2">
                          {focus.metrics.map((metric, i) => (
                            <span
                              key={i}
                              className={`rounded-full px-3 py-1 text-xs ${
                                monthData.isCurrentMonth
                                  ? "bg-blue-200 text-blue-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {metric}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Posting Schedule */}
                      {monthData.isCurrentMonth && strategy.posting_schedule && (
                        <div className="mt-4 rounded-lg bg-blue-50 p-3 border border-blue-200">
                          <p className="text-sm font-medium text-blue-800 mb-2">
                            <Clock className="inline h-4 w-4 mr-1" />
                            Recommended Posting Schedule:
                          </p>
                          <div className="text-sm text-gray-600">
                            {strategy.posting_schedule.best_days && (
                              <p>
                                <span className="font-medium">Best Days:</span>{" "}
                                {Array.isArray(strategy.posting_schedule.best_days)
                                  ? strategy.posting_schedule.best_days.join(", ")
                                  : strategy.posting_schedule.best_days}
                              </p>
                            )}
                            {strategy.posting_schedule.best_times && (
                              <p>
                                <span className="font-medium">Best Times:</span>{" "}
                                {Array.isArray(strategy.posting_schedule.best_times)
                                  ? strategy.posting_schedule.best_times.join(", ")
                                  : strategy.posting_schedule.best_times}
                              </p>
                            )}
                            {strategy.posting_schedule.posts_per_week && (
                              <p>
                                <span className="font-medium">Posts per Week:</span>{" "}
                                {strategy.posting_schedule.posts_per_week}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          {(() => {
            const totalPostsAllMonths = strategy.content_calendar?.total_posts_90_days ||
              [0, 1, 2].reduce((sum, monthIdx) => {
                const { totalPosts } = getMonthlyContentPlan(
                  monthIdx,
                  strategy.recommended_channels,
                  strategy.content_calendar
                );
                return sum + totalPosts;
              }, 0);

            return (
              <div className="mt-6 grid grid-cols-4 gap-4 rounded-lg bg-gray-100 p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">90</p>
                  <p className="text-xs text-gray-600">Days of Strategy</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">3</p>
                  <p className="text-xs text-gray-600">Monthly Phases</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {strategy.recommended_channels?.length || 3}
                  </p>
                  <p className="text-xs text-gray-600">Active Channels</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{totalPostsAllMonths}</p>
                  <p className="text-xs text-gray-600">Total Posts</p>
                </div>
              </div>
            );
          })()}

          {/* Recommended Tools */}
          {strategy.content_calendar?.recommended_tools &&
           strategy.content_calendar.recommended_tools.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Recommended Tools:
              </p>
              <div className="flex flex-wrap gap-2">
                {strategy.content_calendar.recommended_tools.map((tool, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-blue-200 px-3 py-1 text-xs text-blue-800"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => router.push("/content")}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Generate Content for Current Month
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
