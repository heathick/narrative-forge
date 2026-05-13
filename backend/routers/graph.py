from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Entity, Relation
from schemas import GraphData, GraphNode, GraphEdge

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("", response_model=GraphData)
def get_graph(
    entity_type: list[str] | None = Query(None),
    relation_type: list[str] | None = Query(None),
    note_id: int | None = None,
    db: Session = Depends(get_db),
):
    entities_query = db.query(Entity)
    if entity_type:
        entities_query = entities_query.filter(Entity.type.in_(entity_type))
    entities = entities_query.all()

    if not entities:
        return GraphData(nodes=[], edges=[])

    entity_ids = {e.id for e in entities}

    relations_query = db.query(Relation).filter(
        Relation.source_entity_id.in_(entity_ids),
        Relation.target_entity_id.in_(entity_ids),
    )
    if relation_type:
        relations_query = relations_query.filter(Relation.relation_type.in_(relation_type))
    if note_id:
        relations_query = relations_query.filter(Relation.source_note_id == note_id)

    relations = relations_query.all()

    nodes = [
        GraphNode(id=e.id, name=e.name, type=e.type, image_path=e.image_path)
        for e in entities
    ]
    edges = [
        GraphEdge(
            id=r.id,
            source=r.source_entity_id,
            target=r.target_entity_id,
            relation_type=r.relation_type,
            context=r.context,
        )
        for r in relations
    ]

    # Filter nodes to only those connected by edges if note_id filter is applied
    if note_id:
        connected_ids = set()
        for edge in edges:
            connected_ids.add(edge.source)
            connected_ids.add(edge.target)
        nodes = [n for n in nodes if n.id in connected_ids]

    return GraphData(nodes=nodes, edges=edges)


@router.get("/relation-types", response_model=list[str])
def get_relation_types(db: Session = Depends(get_db)):
    types = db.query(Relation.relation_type).distinct().all()
    return [t[0] for t in types]
