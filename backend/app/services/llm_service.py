import openai
from typing import List, Dict, Any
from app.config import settings


class LLMService:
    """Service for interacting with OpenAI GPT models"""

    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o"  # Using GPT-4o for best results

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> str:
        """
        Generate a chat completion

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Creativity (0-1)
            max_tokens: Max response tokens

        Returns:
            Generated text response
        """
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        return response.choices[0].message.content

    async def generate_interview_question(
        self,
        transcript_so_far: str,
        questions_asked: List[str],
        business_context: Dict[str, Any] | None = None,
    ) -> Dict[str, str]:
        """
        Generate the next interview question based on conversation context

        Args:
            transcript_so_far: The interview transcript up to this point
            questions_asked: List of questions already asked
            business_context: Optional extracted business context

        Returns:
            dict with 'question' and 'category' keys
        """
        # Define the interview structure
        interview_categories = [
            "business_overview",
            "target_audience",
            "unique_value",
            "goals",
            "current_marketing",
            "brand_personality",
            "content_preferences",
            "wrap_up",
        ]

        # Build the prompt
        system_prompt = """You are an expert marketing strategist conducting a brand discovery interview.
Your goal is to gather comprehensive information about the business to create an effective marketing strategy.

Interview Guidelines:
1. Ask ONE clear, focused question at a time
2. Build on previous answers with relevant follow-up questions
3. Be warm and conversational, not robotic
4. Dig deeper when answers are vague or surface-level
5. Cover all key areas: business overview, target audience, unique value proposition, goals, current marketing, and brand personality

Categories to cover:
- business_overview: What the business does, products/services, history
- target_audience: Who they serve, customer demographics, pain points
- unique_value: What makes them different, competitive advantages
- goals: Business goals, marketing objectives, success metrics
- current_marketing: Current efforts, what's working/not working
- brand_personality: Brand voice, values, personality traits
- content_preferences: Types of content they like, platforms they prefer
- wrap_up: Final thoughts, anything else they want to share"""

        user_prompt = f"""Based on the interview so far, generate the next question.

Interview Transcript:
{transcript_so_far if transcript_so_far else "No responses yet - this is the start of the interview."}

Questions Already Asked:
{chr(10).join(f"- {q}" for q in questions_asked) if questions_asked else "None yet - start with an opening question."}

Generate a natural, conversational question that:
1. Flows naturally from the previous response (if any)
2. Covers an area not yet explored in depth
3. Helps gather actionable marketing insights

Respond in JSON format:
{{
    "question": "Your question here",
    "category": "one of: business_overview, target_audience, unique_value, goals, current_marketing, brand_personality, content_preferences, wrap_up"
}}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        response = await self.chat_completion(messages, temperature=0.7)

        # Parse the JSON response
        import json

        try:
            result = json.loads(response)
            return result
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return {
                "question": "Tell me more about your business and what you offer.",
                "category": "business_overview",
            }

    async def analyze_interview(self, transcript: str) -> Dict[str, Any]:
        """
        Analyze the complete interview transcript and extract key information

        Args:
            transcript: Full interview transcript

        Returns:
            dict with extracted business information
        """
        system_prompt = """You are an expert marketing strategist analyzing a brand discovery interview.
Extract key information to inform a marketing strategy.

Respond in JSON format with the following structure:
{
    "business_summary": "2-3 sentence summary of the business",
    "target_audience": [
        {"persona": "name", "description": "details", "pain_points": ["list"]}
    ],
    "unique_value_proposition": "What makes them unique",
    "business_goals": ["list of goals"],
    "current_marketing": {
        "channels_used": ["list"],
        "whats_working": "description",
        "whats_not_working": "description"
    },
    "brand_personality": {
        "voice": "description of brand voice",
        "values": ["list of values"],
        "tone": "formal/casual/professional/friendly etc"
    },
    "recommended_platforms": [
        {"platform": "name", "reasoning": "why this platform"}
    ],
    "content_pillars": ["list of 3-5 content themes"]
}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze this interview transcript:\n\n{transcript}"},
        ]

        response = await self.chat_completion(messages, temperature=0.3, max_tokens=2000)

        import json

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"error": "Failed to parse interview analysis", "raw_response": response}


# Singleton instance
llm_service = LLMService()
