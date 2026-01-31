"""
Social Media Posting Service

Handles posting content to social media platforms via Late API (getlate.dev).
Supports LinkedIn, Twitter/X, Instagram, Facebook, TikTok, YouTube, Threads,
Reddit, Pinterest, and Bluesky.
"""

import httpx
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.config import settings
from app.models.post import Post, PostStatus, Platform

logger = logging.getLogger(__name__)


class PostingService:
    """Service for posting content to social media via Late API."""

    def __init__(self):
        self.api_key = getattr(settings, "LATE_API_KEY", None)
        self.base_url = "https://getlate.dev/api/v1"
        self._accounts_cache: Optional[List[Dict[str, Any]]] = None

    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers for Late API."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _platform_to_late(self, platform: Platform) -> str:
        """Convert our Platform enum to Late platform names."""
        mapping = {
            Platform.LINKEDIN: "linkedin",
            Platform.TWITTER: "twitter",
            Platform.INSTAGRAM: "instagram",
            Platform.FACEBOOK: "facebook",
            Platform.TIKTOK: "tiktok",
        }
        return mapping.get(platform, "")

    async def _fetch_accounts(self) -> List[Dict[str, Any]]:
        """Fetch connected accounts from Late API and cache them."""
        if self._accounts_cache is not None:
            return self._accounts_cache

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/accounts",
                    headers=self._get_headers(),
                    timeout=30.0,
                )
                logger.info(f"Late API GET /accounts - status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    accounts_list = data.get("accounts", []) if isinstance(data, dict) else data
                    self._accounts_cache = accounts_list
                    logger.info(f"Late API accounts found: {len(accounts_list)} accounts")
                    for acc in accounts_list:
                        logger.info(f"  Account: platform={acc.get('platform')}, id={acc.get('_id')}, active={acc.get('isActive')}, username={acc.get('username')}")
                    return accounts_list
                else:
                    logger.error(f"Late API accounts fetch failed: {response.text}")
        except Exception as e:
            logger.error(f"Late API accounts fetch error: {e}")
        return []

    async def _get_account_id_for_platform(self, platform_name: str) -> Optional[str]:
        """Get the Late account ID for a given platform name."""
        accounts = await self._fetch_accounts()
        for acc in accounts:
            if acc.get("platform", "").lower() == platform_name.lower() and acc.get("isActive", True):
                return acc.get("_id")
        return None

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
            return await self._simulate_posting(db, post)

        platform_name = self._platform_to_late(post.platform)
        if not platform_name:
            raise ValueError(f"Unsupported platform: {post.platform}")

        # Instagram requires media
        if post.platform == Platform.INSTAGRAM and not post.content_media_url:
            post.status = PostStatus.FAILED
            db.commit()
            return {
                "success": False,
                "post_id": str(post.id),
                "platform": platform_name,
                "error": "Instagram requires an image or video. Please add media to this post before publishing.",
                "requires_media": True,
            }

        # Look up the connected account ID for this platform
        account_id = await self._get_account_id_for_platform(platform_name)
        if not account_id:
            return {
                "success": False,
                "post_id": str(post.id),
                "platform": platform_name,
                "error": f"No {platform_name} account connected. Please connect your {platform_name} account in the Late dashboard (https://getlate.dev/signin).",
            }

        # Build Late API payload
        payload: Dict[str, Any] = {
            "content": post.content_text,
            "platforms": [{"platform": platform_name, "accountId": account_id}],
            "publishNow": True,
            "isDraft": False,
        }

        # Add media if present
        if post.content_media_url:
            media_url = post.content_media_url
            # Detect media type from URL
            media_type = "image"
            lower_url = media_url.lower()
            if any(ext in lower_url for ext in [".mp4", ".mov", ".avi", ".webm"]):
                media_type = "video"
            payload["mediaItems"] = [{"type": media_type, "url": media_url}]

        logger.info(f"Late API POST /posts - Platform: {platform_name}, AccountID: {account_id}")
        logger.info(f"Late API payload: {payload}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/posts",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0,
                )

                result = response.json()
                logger.info(f"Late API response status: {response.status_code}")
                logger.info(f"Late API response body: {result}")

                if response.status_code in (200, 201):
                    post_data = result.get("post", {})
                    post.status = PostStatus.POSTED
                    post.posted_at = datetime.utcnow()
                    post.platform_post_id = post_data.get("_id")
                    db.commit()

                    return {
                        "success": True,
                        "post_id": str(post.id),
                        "platform": platform_name,
                        "platform_post_id": post_data.get("_id"),
                        "message": "Posted successfully",
                    }
                else:
                    post.status = PostStatus.FAILED
                    db.commit()

                    error_msg = result.get("message") or result.get("error") or ""
                    if not error_msg:
                        error_msg = f"Posting failed (status {response.status_code}). Please ensure your {platform_name} account is connected in Late dashboard."
                    else:
                        error_msg = f"{error_msg} (HTTP {response.status_code})"

                    logger.error(f"Late API posting failed: {error_msg}")

                    return {
                        "success": False,
                        "post_id": str(post.id),
                        "platform": platform_name,
                        "error": error_msg,
                    }

        except httpx.TimeoutException:
            logger.error(f"Late API timeout for post {post.id}")
            post.status = PostStatus.FAILED
            db.commit()
            return {
                "success": False,
                "post_id": str(post.id),
                "error": "Request timed out. The Late API did not respond in time.",
            }
        except Exception as e:
            logger.error(f"Late API exception for post {post.id}: {e}")
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
        timezone: str = "UTC",
    ) -> Dict[str, Any]:
        """
        Schedule a post for future publishing via Late.

        Args:
            db: Database session
            post_id: Post ID to schedule
            scheduled_time: When to post
            timezone: User's timezone (IANA format, e.g. 'America/New_York')

        Returns:
            dict with scheduling result
        """
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise ValueError("Post not found")

        if post.status == PostStatus.POSTED:
            raise ValueError("Post already published")

        if not self.api_key:
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

        platform_name = self._platform_to_late(post.platform)
        if not platform_name:
            raise ValueError(f"Unsupported platform: {post.platform}")

        if post.platform == Platform.INSTAGRAM and not post.content_media_url:
            return {
                "success": False,
                "post_id": str(post.id),
                "platform": platform_name,
                "error": "Instagram requires an image or video. Please add media before scheduling.",
                "requires_media": True,
            }

        # Look up the connected account ID for this platform
        account_id = await self._get_account_id_for_platform(platform_name)
        if not account_id:
            return {
                "success": False,
                "post_id": str(post.id),
                "platform": platform_name,
                "error": f"No {platform_name} account connected. Please connect your {platform_name} account in the Late dashboard (https://getlate.dev/signin).",
            }

        schedule_date = scheduled_time.strftime("%Y-%m-%dT%H:%M:%SZ")

        payload: Dict[str, Any] = {
            "content": post.content_text,
            "platforms": [{"platform": platform_name, "accountId": account_id}],
            "scheduledFor": schedule_date,
            "timezone": timezone or "UTC",
            "isDraft": False,
        }

        if post.content_media_url:
            media_url = post.content_media_url
            media_type = "image"
            lower_url = media_url.lower()
            if any(ext in lower_url for ext in [".mp4", ".mov", ".avi", ".webm"]):
                media_type = "video"
            payload["mediaItems"] = [{"type": media_type, "url": media_url}]

        logger.info(f"Late API POST /posts (schedule) - Platform: {platform_name}, AccountID: {account_id}")
        logger.info(f"Late API schedule payload: {payload}")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/posts",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0,
                )

                result = response.json()
                logger.info(f"Late API schedule response status: {response.status_code}")
                logger.info(f"Late API schedule response body: {result}")

                if response.status_code in (200, 201):
                    post_data = result.get("post", {})
                    post.status = PostStatus.SCHEDULED
                    post.scheduled_time = scheduled_time
                    post.platform_post_id = post_data.get("_id")
                    db.commit()

                    return {
                        "success": True,
                        "post_id": str(post.id),
                        "platform": platform_name,
                        "scheduled_time": schedule_date,
                        "platform_post_id": post_data.get("_id"),
                        "message": "Scheduled successfully via Late",
                    }
                else:
                    error_msg = result.get("message") or result.get("error") or ""
                    if not error_msg:
                        error_msg = f"Scheduling failed (status {response.status_code})"
                    else:
                        error_msg = f"{error_msg} (HTTP {response.status_code})"

                    logger.error(f"Late API scheduling failed: {error_msg}")

                    return {
                        "success": False,
                        "post_id": str(post.id),
                        "platform": platform_name,
                        "error": error_msg,
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
        Delete a scheduled post from Late.

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
                    f"{self.base_url}/posts/{post.platform_post_id}",
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
                    f"{self.base_url}/posts/{post.platform_post_id}",
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
        Get connected social media accounts from Late.

        Returns:
            dict with connected accounts
        """
        if not self.api_key:
            return {
                "accounts": [],
                "message": "No API key configured - connect accounts at getlate.dev",
            }

        # Clear cache so we get fresh data
        self._accounts_cache = None

        try:
            accounts_list = await self._fetch_accounts()

            # Extract platform names from connected accounts
            connected_platforms = []
            for acc in accounts_list:
                platform = acc.get("platform", "")
                if platform and acc.get("isActive", True):
                    connected_platforms.append(platform)

            return {
                "accounts": connected_platforms,
                "details": accounts_list,
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
