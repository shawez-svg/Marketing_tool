"""
Social Media Posting Service

Handles posting content to social media platforms via Ayrshare API.
Supports LinkedIn, Twitter/X, Instagram, Facebook, and TikTok.
"""

import httpx
from datetime import datetime
from typing import Dict, Any, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.config import settings
from app.models.post import Post, PostStatus, Platform


class PostingService:
    """Service for posting content to social media via Ayrshare."""

    def __init__(self):
        self.api_key = getattr(settings, "AYRSHARE_API_KEY", None)
        self.base_url = "https://api.ayrshare.com/api"

    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers for Ayrshare API."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _platform_to_ayrshare(self, platform: Platform) -> str:
        """Convert our Platform enum to Ayrshare platform names."""
        mapping = {
            Platform.LINKEDIN: "linkedin",
            Platform.TWITTER: "twitter",
            Platform.INSTAGRAM: "instagram",
            Platform.FACEBOOK: "facebook",
            Platform.TIKTOK: "tiktok",
        }
        return mapping.get(platform, "")

    async def post_now(
        self,
        db: Session,
        post_id: UUID,
    ) -> Dict[str, Any]:
        """
        Post content immediately to social media.

        Args:
            db: Database session
            post_id: Post ID to publish

        Returns:
            dict with posting result
        """
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise ValueError("Post not found")

        if post.status == PostStatus.POSTED:
            raise ValueError("Post already published")

        # Check if API key is configured
        if not self.api_key:
            # Simulate posting for development/testing
            return await self._simulate_posting(db, post)

        # Prepare Ayrshare request
        platform_name = self._platform_to_ayrshare(post.platform)
        if not platform_name:
            raise ValueError(f"Unsupported platform: {post.platform}")

        payload = {
            "post": post.content_text,
            "platforms": [platform_name],
        }

        # Add media if present
        if post.content_media_url:
            payload["mediaUrls"] = [post.content_media_url]

        # Handle platform-specific options
        if post.platform == Platform.INSTAGRAM:
            # Instagram requires media for ALL posts (feed and stories)
            if not post.content_media_url:
                post.status = PostStatus.FAILED
                db.commit()
                return {
                    "success": False,
                    "post_id": str(post.id),
                    "platform": platform_name,
                    "error": "Instagram requires an image or video. Please add media to this post before publishing.",
                    "requires_media": True,
                }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/post",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0,
                )

                result = response.json()

                if response.status_code == 200 and result.get("status") != "error":
                    # Success - update post status
                    post.status = PostStatus.POSTED
                    post.posted_at = datetime.utcnow()
                    post.platform_post_id = result.get("id")
                    db.commit()

                    return {
                        "success": True,
                        "post_id": str(post.id),
                        "platform": platform_name,
                        "platform_post_id": result.get("id"),
                        "message": "Posted successfully",
                    }
                else:
                    # Error - update status to failed
                    post.status = PostStatus.FAILED
                    db.commit()

                    # Get detailed error message
                    error_msg = result.get("message") or result.get("error") or result.get("errors")
                    if isinstance(error_msg, list):
                        error_msg = "; ".join(str(e) for e in error_msg)
                    if isinstance(error_msg, dict):
                        error_msg = str(error_msg)
                    if not error_msg:
                        error_msg = f"Posting failed (status {response.status_code}). Please ensure your {platform_name} account is connected in Ayrshare dashboard."

                    return {
                        "success": False,
                        "post_id": str(post.id),
                        "platform": platform_name,
                        "error": error_msg,
                    }

        except httpx.TimeoutException:
            post.status = PostStatus.FAILED
            db.commit()
            return {
                "success": False,
                "post_id": str(post.id),
                "error": "Request timed out",
            }
        except Exception as e:
            post.status = PostStatus.FAILED
            db.commit()
            return {
                "success": False,
                "post_id": str(post.id),
                "error": str(e),
            }

    async def _simulate_posting(self, db: Session, post: Post) -> Dict[str, Any]:
        """
        Simulate posting for development when API key is not configured.
        """
        # Update post status to simulate successful posting
        post.status = PostStatus.POSTED
        post.posted_at = datetime.utcnow()
        post.platform_post_id = f"simulated_{post.id}"
        db.commit()

        return {
            "success": True,
            "post_id": str(post.id),
            "platform": post.platform.value,
            "platform_post_id": post.platform_post_id,
            "message": "Simulated posting (no API key configured)",
            "simulated": True,
        }

    async def schedule_post(
        self,
        db: Session,
        post_id: UUID,
        scheduled_time: datetime,
    ) -> Dict[str, Any]:
        """
        Schedule a post for future publishing via Ayrshare.

        Args:
            db: Database session
            post_id: Post ID to schedule
            scheduled_time: When to post

        Returns:
            dict with scheduling result
        """
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise ValueError("Post not found")

        if post.status == PostStatus.POSTED:
            raise ValueError("Post already published")

        # Check if API key is configured
        if not self.api_key:
            # Update locally without sending to Ayrshare
            post.scheduled_time = scheduled_time
            post.status = PostStatus.SCHEDULED
            db.commit()

            return {
                "success": True,
                "post_id": str(post.id),
                "scheduled_time": scheduled_time.isoformat(),
                "message": "Scheduled locally (no API key configured)",
                "simulated": True,
            }

        platform_name = self._platform_to_ayrshare(post.platform)
        if not platform_name:
            raise ValueError(f"Unsupported platform: {post.platform}")

        # Format time for Ayrshare (ISO 8601)
        schedule_date = scheduled_time.strftime("%Y-%m-%dT%H:%M:%SZ")

        payload = {
            "post": post.content_text,
            "platforms": [platform_name],
            "scheduleDate": schedule_date,
        }

        if post.content_media_url:
            payload["mediaUrls"] = [post.content_media_url]

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/post",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0,
                )

                result = response.json()

                if response.status_code == 200:
                    post.status = PostStatus.SCHEDULED
                    post.scheduled_time = scheduled_time
                    post.platform_post_id = result.get("id")
                    db.commit()

                    return {
                        "success": True,
                        "post_id": str(post.id),
                        "platform": platform_name,
                        "scheduled_time": schedule_date,
                        "platform_post_id": result.get("id"),
                        "message": "Scheduled successfully",
                    }
                else:
                    return {
                        "success": False,
                        "post_id": str(post.id),
                        "error": result.get("message", "Unknown error"),
                    }

        except Exception as e:
            return {
                "success": False,
                "post_id": str(post.id),
                "error": str(e),
            }

    async def delete_scheduled_post(
        self,
        db: Session,
        post_id: UUID,
    ) -> Dict[str, Any]:
        """
        Delete a scheduled post from Ayrshare.

        Args:
            db: Database session
            post_id: Post ID to delete from schedule

        Returns:
            dict with deletion result
        """
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise ValueError("Post not found")

        if not post.platform_post_id:
            # No platform post ID, just update local status
            post.status = PostStatus.DRAFT
            post.scheduled_time = None
            db.commit()
            return {
                "success": True,
                "message": "Local schedule removed",
            }

        if not self.api_key:
            post.status = PostStatus.DRAFT
            post.scheduled_time = None
            db.commit()
            return {
                "success": True,
                "message": "Simulated schedule removal (no API key)",
            }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/post/{post.platform_post_id}",
                    headers=self._get_headers(),
                    timeout=30.0,
                )

                if response.status_code == 200:
                    post.status = PostStatus.DRAFT
                    post.scheduled_time = None
                    post.platform_post_id = None
                    db.commit()

                    return {
                        "success": True,
                        "message": "Scheduled post deleted",
                    }
                else:
                    return {
                        "success": False,
                        "error": response.json().get("message", "Unknown error"),
                    }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

    async def get_post_analytics(
        self,
        db: Session,
        post_id: UUID,
    ) -> Dict[str, Any]:
        """
        Get analytics for a posted content.

        Args:
            db: Database session
            post_id: Post ID to get analytics for

        Returns:
            dict with analytics data
        """
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise ValueError("Post not found")

        if not post.platform_post_id or not self.api_key:
            return {
                "post_id": str(post.id),
                "analytics": None,
                "message": "Analytics not available",
            }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/analytics/post",
                    params={"id": post.platform_post_id},
                    headers=self._get_headers(),
                    timeout=30.0,
                )

                if response.status_code == 200:
                    return {
                        "post_id": str(post.id),
                        "analytics": response.json(),
                    }
                else:
                    return {
                        "post_id": str(post.id),
                        "analytics": None,
                        "error": response.json().get("message"),
                    }

        except Exception as e:
            return {
                "post_id": str(post.id),
                "analytics": None,
                "error": str(e),
            }

    async def get_user_social_accounts(self) -> Dict[str, Any]:
        """
        Get connected social media accounts from Ayrshare.

        Returns:
            dict with connected accounts
        """
        if not self.api_key:
            return {
                "accounts": [],
                "message": "No API key configured - connect accounts at ayrshare.com",
            }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/user",
                    headers=self._get_headers(),
                    timeout=30.0,
                )

                if response.status_code == 200:
                    data = response.json()
                    return {
                        "accounts": data.get("activeSocialAccounts", []),
                        "email": data.get("email"),
                    }
                else:
                    return {
                        "accounts": [],
                        "error": response.json().get("message"),
                    }

        except Exception as e:
            return {
                "accounts": [],
                "error": str(e),
            }

    async def bulk_post(
        self,
        db: Session,
        post_ids: List[UUID],
    ) -> List[Dict[str, Any]]:
        """
        Post multiple posts at once.

        Args:
            db: Database session
            post_ids: List of post IDs to publish

        Returns:
            List of posting results
        """
        results = []
        for post_id in post_ids:
            try:
                result = await self.post_now(db, post_id)
                results.append(result)
            except Exception as e:
                results.append({
                    "success": False,
                    "post_id": str(post_id),
                    "error": str(e),
                })
        return results


# Singleton instance
posting_service = PostingService()
