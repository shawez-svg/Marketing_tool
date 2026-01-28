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

export interface TTSResponse {
  audio_base64: string;
  content_type: string;
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
   * @param interviewId - The interview ID
   * @param useAi - Whether to use AI for generating questions
   * @param userResponse - Optional user response to add to transcript
   */
  async getNextQuestion(
    interviewId: string,
    useAi: boolean = true,
    userResponse?: string
  ): Promise<NextQuestionResponse> {
    const params: Record<string, string | boolean> = { use_ai: useAi };
    if (userResponse) {
      params.user_response = userResponse;
    }
    const response = await api.get<NextQuestionResponse>(
      `/api/interview/${interviewId}/next-question`,
      { params }
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

  /**
   * Convert text to speech using OpenAI TTS
   */
  async textToSpeech(text: string, voice: string = "nova"): Promise<TTSResponse> {
    const response = await api.post<TTSResponse>("/api/interview/tts", {
      text,
      voice,
    });
    return response.data;
  },

  /**
   * Play text as speech in the browser
   */
  async speakText(text: string, voice: string = "nova"): Promise<void> {
    try {
      const ttsResponse = await this.textToSpeech(text, voice);

      // Convert base64 to audio and play
      const audioData = atob(ttsResponse.audio_base64);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }

      const audioBlob = new Blob([audioArray], { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      await audio.play();

      // Clean up URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error("TTS playback failed:", error);
      throw error;
    }
  },
};

export default interviewApi;
