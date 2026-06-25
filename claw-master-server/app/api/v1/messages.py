from fastapi import APIRouter

router = APIRouter()


@router.get("/{session_id}")
async def list_messages(session_id: str):
    return {"messages": []}


@router.post("/{session_id}")
async def create_message(session_id: str):
    return {"message": "创建消息接口待实现"}
