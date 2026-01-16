from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.services.interview_service import interview_service
from app.models import InterviewStatus


router = APIRouter()


# Pydantic models for request/response
class InterviewStartResponse(BaseModel):
    interview_id: str
    status: str
    first_question: str
    question_category: str

    class Config:
        from_attributes = True


class AudioChunkResponse(BaseModel):
    transcription: str
    full_transcript: str


class NextQuestionResponse(BaseModel):
    question: str
    category: str
    is_final: bool


class InterviewCompleteResponse(BaseModel):
    interview_id: str
    status: str
    transcript: str
    analysis: dict
    duration_seconds: int


class InterviewDetailResponse(BaseModel):
    id: str
    status: str
    transcript: Optional[str]
    duration_seconds: Optional[int]
    created_at: str
    completed_at: Optional[str]

    class Config:
        from_attributes = True


# Temporary: hardcoded user ID for development (will be replaced with auth)
TEMP_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(db: Session = Depends(get_db)):
    """
    Start a new brand interview session

    Returns the interview ID and the first question
    """
    try:
        # Create new interview
        interview = await interview_service.start_interview(db, TEMP_USER_ID)

        # Get the first question
        first_question = await interview_service.get_next_question(
            db, interview.id, use_ai=False
        )

        # Add the question to the transcript
        await interview_service.add_question_to_transcript(
            db, interview.id, first_question["question"]
        )

        return InterviewStartResponse(
            interview_id=str(interview.id),
            status=interview.status.value,
            first_question=first_question["question"],
            question_category=first_question["category"],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{interview_id}/audio-chunk", response_model=AudioChunkResponse)
async def process_audio_chunk(
    interview_id: UUID,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Process an audio chunk from the interview

    Transcribes the audio and updates the interview transcript
    """
    try:
        # Read audio data
        audio_data = await audio.read()

        # Process the chunk
        result = await interview_service.process_audio_chunk(
            db, interview_id, audio_data
        )

        return AudioChunkResponse(
            transcription=result["transcription"],
            full_transcript=result["full_transcript"],
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{interview_id}/next-question", response_model=NextQuestionResponse)
async def get_next_question(
    interview_id: UUID,
    use_ai: bool = True,
    db: Session = Depends(get_db),
):
    """
    Get the next interview question

    Can use AI for dynamic questions or fall back to predefined questions
    """
    try:
        question_data = await interview_service.get_next_question(
            db, interview_id, use_ai=use_ai
        )

        # Add the question to the transcript
        await interview_service.add_question_to_transcript(
            db, interview_id, question_data["question"]
        )

        return NextQuestionResponse(
            question=question_data["question"],
            category=question_data["category"],
            is_final=question_data.get("is_final", False),
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{interview_id}/complete", response_model=InterviewCompleteResponse)
async def complete_interview(
    interview_id: UUID,
    audio_file_url: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Complete the interview and get analysis results

    This triggers the AI analysis of the full transcript
    """
    try:
        result = await interview_service.complete_interview(
            db, interview_id, audio_file_url
        )

        return InterviewCompleteResponse(
            interview_id=result["interview_id"],
            status=result["status"],
            transcript=result["transcript"] or "",
            analysis=result["analysis"],
            duration_seconds=result["duration_seconds"],
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{interview_id}", response_model=InterviewDetailResponse)
async def get_interview(
    interview_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get interview details by ID
    """
    interview = await interview_service.get_interview(db, interview_id)

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    return InterviewDetailResponse(
        id=str(interview.id),
        status=interview.status.value,
        transcript=interview.transcript,
        duration_seconds=interview.duration_seconds,
        created_at=interview.created_at.isoformat(),
        completed_at=interview.completed_at.isoformat() if interview.completed_at else None,
    )


@router.get("/")
async def list_interviews(db: Session = Depends(get_db)):
    """
    List all interviews for the current user
    """
    interviews = await interview_service.get_user_interviews(db, TEMP_USER_ID)

    return [
        {
            "id": str(interview.id),
            "status": interview.status.value,
            "duration_seconds": interview.duration_seconds,
            "created_at": interview.created_at.isoformat(),
            "completed_at": interview.completed_at.isoformat() if interview.completed_at else None,
        }
        for interview in interviews
    ]
