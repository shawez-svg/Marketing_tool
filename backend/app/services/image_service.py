"""
Image Generation Service
Generates images using OpenAI DALL-E for social media posts
"""

import openai
from typing import Optional
from app.config import settings


class ImageService:
    """Service for generating images using DALL-E"""

    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate_image(
        self,
        prompt: str,
        size: str = "1024x1024",
        quality: str = "standard",
        style: str = "vivid",
    ) -> dict:
        """
        Generate an image using DALL-E 3

        Args:
            prompt: Description of the image to generate
            size: Image size (1024x1024, 1024x1792, 1792x1024)
            quality: Image quality (standard or hd)
            style: Image style (vivid or natural)

        Returns:
            dict with image URL and revised prompt
        """
        try:
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size=size,
                quality=quality,
                style=style,
                n=1,
            )

            return {
                "success": True,
                "image_url": response.data[0].url,
                "revised_prompt": response.data[0].revised_prompt,
            }
        except openai.BadRequestError as e:
            return {
                "success": False,
                "error": f"Image generation failed: {str(e)}",
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Image generation error: {str(e)}",
            }

    async def generate_social_media_image(
        self,
        post_content: str,
        platform: str = "instagram",
        brand_context: Optional[str] = None,
    ) -> dict:
        """
        Generate an image optimized for social media

        Args:
            post_content: The text content of the post
            platform: Target platform (instagram, linkedin, etc.)
            brand_context: Optional brand description for style consistency

        Returns:
            dict with image URL
        """
        # Build a prompt optimized for social media imagery
        platform_hints = {
            "instagram": "Instagram feed post, visually striking, engaging, scroll-stopping",
            "linkedin": "professional, business-appropriate, clean design",
            "twitter": "eye-catching, shareable, clear visual",
            "facebook": "engaging, community-focused, warm colors",
            "tiktok": "trendy, youthful, dynamic",
        }

        platform_style = platform_hints.get(platform.lower(), "visually appealing, professional")

        # Create a prompt that generates a relevant image
        prompt = f"""Create a {platform_style} image for social media.

The image should complement this post content: "{post_content[:200]}"

Requirements:
- No text or words in the image
- Modern, clean aesthetic
- High quality, professional look
- Suitable for {platform} content
- Engaging and visually interesting
{f'- Brand style: {brand_context}' if brand_context else ''}

Create an image that would make someone stop scrolling and engage with this post."""

        # Use square format for Instagram, landscape for others
        if platform.lower() == "instagram":
            size = "1024x1024"
        else:
            size = "1792x1024"

        return await self.generate_image(prompt, size=size)


# Singleton instance
image_service = ImageService()
