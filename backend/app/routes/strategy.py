from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel

from app.database import get_db
from app.services.strategy_service import strategy_service


router = APIRouter()


# Pydantic models
class TargetAudience(BaseModel):
    persona_name: str
    demographics: str
    psychographics: str
    pain_points: List[str]
    goals: List[str]
    where_they_hang_out: List[str]

    class Config:
        from_attributes = True


class RecommendedChannel(BaseModel):
    platform: str
    priority: str
    reasoning: str
    content_types: List[str]
    posting_frequency: str
    best_times: List[str]

    class Config:
        from_attributes = True


class ContentPillar(BaseModel):
    pillar_name: str
    description: str
    percentage: int
    example_topics: List[str]

    class Config:
        from_attributes = True


class PostingSchedule(BaseModel):
    posts_per_week: int
    best_days: List[str]
    best_times: List[str]
    content_mix: dict

    class Config:
        from_attributes = True


class ToneAndVoice(BaseModel):
    brand_voice: str
    tone_attributes: List[str]
    language_style: str
    dos: List[str]
    donts: List[str]

    class Config:
        from_attributes = True


class HashtagCategory(BaseModel):
    category: str
    hashtags: List[str]
    usage: str

    class Config:
        from_attributes = True


class ContentIdea(BaseModel):
    title: str
    type: str
    platform: str
    description: str
    pillar: str

    class Config:
        from_attributes = True


class StrategyResponse(BaseModel):
    id: str
    interview_id: str
    brand_summary: str
    target_audience: List[dict]
    value_proposition: str
    recommended_channels: List[dict]
    content_pillars: List[dict]
    posting_schedule: dict
    tone_and_voice: dict
    hashtag_strategy: List[dict]
    content_ideas: List[dict]
    content_calendar: Optional[dict] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class GenerateStrategyRequest(BaseModel):
    interview_id: str


class UpdateStrategyRequest(BaseModel):
    brand_summary: Optional[str] = None
    target_audience: Optional[List[dict]] = None
    value_proposition: Optional[str] = None
    recommended_channels: Optional[List[dict]] = None
    content_pillars: Optional[List[dict]] = None
    posting_schedule: Optional[dict] = None
    tone_and_voice: Optional[dict] = None
    hashtag_strategy: Optional[List[dict]] = None
    content_ideas: Optional[List[dict]] = None


# Temporary: hardcoded user ID for development
TEMP_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


def strategy_to_response(strategy) -> StrategyResponse:
    """Convert Strategy model to response"""
    return StrategyResponse(
        id=str(strategy.id),
        interview_id=str(strategy.interview_id),
        brand_summary=strategy.brand_summary or "",
        target_audience=strategy.target_audience or [],
        value_proposition=strategy.value_proposition or "",
        recommended_channels=strategy.recommended_channels or [],
        content_pillars=strategy.content_pillars or [],
        posting_schedule=strategy.posting_schedule or {},
        tone_and_voice=strategy.tone_and_voice or {},
        hashtag_strategy=strategy.hashtag_strategy or [],
        content_ideas=strategy.content_ideas or [],
        content_calendar=strategy.content_calendar,
        created_at=strategy.created_at.isoformat(),
        updated_at=strategy.updated_at.isoformat() if strategy.updated_at else strategy.created_at.isoformat(),
    )


@router.post("/generate", response_model=StrategyResponse)
async def generate_strategy(
    request: GenerateStrategyRequest,
    db: Session = Depends(get_db),
):
    """
    Generate a marketing strategy from a completed interview
    """
    try:
        interview_id = UUID(request.interview_id)
        strategy = await strategy_service.generate_strategy_from_interview(
            db, interview_id, TEMP_USER_ID
        )
        return strategy_to_response(strategy)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Strategy generation failed: {str(e)}")


@router.get("/latest", response_model=Optional[StrategyResponse])
async def get_latest_strategy(db: Session = Depends(get_db)):
    """
    Get the most recent strategy for the current user
    """
    strategy = await strategy_service.get_latest_strategy(db, TEMP_USER_ID)
    if not strategy:
        raise HTTPException(status_code=404, detail="No strategy found")
    return strategy_to_response(strategy)


@router.get("/interview/{interview_id}", response_model=Optional[StrategyResponse])
async def get_strategy_by_interview(
    interview_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get strategy by interview ID
    """
    strategy = await strategy_service.get_strategy_by_interview(db, interview_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found for this interview")
    return strategy_to_response(strategy)


@router.get("/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(
    strategy_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get strategy by ID
    """
    strategy = await strategy_service.get_strategy(db, strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy_to_response(strategy)


@router.get("/", response_model=List[StrategyResponse])
async def list_strategies(db: Session = Depends(get_db)):
    """
    List all strategies for the current user
    """
    strategies = await strategy_service.get_user_strategies(db, TEMP_USER_ID)
    return [strategy_to_response(s) for s in strategies]


@router.put("/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: UUID,
    request: UpdateStrategyRequest,
    db: Session = Depends(get_db),
):
    """
    Update an existing strategy
    """
    try:
        updates = request.model_dump(exclude_unset=True)
        strategy = await strategy_service.update_strategy(db, strategy_id, updates)
        return strategy_to_response(strategy)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")
