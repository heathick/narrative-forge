from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Note, NoteEntity, Entity, Relation, Contradiction
from schemas import NoteCreate, NoteUpdate, NoteOut, EntityOut

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=list[NoteOut])
def list_notes(
    folder: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Note)
    if folder:
        query = query.filter(Note.folder == folder)
    if search:
        query = query.filter(
            (Note.title.ilike(f"%{search}%")) | (Note.content.ilike(f"%{search}%"))
        )
    notes = query.order_by(Note.updated_at.desc()).offset(skip).limit(limit).all()
    result = []
    for note in notes:
        note_dict = NoteOut.model_validate(note).model_dump()
        note_dict["entity_count"] = len(note.entities)
        result.append(NoteOut(**note_dict))
    return result


@router.get("/folders", response_model=list[str])
def list_folders(db: Session = Depends(get_db)):
    folders = db.query(Note.folder).distinct().filter(Note.folder.isnot(None)).all()
    return [f[0] for f in folders]


@router.get("/{note_id}", response_model=NoteOut)
def get_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note_dict = NoteOut.model_validate(note).model_dump()
    note_dict["entity_count"] = len(note.entities)
    return NoteOut(**note_dict)


@router.get("/{note_id}/entities", response_model=list[EntityOut])
def get_note_entities(note_id: int, db: Session = Depends(get_db)):
    """Get all entities linked to this note, with info about how many other notes reference them."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note.entities


@router.post("", response_model=NoteOut)
def create_note(note_data: NoteCreate, db: Session = Depends(get_db)):
    note = Note(
        title=note_data.title,
        content=note_data.content,
        folder=note_data.folder,
        tags=note_data.tags or [],
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    note_dict = NoteOut.model_validate(note).model_dump()
    note_dict["entity_count"] = 0
    return NoteOut(**note_dict)


@router.put("/{note_id}", response_model=NoteOut)
def update_note(note_id: int, note_data: NoteUpdate, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    update_data = note_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(note, key, value)

    db.commit()
    db.refresh(note)
    note_dict = NoteOut.model_validate(note).model_dump()
    note_dict["entity_count"] = len(note.entities)
    return NoteOut(**note_dict)


@router.delete("/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Find entities linked only to this note (orphans)
    linked_entities = list(note.entities)
    orphan_entity_ids = []
    for entity in linked_entities:
        note_count = db.query(NoteEntity).filter(NoteEntity.entity_id == entity.id).count()
        if note_count <= 1:
            orphan_entity_ids.append(entity.id)

    # Delete contradictions linked to this note
    db.query(Contradiction).filter(
        (Contradiction.note_a_id == note_id) | (Contradiction.note_b_id == note_id)
    ).delete(synchronize_session=False)

    # Delete relations sourced from this note
    db.query(Relation).filter(Relation.source_note_id == note_id).delete(synchronize_session=False)

    # Delete the note (cascades to NoteEntity)
    db.delete(note)

    # Delete orphan entities and their remaining relations
    for entity_id in orphan_entity_ids:
        db.query(Relation).filter(
            (Relation.source_entity_id == entity_id) | (Relation.target_entity_id == entity_id)
        ).delete(synchronize_session=False)
        db.query(Contradiction).filter(Contradiction.entity_id == entity_id).delete(synchronize_session=False)
        db.query(Entity).filter(Entity.id == entity_id).delete(synchronize_session=False)

    db.commit()
    return {
        "ok": True,
        "deleted_orphan_entities": len(orphan_entity_ids),
        "orphan_entity_ids": orphan_entity_ids,
    }
