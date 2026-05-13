import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from models import Entity, Relation
from schemas import EntityCreate, EntityUpdate, EntityOut, EntityWithRelations, RelationOut

router = APIRouter(prefix="/api/entities", tags=["entities"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=list[EntityOut])
def list_entities(
    type: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Entity)
    if type:
        query = query.filter(Entity.type == type)
    if search:
        query = query.filter(Entity.name.ilike(f"%{search}%"))
    return query.order_by(Entity.name).offset(skip).limit(limit).all()


@router.get("/types", response_model=list[str])
def list_entity_types(db: Session = Depends(get_db)):
    types = db.query(Entity.type).distinct().all()
    return [t[0] for t in types]


@router.get("/{entity_id}", response_model=EntityWithRelations)
def get_entity(entity_id: int, db: Session = Depends(get_db)):
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    relations = (
        db.query(Relation)
        .filter(
            (Relation.source_entity_id == entity_id) | (Relation.target_entity_id == entity_id)
        )
        .all()
    )

    relation_outs = []
    for rel in relations:
        r = RelationOut.model_validate(rel)
        r.source_entity_name = rel.source_entity.name
        r.target_entity_name = rel.target_entity.name
        relation_outs.append(r)

    note_ids = [n.id for n in entity.notes]

    return EntityWithRelations(
        id=entity.id,
        name=entity.name,
        type=entity.type,
        description=entity.description,
        image_path=entity.image_path,
        attributes=entity.attributes or {},
        created_at=entity.created_at,
        updated_at=entity.updated_at,
        relations=relation_outs,
        note_ids=note_ids,
    )


@router.post("", response_model=EntityOut)
def create_entity(entity_data: EntityCreate, db: Session = Depends(get_db)):
    entity = Entity(
        name=entity_data.name,
        type=entity_data.type,
        description=entity_data.description,
        attributes=entity_data.attributes or {},
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


@router.put("/{entity_id}", response_model=EntityOut)
def update_entity(entity_id: int, entity_data: EntityUpdate, db: Session = Depends(get_db)):
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    update_data = entity_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entity, key, value)

    db.commit()
    db.refresh(entity)
    return entity


@router.post("/{entity_id}/image", response_model=EntityOut)
async def upload_entity_image(
    entity_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    entity_dir = os.path.join(UPLOAD_DIR, "entities", str(entity_id))
    os.makedirs(entity_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "image.png")[1]
    filename = f"image{ext}"
    filepath = os.path.join(entity_dir, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    entity.image_path = f"/uploads/entities/{entity_id}/{filename}"
    db.commit()
    db.refresh(entity)
    return entity


@router.delete("/{entity_id}")
def delete_entity(entity_id: int, db: Session = Depends(get_db)):
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    db.delete(entity)
    db.commit()
    return {"ok": True}
