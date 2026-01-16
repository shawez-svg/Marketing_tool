import api from "./api";

export interface StartInterviewResponse {
  interview_id: string;
  status: string;
  first_question: string;
  question_category: string;
}

export interface AudioChunkResponse {
  transcription: string;
  full_transcript: string;
}

export interface NextQuestionResponse {
  question: string;
  category: string;
  is_final: boolean;
}

export interface CompleteInterviewResponse {
  interview_id: string;
  status: string;
  transcript: string;
  analysis: {
    business_summary: string;
    target_audience: Array<{
      persona: string;
      description: string;
      pain_points: string[];
    }>;
    unique_value_proposition: string;
    business_goals: string[];
    current_marketing: {
      channels_used: string[];
      whats_working: string;
      whats_not_working: string;
    };
    brand_personality: {
      voice: string;
      values: string[];
      tone: string;
    };
    recommended_platforms: Array<{
      platform: string;
      reasoning: string;
    }>;
    content_pillars: string[];
  };
  duration_seconds: number;
}

export interface InterviewDetail {
  id: string;
  status: string;
  transcript: string | null;
  duration_seconds: number | null;
  created_at: string;
  completed_at: string | null;
}

export const interviewApi = {
  /**
   * Start a new interview session
   */
  async startInterview(): Promise<StartInterviewResponse> {
    const response = await api.post<StartInterviewResponse>(
      "/api/interview/start"
    );
    return response.data;
  },

  /**
   * Send an audio chunk for transcription
   */
  async sendAudioChunk(
    interviewId: string,
    audioBlob: Blob
  ): Promise<AudioChunkResponse> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");

    const response = await api.post<AudioChunkResponse>(
      `/api/interview/${interviewId}/audio-chunk`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  /**
   * Get the next interview question
   */
  async getNextQuestion(
    interviewId: string,
    useAi: boolean = true
  ): Promise<NextQuestionResponse> {
    const response = await api.get<NextQuestionResponse>(
      `/api/interview/${interviewId}/next-question`,
      {
        params: { use_ai: useAi },
      }
    );
    return response.data;
  },

  /**
   * Complete the interview and get analysis
   */
  async completeInterview(
    interviewId: string,
    audioFileUrl?: string
  ): Promise<CompleteInterviewResponse> {
    const formData = new FormData();
    if (audioFileUrl) {
      formData.append("audio_file_url", audioFileUrl);
    }

    const response = await api.post<CompleteInterviewResponse>(
      `/api/interview/${interviewId}/complete`,
      formData
    );
    return response.data;
  },

  /**
   * Get interview details
   */
  async getInterview(interviewId: string): Promise<InterviewDetail> {
    const response = await api.get<InterviewDetail>(
      `/api/interview/${interviewId}`
    );
    return response.data;
  },

  /**
   * List all interviews
   */
  async listInterviews(): Promise<InterviewDetail[]> {
    const response = await api.get<InterviewDetail[]>("/api/interview/");
    return response.data;
  },
};

export default interviewApi;
