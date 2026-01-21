from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models import Interview, InterviewStatus
from app.services.whisper_service import whisper_service
from app.services.llm_service import llm_service


class InterviewService:
    """Service for managing brand interviews"""

    # Opening question to get interviewee's name
    NAME_QUESTION = {
        "question": "Hi! Welcome to your brand discovery interview. I'm excited to learn about you and your business. Before we dive in, what's your name?",
        "category": "introduction",
    }

    # Pre-defined interview questions as fallback
    DEFAULT_QUESTIONS = [
        {
            "question": "Nice to meet you! Now let's talk about your business - can you tell me what your business does and what products or services you offer?",
            "category": "business_overview",
        },
        {
            "question": "That's great! Now, who are your ideal customers? Can you describe the people or businesses you serve best?",
            "category": "target_audience",
        },
        {
            "question": "What makes your business unique? What do you do differently from your competitors?",
            "category": "unique_value",
        },
        {
            "question": "What are your main business goals right now? What would success look like for you in the next year?",
            "category": "goals",
        },
        {
            "question": "Tell me about your current marketing efforts. What are you doing now, and what's working or not working?",
            "category": "current_marketing",
        },
        {
            "question": "How would you describe your brand's personality? If your brand was a person, what would they be like?",
            "category": "brand_personality",
        },
        {
            "question": "What type of content do you enjoy creating or consuming? Are there any brands whose content you admire?",
            "category": "content_preferences",
        },
        {
            "question": "Is there anything else you'd like to share about your business or marketing goals that we haven't covered?",
            "category": "wrap_up",
        },
    ]

    async def start_interview(self, db: Session, user_id: UUID) -> Interview:
        """
        Start a new interview session

        Args:
            db: Database session
            user_id: User ID

        Returns:
            New Interview object
        """
        interview = Interview(
            user_id=user_id,
            status=InterviewStatus.IN_PROGRESS,
            transcript="",
        )

        db.add(interview)
        db.commit()
        db.refresh(interview)

        return interview

    async def process_audio_chunk(
        self,
        db: Session,
        interview_id: UUID,
        audio_data: bytes,
    ) -> Dict[str, Any]:
        """
        Process an audio chunk: transcribe and generate next question

        Args:
            db: Database session
            interview_id: Interview ID
            audio_data: Raw audio bytes

        Returns:
            dict with transcription and next question
        """
        # Get interview
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            raise ValueError(f"Interview {interview_id} not found")

        # Transcribe audio
        transcription_result = await whisper_service.transcribe_audio(
            audio_data,
            prompt="This is a business interview about marketing and branding.",
        )

        transcribed_text = transcription_result.get("text", "")

        # Update transcript
        if transcribed_text:
            if interview.transcript:
                interview.transcript += f"\n\nUser: {transcribed_text}"
            else:
                interview.transcript = f"User: {transcribed_text}"

            db.commit()

        return {
            "transcription": transcribed_text,
            "full_transcript": interview.transcript,
        }

    async def get_next_question(
        self,
        db: Session,
        interview_id: UUID,
        use_ai: bool = True,
    ) -> Dict[str, str]:
        """
        Get the next interview question

        Args:
            db: Database session
            interview_id: Interview ID
            use_ai: Whether to use AI for dynamic questions

        Returns:
            dict with question and category
        """
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            raise ValueError(f"Interview {interview_id} not found")

        # Parse transcript to count Q&A exchanges
        transcript = interview.transcript or ""
        lines = [line.strip() for line in transcript.split("\n") if line.strip()]

        questions_asked = []
        user_responses = []

        for line in lines:
            if line.startswith("AI: "):
                questions_asked.append(line[4:])
            elif line.startswith("User: "):
                user_responses.append(line[6:])

        question_count = len(questions_asked)
        response_count = len(user_responses)

        # Maximum 9 questions (including name question) - after that, always signal completion
        MAX_QUESTIONS = 9

        # If we've asked max questions, mark as final
        if question_count >= MAX_QUESTIONS:
            return {
                "question": "Thank you so much for sharing! I now have everything I need to create your personalized marketing strategy. Click 'Complete Interview' to see your results.",
                "category": "complete",
                "is_final": True,
            }

        # Check if user has responded to the last question
        # If last question has no response yet, don't ask a new one (return same question)
        if question_count > 0 and response_count < question_count:
            # User hasn't responded to the last question yet - return waiting state
            last_question = questions_asked[-1] if questions_asked else ""
            return {
                "question": last_question,
                "category": "waiting_for_response",
                "is_final": False,
            }

        # FIRST QUESTION: Always ask for name
        if question_count == 0:
            return {**self.NAME_QUESTION, "is_final": False}

        # Last question should be the wrap-up question
        if question_count == MAX_QUESTIONS - 1:
            return {
                "question": "We're almost done! Is there anything else you'd like to share about your business or marketing goals that we haven't covered yet?",
                "category": "wrap_up",
                "is_final": False,
            }

        # Determine which categories have been covered based on questions asked
        covered_categories = set()
        covered_categories.add("introduction")  # Name question is always covered after first question

        for q in questions_asked:
            q_lower = q.lower()
            if any(kw in q_lower for kw in ["business does", "products", "services", "what you offer", "tell me about your business", "what does your"]):
                covered_categories.add("business_overview")
            if any(kw in q_lower for kw in ["customer", "audience", "serve", "who are", "ideal client", "target", "demographic"]):
                covered_categories.add("target_audience")
            if any(kw in q_lower for kw in ["unique", "different", "competitor", "apart", "stand out", "differentiates", "sets you apart"]):
                covered_categories.add("unique_value")
            if any(kw in q_lower for kw in ["goal", "success", "objective", "achieve", "year", "aspiration", "vision"]):
                covered_categories.add("goals")
            if any(kw in q_lower for kw in ["marketing", "channel", "advertis", "promot", "current efforts", "campaigns", "outreach"]):
                covered_categories.add("current_marketing")
            if any(kw in q_lower for kw in ["personality", "brand voice", "person", "describe your brand", "tone", "values"]):
                covered_categories.add("brand_personality")
            if any(kw in q_lower for kw in ["content", "creating", "consuming", "admire", "type of", "posts", "videos"]):
                covered_categories.add("content_preferences")

        # Use AI for conversational questions (questions 2-8, after name)
        if use_ai and question_count > 0:
            try:
                # Generate AI question based on conversation
                ai_question = await llm_service.generate_interview_question(
                    transcript_so_far=transcript,
                    questions_asked=questions_asked,
                    covered_categories=list(covered_categories),
                )

                # Validate that AI didn't repeat a category we already covered
                ai_category = ai_question.get("category", "")
                if ai_category not in covered_categories or ai_category == "follow_up":
                    return {**ai_question, "is_final": False}
                # If AI repeated a category, fall through to default questions
                print(f"AI repeated category {ai_category}, using fallback")
            except Exception as e:
                # Fall back to default questions
                print(f"AI question generation failed: {e}")

        # Use default question as fallback
        # Skip questions in categories already covered
        for default_q in self.DEFAULT_QUESTIONS:
            if default_q["category"] not in covered_categories:
                return {**default_q, "is_final": False}

        # If we've gone through all default questions, signal completion
        return {
            "question": "Thank you for all that information! Click 'Complete Interview' to generate your marketing strategy.",
            "category": "complete",
            "is_final": True,
        }

    async def add_question_to_transcript(
        self,
        db: Session,
        interview_id: UUID,
        question: str,
    ) -> None:
        """Add AI question to transcript (prevents duplicates)"""
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            raise ValueError(f"Interview {interview_id} not found")

        # Check if this exact question was already the last AI message
        transcript = interview.transcript or ""
        lines = [line.strip() for line in transcript.split("\n") if line.strip()]

        # Find the last AI line
        last_ai_line = None
        for line in reversed(lines):
            if line.startswith("AI: "):
                last_ai_line = line[4:]  # Remove "AI: " prefix
                break

        # Don't add duplicate question
        if last_ai_line and last_ai_line.strip() == question.strip():
            return

        if interview.transcript:
            interview.transcript += f"\n\nAI: {question}"
        else:
            interview.transcript = f"AI: {question}"

        db.commit()

    async def complete_interview(
        self,
        db: Session,
        interview_id: UUID,
        audio_file_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Complete the interview and analyze results

        Args:
            db: Database session
            interview_id: Interview ID
            audio_file_url: Optional URL to stored audio file

        Returns:
            Interview analysis results
        """
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            raise ValueError(f"Interview {interview_id} not found")

        # Analyze the transcript
        analysis = await llm_service.analyze_interview(interview.transcript or "")

        # Update interview
        interview.status = InterviewStatus.COMPLETED
        interview.completed_at = datetime.utcnow()
        if audio_file_url:
            interview.audio_file_url = audio_file_url

        # Calculate duration from transcript or use default
        interview.duration_seconds = self._estimate_duration(interview.transcript)

        db.commit()
        db.refresh(interview)

        return {
            "interview_id": str(interview.id),
            "status": interview.status.value,
            "transcript": interview.transcript,
            "analysis": analysis,
            "duration_seconds": interview.duration_seconds,
        }

    def _estimate_duration(self, transcript: str) -> int:
        """Estimate interview duration from transcript length"""
        if not transcript:
            return 0

        # Rough estimate: 150 words per minute speaking rate
        word_count = len(transcript.split())
        return int((word_count / 150) * 60)  # Convert to seconds

    async def get_interview(
        self,
        db: Session,
        interview_id: UUID,
    ) -> Optional[Interview]:
        """Get interview by ID"""
        return db.query(Interview).filter(Interview.id == interview_id).first()

    async def get_user_interviews(
        self,
        db: Session,
        user_id: UUID,
    ) -> List[Interview]:
        """Get all interviews for a user"""
        return (
            db.query(Interview)
            .filter(Interview.user_id == user_id)
            .order_by(Interview.created_at.desc())
            .all()
        )


# Singleton instance
interview_service = InterviewService()
