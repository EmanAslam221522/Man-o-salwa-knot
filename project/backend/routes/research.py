from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.tavily_service import search_business_reputation

router = APIRouter(prefix="/research")

class VendorResearchRequest(BaseModel):
    vendorName: str
    location: Optional[str] = "Pakistan"

@router.post("/vendor")
async def research_vendor(req: VendorResearchRequest):
    query = f"{req.vendorName} {req.location}"
    reputation = await search_business_reputation(query)
    return reputation
