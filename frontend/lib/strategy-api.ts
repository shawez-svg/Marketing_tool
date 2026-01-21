import api from "./api";

export interface TargetAudience {
  persona_name: string;
  demographics: string;
  psychographics: string;
  pain_points: string[];
  goals: string[];
  where_they_hang_out: string[];
}

export interface RecommendedChannel {
  platform: string;
  priority: string;
  reasoning: string;
  content_types: string[];
  posting_frequency: string;
  best_times: string[];
}

export interface ContentPillar {
  pillar_name: string;
  description: string;
  percentage: number;
  example_topics: string[];
}

export interface PostingSchedule {
  posts_per_week: number;
  best_days: string[];
  best_times: string[];
  content_mix: Record<string, number>;
}

export interface ToneAndVoice {
  brand_voice: string;
  tone_attributes: string[];
  language_style: string;
  dos: string[];
  donts: string[];
}

export interface HashtagCategory {
  category: string;
  hashtags: string[];
  usage: string;
}

export interface ContentIdea {
  title: string;
  type: string;
  platform: string;
  description: string;
  pillar: string;
}

// Content Calendar types for 90-day strategy
export interface PlatformPlan {
  platform: string;
  post_count: number;
  content_types: string;
  reasoning: string;
}

export interface PillarDistribution {
  pillar: string;
  percentage: number;
}

export interface MonthlyPlan {
  month: number;
  name: string;
  focus: string;
  total_posts: number;
  platforms: PlatformPlan[];
  pillar_distribution: PillarDistribution[];
  key_goals: string[];
}

export interface ContentCalendar {
  months: MonthlyPlan[];
  strategy_summary: string;
  total_posts_90_days: number;
  recommended_tools: string[];
}

export interface Strategy {
  id: string;
  interview_id: string;
  brand_summary: string;
  target_audience: TargetAudience[];
  value_proposition: string;
  recommended_channels: RecommendedChannel[];
  content_pillars: ContentPillar[];
  posting_schedule: PostingSchedule;
  tone_and_voice: ToneAndVoice;
  hashtag_strategy: HashtagCategory[];
  content_ideas: ContentIdea[];
  content_calendar: ContentCalendar | null;
  created_at: string;
  updated_at: string;
}

export const strategyApi = {
  /**
   * Generate strategy from a completed interview
   */
  async generateStrategy(interviewId: string): Promise<Strategy> {
    const response = await api.post<Strategy>("/api/strategy/generate", {
      interview_id: interviewId,
    });
    return response.data;
  },

  /**
   * Get the latest strategy for the current user
   */
  async getLatestStrategy(): Promise<Strategy> {
    const response = await api.get<Strategy>("/api/strategy/latest");
    return response.data;
  },

  /**
   * Get strategy by interview ID
   */
  async getStrategyByInterview(interviewId: string): Promise<Strategy> {
    const response = await api.get<Strategy>(
      `/api/strategy/interview/${interviewId}`
    );
    return response.data;
  },

  /**
   * Get strategy by ID
   */
  async getStrategy(strategyId: string): Promise<Strategy> {
    const response = await api.get<Strategy>(`/api/strategy/${strategyId}`);
    return response.data;
  },

  /**
   * List all strategies
   */
  async listStrategies(): Promise<Strategy[]> {
    const response = await api.get<Strategy[]>("/api/strategy/");
    return response.data;
  },

  /**
   * Update a strategy
   */
  async updateStrategy(
    strategyId: string,
    updates: Partial<Strategy>
  ): Promise<Strategy> {
    const response = await api.put<Strategy>(
      `/api/strategy/${strategyId}`,
      updates
    );
    return response.data;
  },
};

export default strategyApi;
