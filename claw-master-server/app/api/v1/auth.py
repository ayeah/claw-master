from fastapi import APIRouter

router = APIRouter()


@router.post("/register")
async def register():
    return {"message": "注册接口待实现"}


@router.post("/login")
async def login():
    return {"message": "登录接口待实现"}


@router.post("/device/register")
async def register_device():
    return {"message": "设备注册接口待实现"}
