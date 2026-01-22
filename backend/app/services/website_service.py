"""
Website Analysis Service
Fetches and analyzes company website information using AI
"""

import httpx
import openai
from typing import Dict, Any, Optional
from bs4 import BeautifulSoup
import re
from app.config import settings


class WebsiteService:
    """Service for fetching and analyzing company websites"""

    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    async def fetch_website_content(self, url: str) -> Dict[str, Any]:
        """
        Fetch website content and extract text

        Args:
            url: Website URL to fetch

        Returns:
            dict with website content
        """
        # Ensure URL has protocol
        if not url.startswith("http://") and not url.startswith("https://"):
            url = "https://" + url

        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
                response = await client.get(url, headers=headers)
                response.raise_for_status()

                # Parse HTML
                soup = BeautifulSoup(response.text, "html.parser")

                # Remove script and style elements
                for script in soup(["script", "style", "nav", "footer", "header"]):
                    script.decompose()

                # Get text content
                text = soup.get_text(separator=" ", strip=True)

                # Clean up whitespace
                text = re.sub(r"\s+", " ", text)

                # Get meta description
                meta_desc = ""
                meta_tag = soup.find("meta", attrs={"name": "description"})
                if meta_tag and meta_tag.get("content"):
                    meta_desc = meta_tag["content"]

                # Get title
                title = soup.title.string if soup.title else ""

                # Get og:description or og:title
                og_desc = ""
                og_tag = soup.find("meta", property="og:description")
                if og_tag and og_tag.get("content"):
                    og_desc = og_tag["content"]

                og_title = ""
                og_title_tag = soup.find("meta", property="og:title")
                if og_title_tag and og_title_tag.get("content"):
                    og_title = og_title_tag["content"]

                return {
                    "success": True,
                    "url": url,
                    "title": title or og_title,
                    "meta_description": meta_desc or og_desc,
                    "content": text[:8000],  # Limit content length
                }

        except httpx.HTTPError as e:
            return {
                "success": False,
                "url": url,
                "error": f"Failed to fetch website: {str(e)}",
            }
        except Exception as e:
            return {
                "success": False,
                "url": url,
                "error": f"Error processing website: {str(e)}",
            }

    async def analyze_company_info(self, website_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use AI to analyze website content and extract company information

        Args:
            website_data: Dict containing website content

        Returns:
            dict with extracted company information
        """
        if not website_data.get("success"):
            return {
                "success": False,
                "error": website_data.get("error", "Failed to fetch website"),
            }

        prompt = f"""Analyze this company website content and extract key business information.

Website Title: {website_data.get('title', 'N/A')}
Meta Description: {website_data.get('meta_description', 'N/A')}
Website Content:
{website_data.get('content', '')[:6000]}

Based on this website content, extract and provide the following information in JSON format:
{{
    "company_name": "The company name",
    "description": "A 2-3 sentence description of what the company does",
    "industry": "The primary industry (e.g., Technology, Healthcare, E-commerce, Marketing, Finance, Education, etc.)",
    "products_services": ["List of main products or services offered"],
    "target_audience": "Who their target customers/audience appear to be",
    "unique_value": "What makes this company unique or their main value proposition",
    "company_size": "Estimated size if mentioned (startup, small business, enterprise, etc.) or 'Unknown'",
    "location": "Company location if mentioned, or 'Not specified'",
    "social_media": {{
        "linkedin": "LinkedIn URL if found",
        "twitter": "Twitter/X URL if found",
        "instagram": "Instagram URL if found",
        "facebook": "Facebook URL if found"
    }}
}}

If any information is not available from the website content, make a reasonable inference based on context or use "Not specified".
Respond ONLY with the JSON object, no additional text."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert business analyst. Extract company information from website content and return it as valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=1000,
            )

            result_text = response.choices[0].message.content

            # Parse JSON response
            import json

            # Handle potential markdown code blocks
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0]

            company_info = json.loads(result_text.strip())

            return {
                "success": True,
                "company_info": company_info,
            }

        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"Failed to parse AI response: {str(e)}",
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"AI analysis failed: {str(e)}",
            }

    async def get_company_info(self, url: str) -> Dict[str, Any]:
        """
        Fetch website and analyze company information

        Args:
            url: Company website URL

        Returns:
            dict with company information
        """
        # Fetch website content
        website_data = await self.fetch_website_content(url)

        if not website_data.get("success"):
            return website_data

        # Analyze with AI
        analysis = await self.analyze_company_info(website_data)

        if not analysis.get("success"):
            return analysis

        return {
            "success": True,
            "url": url,
            "company_info": analysis["company_info"],
        }


# Singleton instance
website_service = WebsiteService()
