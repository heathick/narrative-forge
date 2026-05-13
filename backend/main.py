import os
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base, get_db
from sqlalchemy.orm import Session
from routers import notes, entities, graph, contradictions
from services.llm_client import ollama_client

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")

# Track analysis status per note
_analysis_status: dict[int, dict] = {}
_analysis_lock = threading.Lock()


def get_analysis_status(note_id: int) -> dict:
    with _analysis_lock:
        return _analysis_status.get(note_id, {"status": "idle"})


def set_analysis_status(note_id: int, status: str, **kwargs):
    with _analysis_lock:
        _analysis_status[note_id] = {"status": status, **kwargs}


def run_analysis(note_id: int):
    """Run analysis in a background thread."""
    from database import SessionLocal
    from services.note_processor import process_note

    set_analysis_status(note_id, status="processing", stage="extracting_entities")
    db = SessionLocal()
    try:
        from models import Note
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            set_analysis_status(note_id, status="error", error="Note not found")
            return

        set_analysis_status(note_id, status="processing", stage="extracting_entities")
        process_note(note_id, db, status_callback=lambda s: set_analysis_status(note_id, status="processing", stage=s))
        set_analysis_status(note_id, status="done")
    except Exception as e:
        db.rollback()
        set_analysis_status(note_id, status="error", error=str(e))
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="NarrativeForge API",
    description="AI-first tool for writers and RPG masters",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8001", "http://127.0.0.1:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(notes.router)
app.include_router(entities.router)
app.include_router(graph.router)
app.include_router(contradictions.router)


@app.get("/api/health")
def health_check():
    ollama_ok = ollama_client.health_check()
    return {
        "status": "ok",
        "ollama": "connected" if ollama_ok else "disconnected",
        "model": ollama_client.model,
    }


@app.post("/api/notes/{note_id}/analyze")
def analyze_note(note_id: int):
    """Trigger LLM analysis for a specific note (runs in background)."""
    current = get_analysis_status(note_id)
    if current.get("status") == "processing":
        return {"status": "processing", "stage": current.get("stage", ""), "note_id": note_id}

    from models import Note
    from database import SessionLocal
    db = SessionLocal()
    try:
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            return {"status": "error", "error": "Note not found"}
    finally:
        db.close()

    thread = threading.Thread(target=run_analysis, args=(note_id,), daemon=True)
    thread.start()
    return {"status": "started", "note_id": note_id}


@app.get("/api/notes/{note_id}/analyze")
def get_analyze_status(note_id: int):
    """Get the current analysis status for a note."""
    return get_analysis_status(note_id)


@app.get("/api/search")
def global_search(q: str, db: Session = Depends(get_db)):
    """Search across notes, entities, and relations."""
    from models import Note, Entity, Relation

    results = {"notes": [], "entities": [], "relations": []}

    # Search notes
    notes = db.query(Note).filter(
        (Note.title.ilike(f"%{q}%")) | (Note.content.ilike(f"%{q}%"))
    ).limit(10).all()
    for note in notes:
        results["notes"].append({
            "id": note.id,
            "title": note.title,
            "folder": note.folder,
            "snippet": note.content[:200] if note.content else "",
        })

    # Search entities
    entities = db.query(Entity).filter(
        (Entity.name.ilike(f"%{q}%")) | (Entity.description.ilike(f"%{q}%"))
    ).limit(20).all()
    for entity in entities:
        attrs_str = " ".join(str(v) for v in (entity.attributes or {}).values())
        results["entities"].append({
            "id": entity.id,
            "name": entity.name,
            "type": entity.type,
            "description": entity.description or "",
        })

    # Search relations
    entity_ids = {e.id for e in entities}
    if entity_ids:
        relations = db.query(Relation).filter(
            (Relation.relation_type.ilike(f"%{q}%")) |
            (Relation.context.ilike(f"%{q}%")) |
            (Relation.source_entity_id.in_(entity_ids)) |
            (Relation.target_entity_id.in_(entity_ids))
        ).limit(20).all()
    else:
        relations = db.query(Relation).filter(
            (Relation.relation_type.ilike(f"%{q}%")) | (Relation.context.ilike(f"%{q}%"))
        ).limit(20).all()

    for rel in relations:
        results["relations"].append({
            "id": rel.id,
            "source_entity_id": rel.source_entity_id,
            "source_entity_name": rel.source_entity.name if rel.source_entity else "",
            "target_entity_id": rel.target_entity_id,
            "target_entity_name": rel.target_entity.name if rel.target_entity else "",
            "relation_type": rel.relation_type,
            "context": rel.context or "",
        })

    return results


# --- Relation CRUD ---
@app.delete("/api/relations/{relation_id}")
def delete_relation(relation_id: int, db: Session = Depends(get_db)):
    from models import Relation
    rel = db.query(Relation).filter(Relation.id == relation_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relation not found")
    db.delete(rel)
    db.commit()
    return {"ok": True}


@app.put("/api/relations/{relation_id}")
def update_relation(relation_id: int, data: dict, db: Session = Depends(get_db)):
    from models import Relation
    rel = db.query(Relation).filter(Relation.id == relation_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relation not found")
    if "relation_type" in data:
        rel.relation_type = data["relation_type"]
    if "context" in data:
        rel.context = data["context"]
    db.commit()
    db.refresh(rel)
    return {
        "id": rel.id,
        "source_entity_id": rel.source_entity_id,
        "target_entity_id": rel.target_entity_id,
        "relation_type": rel.relation_type,
        "context": rel.context,
    }


@app.post("/api/relations")
def create_relation(data: dict, db: Session = Depends(get_db)):
    from models import Relation, Entity
    source = db.query(Entity).filter(Entity.id == data.get("source_entity_id")).first()
    target = db.query(Entity).filter(Entity.id == data.get("target_entity_id")).first()
    if not source or not target:
        raise HTTPException(status_code=400, detail="Source or target entity not found")
    rel = Relation(
        source_entity_id=source.id,
        target_entity_id=target.id,
        relation_type=data.get("relation_type", "related_to"),
        context=data.get("context"),
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)
    return {"id": rel.id, "relation_type": rel.relation_type}


@app.post("/api/entities/merge")
def merge_entities(data: dict, db: Session = Depends(get_db)):
    from models import Entity, Relation, NoteEntity, Contradiction
    source_id = data.get("source_entity_id")
    target_id = data.get("target_entity_id")
    if not source_id or not target_id:
        raise HTTPException(status_code=400, detail="Both entity IDs required")

    source = db.query(Entity).filter(Entity.id == source_id).first()
    target = db.query(Entity).filter(Entity.id == target_id).first()
    if not source or not target:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Reassign all relations from source to target
    db.query(Relation).filter(Relation.source_entity_id == source_id).update(
        {"source_entity_id": target_id}
    )
    db.query(Relation).filter(Relation.target_entity_id == source_id).update(
        {"target_entity_id": target_id}
    )

    # Reassign note links
    db.query(NoteEntity).filter(NoteEntity.entity_id == source_id).update(
        {"entity_id": target_id}
    )

    # Reassign contradictions
    db.query(Contradiction).filter(Contradiction.entity_id == source_id).update(
        {"entity_id": target_id}
    )

    # Merge attributes
    merged_attrs = target.attributes or {}
    for key, value in (source.attributes or {}).items():
        if key not in merged_attrs:
            merged_attrs[key] = value
    target.attributes = merged_attrs

    # Delete source entity
    db.delete(source)
    db.commit()
    return {"ok": True, "merged_into": target_id}
