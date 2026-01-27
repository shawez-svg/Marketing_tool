"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { contentApi, Post } from "@/lib/content-api";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Calendar,
  X,
  Settings as SettingsIcon,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Image,
  Link,
  Sparkles,
} from "lucide-react";

type PostStatus = "draft" | "approved" | "scheduled" | "posted" | "rejected" | "failed";

const platformColors: Record<string, string> = {
  linkedin: "bg-blue-600",
  twitter: "bg-sky-500",
  instagram: "bg-pink-600",
  facebook: "bg-blue-700",
  tiktok: "bg-black",
};

export default function ApprovalPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<PostStatus | "all">("all");
  const [autoApproval, setAutoApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scheduling modal
  const [schedulingPost, setSchedulingPost] = useState<Post | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // Posting state
  const [postingId, setPostingId] = useState<string | null>(null);
  const [postingMessage, setPostingMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Media URL modal for Instagram
  const [mediaUrlPost, setMediaUrlPost] = useState<Post | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);

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
      setError("Failed to load posts. Please try again.");
    } finally {
      setLoading(false);
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

  // State for scheduling loading
  const [isScheduling, setIsScheduling] = useState(false);

  const handleSchedule = async () => {
    if (!schedulingPost || !scheduleDate || !scheduleTime) return;

    setIsScheduling(true);
    try {
      const scheduledTime = new Date(`${scheduleDate}T${scheduleTime}`);

      // Use the Ayrshare scheduling endpoint
      const result = await contentApi.schedulePostToSocial(schedulingPost.id, scheduledTime);

      if (result.success) {
        // Refresh post data to get updated status
        const updated = await contentApi.getPost(schedulingPost.id);
        setPosts((prev) => prev.map((p) => (p.id === schedulingPost.id ? updated : p)));

        setPostingMessage({
          type: "success",
          message: result.message || `Post scheduled for ${scheduledTime.toLocaleString()}`,
        });
      } else {
        setPostingMessage({
          type: "error",
          message: result.error || "Failed to schedule post",
        });
      }

      // Close modal and reset state
      setSchedulingPost(null);
      setScheduleDate("");
      setScheduleTime("");
    } catch (err: any) {
      console.error("Failed to schedule post:", err);
      setPostingMessage({
        type: "error",
        message: err.response?.data?.detail || "Failed to schedule post",
      });
    } finally {
      setIsScheduling(false);
      setTimeout(() => setPostingMessage(null), 5000);
    }
  };

  const handleAddMediaUrl = async () => {
    if (!mediaUrlPost || !mediaUrl) return;

    try {
      // Update the post with media URL
      const updated = await contentApi.updatePost(mediaUrlPost.id, {
        content_media_url: mediaUrl,
      });
      setPosts((prev) => prev.map((p) => (p.id === mediaUrlPost.id ? updated : p)));
      setMediaUrlPost(null);
      setMediaUrl("");
      setPostingMessage({
        type: "success",
        message: "Media URL added! You can now post to Instagram.",
      });
      setTimeout(() => setPostingMessage(null), 3000);
    } catch (err) {
      console.error("Failed to add media URL:", err);
      setPostingMessage({
        type: "error",
        message: "Failed to add media URL",
      });
    }
  };

  const handleGenerateAIImage = async () => {
    if (!mediaUrlPost) return;

    setGeneratingImage(true);
    try {
      const result = await contentApi.generateImageForPost(mediaUrlPost.id);

      if (result.success && result.image_url) {
        // Refresh post data
        const updated = await contentApi.getPost(mediaUrlPost.id);
        setPosts((prev) => prev.map((p) => (p.id === mediaUrlPost.id ? updated : p)));
        setMediaUrlPost(null);
        setMediaUrl("");
        setPostingMessage({
          type: "success",
          message: "AI image generated! You can now post to Instagram.",
        });
        setTimeout(() => setPostingMessage(null), 5000);
      } else {
        setPostingMessage({
          type: "error",
          message: result.error || "Failed to generate image",
        });
      }
    } catch (err: any) {
      console.error("Failed to generate AI image:", err);
      setPostingMessage({
        type: "error",
        message: err.response?.data?.detail || "Failed to generate AI image",
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handlePostNow = async (postParam: Post) => {
    // Get the latest post data from state (in case media URL was just added)
    const post = posts.find((p) => p.id === postParam.id) || postParam;

    // Check if Instagram post needs media
    if (post.platform.toLowerCase() === "instagram" && !post.content_media_url) {
      setMediaUrlPost(post);
      return;
    }

    setPostingId(post.id);
    setPostingMessage(null);

    try {
      // Call the actual posting API
      const result = await contentApi.postNow(post.id);

      if (result.success) {
        // Refresh post data
        const updated = await contentApi.getPost(post.id);
        setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));

        setPostingMessage({
          type: "success",
          message: result.simulated
            ? `Post simulated (no API key configured). ${result.message}`
            : `Successfully posted to ${post.platform}!`,
        });
      } else {
        setPostingMessage({
          type: "error",
          message: result.error || "Failed to post",
        });
      }
    } catch (err: any) {
      console.error("Failed to post:", err);
      setPostingMessage({
        type: "error",
        message: err.response?.data?.detail || "Failed to post",
      });
    } finally {
      setPostingId(null);
      // Auto-hide message after 5 seconds
      setTimeout(() => setPostingMessage(null), 5000);
    }
  };

  const handleCancelSchedule = async (postId: string) => {
    try {
      // Use the cancel schedule API
      await contentApi.cancelScheduledPost(postId);
      const updated = await contentApi.getPost(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    } catch (err) {
      console.error("Failed to cancel schedule:", err);
      // Fallback to simple status update
      try {
        const updated = await contentApi.updatePost(postId, { status: "approved" });
        setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      } catch (e) {
        console.error("Fallback also failed:", e);
      }
    }
  };

  const statusOptions: { value: PostStatus | "all"; label: string; count: number }[] = [
    { value: "all", label: "All", count: posts.length },
    { value: "draft", label: "Draft", count: posts.filter((p) => p.status === "draft").length },
    { value: "approved", label: "Approved", count: posts.filter((p) => p.status === "approved").length },
    { value: "scheduled", label: "Scheduled", count: posts.filter((p) => p.status === "scheduled").length },
    { value: "posted", label: "Posted", count: posts.filter((p) => p.status === "posted").length },
    { value: "rejected", label: "Rejected", count: posts.filter((p) => p.status === "rejected").length },
  ];

  const filteredPosts =
    selectedStatus === "all" ? posts : posts.filter((post) => post.status === selectedStatus);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      approved: "bg-green-100 text-green-700",
      scheduled: "bg-blue-100 text-blue-700",
      posted: "bg-purple-100 text-purple-700",
      rejected: "bg-red-100 text-red-700",
      failed: "bg-red-200 text-red-800",
    };
    return colors[status] || colors.draft;
  };

  const formatScheduledTime = (isoString: string | null) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getPlatformColor = (platform: string) => {
    return platformColors[platform.toLowerCase()] || "bg-gray-600";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-lg text-gray-600">Loading posts...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Approval & Posting</h1>
            <p className="mt-2 text-gray-600">Review, approve, and schedule your content</p>
          </div>
          <button
            onClick={() => router.push("/content")}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <span>Back to Content</span>
          </button>
        </div>

        {/* Posting Message Toast */}
        {postingMessage && (
          <div
            className={`fixed right-4 top-4 z-50 rounded-lg p-4 shadow-lg ${
              postingMessage.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            <div className="flex items-center space-x-2">
              {postingMessage.type === "success" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{postingMessage.message}</span>
              <button
                onClick={() => setPostingMessage(null)}
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-5 gap-4">
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">
              {posts.filter((p) => p.status === "draft").length}
            </p>
            <p className="text-sm text-gray-500">Drafts</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {posts.filter((p) => p.status === "approved").length}
            </p>
            <p className="text-sm text-gray-500">Approved</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {posts.filter((p) => p.status === "scheduled").length}
            </p>
            <p className="text-sm text-gray-500">Scheduled</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {posts.filter((p) => p.status === "posted").length}
            </p>
            <p className="text-sm text-gray-500">Posted</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {posts.filter((p) => p.status === "rejected").length}
            </p>
            <p className="text-sm text-gray-500">Rejected</p>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between max-w-md">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">Auto-Approval</h3>
                <p className="text-xs text-gray-500">
                  Auto-approve & schedule content
                </p>
              </div>
            </div>
            <button
              onClick={() => setAutoApproval(!autoApproval)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                autoApproval ? "bg-gradient-to-r from-blue-600 to-purple-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
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
              className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                selectedStatus === option.value
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span>{option.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  selectedStatus === option.value ? "bg-white/30 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
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
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium text-white ${getPlatformColor(
                        post.platform
                      )}`}
                    >
                      {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                        post.status
                      )}`}
                    >
                      {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </span>
                    {post.content_pillar && (
                      <span className="text-xs text-gray-500">{post.content_pillar}</span>
                    )}
                    {post.scheduled_time && (
                      <span className="flex items-center text-sm text-blue-600">
                        <Clock className="mr-1 h-4 w-4" />
                        {formatScheduledTime(post.scheduled_time)}
                      </span>
                    )}
                  </div>

                  {/* Instagram Media Warning */}
                  {post.platform.toLowerCase() === "instagram" && !post.content_media_url && (
                    <div className="mb-3 flex items-center rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
                      <span className="text-sm text-amber-800">
                        Instagram requires an image or video.{" "}
                        <button
                          onClick={() => setMediaUrlPost(post)}
                          className="underline font-medium hover:text-amber-900"
                        >
                          Add media URL
                        </button>
                      </span>
                    </div>
                  )}

                  {/* Media Preview */}
                  {post.content_media_url && (
                    <div className="mb-3 flex items-center text-sm text-gray-600">
                      <Image className="h-4 w-4 mr-2" />
                      <a
                        href={post.content_media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate max-w-xs"
                      >
                        {post.content_media_url}
                      </a>
                    </div>
                  )}

                  {/* Content Preview */}
                  <p className="mb-4 whitespace-pre-line text-gray-700">{post.content_text}</p>

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

                  {/* Actions based on status */}
                  {post.status === "draft" && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(post.id)}
                        className="flex items-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => setSchedulingPost(post)}
                        className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Schedule</span>
                      </button>
                      <button
                        onClick={() => handleReject(post.id)}
                        className="flex items-center space-x-2 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {post.status === "approved" && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePostNow(post)}
                        disabled={postingId === post.id}
                        className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {postingId === post.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        <span>Post Now</span>
                      </button>
                      <button
                        onClick={() => setSchedulingPost(post)}
                        className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Schedule</span>
                      </button>
                    </div>
                  )}

                  {post.status === "scheduled" && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          // Pre-populate date/time from existing schedule
                          if (post.scheduled_time) {
                            const dt = new Date(post.scheduled_time);
                            setScheduleDate(dt.toISOString().split("T")[0]);
                            setScheduleTime(dt.toTimeString().slice(0, 5));
                          }
                          setSchedulingPost(post);
                        }}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Edit Schedule
                      </button>
                      <button
                        onClick={() => handleCancelSchedule(post.id)}
                        className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        Cancel Schedule
                      </button>
                    </div>
                  )}

                  {post.status === "posted" && (
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Successfully posted
                      {post.posted_at && ` on ${formatScheduledTime(post.posted_at)}`}
                    </div>
                  )}

                  {post.status === "rejected" && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(post.id)}
                        className="flex items-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Reconsider</span>
                      </button>
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
            {selectedStatus === "all" && (
              <button
                onClick={() => router.push("/content")}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Generate Content
              </button>
            )}
          </div>
        )}

        {/* Scheduling Modal */}
        {schedulingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold">Schedule Post</h3>
              <p className="mb-4 text-sm text-gray-600 line-clamp-2">
                {schedulingPost.content_text}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                {schedulingPost.suggested_time && (
                  <p className="text-xs text-gray-500">
                    Suggested: {formatScheduledTime(schedulingPost.suggested_time)}
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSchedulingPost(null);
                    setScheduleDate("");
                    setScheduleTime("");
                  }}
                  disabled={isScheduling}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSchedule}
                  disabled={!scheduleDate || !scheduleTime || isScheduling}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {isScheduling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation to Analytics */}
        {posts.filter((p) => p.status === "posted").length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={() => router.push("/analytics")}
              className="flex items-center space-x-2 rounded-lg bg-purple-600 px-6 py-3 text-white hover:bg-purple-700"
            >
              <Eye className="h-5 w-5" />
              <span>View Analytics</span>
            </button>
          </div>
        )}

        {/* Media URL Modal for Instagram */}
        {mediaUrlPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-center mb-4">
                <Image className="h-6 w-6 text-pink-600 mr-2" />
                <h3 className="text-lg font-semibold">Add Media for Instagram</h3>
              </div>

              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Instagram requires an image or video</strong> for all posts.
                  Choose one of the options below.
                </p>
              </div>

              <p className="mb-4 text-sm text-gray-600 line-clamp-2 bg-gray-50 p-3 rounded">
                {mediaUrlPost.content_text}
              </p>

              {/* Option 1: Generate AI Image */}
              <div className="mb-4 p-4 border border-purple-200 rounded-lg bg-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
                    <div>
                      <p className="font-medium text-purple-900">Generate AI Image</p>
                      <p className="text-xs text-purple-700">Create an image using DALL-E based on your post content</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateAIImage}
                    disabled={generatingImage}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50 flex items-center"
                  >
                    {generatingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="px-3 text-sm text-gray-500">OR</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              {/* Option 2: Paste URL */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    <Link className="h-4 w-4 inline mr-1" />
                    Paste Media URL
                  </label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full rounded-lg border px-3 py-2 focus:border-blue-500 focus:outline-none"
                    disabled={generatingImage}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Supported formats: JPG, PNG, GIF, MP4, MOV. Must be publicly accessible.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setMediaUrlPost(null);
                    setMediaUrl("");
                  }}
                  disabled={generatingImage}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMediaUrl}
                  disabled={!mediaUrl || generatingImage}
                  className="rounded-lg bg-pink-600 px-4 py-2 text-sm text-white hover:bg-pink-700 disabled:opacity-50"
                >
                  Use URL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
