from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models import Interview, InterviewStatus
from app.services.whisper_service import whisper_service
from app.services.llm_service import llm_service


class InterviewService:
    """Service for managing brand interviews"""

    # Pre-defined interview questions as fallback
    DEFAULT_QUESTIONS = [
        {
            "question": "Hi! I'm excited to learn about your business. Let's start with the basics - can you tell me what your business does and what products or services you offer?",
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

        # Count how many questions have been asked
        transcript = interview.transcript or ""
        questions_asked = [
            line.replace("AI: ", "")
            for line in transcript.split("\n")
            if line.startswith("AI: ")
        ]

        question_count = len(questions_asked)

        # Use default questions for first 8, then wrap up
        if question_count >= len(self.DEFAULT_QUESTIONS):
            return {
                "question": "Thank you so much for sharing all of this! I have everything I need to create your marketing strategy. Is there anything else you'd like to add before we wrap up?",
                "category": "wrap_up",
                "is_final": True,
            }

        if use_ai and transcript:
            try:
                # Generate AI question based on conversation
                ai_question = await llm_service.generate_interview_question(
                    transcript_so_far=transcript,
                    questions_asked=questions_asked,
                )
                return {**ai_question, "is_final": False}
            except Exception as e:
                # Fall back to default questions
                print(f"AI question generation failed: {e}")

        # Use default question
        default_q = self.DEFAULT_QUESTIONS[question_count]
        return {**default_q, "is_final": False}

    async def add_question_to_transcript(
        self,
        db: Session,
        interview_id: UUID,
        question: str,
    ) -> None:
        """Add AI question to transcript"""
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            raise ValueError(f"Interview {interview_id} not found")

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
