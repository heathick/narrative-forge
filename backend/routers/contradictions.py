from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Contradiction
from schemas import ContradictionOut, ContradictionResolve

router = APIRouter(prefix="/api/contradictions", tags=["contradictions"])


@router.get("", response_model=list[ContradictionOut])
def list_contradictions(
    resolved: bool | None = None,
    entity_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Contradiction)
    if resolved is not None:
        query = query.filter(Contradiction.resolved == resolved)
    if entity_id:
        query = query.filter(Contradiction.entity_id == entity_id)

    contradictions = query.order_by(Contradiction.created_at.desc()).all()
    result = []
    for c in contradictions:
        out = ContradictionOut.model_validate(c)
        out.entity_name = c.entity.name if c.entity else None
        out.note_a_title = c.note_a.title if c.note_a else None
        out.note_b_title = c.note_b.title if c.note_b else None
        result.append(out)
    return result


@router.get("/{contradiction_id}", response_model=ContradictionOut)
def get_contradiction(contradiction_id: int, db: Session = Depends(get_db)):
    c = db.query(Contradiction).filter(Contradiction.id == contradiction_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contradiction not found")
    out = ContradictionOut.model_validate(c)
    out.entity_name = c.entity.name if c.entity else None
    out.note_a_title = c.note_a.title if c.note_a else None
    out.note_b_title = c.note_b.title if c.note_b else None
    return out


@router.put("/{contradiction_id}", response_model=ContradictionOut)
def resolve_contradiction(
    contradiction_id: int, data: ContradictionResolve, db: Session = Depends(get_db)
):
    c = db.query(Contradiction).filter(Contradiction.id == contradiction_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contradiction not found")
    c.resolved = data.resolved
    db.commit()
    db.refresh(c)
    out = ContradictionOut.model_validate(c)
    out.entity_name = c.entity.name if c.entity else None
    out.note_a_title = c.note_a.title if c.note_a else None
    out.note_b_title = c.note_b.title if c.note_b else None
    return out
