from fastapi import APIRouter
from pydantic import BaseModel
import time
import uuid
from services.redis_client import push_to_workspace, get_workspace_messages

router = APIRouter(prefix="/workspace/messages")

class WorkspaceMessageRequest(BaseModel):
    foodPostId: str
    senderId: str
    senderName: str
    senderRole: str
    content: str

@router.post("")
async def send_workspace_message(req: WorkspaceMessageRequest):
    message = {
        "id": str(uuid.uuid4()),
        "foodPostId": req.foodPostId,
        "senderId": req.senderId,
        "senderName": req.senderName,
        "senderRole": req.senderRole,
        "content": req.content,
        "timestamp": int(time.time() * 1000)
    }
    
    push_to_workspace(req.foodPostId, message)
    return message

@router.get("/{food_post_id}")
async def get_workspace_msgs(food_post_id: str):
    messages = get_workspace_messages(food_post_id)
    return {"messages": messages}
