/**
 * Content API Client
 *
 * Handles communication with the content generation endpoints.
 */

import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface Post {
  id: string;
  strategy_id: string;
  platform: string;
  content_text: string;
  content_media_url: string | null;
  tags: string[];
  content_pillar: string | null;
  status: "draft" | "approved" | "rejected" | "scheduled" | "posted" | "failed";
  suggested_time: string | null;
  scheduled_time: string | null;
  posted_at: string | null;
  platform_post_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImageGenerationResult {
  success: boolean;
  image_url?: string;
  revised_prompt?: string;
  error?: string;
}

export interface PostingResult {
  success: boolean;
  post_id: string;
  platform?: string;
  platform_post_id?: string;
  message?: string;
  error?: string;
  simulated?: boolean;
}

export interface ConnectedAccount {
  platform: string;
  connected: boolean;
}

export interface GenerateContentRequest {
  strategy_id: string;
  platforms?: string[];
  posts_per_platform?: number;
}

export interface UpdatePostRequest {
  content_text?: string;
  content_media_url?: string;
  tags?: string[];
  status?: string;
}

export const contentApi = {
  /**
   * Generate content batch for specified platforms
   */
  async generateContent(request: GenerateContentRequest): Promise<Post[]> {
    const response = await api.post<Post[]>("/api/content/generate", request);
    return response.data;
  },

  /**
   * Get all posts for user
   */
  async getPosts(status?: string, platform?: string): Promise<Post[]> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (platform) params.append("platform", platform);

    const response = await api.get<Post[]>(`/api/content/?${params.toString()}`);
    return response.data;
  },

  /**
   * Get posts by strategy ID
   */
  async getPostsByStrategy(strategyId: string, status?: string): Promise<Post[]> {
    const params = status ? `?status=${status}` : "";
    const response = await api.get<Post[]>(`/api/content/strategy/${strategyId}${params}`);
    return response.data;
  },

  /**
   * Get a single post
   */
  async getPost(postId: string): Promise<Post> {
    const response = await api.get<Post>(`/api/content/${postId}`);
    return response.data;
  },

  /**
   * Regenerate a post
   */
  async regeneratePost(postId: string, instructions?: string): Promise<Post> {
    const response = await api.post<Post>(`/api/content/${postId}/regenerate`, {
      instructions,
    });
    return response.data;
  },

  /**
   * Update a post
   */
  async updatePost(postId: string, updates: UpdatePostRequest): Promise<Post> {
    const response = await api.put<Post>(`/api/content/${postId}`, updates);
    return response.data;
  },

  /**
   * Approve a post
   */
  async approvePost(postId: string): Promise<Post> {
    const response = await api.post<Post>(`/api/content/${postId}/approve`);
    return response.data;
  },

  /**
   * Reject a post
   */
  async rejectPost(postId: string): Promise<Post> {
    const response = await api.post<Post>(`/api/content/${postId}/reject`);
    return response.data;
  },

  /**
   * Schedule a post
   */
  async schedulePost(postId: string, scheduledTime: Date): Promise<Post> {
    const response = await api.post<Post>(`/api/content/${postId}/schedule`, {
      scheduled_time: scheduledTime.toISOString(),
    });
    return response.data;
  },

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<void> {
    await api.delete(`/api/content/${postId}`);
  },

  /**
   * Bulk approve posts
   */
  async bulkApprove(postIds: string[]): Promise<Post[]> {
    const response = await api.post<Post[]>("/api/content/bulk-approve", postIds);
    return response.data;
  },

  // ============================================================
  // POSTING METHODS - Actual social media posting via Ayrshare
  // ============================================================

  /**
   * Post content immediately to social media
   */
  async postNow(postId: string): Promise<PostingResult> {
    const response = await api.post<PostingResult>(`/api/content/${postId}/post-now`);
    return response.data;
  },

  /**
   * Schedule a post to be published at a specific time via Ayrshare
   */
  async schedulePostToSocial(postId: string, scheduledTime: Date): Promise<PostingResult> {
    const response = await api.post<PostingResult>(`/api/content/${postId}/schedule-post`, {
      scheduled_time: scheduledTime.toISOString(),
    });
    return response.data;
  },

  /**
   * Cancel a scheduled post
   */
  async cancelScheduledPost(postId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/api/content/${postId}/cancel-schedule`);
    return response.data;
  },

  /**
   * Post multiple posts at once
   */
  async bulkPost(postIds: string[]): Promise<PostingResult[]> {
    const response = await api.post<PostingResult[]>("/api/content/bulk-post", {
      post_ids: postIds,
    });
    return response.data;
  },

  /**
   * Get analytics for a posted content
   */
  async getPostAnalytics(postId: string): Promise<{ post_id: string; analytics: unknown }> {
    const response = await api.get(`/api/content/${postId}/analytics`);
    return response.data;
  },

  /**
   * Get connected social media accounts
   */
  async getConnectedAccounts(): Promise<{ accounts: string[]; email?: string; message?: string }> {
    const response = await api.get("/api/content/accounts/connected");
    return response.data;
  },

  // ============================================================
  // IMAGE GENERATION METHODS - AI image generation via DALL-E
  // ============================================================

  /**
   * Generate an AI image for a post
   */
  async generateImageForPost(postId: string): Promise<ImageGenerationResult & { post_id: string }> {
    const response = await api.post(`/api/content/${postId}/generate-image`);
    return response.data;
  },

  /**
   * Generate an AI image based on content
   */
  async generateImage(
    postContent: string,
    platform: string = "instagram",
    brandContext?: string
  ): Promise<ImageGenerationResult> {
    const response = await api.post("/api/content/generate-image", {
      post_content: postContent,
      platform,
      brand_context: brandContext,
    });
    return response.data;
  },
};
