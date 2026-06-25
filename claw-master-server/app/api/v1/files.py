from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from ...database import get_db
from ...models.file import File
from ...schemas.file import FileCreate, FileUpdate, FileResponse
from ...core.security import get_current_user

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/", response_model=List[FileResponse])
def list_files(
    path: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(File).filter(File.user_id == current_user["id"])
    if path:
        query = query.filter(File.path.startswith(path))
    files = query.all()
    return files


@router.post("/", response_model=FileResponse)
def create_file(
    file_data: FileCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Check if file already exists
    existing = (
        db.query(File)
        .filter(
            File.user_id == current_user["id"],
            File.path == file_data.path,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="File already exists")

    file = File(
        user_id=current_user["id"],
        name=os.path.basename(file_data.path),
        path=file_data.path,
        type="file",
        content=file_data.content,
    )
    db.add(file)
    db.commit()
    db.refresh(file)
    return file


@router.get("/{file_path:path}", response_model=FileResponse)
def get_file(
    file_path: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    file = (
        db.query(File)
        .filter(File.path == file_path, File.user_id == current_user["id"])
        .first()
    )
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return file


@router.put("/{file_path:path}", response_model=FileResponse)
def update_file(
    file_path: str,
    file_data: FileUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    file = (
        db.query(File)
        .filter(File.path == file_path, File.user_id == current_user["id"])
        .first()
    )
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if file_data.content is not None:
        file.content = file_data.content
    if file_data.metadata is not None:
        file.metadata = file_data.metadata

    db.commit()
    db.refresh(file)
    return file


@router.delete("/{file_path:path}")
def delete_file(
    file_path: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    file = (
        db.query(File)
        .filter(File.path == file_path, File.user_id == current_user["id"])
        .first()
    )
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    db.delete(file)
    db.commit()
    return {"message": "File deleted"}


@router.post("/move")
def move_file(
    source_path: str,
    dest_path: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    file = (
        db.query(File)
        .filter(File.path == source_path, File.user_id == current_user["id"])
        .first()
    )
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    file.path = dest_path
    file.name = os.path.basename(dest_path)
    db.commit()
    return {"message": "File moved"}


@router.post("/copy")
def copy_file(
    source_path: str,
    dest_path: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    file = (
        db.query(File)
        .filter(File.path == source_path, File.user_id == current_user["id"])
        .first()
    )
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    new_file = File(
        user_id=current_user["id"],
        name=os.path.basename(dest_path),
        path=dest_path,
        type=file.type,
        size=file.size,
        mime_type=file.mime_type,
        content=file.content,
        metadata=file.metadata,
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    return new_file