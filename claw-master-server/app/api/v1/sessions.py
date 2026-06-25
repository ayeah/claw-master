from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_sessions():
    return {"sessions": []}


@router.post("/")
async def create_session():
    return {"message": "创建会话接口待实现"}


@router.get("/{session_id}")
async def get_session(session_id: str):
    return {"session_id": session_id}


@router.put("/{session_id}")
async def update_session(session_id: str):
    return {"message": "更新会话接口待实现"}


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    return {"message": "删除会话接口待实现"}
