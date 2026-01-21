"""
Content Generation Service

Generates platform-specific social media posts based on the marketing strategy.
Uses OpenAI to create engaging content tailored to each platform's best practices.
"""

import json
import openai
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.config import settings
from app.models.post import Post, Platform, PostStatus
from app.models.strategy import Strategy


class ContentService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o"

    async def generate_content_batch(
        self,
        db: Session,
        strategy_id: UUID,
        user_id: UUID,
        platforms: List[str] = None,
        posts_per_platform: int = 5,
    ) -> List[Post]:
        """
        Generate a batch of content for specified platforms based on strategy.
        """
        # Get the strategy
        strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
        if not strategy:
            raise ValueError("Strategy not found")

        # Default to all recommended channels from strategy
        if not platforms:
            platforms = [ch.get("platform", "").lower() for ch in (strategy.recommended_channels or [])]
            if not platforms:
                platforms = ["linkedin", "instagram", "twitter"]

        # Generate content for each platform
        all_posts = []
        for platform in platforms:
            try:
                platform_enum = Platform(platform.lower())
            except ValueError:
                continue  # Skip invalid platforms

            posts = await self._generate_platform_content(
                db, strategy, user_id, platform_enum, posts_per_platform
            )
            all_posts.extend(posts)

        return all_posts

    async def _generate_platform_content(
        self,
        db: Session,
        strategy: Strategy,
        user_id: UUID,
        platform: Platform,
        count: int,
    ) -> List[Post]:
        """
        Generate content specifically for one platform.
        """
        # Build context from strategy
        context = self._build_strategy_context(strategy)
        platform_guidelines = self._get_platform_guidelines(platform)

        prompt = f"""You are a social media content expert. Generate {count} engaging posts for {platform.value.upper()}.

BRAND CONTEXT:
{context}

PLATFORM GUIDELINES FOR {platform.value.upper()}:
{platform_guidelines}

Generate {count} posts that:
1. Match the brand voice and tone
2. Address the target audience's pain points and goals
3. Follow {platform.value} best practices
4. Use appropriate hashtags
5. Cover different content pillars
6. Are ready to post (no placeholders)

Return as JSON array with this structure:
{{
  "posts": [
    {{
      "content": "The post text with hashtags",
      "pillar": "Which content pillar this belongs to",
      "hashtags": ["hashtag1", "hashtag2"],
      "post_type": "educational|promotional|engagement|behind_the_scenes|testimonial",
      "hook": "The attention-grabbing first line"
    }}
  ]
}}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a social media marketing expert who creates engaging, platform-specific content.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.8,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            data = json.loads(content)
            posts_data = data.get("posts", [])

            # Create Post objects
            created_posts = []
            base_time = datetime.utcnow() + timedelta(days=1)

            for i, post_data in enumerate(posts_data):
                # Calculate suggested posting time
                suggested_time = self._calculate_suggested_time(
                    strategy, platform, base_time, i
                )

                post = Post(
                    user_id=user_id,
                    strategy_id=strategy.id,
                    platform=platform,
                    content_text=post_data.get("content", ""),
                    tags=post_data.get("hashtags", []),
                    content_pillar=post_data.get("pillar", ""),
                    status=PostStatus.DRAFT,
                    suggested_time=suggested_time,
                )

                db.add(post)
                created_posts.append(post)

            db.commit()
            return created_posts

        except Exception as e:
            db.rollback()
            raise ValueError(f"Content generation failed: {str(e)}")

    def _build_strategy_context(self, strategy: Strategy) -> str:
        """Build a text context from the strategy for the prompt."""
        context_parts = []

        if strategy.brand_summary:
            context_parts.append(f"BRAND SUMMARY:\n{strategy.brand_summary}")

        if strategy.value_proposition:
            context_parts.append(f"VALUE PROPOSITION:\n{strategy.value_proposition}")

        if strategy.target_audience:
            audience_text = []
            for aud in strategy.target_audience:
                audience_text.append(
                    f"- {aud.get('persona_name', 'Audience')}: {aud.get('demographics', '')}"
                )
                if aud.get("pain_points"):
                    audience_text.append(f"  Pain points: {', '.join(aud['pain_points'])}")
            context_parts.append(f"TARGET AUDIENCE:\n" + "\n".join(audience_text))

        if strategy.content_pillars:
            pillars = [
                f"- {p.get('pillar_name', '')}: {p.get('description', '')} ({p.get('percentage', 0)}%)"
                for p in strategy.content_pillars
            ]
            context_parts.append(f"CONTENT PILLARS:\n" + "\n".join(pillars))

        if strategy.tone_and_voice:
            tone = strategy.tone_and_voice
            context_parts.append(
                f"BRAND VOICE:\n{tone.get('brand_voice', '')}\n"
                f"Tone: {', '.join(tone.get('tone_attributes', []))}"
            )

        if strategy.hashtag_strategy:
            hashtags = []
            for cat in strategy.hashtag_strategy:
                hashtags.append(f"- {cat.get('category', '')}: {', '.join(cat.get('hashtags', []))}")
            context_parts.append(f"HASHTAG STRATEGY:\n" + "\n".join(hashtags))

        return "\n\n".join(context_parts)

    def _get_platform_guidelines(self, platform: Platform) -> str:
        """Get best practices for each platform."""
        guidelines = {
            Platform.LINKEDIN: """
- Professional tone with personal touches
- Optimal length: 1200-1500 characters for engagement
- Use line breaks for readability
- Start with a hook (question, stat, or bold statement)
- End with a call-to-action or question
- Use 3-5 relevant hashtags at the end
- Emojis used sparingly for emphasis
- Share insights, lessons learned, or industry thoughts
""",
            Platform.INSTAGRAM: """
- Casual, authentic, visually-oriented captions
- Optimal length: 125-150 characters for feed, up to 2200 allowed
- Strong hook in first line (shown before "more")
- Use 20-30 hashtags (mix of popular, niche, and branded)
- Include call-to-action (save, share, comment)
- Use emojis naturally throughout
- Line breaks for readability
- End with engagement prompt
""",
            Platform.TWITTER: """
- Concise, punchy content (280 character limit)
- Use threads for longer content
- Include 1-2 relevant hashtags
- Ask questions to drive engagement
- Use numbers and lists
- Strong opinion or unique take
- Reply-worthy content
""",
            Platform.FACEBOOK: """
- Conversational, community-focused tone
- Optimal length: 40-80 characters for highest engagement
- Questions perform well
- Use 1-2 hashtags maximum
- Include clear call-to-action
- Personal stories resonate
- Ask for opinions and experiences
""",
            Platform.TIKTOK: """
- Casual, trendy, authentic voice
- Very short captions (keep it under 100 chars)
- Use trending hashtags and sounds
- Hook immediately
- Be relatable and human
- Use 3-5 relevant hashtags
- Encourage duets, stitches, comments
""",
        }
        return guidelines.get(platform, "Follow platform best practices.")

    def _calculate_suggested_time(
        self, strategy: Strategy, platform: Platform, base_time: datetime, index: int
    ) -> datetime:
        """Calculate optimal posting time based on strategy and platform."""
        # Get best times from strategy posting schedule
        schedule = strategy.posting_schedule or {}
        best_times = schedule.get("best_times", ["09:00", "12:00", "17:00"])
        best_days = schedule.get("best_days", ["Tuesday", "Wednesday", "Thursday"])

        # Spread posts across days
        day_offset = index // len(best_times)
        time_index = index % len(best_times)

        # Calculate the date
        suggested_date = base_time + timedelta(days=day_offset)

        # Parse the time
        try:
            time_str = best_times[time_index]
            hour, minute = map(int, time_str.split(":"))
            suggested_date = suggested_date.replace(hour=hour, minute=minute, second=0)
        except (ValueError, IndexError):
            # Default to 9 AM
            suggested_date = suggested_date.replace(hour=9, minute=0, second=0)

        return suggested_date

    async def regenerate_post(
        self, db: Session, post_id: UUID, instructions: str = None
    ) -> Post:
        """
        Regenerate a single post with optional custom instructions.
        """
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise ValueError("Post not found")

        strategy = db.query(Strategy).filter(Strategy.id == post.strategy_id).first()
        if not strategy:
            raise ValueError("Strategy not found")

        context = self._build_strategy_context(strategy)
        platform_guidelines = self._get_platform_guidelines(post.platform)

        prompt = f"""Regenerate this social media post for {post.platform.value.upper()}.

BRAND CONTEXT:
{context}

PLATFORM GUIDELINES:
{platform_guidelines}

ORIGINAL POST:
{post.content_text}

{f'ADDITIONAL INSTRUCTIONS: {instructions}' if instructions else ''}

Generate a new version that:
1. Maintains brand voice
2. Follows platform best practices
3. Addresses any specific instructions provided

Return as JSON:
{{
  "content": "The new post text with hashtags",
  "pillar": "Content pillar",
  "hashtags": ["hashtag1", "hashtag2"]
}}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a social media expert who creates engaging content.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.8,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            data = json.loads(content)

            # Update post
            post.content_text = data.get("content", post.content_text)
            post.tags = data.get("hashtags", post.tags)
            post.content_pillar = data.get("pillar", post.content_pillar)
            post.updated_at = datetime.utcnow()

            db.commit()
            return post

        except Exception as e:
            db.rollback()
            raise ValueError(f"Post regeneration failed: {str(e)}")

    async def get_posts_by_strategy(
        self, db: Session, strategy_id: UUID, status: PostStatus = None
    ) -> List[Post]:
        """Get all posts for a strategy, optionally filtered by status."""
        query = db.query(Post).filter(Post.strategy_id == strategy_id)
        if status:
            query = query.filter(Post.status == status)
        return query.order_by(Post.suggested_time).all()

    async def get_posts_by_user(
        self, db: Session, user_id: UUID, status: PostStatus = None
    ) -> List[Post]:
        """Get all posts for a user, optionally filtered by status."""
        query = db.query(Post).filter(Post.user_id == user_id)
        if status:
            query = query.filter(Post.status == status)
        return query.order_by(Post.created_at.desc()).all()

    async def update_post_status(
        self, db: Session, post_id: UUID, status: PostStatus
    ) -> Post:
        """Update a post's status (approve, reject, etc.)."""
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise ValueError("Post not found")

        post.status = status
        post.updated_at = datetime.utcnow()

        if status == PostStatus.POSTED:
            post.posted_at = datetime.utcnow()

        db.commit()
        return post

    async def update_post_content(
        self, db: Session, post_id: UUID, content_text: str, tags: List[str] = None
    ) -> Post:
        """Update post content manually."""
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise ValueError("Post not found")

        post.content_text = content_text
        if tags is not None:
            post.tags = tags
        post.updated_at = datetime.utcnow()

        db.commit()
        return post

    async def schedule_post(
        self, db: Session, post_id: UUID, scheduled_time: datetime
    ) -> Post:
        """Schedule a post for future posting."""
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise ValueError("Post not found")

        post.scheduled_time = scheduled_time
        post.status = PostStatus.SCHEDULED
        post.updated_at = datetime.utcnow()

        db.commit()
        return post

    async def get_post(self, db: Session, post_id: UUID) -> Optional[Post]:
        """Get a single post by ID."""
        return db.query(Post).filter(Post.id == post_id).first()

    async def delete_post(self, db: Session, post_id: UUID) -> bool:
        """Delete a post."""
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return False

        db.delete(post)
        db.commit()
        return True


# Singleton instance
content_service = ContentService()
