"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Save,
  X,
  Users,
  MapPin,
  Sword,
  Calendar,
  Lightbulb,
  Trash2,
  Pencil,
  Plus,
} from "lucide-react";

const typeIcons: Record<string, any> = {
  character: Users,
  location: MapPin,
  item: Sword,
  event: Calendar,
  concept: Lightbulb,
};

export default function EntityDetailPage() {
  const params = useParams();
  const entityId = params.id as string;
  const [entity, setEntity] = useState<any>(null);
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAttrs, setEditingAttrs] = useState(false);
  const [attrEdits, setAttrEdits] = useState<Record<string, string>>({});
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");
  const [editingRel, setEditingRel] = useState<number | null>(null);
  const [editRelType, setEditRelType] = useState("");
  const [showAddRel, setShowAddRel] = useState(false);
  const [addRelTarget, setAddRelTarget] = useState("");
  const [addRelType, setAddRelType] = useState("");

  useEffect(() => {
    loadEntity();
    loadAllEntities();
  }, [entityId]);

  const loadEntity = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/entities/${entityId}`);
      const data = await res.json();
      setEntity(data);
      setAttrEdits(data.attributes || {});
    } catch (err) {
      console.error("Failed to load entity", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllEntities = async () => {
    try {
      const res = await fetch("/api/entities?limit=500");
      const data = await res.json();
      setAllEntities(Array.isArray(data) ? data.filter((e: any) => String(e.id) !== entityId) : []);
    } catch {}
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/entities/${entityId}/image`, { method: "POST", body: formData });
    loadEntity();
  };

  const saveAttributes = async () => {
    await fetch(`/api/entities/${entityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attributes: attrEdits }),
    });
    setEditingAttrs(false);
    loadEntity();
  };

  const addAttribute = () => {
    if (newAttrKey && newAttrValue) {
      setAttrEdits({ ...attrEdits, [newAttrKey]: newAttrValue });
      setNewAttrKey("");
      setNewAttrValue("");
    }
  };

  const removeAttribute = (key: string) => {
    const updated = { ...attrEdits };
    delete updated[key];
    setAttrEdits(updated);
  };

  // --- Relation CRUD ---
  const deleteRelation = async (relId: number) => {
    if (!confirm("Delete this relation?")) return;
    await fetch(`/api/relations/${relId}`, { method: "DELETE" });
    loadEntity();
  };

  const startEditRel = (rel: any) => {
    setEditingRel(rel.id);
    setEditRelType(rel.relation_type);
  };

  const saveEditRel = async (relId: number) => {
    await fetch(`/api/relations/${relId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relation_type: editRelType }),
    });
    setEditingRel(null);
    loadEntity();
  };

  const addRelation = async () => {
    if (!addRelTarget || !addRelType) return;
    await fetch("/api/relations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_entity_id: parseInt(entityId),
        target_entity_id: parseInt(addRelTarget),
        relation_type: addRelType,
      }),
    });
    setShowAddRel(false);
    setAddRelTarget("");
    setAddRelType("");
    loadEntity();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
    );
  }

  if (!entity) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">Entity not found</div>
    );
  }

  const Icon = typeIcons[entity.type] || Lightbulb;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href="/entities"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6"
      >
        <ArrowLeft size={16} /> Back to Entities
      </Link>

      {/* Header */}
      <div className="bg-bg-secondary rounded-xl border border-white/5 p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="relative group shrink-0">
            {entity.image_path ? (
              <img src={entity.image_path} alt={entity.name} className="w-32 h-32 rounded-xl object-cover" />
            ) : (
              <div className="w-32 h-32 rounded-xl bg-bg-tertiary flex items-center justify-center">
                <Icon size={48} className="text-gray-600" />
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <div className="text-center">
                <Upload size={20} className="text-white mx-auto mb-1" />
                <span className="text-xs text-white">Upload</span>
              </div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{entity.name}</h1>
              <span className="px-2 py-1 rounded text-xs bg-white/5 text-gray-400 capitalize">{entity.type}</span>
            </div>
            {entity.description && (
              <p className="text-gray-300 text-sm leading-relaxed">{entity.description}</p>
            )}
            <div className="text-xs text-gray-500 mt-3">
              Mentioned in {entity.note_ids?.length || 0} notes
            </div>
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div className="bg-bg-secondary rounded-xl border border-white/5 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Attributes</h2>
          {editingAttrs ? (
            <button onClick={saveAttributes} className="flex items-center gap-2 px-3 py-1.5 bg-accent-green/20 text-accent-green rounded-lg text-sm hover:bg-accent-green/30">
              <Save size={14} /> Save
            </button>
          ) : (
            <button onClick={() => setEditingAttrs(true)} className="px-3 py-1.5 text-gray-400 hover:text-white text-sm">Edit</button>
          )}
        </div>

        {Object.keys(attrEdits).length === 0 && !editingAttrs ? (
          <p className="text-gray-500 text-sm">No attributes yet. Click Edit to add some.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(attrEdits).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-bg-tertiary">
                <span className="text-gray-400 text-sm min-w-[120px]">{key}</span>
                {editingAttrs ? (
                  <input
                    type="text"
                    value={String(value)}
                    onChange={(e) => setAttrEdits({ ...attrEdits, [key]: e.target.value })}
                    className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                  />
                ) : (
                  <span className="text-white text-sm">{String(value)}</span>
                )}
                {editingAttrs && (
                  <button onClick={() => removeAttribute(key)} className="text-gray-500 hover:text-accent-red">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {editingAttrs && (
              <div className="flex items-center gap-3 mt-3">
                <input
                  type="text" placeholder="Attribute name" value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                  className="w-40 bg-bg-tertiary border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
                />
                <input
                  type="text" placeholder="Value" value={newAttrValue}
                  onChange={(e) => setNewAttrValue(e.target.value)}
                  className="flex-1 bg-bg-tertiary border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
                />
                <button onClick={addAttribute} className="px-3 py-1.5 bg-accent-blue/20 text-accent-blue rounded text-sm hover:bg-accent-blue/30">Add</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Relations */}
      <div className="bg-bg-secondary rounded-xl border border-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Relations</h2>
          <button
            onClick={() => setShowAddRel(!showAddRel)}
            className="flex items-center gap-1 px-3 py-1.5 bg-accent-blue/20 text-accent-blue rounded-lg text-sm hover:bg-accent-blue/30"
          >
            <Plus size={14} /> Add Relation
          </button>
        </div>

        {/* Add relation form */}
        {showAddRel && (
          <div className="mb-4 p-3 rounded-lg bg-bg-tertiary space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-white">{entity.name}</span>
              <span>→</span>
              <select
                value={addRelTarget}
                onChange={(e) => setAddRelTarget(e.target.value)}
                className="bg-bg-secondary border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-accent-blue"
              >
                <option value="">Select entity...</option>
                {allEntities.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text" placeholder="Relation type (e.g., loves, enemy_of, lives_in...)"
                value={addRelType}
                onChange={(e) => setAddRelType(e.target.value)}
                className="flex-1 bg-bg-secondary border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
              />
              <button onClick={addRelation} className="px-3 py-1.5 bg-accent-green/20 text-accent-green rounded text-sm hover:bg-accent-green/30">Add</button>
              <button onClick={() => setShowAddRel(false)} className="px-3 py-1.5 text-gray-400 hover:text-white text-sm">Cancel</button>
            </div>
          </div>
        )}

        {entity.relations?.length === 0 && !showAddRel ? (
          <p className="text-gray-500 text-sm">No relations yet. Analyze notes or add one manually.</p>
        ) : (
          <div className="space-y-2">
            {entity.relations?.map((rel: any) => {
              const isSource = rel.source_entity_id === parseInt(entityId);
              const otherName = isSource ? rel.target_entity_name : rel.source_entity_name;
              const otherId = isSource ? rel.target_entity_id : rel.source_entity_id;
              return (
                <div key={rel.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-bg-tertiary group">
                  <span className="text-white text-sm">
                    {isSource ? entity.name : (
                      <Link href={`/entities/${otherId}`} className="text-accent-blue hover:underline">{otherName}</Link>
                    )}
                  </span>
                  <span className="text-gray-500 text-xs">{isSource ? "→" : "←"}</span>

                  {editingRel === rel.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text" value={editRelType}
                        onChange={(e) => setEditRelType(e.target.value)}
                        className="flex-1 bg-bg-secondary border border-accent-blue rounded px-2 py-0.5 text-sm text-white focus:outline-none"
                        autoFocus
                      />
                      <button onClick={() => saveEditRel(rel.id)} className="text-accent-green hover:text-accent-green/70">
                        <Save size={12} />
                      </button>
                      <button onClick={() => setEditingRel(null)} className="text-gray-500 hover:text-white">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-accent-purple text-xs font-medium">{rel.relation_type}</span>
                      <span className="text-gray-500 text-xs">{isSource ? "→" : "→"}</span>
                      <span className="text-white text-sm">
                        {isSource ? (
                          <Link href={`/entities/${otherId}`} className="text-accent-blue hover:underline">{otherName}</Link>
                        ) : entity.name}
                      </span>
                      {rel.context && (
                        <span className="text-gray-500 text-xs ml-auto truncate max-w-[200px] italic" title={rel.context}>
                          &quot;{rel.context.substring(0, 50)}{rel.context.length > 50 ? "..." : ""}&quot;
                        </span>
                      )}
                      <div className="ml-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => startEditRel(rel)} className="text-gray-500 hover:text-accent-blue p-1">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => deleteRelation(rel.id)} className="text-gray-500 hover:text-accent-red p-1">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
