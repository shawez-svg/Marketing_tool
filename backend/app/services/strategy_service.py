"""
Strategy Generation Service
Generates comprehensive marketing strategies from interview analysis
"""
from uuid import UUID
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from app.models import Strategy, Interview, InterviewStatus
from app.services.llm_service import llm_service


class StrategyService:
    """Service for generating and managing marketing strategies"""

    async def generate_strategy_from_interview(
        self,
        db: Session,
        interview_id: UUID,
        user_id: UUID,
    ) -> Strategy:
        """
        Generate a marketing strategy from a completed interview

        Args:
            db: Database session
            interview_id: Interview ID
            user_id: User ID

        Returns:
            Generated Strategy object
        """
        # Get the interview
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            raise ValueError(f"Interview {interview_id} not found")

        if interview.status != InterviewStatus.COMPLETED:
            raise ValueError("Interview must be completed before generating strategy")

        # Check if strategy already exists for this interview - delete it to regenerate
        existing_strategy = (
            db.query(Strategy)
            .filter(Strategy.interview_id == interview_id)
            .first()
        )
        if existing_strategy:
            # Delete existing strategy to regenerate fresh
            db.delete(existing_strategy)
            db.commit()

        # Generate the strategy using LLM
        strategy_data = await self._generate_strategy_content(interview.transcript)

        # Generate the 90-day content calendar based on strategy
        content_calendar = await self._generate_content_calendar(
            interview.transcript,
            strategy_data.get("recommended_channels", []),
            strategy_data.get("content_pillars", []),
        )

        # Create strategy record
        strategy = Strategy(
            user_id=user_id,
            interview_id=interview_id,
            brand_summary=strategy_data.get("brand_summary", ""),
            target_audience=strategy_data.get("target_audience", []),
            value_proposition=strategy_data.get("value_proposition", ""),
            recommended_channels=strategy_data.get("recommended_channels", []),
            content_pillars=strategy_data.get("content_pillars", []),
            posting_schedule=strategy_data.get("posting_schedule", {}),
            tone_and_voice=strategy_data.get("tone_and_voice", {}),
            hashtag_strategy=strategy_data.get("hashtag_strategy", []),
            content_ideas=strategy_data.get("content_ideas", []),
            content_calendar=content_calendar,
        )

        db.add(strategy)
        db.commit()
        db.refresh(strategy)

        return strategy

    async def _generate_strategy_content(self, transcript: str) -> Dict[str, Any]:
        """
        Use LLM to generate comprehensive strategy content

        Args:
            transcript: Interview transcript

        Returns:
            Dict containing all strategy components
        """
        system_prompt = """You are an expert marketing strategist. Based on the interview transcript,
create a comprehensive marketing strategy. Be specific and actionable.

Return a JSON object with this exact structure:
{
    "brand_summary": "2-3 paragraph summary of the brand, their mission, and market position",
    "target_audience": [
        {
            "persona_name": "Name for this audience segment",
            "demographics": "Age, location, income, etc.",
            "psychographics": "Values, interests, lifestyle",
            "pain_points": ["List of problems they face"],
            "goals": ["What they want to achieve"],
            "where_they_hang_out": ["Social platforms and communities they use"]
        }
    ],
    "value_proposition": "Clear statement of the unique value this brand provides",
    "recommended_channels": [
        {
            "platform": "Platform name (LinkedIn, Instagram, etc.)",
            "priority": "primary or secondary",
            "reasoning": "Why this platform fits the brand",
            "content_types": ["Types of content to post here"],
            "posting_frequency": "How often to post",
            "best_times": ["Best times to post"]
        }
    ],
    "content_pillars": [
        {
            "pillar_name": "Name of content theme",
            "description": "What this pillar covers",
            "percentage": 25,
            "example_topics": ["Specific topic ideas"]
        }
    ],
    "posting_schedule": {
        "posts_per_week": 5,
        "best_days": ["Monday", "Wednesday", "Friday"],
        "best_times": ["9:00 AM", "12:00 PM", "6:00 PM"],
        "content_mix": {
            "educational": 30,
            "promotional": 20,
            "engagement": 25,
            "behind_the_scenes": 15,
            "user_generated": 10
        }
    },
    "tone_and_voice": {
        "brand_voice": "Description of how the brand should sound",
        "tone_attributes": ["Professional", "Friendly", "Authoritative"],
        "language_style": "Formal, casual, technical, etc.",
        "dos": ["Things to do in messaging"],
        "donts": ["Things to avoid in messaging"]
    },
    "hashtag_strategy": [
        {
            "category": "Brand hashtags",
            "hashtags": ["#BrandName", "#BrandSlogan"],
            "usage": "Use on every post"
        },
        {
            "category": "Industry hashtags",
            "hashtags": ["#Industry", "#Niche"],
            "usage": "Use 3-5 per post"
        }
    ],
    "content_ideas": [
        {
            "title": "Content idea title",
            "type": "Post type (carousel, video, story, etc.)",
            "platform": "Best platform for this",
            "description": "What the content should include",
            "pillar": "Which content pillar this falls under"
        }
    ]
}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Create a marketing strategy based on this interview:\n\n{transcript}"},
        ]

        response = await llm_service.chat_completion(
            messages,
            temperature=0.4,
            max_tokens=4000
        )

        import json
        try:
            # Try to parse JSON from response
            # Handle potential markdown code blocks
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]

            return json.loads(response.strip())
        except json.JSONDecodeError as e:
            print(f"Failed to parse strategy JSON: {e}")
            # Return a basic structure
            return {
                "brand_summary": "Strategy generation in progress...",
                "target_audience": [],
                "value_proposition": "",
                "recommended_channels": [],
                "content_pillars": [],
                "posting_schedule": {},
                "tone_and_voice": {},
                "hashtag_strategy": [],
                "content_ideas": [],
            }

    async def _generate_content_calendar(
        self,
        transcript: str,
        recommended_channels: List[Dict[str, Any]],
        content_pillars: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Generate a 90-day content calendar with AI-recommended post counts per platform.

        Args:
            transcript: Interview transcript for context
            recommended_channels: List of recommended platforms
            content_pillars: List of content themes

        Returns:
            Dict containing monthly content plans for 3 months
        """
        # Get current date for accurate month names
        from datetime import datetime, timedelta
        today = datetime.now()

        month_names = []
        for i in range(3):
            month_date = datetime(today.year, today.month, 1) + timedelta(days=32 * i)
            month_name = month_date.strftime("%B %Y")
            month_names.append(month_name)

        # Get platform names for the prompt
        platforms = [ch.get("platform", "") for ch in recommended_channels if ch.get("platform")]
        platform_list = ", ".join(platforms) if platforms else "Instagram, LinkedIn, Twitter, Facebook"

        # Get content pillars for the prompt
        pillars = [p.get("pillar_name", "") for p in content_pillars if p.get("pillar_name")]
        pillar_list = ", ".join(pillars) if pillars else "Educational, Promotional, Engagement"

        system_prompt = f"""You are an expert social media strategist creating a 90-day content calendar.

Based on the business interview, recommend specific post counts per platform for each of the next 3 months.

Consider these factors when deciding post counts:
1. Business type and resources (small business = fewer posts, established brand = more)
2. Platform best practices (Twitter needs more frequency than LinkedIn)
3. Gradual scaling (start conservative month 1, increase as momentum builds)
4. Content pillar distribution

The recommended platforms are: {platform_list}
The content pillars are: {pillar_list}

Return a JSON object with this exact structure:
{{
    "months": [
        {{
            "month": 1,
            "name": "{month_names[0]}",
            "focus": "Short description of this month's focus (e.g., 'Foundation & Brand Awareness')",
            "total_posts": 15,
            "platforms": [
                {{
                    "platform": "Instagram",
                    "post_count": 4,
                    "content_types": "Posts & Reels",
                    "reasoning": "Brief explanation why this number"
                }},
                {{
                    "platform": "LinkedIn",
                    "post_count": 3,
                    "content_types": "Posts & Articles",
                    "reasoning": "Brief explanation why this number"
                }}
            ],
            "pillar_distribution": [
                {{"pillar": "Educational", "percentage": 40}},
                {{"pillar": "Promotional", "percentage": 30}},
                {{"pillar": "Engagement", "percentage": 30}}
            ],
            "key_goals": ["Goal 1", "Goal 2", "Goal 3"]
        }},
        {{
            "month": 2,
            "name": "{month_names[1]}",
            "focus": "Growth & Community Building",
            "total_posts": 22,
            "platforms": [...],
            "pillar_distribution": [...],
            "key_goals": [...]
        }},
        {{
            "month": 3,
            "name": "{month_names[2]}",
            "focus": "Optimization & Conversion",
            "total_posts": 28,
            "platforms": [...],
            "pillar_distribution": [...],
            "key_goals": [...]
        }}
    ],
    "strategy_summary": "Brief 2-3 sentence overview of the 90-day content strategy",
    "total_posts_90_days": 65,
    "recommended_tools": ["Scheduling tool suggestions if applicable"]
}}

Important guidelines:
- Be realistic about what a small/medium business can handle
- Month 1 should be manageable (foundation building)
- Month 2 should increase by 30-50%
- Month 3 should be the peak but sustainable
- Include ALL recommended platforms in each month
- Post counts should reflect platform-specific best practices"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Create a 90-day content calendar based on this business interview:\n\n{transcript[:3000]}"},
        ]

        response = await llm_service.chat_completion(
            messages,
            temperature=0.4,
            max_tokens=2500
        )

        import json
        try:
            # Handle potential markdown code blocks
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]

            return json.loads(response.strip())
        except json.JSONDecodeError as e:
            print(f"Failed to parse content calendar JSON: {e}")
            # Return a default structure
            return self._get_default_content_calendar(month_names, recommended_channels)

    def _get_default_content_calendar(
        self,
        month_names: List[str],
        recommended_channels: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate a default content calendar if AI generation fails."""
        # Default post counts per platform
        default_volumes = {
            "instagram": [4, 6, 8],
            "linkedin": [3, 4, 5],
            "twitter": [8, 12, 15],
            "facebook": [3, 4, 5],
            "tiktok": [3, 5, 6],
        }

        months = []
        focuses = [
            "Foundation & Brand Awareness",
            "Growth & Community Building",
            "Optimization & Conversion"
        ]

        for i in range(3):
            platforms = []
            total = 0

            for channel in recommended_channels:
                platform_name = channel.get("platform", "").lower()
                if platform_name in default_volumes:
                    count = default_volumes[platform_name][i]
                    platforms.append({
                        "platform": channel.get("platform"),
                        "post_count": count,
                        "content_types": self._get_content_type(platform_name),
                        "reasoning": f"Standard volume for {channel.get('platform')}"
                    })
                    total += count

            months.append({
                "month": i + 1,
                "name": month_names[i],
                "focus": focuses[i],
                "total_posts": total,
                "platforms": platforms,
                "pillar_distribution": [
                    {"pillar": "Educational", "percentage": 40},
                    {"pillar": "Promotional", "percentage": 30},
                    {"pillar": "Engagement", "percentage": 30}
                ],
                "key_goals": [
                    "Establish consistent posting",
                    "Build audience engagement",
                    "Track performance metrics"
                ]
            })

        total_90_days = sum(m["total_posts"] for m in months)

        return {
            "months": months,
            "strategy_summary": "A gradual 90-day content strategy focusing on building brand awareness and engagement.",
            "total_posts_90_days": total_90_days,
            "recommended_tools": ["Content scheduling tool", "Analytics dashboard"]
        }

    def _get_content_type(self, platform: str) -> str:
        """Get content type description for a platform."""
        types = {
            "instagram": "Posts & Reels",
            "linkedin": "Posts & Articles",
            "twitter": "Tweets & Threads",
            "facebook": "Posts & Stories",
            "tiktok": "Short Videos",
        }
        return types.get(platform, "Posts")

    async def get_strategy(
        self,
        db: Session,
        strategy_id: UUID,
    ) -> Optional[Strategy]:
        """Get strategy by ID"""
        return db.query(Strategy).filter(Strategy.id == strategy_id).first()

    async def get_strategy_by_interview(
        self,
        db: Session,
        interview_id: UUID,
    ) -> Optional[Strategy]:
        """Get strategy by interview ID"""
        return db.query(Strategy).filter(Strategy.interview_id == interview_id).first()

    async def get_user_strategies(
        self,
        db: Session,
        user_id: UUID,
    ) -> List[Strategy]:
        """Get all strategies for a user"""
        return (
            db.query(Strategy)
            .filter(Strategy.user_id == user_id)
            .order_by(Strategy.created_at.desc())
            .all()
        )

    async def get_latest_strategy(
        self,
        db: Session,
        user_id: UUID,
    ) -> Optional[Strategy]:
        """Get the most recent strategy for a user"""
        return (
            db.query(Strategy)
            .filter(Strategy.user_id == user_id)
            .order_by(Strategy.created_at.desc())
            .first()
        )

    async def update_strategy(
        self,
        db: Session,
        strategy_id: UUID,
        updates: Dict[str, Any],
    ) -> Strategy:
        """Update an existing strategy"""
        strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
        if not strategy:
            raise ValueError(f"Strategy {strategy_id} not found")

        # Update allowed fields
        allowed_fields = [
            "brand_summary", "target_audience", "value_proposition",
            "recommended_channels", "content_pillars", "posting_schedule",
            "tone_and_voice", "hashtag_strategy", "content_ideas", "content_calendar"
        ]

        for field, value in updates.items():
            if field in allowed_fields:
                setattr(strategy, field, value)

        strategy.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(strategy)

        return strategy


# Singleton instance
strategy_service = StrategyService()
