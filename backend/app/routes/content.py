"""
Content Routes

API endpoints for generating and managing social media content.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.services.content_service import content_service
from app.services.posting_service import posting_service
from app.models.post import PostStatus, Platform


router = APIRouter()


# Pydantic models
class GenerateContentRequest(BaseModel):
    strategy_id: str
    platforms: Optional[List[str]] = None
    posts_per_platform: int = 5


class RegeneratePostRequest(BaseModel):
    instructions: Optional[str] = None


class UpdatePostRequest(BaseModel):
    content_text: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None


class SchedulePostRequest(BaseModel):
    scheduled_time: datetime


class PostResponse(BaseModel):
    id: str
    strategy_id: str
    platform: str
    content_text: str
    tags: List[str]
    content_pillar: Optional[str]
    status: str
    suggested_time: Optional[str]
    scheduled_time: Optional[str]
    posted_at: Optional[str]
    platform_post_id: Optional[str]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class PostingResponse(BaseModel):
    success: bool
    post_id: str
    platform: Optional[str] = None
    platform_post_id: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None
    simulated: bool = False


class BulkPostRequest(BaseModel):
    post_ids: List[str]


class ScheduleWithPostingRequest(BaseModel):
    scheduled_time: datetime


# Temporary: hardcoded user ID for development
TEMP_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


def post_to_response(post) -> PostResponse:
    """Convert Post model to response."""
    return PostResponse(
        id=str(post.id),
        strategy_id=str(post.strategy_id),
        platform=post.platform.value,
        content_text=post.content_text,
        tags=post.tags or [],
        content_pillar=post.content_pillar,
        status=post.status.value,
        suggested_time=post.suggested_time.isoformat() if post.suggested_time else None,
        scheduled_time=post.scheduled_time.isoformat() if post.scheduled_time else None,
        posted_at=post.posted_at.isoformat() if post.posted_at else None,
        platform_post_id=post.platform_post_id,
        created_at=post.created_at.isoformat(),
        updated_at=post.updated_at.isoformat(),
    )


@router.post("/generate", response_model=List[PostResponse])
async def generate_content(
    request: GenerateContentRequest,
    db: Session = Depends(get_db),
):
    """
    Generate content batch for specified platforms based on strategy.
    """
    try:
        strategy_id = UUID(request.strategy_id)
        posts = await content_service.generate_content_batch(
            db,
            strategy_id,
            TEMP_USER_ID,
            request.platforms,
            request.posts_per_platform,
        )
        return [post_to_response(p) for p in posts]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")


@router.get("/", response_model=List[PostResponse])
async def list_posts(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    List all posts for the current user.
    """
    try:
        status_filter = PostStatus(status) if status else None
        posts = await content_service.get_posts_by_user(db, TEMP_USER_ID, status_filter)

        if platform:
            posts = [p for p in posts if p.platform.value == platform.lower()]

        return [post_to_response(p) for p in posts]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status value")


@router.get("/strategy/{strategy_id}", response_model=List[PostResponse])
async def get_posts_by_strategy(
    strategy_id: UUID,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Get all posts for a specific strategy.
    """
    try:
        status_filter = PostStatus(status) if status else None
        posts = await content_service.get_posts_by_strategy(db, strategy_id, status_filter)
        return [post_to_response(p) for p in posts]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status value")


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get a single post by ID.
    """
    post = await content_service.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post_to_response(post)


@router.post("/{post_id}/regenerate", response_model=PostResponse)
async def regenerate_post(
    post_id: UUID,
    request: RegeneratePostRequest,
    db: Session = Depends(get_db),
):
    """
    Regenerate a post with optional instructions.
    """
    try:
        post = await content_service.regenerate_post(db, post_id, request.instructions)
        return post_to_response(post)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {str(e)}")


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: UUID,
    request: UpdatePostRequest,
    db: Session = Depends(get_db),
):
    """
    Update a post's content or status.
    """
    try:
        post = await content_service.get_post(db, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        # Update content if provided
        if request.content_text is not None or request.tags is not None:
            post = await content_service.update_post_content(
                db,
                post_id,
                request.content_text or post.content_text,
                request.tags if request.tags is not None else post.tags,
            )

        # Update status if provided
        if request.status:
            status = PostStatus(request.status)
            post = await content_service.update_post_status(db, post_id, status)

        return post_to_response(post)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{post_id}/approve", response_model=PostResponse)
async def approve_post(
    post_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Approve a post for scheduling/posting.
    """
    try:
        post = await content_service.update_post_status(db, post_id, PostStatus.APPROVED)
        return post_to_response(post)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{post_id}/reject", response_model=PostResponse)
async def reject_post(
    post_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Reject a post.
    """
    try:
        post = await content_service.update_post_status(db, post_id, PostStatus.REJECTED)
        return post_to_response(post)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{post_id}/schedule", response_model=PostResponse)
async def schedule_post(
    post_id: UUID,
    request: SchedulePostRequest,
    db: Session = Depends(get_db),
):
    """
    Schedule a post for future posting.
    """
    try:
        post = await content_service.schedule_post(db, post_id, request.scheduled_time)
        return post_to_response(post)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{post_id}")
async def delete_post(
    post_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Delete a post.
    """
    deleted = await content_service.delete_post(db, post_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted successfully"}


@router.post("/bulk-approve", response_model=List[PostResponse])
async def bulk_approve_posts(
    post_ids: List[str],
    db: Session = Depends(get_db),
):
    """
    Approve multiple posts at once.
    """
    approved_posts = []
    for post_id_str in post_ids:
        try:
            post_id = UUID(post_id_str)
            post = await content_service.update_post_status(db, post_id, PostStatus.APPROVED)
            approved_posts.append(post_to_response(post))
        except (ValueError, Exception):
            continue
    return approved_posts


# ============================================================
# POSTING ENDPOINTS - Actual social media posting via Ayrshare
# ============================================================


@router.post("/{post_id}/post-now", response_model=PostingResponse)
async def post_now(
    post_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Post content immediately to social media.

    Uses Ayrshare API to publish the post to the specified platform.
    If no API key is configured, simulates posting for development.
    """
    try:
        result = await posting_service.post_now(db, post_id)
        return PostingResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Posting failed: {str(e)}")


@router.post("/{post_id}/schedule-post", response_model=PostingResponse)
async def schedule_post_to_platform(
    post_id: UUID,
    request: ScheduleWithPostingRequest,
    db: Session = Depends(get_db),
):
    """
    Schedule a post for future posting via Ayrshare.

    The post will be published automatically at the scheduled time.
    """
    try:
        result = await posting_service.schedule_post(db, post_id, request.scheduled_time)
        return PostingResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scheduling failed: {str(e)}")


@router.delete("/{post_id}/cancel-schedule")
async def cancel_scheduled_post(
    post_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Cancel a scheduled post.

    Removes the post from the Ayrshare schedule and sets status back to draft.
    """
    try:
        result = await posting_service.delete_scheduled_post(db, post_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cancellation failed: {str(e)}")


@router.post("/bulk-post", response_model=List[PostingResponse])
async def bulk_post(
    request: BulkPostRequest,
    db: Session = Depends(get_db),
):
    """
    Post multiple posts at once.

    Posts each content item to its respective platform.
    Returns a list of results for each post.
    """
    try:
        post_ids = [UUID(pid) for pid in request.post_ids]
        results = await posting_service.bulk_post(db, post_ids)
        return [PostingResponse(**r) for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk posting failed: {str(e)}")


@router.get("/{post_id}/analytics")
async def get_post_analytics(
    post_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get analytics for a posted content.

    Returns engagement metrics from the social media platform.
    Only available for posts that have been published.
    """
    try:
        result = await posting_service.get_post_analytics(db, post_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/accounts/connected")
async def get_connected_accounts():
    """
    Get list of connected social media accounts.

    Returns the social accounts connected via Ayrshare.
    """
    result = await posting_service.get_user_social_accounts()
    return result
