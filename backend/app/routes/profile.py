"""
Profile Routes

API endpoints for user profile and company information.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict

from app.services.website_service import website_service


router = APIRouter()


class FetchCompanyInfoRequest(BaseModel):
    website_url: str


class SocialMedia(BaseModel):
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None


class CompanyInfoResponse(BaseModel):
    success: bool
    company_name: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    products_services: Optional[List[str]] = None
    target_audience: Optional[str] = None
    unique_value: Optional[str] = None
    company_size: Optional[str] = None
    location: Optional[str] = None
    social_media: Optional[SocialMedia] = None
    error: Optional[str] = None


@router.post("/fetch-company-info", response_model=CompanyInfoResponse)
async def fetch_company_info(request: FetchCompanyInfoRequest):
    """
    Fetch and analyze company information from their website.

    Uses AI to extract relevant business information from the website content.
    """
    try:
        result = await website_service.get_company_info(request.website_url)

        if not result.get("success"):
            return CompanyInfoResponse(
                success=False,
                error=result.get("error", "Failed to fetch company information"),
            )

        company_info = result.get("company_info", {})

        # Parse social media
        social_data = company_info.get("social_media", {})
        social_media = SocialMedia(
            linkedin=social_data.get("linkedin") if social_data.get("linkedin") != "Not found" else None,
            twitter=social_data.get("twitter") if social_data.get("twitter") != "Not found" else None,
            instagram=social_data.get("instagram") if social_data.get("instagram") != "Not found" else None,
            facebook=social_data.get("facebook") if social_data.get("facebook") != "Not found" else None,
        )

        return CompanyInfoResponse(
            success=True,
            company_name=company_info.get("company_name"),
            description=company_info.get("description"),
            industry=company_info.get("industry"),
            products_services=company_info.get("products_services"),
            target_audience=company_info.get("target_audience"),
            unique_value=company_info.get("unique_value"),
            company_size=company_info.get("company_size"),
            location=company_info.get("location"),
            social_media=social_media,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch company information: {str(e)}",
        )
