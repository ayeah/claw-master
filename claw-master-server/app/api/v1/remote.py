from fastapi import APIRouter

router = APIRouter()


@router.post("/task")
async def create_remote_task():
    return {"message": "远程任务接口待实现"}


@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    return {"task_id": task_id, "status": "pending"}
