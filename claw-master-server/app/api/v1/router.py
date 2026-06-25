from fastapi import APIRouter

from app.api.v1 import auth, sessions, messages, providers, memory, files, remote, skills

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["会话"])
api_router.include_router(messages.router, prefix="/messages", tags=["消息"])
api_router.include_router(providers.router, prefix="/providers", tags=["模型商"])
api_router.include_router(skills.router, prefix="/skills", tags=["技能"])
api_router.include_router(memory.router, prefix="/memory", tags=["记忆"])
api_router.include_router(files.router, prefix="/files", tags=["文件"])
api_router.include_router(remote.router, prefix="/remote", tags=["远程访问"])
