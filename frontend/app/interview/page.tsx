"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { AudioWaveform } from "@/components/AudioWaveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { interviewApi, CompleteInterviewResponse } from "@/lib/interview-api";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Pause, Play, CheckCircle, Loader2, Volume2, AlertCircle } from "lucide-react";

// Demo mode configuration - set to true when backend is not available
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_API_URL;

// Demo data for when backend is unavailable
const DEMO_QUESTIONS = [
  { question: "Tell me about your business. What products or services do you offer?", category: "business_overview" },
  { question: "Who are your ideal customers? Describe your target audience.", category: "target_audience" },
  { question: "What makes your business unique compared to competitors?", category: "unique_value" },
  { question: "What are your main business goals for the next year?", category: "goals" },
  { question: "What marketing channels are you currently using?", category: "current_marketing" },
  { question: "What's your brand personality? How do you want customers to perceive you?", category: "brand_voice" },
  { question: "What challenges are you facing with your current marketing efforts?", category: "challenges" },
  { question: "Is there anything else you'd like to share about your business?", category: "additional" },
];

const DEMO_ANALYSIS: CompleteInterviewResponse = {
  interview_id: "demo-interview",
  status: "completed",
  transcript: "This is a demo transcript. In production, this would contain the full conversation.",
  analysis: {
    business_summary: "A forward-thinking company focused on delivering innovative solutions to their target market.",
    target_audience: [
      { persona: "Primary Customer", description: "Business professionals aged 25-45", pain_points: ["Time constraints", "Need for efficiency"] },
    ],
    unique_value_proposition: "Combining cutting-edge technology with personalized service.",
    business_goals: ["Increase brand awareness", "Generate more leads", "Build community engagement"],
    current_marketing: { channels_used: ["Social media", "Email"], whats_working: "Social engagement", whats_not_working: "Lead conversion" },
    brand_personality: { voice: "Professional yet approachable", values: ["Innovation", "Integrity", "Customer focus"], tone: "Friendly and informative" },
    recommended_platforms: [
      { platform: "LinkedIn", reasoning: "B2B focus and professional audience" },
      { platform: "Instagram", reasoning: "Visual storytelling opportunities" },
    ],
    content_pillars: ["Thought leadership", "Behind the scenes", "Customer success stories", "Industry insights"],
  },
  duration_seconds: 1800,
};

type InterviewPhase = "idle" | "recording" | "processing" | "waiting" | "complete";

interface Message {
  role: "ai" | "user";
  content: string;
  timestamp: Date;
}

export default function InterviewPage() {
  const router = useRouter();

  // Interview state
  const [phase, setPhase] = useState<InterviewPhase>("idle");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [questionCategory, setQuestionCategory] = useState<string>("");
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<CompleteInterviewResponse | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Speak a question using TTS
  const speakQuestion = async (text: string) => {
    setIsSpeaking(true);
    try {
      await interviewApi.speakText(text, "nova");
    } catch (err) {
      console.error("TTS failed, continuing without voice:", err);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Track transcriptions to avoid duplicates
  const [lastTranscription, setLastTranscription] = useState<string>("");

  // Audio recorder hook - only send to backend, don't add to messages yet
  const handleAudioChunk = useCallback(
    async (chunk: Blob) => {
      if (!interviewId || isProcessing) return;

      setIsProcessing(true);
      try {
        const result = await interviewApi.sendAudioChunk(interviewId, chunk);

        // Store the transcription but don't add to messages yet
        // Messages will be added in handleStopRecording to avoid duplicates
        if (result.transcription) {
          setLastTranscription((prev) => {
            // Append new transcription if it's different
            if (result.transcription && !prev.includes(result.transcription)) {
              return prev ? `${prev} ${result.transcription}` : result.transcription;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to process audio chunk:", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [interviewId, isProcessing]
  );

  const {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getAudioChunk,
    error: recorderError,
  } = useAudioRecorder(handleAudioChunk, 10000);

  // Start interview
  const handleStartInterview = async () => {
    setError(null);
    setPhase("processing");

    try {
      const response = await interviewApi.startInterview();

      setInterviewId(response.interview_id);
      setCurrentQuestion(response.first_question);
      setQuestionCategory(response.question_category);

      // Add first AI message
      setMessages([
        {
          role: "ai",
          content: response.first_question,
          timestamp: new Date(),
        },
      ]);

      setPhase("waiting");

      // Speak the first question
      speakQuestion(response.first_question);
    } catch (err) {
      setError("Failed to start interview. Please try again.");
      setPhase("idle");
      console.error(err);
    }
  };

  // Start recording user's response
  const handleStartRecording = async () => {
    try {
      await startRecording();
      setPhase("recording");
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.");
      console.error(err);
    }
  };

  // Stop recording and get next question
  const handleStopRecording = async () => {
    setPhase("processing");

    if (!interviewId) {
      stopRecording();
      return;
    }

    try {
      // Get the final audio chunk before stopping
      const finalChunk = await getAudioChunk();

      // Stop recording now
      stopRecording();

      let finalTranscription = lastTranscription;

      // Send the final audio chunk if we have one
      if (finalChunk && finalChunk.size > 0) {
        try {
          const result = await interviewApi.sendAudioChunk(interviewId, finalChunk);

          // Append final chunk transcription if it's new
          if (result.transcription && !finalTranscription.includes(result.transcription)) {
            finalTranscription = finalTranscription
              ? `${finalTranscription} ${result.transcription}`
              : result.transcription;
          }
        } catch (audioErr) {
          console.error("Failed to send final audio chunk:", audioErr);
        }
      }

      // Add user message to UI (combined transcription from all chunks)
      if (finalTranscription.trim()) {
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: finalTranscription.trim(),
            timestamp: new Date(),
          },
        ]);
      }

      // Reset transcription tracker for next recording
      setLastTranscription("");

      // Small delay to ensure backend has processed the audio
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get next question
      const nextQuestion = await interviewApi.getNextQuestion(interviewId, true);

      setCurrentQuestion(nextQuestion.question);
      setQuestionCategory(nextQuestion.category);
      setQuestionsAnswered((prev) => prev + 1);

      // Add AI message
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: nextQuestion.question,
          timestamp: new Date(),
        },
      ]);

      if (nextQuestion.is_final) {
        // Interview complete
        await handleCompleteInterview();
      } else {
        setPhase("waiting");
        // Speak the next question
        speakQuestion(nextQuestion.question);
      }
    } catch (err) {
      setError("Failed to get next question. Please try again.");
      setPhase("waiting");
      console.error(err);
    }
  };

  // Complete interview
  const handleCompleteInterview = async () => {
    if (!interviewId) return;

    setPhase("processing");

    try {
      const result = await interviewApi.completeInterview(interviewId);
      setAnalysis(result);
      setPhase("complete");

      // Store analysis in localStorage for strategy page
      localStorage.setItem("interviewAnalysis", JSON.stringify(result.analysis));
      localStorage.setItem("interviewId", interviewId);
    } catch (err) {
      setError("Failed to complete interview. Please try again.");
      setPhase("waiting");
      console.error(err);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper to safely get analysis data
  const getAnalysisData = () => {
    if (!analysis?.analysis) return null;
    // Use type assertion to handle potential extra fields from API
    const analysisObj = analysis.analysis as Record<string, unknown>;
    return {
      businessSummary: (analysisObj.business_summary as string) ||
                       (analysisObj.business_overview as string) ||
                       "Business analysis is being processed...",
      targetAudience: analysis.analysis.target_audience || [],
      valueProposition: analysis.analysis.unique_value_proposition || "",
      goals: analysis.analysis.business_goals || [],
      platforms: analysis.analysis.recommended_platforms || [],
      contentPillars: analysis.analysis.content_pillars || [],
    };
  };

  // Render interview complete state
  if (phase === "complete" && analysis) {
    const analysisData = getAnalysisData();

    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Interview Complete!
            </h1>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-6">
            <p className="text-green-800">
              Thank you for sharing about your business! Your marketing strategy
              has been generated.
            </p>
            <div className="mt-4 flex space-x-4">
              <button
                onClick={() => router.push("/strategy")}
                className="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700"
              >
                View Marketing Strategy
              </button>
              <button
                onClick={() => router.push("/content")}
                className="rounded-lg border border-green-600 px-6 py-2 text-green-600 hover:bg-green-50"
              >
                View Generated Content
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Interview Summary
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium text-gray-900">
                  {analysis.duration_seconds > 0
                    ? formatDuration(analysis.duration_seconds)
                    : formatDuration(duration)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Questions Answered</p>
                <p className="font-medium text-gray-900">{questionsAnswered || messages.filter(m => m.role === "user").length}</p>
              </div>
            </div>
          </div>

          {/* Business Summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Business Summary
            </h2>
            {analysisData?.businessSummary ? (
              <p className="text-gray-700">{analysisData.businessSummary}</p>
            ) : (
              <div className="flex items-center text-gray-500">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span>Generating business summary...</span>
              </div>
            )}
          </div>

          {/* Key Insights */}
          {analysisData && (analysisData.goals.length > 0 || analysisData.contentPillars.length > 0) && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Key Insights
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {analysisData.goals.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Business Goals</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {analysisData.goals.slice(0, 3).map((goal: string, idx: number) => (
                        <li key={idx}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysisData.contentPillars.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Content Pillars</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {analysisData.contentPillars.slice(0, 3).map((pillar: string, idx: number) => (
                        <li key={idx}>{pillar}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Brand Interview</h1>
          <p className="mt-2 text-gray-600">
            Tell me about your brand, and I'll help create your marketing
            strategy
          </p>
        </div>

        {/* Error Display */}
        {(error || recorderError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">{error || recorderError}</p>
          </div>
        )}

        {/* Recording Interface */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center space-y-6">
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              {phase === "idle" && (
                <p className="text-gray-500">Ready to start interview</p>
              )}
              {phase === "processing" && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-medium">Processing...</span>
                </div>
              )}
              {phase === "waiting" && !isSpeaking && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Volume2 className="h-5 w-5" />
                  <span className="font-medium">
                    Ready - Click to respond
                  </span>
                </div>
              )}
              {phase === "waiting" && isSpeaking && (
                <div className="flex items-center space-x-2 text-purple-600">
                  <Volume2 className="h-5 w-5 animate-pulse" />
                  <span className="font-medium">
                    AI is speaking...
                  </span>
                </div>
              )}
              {phase === "recording" && (
                <div className="flex items-center space-x-2 text-red-600">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-red-600" />
                  <span className="font-medium">
                    Recording... {formatDuration(duration)}
                  </span>
                </div>
              )}
            </div>

            {/* Audio Waveform */}
            {(phase === "recording" || phase === "waiting") && (
              <AudioWaveform
                audioLevel={audioLevel}
                isRecording={isRecording}
                isPaused={isPaused}
              />
            )}

            {/* Main Action Buttons */}
            <div className="flex items-center space-x-4">
              {phase === "idle" && (
                <button
                  onClick={handleStartInterview}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 transition-all hover:bg-blue-700 hover:scale-105"
                >
                  <Mic className="h-8 w-8 text-white" />
                </button>
              )}

              {phase === "waiting" && (
                <button
                  onClick={handleStartRecording}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 transition-all hover:bg-blue-700 hover:scale-105"
                >
                  <Mic className="h-8 w-8 text-white" />
                </button>
              )}

              {phase === "recording" && (
                <>
                  <button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500 transition-all hover:bg-yellow-600"
                  >
                    {isPaused ? (
                      <Play className="h-6 w-6 text-white" />
                    ) : (
                      <Pause className="h-6 w-6 text-white" />
                    )}
                  </button>
                  <button
                    onClick={handleStopRecording}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 transition-all hover:bg-red-700 hover:scale-105"
                  >
                    <Square className="h-8 w-8 text-white" />
                  </button>
                </>
              )}

              {phase === "processing" && (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Current Question Display */}
            {currentQuestion && (
              <div className="w-full max-w-2xl rounded-lg bg-blue-50 p-6">
                <div className="mb-2 flex items-center space-x-2">
                  <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white">
                    AI
                  </span>
                  <span className="text-xs text-gray-500">
                    {questionCategory.replace("_", " ")}
                  </span>
                </div>
                <p className="text-lg text-gray-800">{currentQuestion}</p>
              </div>
            )}

            {/* Idle state message */}
            {phase === "idle" && (
              <div className="w-full max-w-2xl rounded-lg bg-gray-50 p-6 text-center">
                <p className="text-lg text-gray-700">
                  Please talk to me about your brand
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Click the microphone to begin
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="text-center text-sm text-gray-500">
              <p>Duration: ~30 minutes</p>
              <p>The AI will ask follow-up questions about your business</p>
            </div>
          </div>
        </div>

        {/* Conversation History */}
        {messages.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-medium text-gray-900">
              Conversation History
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "ai" ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === "ai"
                        ? "bg-blue-50 text-gray-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <div className="mb-1 flex items-center space-x-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          message.role === "ai"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-600 text-white"
                        }`}
                      >
                        {message.role === "ai" ? "AI" : "You"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-medium text-gray-900">Interview Progress</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Questions Answered</span>
              <span className="font-medium text-gray-900">
                {questionsAnswered} / 9
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${(questionsAnswered / 9) * 100}%` }}
              />
            </div>
          </div>

          {/* Duration */}
          {phase !== "idle" && (
            <div className="mt-4 text-sm text-gray-700">
              Total recording time: {formatDuration(duration)}
            </div>
          )}
        </div>

        {/* Complete Interview Button */}
        {questionsAnswered >= 3 && phase === "waiting" && (
          <div className="flex justify-center">
            <button
              onClick={handleCompleteInterview}
              className="rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
            >
              Complete Interview & Generate Strategy
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
