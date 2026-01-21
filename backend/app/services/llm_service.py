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
        covered_categories: List[str] | None = None,
    ) -> Dict[str, str]:
        """
        Generate the next interview question based on conversation context

        Args:
            transcript_so_far: The interview transcript up to this point
            questions_asked: List of questions already asked
            business_context: Optional extracted business context
            covered_categories: List of categories already covered

        Returns:
            dict with 'question' and 'category' keys
        """
        # Define the interview structure
        all_categories = [
            "business_overview",
            "target_audience",
            "unique_value",
            "goals",
            "current_marketing",
            "brand_personality",
            "content_preferences",
        ]

        # Determine which categories still need to be covered
        covered = set(covered_categories or [])
        remaining_categories = [c for c in all_categories if c not in covered]

        # Build the prompt
        system_prompt = """You are an expert marketing strategist conducting a brand discovery interview.
Your goal is to gather comprehensive information about the business to create an effective marketing strategy.

Interview Guidelines:
1. Ask ONE clear, focused question at a time
2. Build on previous answers with relevant follow-up questions
3. Be warm, friendly, and conversational - use the person's name if they provided it
4. Dig deeper when answers are vague or surface-level
5. NEVER repeat a question or ask about a topic that was already covered

Categories and what they cover:
- business_overview: What the business does, products/services, industry, history
- target_audience: Who they serve, customer demographics, pain points, ideal customer
- unique_value: What makes them different, competitive advantages, USP
- goals: Business goals, marketing objectives, success metrics, vision
- current_marketing: Current marketing efforts, channels used, what's working/not working
- brand_personality: Brand voice, values, personality traits, tone
- content_preferences: Types of content they like creating, platforms they prefer, content style"""

        user_prompt = f"""Based on the interview so far, generate the next question.

Interview Transcript:
{transcript_so_far if transcript_so_far else "No responses yet - this is the start of the interview."}

Questions Already Asked (NEVER repeat or rephrase these):
{chr(10).join(f"- {q}" for q in questions_asked) if questions_asked else "None yet."}

Categories ALREADY COVERED (DO NOT ask about these again):
{chr(10).join(f"- {c}" for c in covered) if covered else "None yet."}

Categories REMAINING to cover (pick from these):
{chr(10).join(f"- {c}" for c in remaining_categories) if remaining_categories else "All categories covered!"}

Number of questions asked so far: {len(questions_asked)}

CRITICAL RULES:
1. Pick a category from the REMAINING categories list ONLY
2. DO NOT ask about categories listed as ALREADY COVERED
3. DO NOT rephrase or ask variations of questions already asked
4. Reference specific details from their previous answers to personalize the question
5. If they mentioned their name, use it in your question
6. Use "follow_up" as the category ONLY if you're diving deeper into the last response

Generate a natural, conversational question that feels like a real conversation with a marketing expert.

Respond in JSON format:
{{
    "question": "Your personalized question here",
    "category": "one of the REMAINING categories listed above, or 'follow_up' for a deeper dive"
}}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        response = await self.chat_completion(messages, temperature=0.7)

        # Parse the JSON response
        import json

        try:
            # Handle potential markdown code blocks
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]

            result = json.loads(response.strip())

            # Validate the category is valid
            valid_categories = all_categories + ["follow_up", "wrap_up"]
            if result.get("category") not in valid_categories:
                result["category"] = remaining_categories[0] if remaining_categories else "follow_up"

            return result
        except json.JSONDecodeError:
            # Fallback: pick from remaining categories
            fallback_questions = {
                "business_overview": {"question": "Tell me about your business - what products or services do you offer?", "category": "business_overview"},
                "target_audience": {"question": "Who are your ideal customers? What problems do they face that you solve?", "category": "target_audience"},
                "unique_value": {"question": "What sets your business apart from competitors?", "category": "unique_value"},
                "goals": {"question": "What are your top business and marketing goals for this year?", "category": "goals"},
                "current_marketing": {"question": "How are you currently marketing your business? What channels do you use?", "category": "current_marketing"},
                "brand_personality": {"question": "How would you describe your brand's personality and voice?", "category": "brand_personality"},
                "content_preferences": {"question": "What type of content resonates most with your audience?", "category": "content_preferences"},
            }

            # Return the first remaining category's fallback question
            for cat in remaining_categories:
                if cat in fallback_questions:
                    return fallback_questions[cat]

            # Ultimate fallback
            return {"question": "Is there anything else about your business you'd like to share?", "category": "follow_up"}

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
