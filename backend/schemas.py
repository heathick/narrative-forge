from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# --- Notes ---
class NoteCreate(BaseModel):
    title: str
    content: str
    folder: Optional[str] = None
    tags: Optional[list[str]] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    folder: Optional[str] = None
    tags: Optional[list[str]] = None


class NoteOut(BaseModel):
    id: int
    title: str
    content: str
    folder: Optional[str]
    tags: list[str]
    created_at: datetime
    updated_at: datetime
    entity_count: int = 0

    class Config:
        from_attributes = True


# --- Entities ---
class EntityCreate(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    attributes: Optional[dict] = None


class EntityUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    attributes: Optional[dict] = None


class EntityOut(BaseModel):
    id: int
    name: str
    type: str
    description: Optional[str]
    image_path: Optional[str]
    attributes: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EntityWithRelations(EntityOut):
    relations: list["RelationOut"] = []
    note_ids: list[int] = []


# --- Relations ---
class RelationCreate(BaseModel):
    source_entity_id: int
    target_entity_id: int
    relation_type: str
    context: Optional[str] = None
    source_note_id: Optional[int] = None


class RelationOut(BaseModel):
    id: int
    source_entity_id: int
    target_entity_id: int
    relation_type: str
    context: Optional[str]
    source_note_id: Optional[int]
    source_entity_name: Optional[str] = None
    target_entity_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Contradictions ---
class ContradictionOut(BaseModel):
    id: int
    entity_id: int
    field: str
    value_a: str
    value_b: str
    note_a_id: Optional[int]
    note_b_id: Optional[int]
    resolved: bool
    explanation: Optional[str]
    entity_name: Optional[str] = None
    note_a_title: Optional[str] = None
    note_b_title: Optional[str] = None

    class Config:
        from_attributes = True


class ContradictionResolve(BaseModel):
    resolved: bool


# --- Graph ---
class GraphNode(BaseModel):
    id: int
    name: str
    type: str
    image_path: Optional[str] = None


class GraphEdge(BaseModel):
    id: int
    source: int
    target: int
    relation_type: str
    context: Optional[str] = None


class GraphData(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


# --- LLM Analysis ---
class NERResult(BaseModel):
    entities: list[dict]
    relations: list[dict]


class AnalysisStatus(BaseModel):
    note_id: int
    status: str  # "pending", "processing", "done", "error"
    entities_found: int = 0
    relations_found: int = 0
    contradictions_found: int = 0
    error: Optional[str] = None


# --- Global Search ---
class SearchResult(BaseModel):
    notes: list[dict]
    entities: list[dict]
    relations: list[dict]


# --- Fuzzy Match ---
class FuzzyMatchResult(BaseModel):
    new_name: str
    new_type: str
    matched_entity_id: Optional[int] = None
    matched_entity_name: Optional[str] = None
    similarity: float = 0.0


class EntityMergeRequest(BaseModel):
    source_entity_id: int
    target_entity_id: int
