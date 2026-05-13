import json
import logging
from difflib import SequenceMatcher
from typing import Any

from sqlalchemy.orm import Session

from models import Note, Entity, Relation, NoteEntity, Contradiction
from services.llm_client import ollama_client

logger = logging.getLogger(__name__)


def process_note(note_id: int, db: Session, status_callback=None):
    """Full pipeline: NER extraction → merge entities → build relations → check contradictions."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        logger.error(f"Note {note_id} not found")
        return

    logger.info(f"Processing note {note_id}: {note.title}")

    # Step 1: NER extraction
    if status_callback:
        status_callback("extracting_entities")
    ner_result = ollama_client.extract_ner(note.content)
    if not ner_result:
        logger.warning(f"NER extraction returned no result for note {note_id}")
        return

    extracted_entities = ner_result.get("entities", [])
    extracted_relations = ner_result.get("relations", [])

    logger.info(
        f"Extracted {len(extracted_entities)} entities and {len(extracted_relations)} relations"
    )

    # Step 2: Merge entities into DB (with fuzzy matching)
    entity_name_map = {}  # name -> Entity DB object
    all_existing_entities = db.query(Entity).all()

    for ent_data in extracted_entities:
        name = ent_data.get("name", "").strip()
        ent_type = ent_data.get("type", "concept").strip()
        attributes = ent_data.get("attributes", {})

        if not name:
            continue

        # Exact match first (case-insensitive)
        existing = db.query(Entity).filter(Entity.name.ilike(name)).first()

        # Fuzzy match if no exact match
        if not existing and all_existing_entities:
            best_match = None
            best_score = 0.0
            for e in all_existing_entities:
                score = SequenceMatcher(None, name.lower(), e.name.lower()).ratio()
                if score > best_score:
                    best_score = score
                    best_match = e
            if best_score >= 0.75 and best_match:
                logger.info(f"Fuzzy match: '{name}' -> '{best_match.name}' (score: {best_score:.2f})")
                existing = best_match

        if existing:
            merged_attrs = existing.attributes or {}
            for key, value in attributes.items():
                if key not in merged_attrs:
                    merged_attrs[key] = value
            existing.attributes = merged_attrs
            entity_name_map[name] = existing
        else:
            new_entity = Entity(
                name=name,
                type=ent_type,
                attributes=attributes,
            )
            db.add(new_entity)
            db.flush()
            entity_name_map[name] = new_entity
            all_existing_entities.append(new_entity)

    # Link note to all found entities
    for name, entity in entity_name_map.items():
        link = (
            db.query(NoteEntity)
            .filter(NoteEntity.note_id == note_id, NoteEntity.entity_id == entity.id)
            .first()
        )
        if not link:
            db.add(NoteEntity(note_id=note_id, entity_id=entity.id))

    db.flush()

    # Step 3: Build relations and check for relationship conflicts
    if status_callback:
        status_callback("building_relations")
    for rel_data in extracted_relations:
        source_name = rel_data.get("source", "").strip()
        target_name = rel_data.get("target", "").strip()
        rel_type = rel_data.get("type", "").strip()
        context = rel_data.get("context", "")

        if not source_name or not target_name or not rel_type:
            continue

        source_entity = entity_name_map.get(source_name)
        target_entity = entity_name_map.get(target_name)

        if not source_entity or not target_entity:
            continue

        # Check for conflicting relations between same entity pair
        existing_rels = (
            db.query(Relation)
            .filter(
                Relation.source_entity_id == source_entity.id,
                Relation.target_entity_id == target_entity.id,
            )
            .all()
        )

        if existing_rels:
            # Check via LLM if new relation conflicts with existing ones
            existing_desc = "\n".join(
                f"- {r.relation_type} (context: {r.context or 'N/A'})"
                for r in existing_rels
            )
            new_desc = f"- {rel_type} (context: {context or 'N/A'})"

            contradiction_result = ollama_client.check_relation_contradictions(
                entity_name=f"{source_entity.name} → {target_entity.name}",
                existing_relations=existing_desc,
                new_relations=new_desc,
            )

            if contradiction_result and contradiction_result.get("contradictions"):
                for contra in contradiction_result["contradictions"]:
                    # Find the existing relation that conflicts
                    conflicting_rel = existing_rels[0]
                    contradiction = Contradiction(
                        entity_id=source_entity.id,
                        field=f"relation_with_{target_entity.name}",
                        value_a=contra.get("old_value", existing_desc),
                        value_b=contra.get("new_value", new_desc),
                        note_a_id=conflicting_rel.source_note_id,
                        note_b_id=note_id,
                        explanation=contra.get("explanation", ""),
                    )
                    db.add(contradiction)

        # Check reverse direction too (B→A might exist)
        reverse_rels = (
            db.query(Relation)
            .filter(
                Relation.source_entity_id == target_entity.id,
                Relation.target_entity_id == source_entity.id,
            )
            .all()
        )
        if reverse_rels:
            existing_desc = "\n".join(
                f"- {r.relation_type} (context: {r.context or 'N/A'})"
                for r in reverse_rels
            )
            new_desc = f"- {rel_type} (context: {context or 'N/A'})"

            contradiction_result = ollama_client.check_relation_contradictions(
                entity_name=f"{target_entity.name} → {source_entity.name}",
                existing_relations=existing_desc,
                new_relations=new_desc,
            )

            if contradiction_result and contradiction_result.get("contradictions"):
                for contra in contradiction_result["contradictions"]:
                    conflicting_rel = reverse_rels[0]
                    contradiction = Contradiction(
                        entity_id=target_entity.id,
                        field=f"relation_with_{source_entity.name}",
                        value_a=contra.get("old_value", existing_desc),
                        value_b=contra.get("new_value", new_desc),
                        note_a_id=conflicting_rel.source_note_id,
                        note_b_id=note_id,
                        explanation=contra.get("explanation", ""),
                    )
                    db.add(contradiction)

        # Add the new relation (even if it conflicts — user decides)
        existing_rel = (
            db.query(Relation)
            .filter(
                Relation.source_entity_id == source_entity.id,
                Relation.target_entity_id == target_entity.id,
                Relation.relation_type == rel_type,
            )
            .first()
        )
        if not existing_rel:
            relation = Relation(
                source_entity_id=source_entity.id,
                target_entity_id=target_entity.id,
                relation_type=rel_type,
                context=context,
                source_note_id=note_id,
            )
            db.add(relation)

    db.flush()

    # Step 4: Check attribute contradictions for each updated entity
    if status_callback:
        status_callback("checking_contradictions")
    for name, entity in entity_name_map.items():
        new_attrs = {}
        for ent_data in extracted_entities:
            if ent_data.get("name", "").strip().lower() == name.lower():
                new_attrs = ent_data.get("attributes", {})
                break

        if not new_attrs:
            continue

        existing_attrs = entity.attributes or {}
        # Only check if there are overlapping keys with different values
        has_potential_conflict = any(
            key in existing_attrs and existing_attrs[key] != value
            for key, value in new_attrs.items()
        )

        if has_potential_conflict:
            contradiction_result = ollama_client.check_contradictions(
                entity_name=entity.name,
                entity_type=entity.type,
                existing_attributes=existing_attrs,
                new_text=note.content,
                new_attributes=new_attrs,
            )

            if contradiction_result and contradiction_result.get("contradictions"):
                for contra in contradiction_result["contradictions"]:
                    contradiction = Contradiction(
                        entity_id=entity.id,
                        field=contra.get("field", "unknown"),
                        value_a=contra.get("old_value", ""),
                        value_b=contra.get("new_value", ""),
                        note_a_id=None,
                        note_b_id=note_id,
                        explanation=contra.get("explanation", ""),
                    )
                    db.add(contradiction)

    # Step 5: Update entity summaries
    if status_callback:
        status_callback("generating_summaries")
    for name, entity in entity_name_map.items():
        all_mentions = _collect_entity_mentions(entity, db)
        if all_mentions:
            summary = ollama_client.generate_summary(
                entity_name=entity.name,
                entity_type=entity.type,
                all_mentions=all_mentions,
            )
            if summary:
                entity.description = summary

    db.commit()
    logger.info(f"Note {note_id} processing complete")


def _collect_entity_mentions(entity: Entity, db: Session) -> str:
    """Collect all text snippets mentioning this entity."""
    notes = db.query(Note).join(NoteEntity).filter(NoteEntity.entity_id == entity.id).all()
    mentions = []
    for note in notes:
        mentions.append(f"[{note.title}]:\n{note.content}")
    return "\n\n---\n\n".join(mentions)
