"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { AudioWaveform } from "@/components/AudioWaveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { interviewApi, CompleteInterviewResponse, InterviewDetail } from "@/lib/interview-api";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Pause, Play, CheckCircle, Loader2, Volume2, AlertCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";

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

  // Previous interview state
  const [previousInterview, setPreviousInterview] = useState<InterviewDetail | null>(null);
  const [loadingPrevious, setLoadingPrevious] = useState(true);
  const [showPreviousTranscript, setShowPreviousTranscript] = useState(true);

  // Load previous interview on mount
  useEffect(() => {
    const loadPreviousInterview = async () => {
      setLoadingPrevious(true);
      let foundInterview: InterviewDetail | null = null;

      try {
        // First check localStorage for interview ID
        const savedInterviewId = localStorage.getItem("interviewId");

        if (savedInterviewId) {
          // Try to fetch the specific interview
          try {
            const interview = await interviewApi.getInterview(savedInterviewId);
            if (interview && interview.status === "completed" && interview.transcript) {
              foundInterview = interview;
            }
          } catch (err) {
            console.log("Could not fetch saved interview, trying to get latest...");
          }
        }

        // If no saved interview or it failed, try to get the latest completed one
        if (!foundInterview) {
          try {
            const interviews = await interviewApi.listInterviews();
            const completedInterviews = interviews.filter(
              (i) => i.status === "completed" && i.transcript
            );
            if (completedInterviews.length > 0) {
              // Sort by created_at descending and get the most recent
              completedInterviews.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              foundInterview = completedInterviews[0];
            }
          } catch (err) {
            console.log("Could not fetch interview list");
          }
        }

        if (foundInterview) {
          setPreviousInterview(foundInterview);
        }
      } catch (err) {
        console.error("Error loading previous interview:", err);
      } finally {
        setLoadingPrevious(false);
      }
    };

    loadPreviousInterview();
  }, []);

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

  // Audio recorder hook - no intermediate chunk processing to avoid duplicates
  // The useAudioRecorder sends cumulative audio (not incremental), so each chunk
  // contains all audio from the start. We only process once when recording stops.
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
  } = useAudioRecorder();

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
      // Get the complete audio recording before stopping
      const audioBlob = await getAudioChunk();

      // Stop recording now
      stopRecording();

      let transcription = "";

      // Send the complete audio for transcription
      if (audioBlob && audioBlob.size > 0) {
        try {
          const result = await interviewApi.sendAudioChunk(interviewId, audioBlob);
          transcription = result.transcription || "";
        } catch (audioErr) {
          console.error("Failed to transcribe audio:", audioErr);
        }
      }

      // Add user message to UI
      if (transcription.trim()) {
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: transcription.trim(),
            timestamp: new Date(),
          },
        ]);
      }

      // Get next question - pass the transcription to be saved to transcript
      const nextQuestion = await interviewApi.getNextQuestion(
        interviewId,
        true,
        transcription.trim() || undefined
      );

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
                className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700"
              >
                View Marketing Strategy
              </button>
              <button
                onClick={() => router.push("/content")}
                className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
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
            Tell me about your brand, and I'll help create your marketing strategy
          </p>
        </div>

        {/* Error Display */}
        {(error || recorderError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">{error || recorderError}</p>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Interview Controls */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
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
                    <span className="font-medium">Ready - Click to respond</span>
                  </div>
                )}
                {phase === "waiting" && isSpeaking && (
                  <div className="flex items-center space-x-2 text-purple-600">
                    <Volume2 className="h-5 w-5 animate-pulse" />
                    <span className="font-medium">AI is speaking...</span>
                  </div>
                )}
                {phase === "recording" && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-red-600" />
                    <span className="font-medium">Recording... {formatDuration(duration)}</span>
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
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 transition-all hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg"
                  >
                    <Mic className="h-8 w-8 text-white" />
                  </button>
                )}

                {phase === "waiting" && (
                  <button
                    onClick={handleStartRecording}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 transition-all hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg"
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
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 transition-all hover:bg-red-700 hover:scale-105 shadow-lg"
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
                <div className="w-full rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-5 border border-blue-100">
                  <div className="mb-2 flex items-center space-x-2">
                    <span className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-1 text-xs font-medium text-white">
                      AI
                    </span>
                    <span className="text-xs text-gray-500">
                      {questionCategory.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-base text-gray-800">{currentQuestion}</p>
                </div>
              )}

              {/* Idle state message */}
              {phase === "idle" && (
                <div className="w-full rounded-lg bg-gradient-to-r from-gray-50 to-blue-50 p-6 text-center border border-gray-100">
                  <p className="text-lg text-gray-700">Please talk to me about your brand</p>
                  <p className="mt-2 text-sm text-gray-500">Click the microphone to begin</p>
                </div>
              )}

              {/* Instructions */}
              <div className="text-center text-sm text-gray-500">
                <p>Duration: ~30 minutes</p>
                <p>The AI will ask follow-up questions about your business</p>
              </div>

              {/* Complete Interview Button */}
              {questionsAnswered >= 3 && phase === "waiting" && (
                <button
                  onClick={handleCompleteInterview}
                  className="w-full rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-white hover:from-green-700 hover:to-emerald-700 font-medium shadow-md"
                >
                  Complete Interview & Generate Strategy
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Transcript & Progress */}
          <div className="space-y-4">
            {/* Progress Indicator */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-medium text-gray-900">Interview Progress</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Questions Answered</span>
                  <span className="font-medium text-gray-900">{questionsAnswered} / 9</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
                    style={{ width: `${(questionsAnswered / 9) * 100}%` }}
                  />
                </div>
              </div>
              {phase !== "idle" && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Recording Time</span>
                  <span className="font-medium text-blue-600">{formatDuration(duration)}</span>
                </div>
              )}
            </div>

            {/* Transcript Section */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm flex flex-col" style={{ height: "calc(100vh - 380px)", minHeight: "400px" }}>
              {/* Header - changes based on state */}
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
                {phase === "idle" && messages.length === 0 && previousInterview ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <h3 className="font-medium text-gray-900">Previous Interview</h3>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(previousInterview.created_at).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPreviousTranscript(!showPreviousTranscript)}
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <span>{showPreviousTranscript ? "Hide" : "Show"}</span>
                      {showPreviousTranscript ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-medium text-gray-900">Live Transcript</h3>
                    <p className="text-xs text-gray-500">{messages.length} messages</p>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Show previous interview transcript when idle */}
                {phase === "idle" && messages.length === 0 ? (
                  loadingPrevious ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Loader2 className="h-8 w-8 mb-2 animate-spin" />
                      <p className="text-sm">Loading previous interview...</p>
                    </div>
                  ) : previousInterview && showPreviousTranscript ? (
                    <div className="space-y-4">
                      {/* Transcript content */}
                      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4 border border-blue-100">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-1 text-xs font-medium text-white">
                            Transcript
                          </span>
                          {previousInterview.duration_seconds && (
                            <span className="text-xs text-gray-500">
                              Duration: {formatDuration(previousInterview.duration_seconds)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
                          {previousInterview.transcript}
                        </div>
                      </div>

                      {/* Action hint */}
                      <div className="text-center py-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                          Click the microphone above to start a new interview
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Mic className="h-12 w-12 mb-2 opacity-30" />
                      <p className="text-sm">
                        {previousInterview && !showPreviousTranscript
                          ? "Previous transcript hidden"
                          : "No previous interview found"}
                      </p>
                      <p className="text-xs mt-1">Start the interview to see transcript</p>
                    </div>
                  )
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Mic className="h-12 w-12 mb-2 opacity-30" />
                    <p className="text-sm">Recording will appear here</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === "ai" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 ${
                          message.role === "ai"
                            ? "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100"
                            : "bg-gray-100"
                        }`}
                      >
                        <div className="mb-1 flex items-center space-x-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              message.role === "ai"
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                                : "bg-gray-600 text-white"
                            }`}
                          >
                            {message.role === "ai" ? "AI" : "You"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
