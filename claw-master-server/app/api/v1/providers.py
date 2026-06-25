from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_providers():
    return {"providers": []}


@router.post("/sync")
async def sync_providers():
    return {"message": "同步模型商配置接口待实现"}
