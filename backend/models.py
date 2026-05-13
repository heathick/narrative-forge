import json
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from database import Base


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    folder = Column(String(200), nullable=True)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    entities = relationship("Entity", secondary="note_entities", back_populates="notes")
    relations = relationship("Relation", back_populates="source_note")
    contradictions_as_a = relationship(
        "Contradiction", foreign_keys="Contradiction.note_a_id", back_populates="note_a"
    )
    contradictions_as_b = relationship(
        "Contradiction", foreign_keys="Contradiction.note_b_id", back_populates="note_b"
    )


class EntityType:
    CHARACTER = "character"
    LOCATION = "location"
    ITEM = "item"
    EVENT = "event"
    CONCEPT = "concept"

    ALL = [CHARACTER, LOCATION, ITEM, EVENT, CONCEPT]


class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(300), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    image_path = Column(String(500), nullable=True)
    attributes = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    notes = relationship("Note", secondary="note_entities", back_populates="entities")
    relations_as_source = relationship(
        "Relation", foreign_keys="Relation.source_entity_id", back_populates="source_entity"
    )
    relations_as_target = relationship(
        "Relation", foreign_keys="Relation.target_entity_id", back_populates="target_entity"
    )


class NoteEntity(Base):
    __tablename__ = "note_entities"

    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), primary_key=True)


class Relation(Base):
    __tablename__ = "relations"

    id = Column(Integer, primary_key=True, index=True)
    source_entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    target_entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String(200), nullable=False)
    context = Column(Text, nullable=True)
    source_note_id = Column(Integer, ForeignKey("notes.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    source_entity = relationship("Entity", foreign_keys=[source_entity_id], back_populates="relations_as_source")
    target_entity = relationship("Entity", foreign_keys=[target_entity_id], back_populates="relations_as_target")
    source_note = relationship("Note", back_populates="relations")


class Contradiction(Base):
    __tablename__ = "contradictions"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    field = Column(String(200), nullable=False)
    value_a = Column(String(500), nullable=False)
    value_b = Column(String(500), nullable=False)
    note_a_id = Column(Integer, ForeignKey("notes.id", ondelete="SET NULL"), nullable=True)
    note_b_id = Column(Integer, ForeignKey("notes.id", ondelete="SET NULL"), nullable=True)
    resolved = Column(Boolean, default=False)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    entity = relationship("Entity")
    note_a = relationship("Note", foreign_keys=[note_a_id], back_populates="contradictions_as_a")
    note_b = relationship("Note", foreign_keys=[note_b_id], back_populates="contradictions_as_b")
