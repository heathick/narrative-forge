"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, Folder, Loader2, Sparkles, CheckCircle, FileText, Trash2, Users, Save, X, MapPin, Sword, Calendar, Lightbulb, ExternalLink } from "lucide-react";
import Link from "next/link";

const ENTITY_COLORS: Record<string, string> = {
  character: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  location: "bg-green-500/20 text-green-300 border-green-500/30",
  item: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  event: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  concept: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const ENTITY_TYPE_ICONS: Record<string, any> = { character: Users, location: MapPin, item: Sword, event: Calendar, concept: Lightbulb };

function HighlightedText({ content, entities }: { content: string; entities: any[] }) {
  if (!content || entities.length === 0) {
    return <>{content}</>;
  }

  // Sort entities by name length (longest first) to avoid partial matches
  const sorted = [...entities].sort((a, b) => b.name.length - a.name.length);
  
  // Build regex that matches any entity name
  const names = sorted.map(e => e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${names.join('|')})`, 'gi');
  
  const parts = content.split(regex);
  
  return (
    <>
      {parts.map((part, i) => {
        const entity = sorted.find(
          e => e.name.toLowerCase() === part.toLowerCase()
        );
        if (entity) {
          const colorClass = ENTITY_COLORS[entity.type] || ENTITY_COLORS.concept;
          return (
            <Link
              key={i}
              href={`/entities/${entity.id}`}
              className={`inline px-1 py-0.5 rounded border cursor-pointer hover:opacity-80 transition-opacity ${colorClass}`}
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [noteEntities, setNoteEntities] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFolder, setEditFolder] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStage, setAnalyzeStage] = useState("");
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entityPanel, setEntityPanel] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ show: boolean; entities: any[]; noteId: number | null }>({
    show: false,
    entities: [],
    noteId: null,
  });

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadNotes = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeFolder) params.set("folder", activeFolder);
    const res = await fetch(`/api/notes?${params}`);
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
  }, [search, activeFolder]);

  const loadFolders = useCallback(async () => {
    const res = await fetch("/api/notes/folders");
    const data = await res.json();
    setFolders(Array.isArray(data) ? data : []);
  }, []);

  const loadNoteEntities = useCallback(async (noteId: number) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/entities`);
      const data = await res.json();
      setNoteEntities(Array.isArray(data) ? data : []);
    } catch {
      setNoteEntities([]);
    }
  }, []);

  useEffect(() => {
    loadNotes();
    loadFolders();
  }, [loadNotes, loadFolders]);

  // Auto-save with debounce
  const triggerAutosave = useCallback((title: string, content: string, folder: string, noteId: number) => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/notes/${noteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, folder: folder || null }),
        });
        setIsDirty(false);
        loadNotes();
      } catch (err) {
        console.error("Autosave failed", err);
      } finally {
        setSaving(false);
      }
    }, 2000);
  }, [loadNotes]);

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const selectNote = async (id: number, force: boolean = false) => {
    if (!force && isDirty) {
      // Force save before switching
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      if (selectedNote && editing) {
        await fetch(`/api/notes/${selectedNote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: editTitle, content: editContent, folder: editFolder || null }),
        });
        setIsDirty(false);
      }
    }
    const res = await fetch(`/api/notes/${id}`);
    const note = await res.json();
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditFolder(note.folder || "");
    setEditing(true);
    setIsDirty(false);
    loadNoteEntities(id);
  };

  const saveNote = async () => {
    if (!selectedNote) return;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    setSaving(true);
    await fetch(`/api/notes/${selectedNote.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        content: editContent,
        folder: editFolder || null,
      }),
    });
    setIsDirty(false);
    setSaving(false);
    loadNotes();
    loadNoteEntities(selectedNote.id);
  };

  const handleEditChange = (field: string, value: string) => {
    if (field === "title") setEditTitle(value);
    if (field === "content") setEditContent(value);
    if (field === "folder") setEditFolder(value);
    setIsDirty(true);
    if (selectedNote) {
      const t = field === "title" ? value : editTitle;
      const c = field === "content" ? value : editContent;
      const f = field === "folder" ? value : editFolder;
      triggerAutosave(t, c, f, selectedNote.id);
    }
  };

  const createNote = async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Note",
        content: "",
        folder: activeFolder || null,
      }),
    });
    const note = await res.json();
    loadNotes();
    loadFolders();
    selectNote(note.id, true);
  };

  const STAGE_LABELS: Record<string, string> = {
    extracting_entities: "Extracting entities...",
    building_relations: "Building relationships...",
    checking_contradictions: "Checking contradictions...",
    generating_summaries: "Generating summaries...",
    done: "Done!",
    error: "Analysis failed",
  };

  const analyzeNote = async (id: number) => {
    setAnalyzing(true);
    setAnalyzeStage("Starting analysis...");
    try {
      const startRes = await fetch(`/api/notes/${id}/analyze`, { method: "POST" });
      const startData = await startRes.json();

      if (startData.status === "error") {
        setAnalyzeStage("Error: " + (startData.error || "Unknown error"));
        setTimeout(() => { setAnalyzing(false); setAnalyzeStage(""); }, 3000);
        return;
      }

      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/notes/${id}/analyze`);
          const data = await res.json();
          const label = STAGE_LABELS[data.stage || data.status] || data.stage || data.status;
          setAnalyzeStage(label);

          if (data.status === "done") {
            clearInterval(pollInterval);
            loadNotes();
            loadFolders();
            loadNoteEntities(id);
            setTimeout(() => { setAnalyzing(false); setAnalyzeStage(""); }, 1500);
          } else if (data.status === "error") {
            clearInterval(pollInterval);
            setAnalyzeStage("Error: " + (data.error || "Unknown"));
            setTimeout(() => { setAnalyzing(false); setAnalyzeStage(""); }, 4000);
          }
        } catch {
          // keep polling
        }
      }, 2000);
    } catch (err) {
      console.error("Analysis failed", err);
      setAnalyzeStage("Failed to start analysis");
      setTimeout(() => { setAnalyzing(false); setAnalyzeStage(""); }, 3000);
    }
  };

  const analyzeAllNotes = async () => {
    if (notes.length === 0) return;
    setAnalyzingAll(true);
    try {
      for (let i = 0; i < notes.length; i++) {
        setAnalyzeProgress(`${i + 1}/${notes.length}`);
        setAnalyzeStage(`Analyzing note ${i + 1} of ${notes.length}...`);
        await fetch(`/api/notes/${notes[i].id}/analyze`, { method: "POST" });
        await new Promise<void>((resolve) => {
          const poll = setInterval(async () => {
            try {
              const res = await fetch(`/api/notes/${notes[i].id}/analyze`);
              const data = await res.json();
              setAnalyzeStage(`Note ${i + 1}/${notes.length}: ${STAGE_LABELS[data.stage || ""] || data.stage || "processing..."}`);
              if (data.status === "done" || data.status === "error") {
                clearInterval(poll);
                resolve();
              }
            } catch {
              // keep polling
            }
          }, 2000);
        });
      }
      loadNotes();
      loadFolders();
      if (selectedNote) loadNoteEntities(selectedNote.id);
    } catch (err) {
      console.error("Analyze all failed", err);
    } finally {
      setAnalyzingAll(false);
      setAnalyzeProgress("");
      setAnalyzing(false);
      setAnalyzeStage("");
    }
  };

  const requestDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/notes/${id}/entities`);
      const entities = await res.json();
      setDeleteDialog({ show: true, entities: Array.isArray(entities) ? entities : [], noteId: id });
    } catch {
      if (confirm("Delete this note?")) {
        await fetch(`/api/notes/${id}`, { method: "DELETE" });
        if (selectedNote?.id === id) setSelectedNote(null);
        loadNotes();
        loadFolders();
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.noteId) return;
    await fetch(`/api/notes/${deleteDialog.noteId}`, { method: "DELETE" });
    if (selectedNote?.id === deleteDialog.noteId) setSelectedNote(null);
    setDeleteDialog({ show: false, entities: [], noteId: null });
    loadNotes();
    loadFolders();
  };

  const openEntityPanel = async (entityId: number) => {
    try {
      const res = await fetch(`/api/entities/${entityId}`);
      const data = await res.json();
      setEntityPanel(data);
    } catch (err) {
      console.error("Failed to load entity", err);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-80 border-r border-white/5 flex flex-col bg-bg-secondary">
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-tertiary border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
            />
          </div>
        </div>

        {folders.length > 0 && (
          <div className="px-3 py-2 border-b border-white/5 flex gap-1 flex-wrap">
            <button
              onClick={() => setActiveFolder(null)}
              className={`px-2 py-1 rounded text-xs ${!activeFolder ? "bg-accent-blue/20 text-accent-blue" : "text-gray-400 hover:text-white"}`}
            >
              All
            </button>
            {folders.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFolder(f)}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${activeFolder === f ? "bg-accent-blue/20 text-accent-blue" : "text-gray-400 hover:text-white"}`}
              >
                <Folder size={10} />{f}
              </button>
            ))}
          </div>
        )}

        <div className="px-3 py-2 space-y-2">
          <button
            onClick={createNote}
            className="w-full flex items-center justify-center gap-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg py-2 text-sm transition-colors"
          >
            <Plus size={16} /> New Note
          </button>
          {notes.length > 0 && (
            <button
              onClick={analyzeAllNotes}
              disabled={analyzingAll || analyzing}
              className="w-full flex items-center justify-center gap-2 bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple rounded-lg py-2 text-sm transition-colors disabled:opacity-50"
            >
              {analyzingAll ? (
                <><Loader2 size={14} className="animate-spin" /> Analyzing {analyzeProgress}...</>
              ) : (
                <><Sparkles size={14} /> Analyze All ({notes.length})</>
              )}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto px-3 space-y-1">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => selectNote(note.id)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedNote?.id === note.id
                  ? "bg-accent-blue/20 border border-accent-blue/30"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              <div className="text-white text-sm font-medium truncate">{note.title}</div>
              <div className="text-gray-500 text-xs mt-1 line-clamp-2">
                {note.content.substring(0, 100) || "Empty note"}
              </div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                {note.folder && <span className="flex items-center gap-1"><Folder size={8} />{note.folder}</span>}
                <span>{note.entity_count} entities</span>
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-8">No notes found</div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex-1">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => handleEditChange("title", e.target.value)}
                  className="bg-transparent text-xl font-bold text-white focus:outline-none w-full"
                  placeholder="Note title..."
                />
              </div>
              <div className="flex items-center gap-2 ml-4">
                {/* Autosave indicator */}
                {saving && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> Saving...
                  </span>
                )}
                {isDirty && !saving && (
                  <span className="text-xs text-yellow-500">Unsaved</span>
                )}
                {!isDirty && !saving && (
                  <span className="text-xs text-green-500/50 flex items-center gap-1">
                    <CheckCircle size={10} /> Saved
                  </span>
                )}
                {analyzing ? (
                  <div className="flex items-center gap-2 text-accent-purple text-sm min-w-[180px]">
                    <Loader2 size={16} className="animate-spin shrink-0" />
                    <span className="truncate">{analyzeStage || "Analyzing..."}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => analyzeNote(selectedNote.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent-purple/20 text-accent-purple rounded-lg text-sm hover:bg-accent-purple/30 transition-colors"
                  >
                    <Sparkles size={14} /> Analyze
                  </button>
                )}
                <button
                  onClick={saveNote}
                  className="flex items-center gap-2 px-3 py-1.5 bg-accent-green/20 text-accent-green rounded-lg text-sm hover:bg-accent-green/30 transition-colors"
                >
                  <Save size={14} /> Save
                </button>
                <button
                  onClick={() => requestDelete(selectedNote.id)}
                  className="px-3 py-1.5 text-gray-500 hover:text-accent-red text-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-white/5">
              <input
                type="text"
                value={editFolder}
                onChange={(e) => handleEditChange("folder", e.target.value)}
                placeholder="Folder (e.g., Characters, Locations...)"
                className="w-full bg-transparent text-sm text-gray-400 focus:outline-none focus:text-white"
              />
            </div>

            <div className="flex-1 overflow-auto">
              <textarea
                value={editContent}
                onChange={(e) => handleEditChange("content", e.target.value)}
                className="w-full h-full bg-transparent px-6 py-4 text-white text-sm leading-relaxed resize-none focus:outline-none"
                placeholder="Write your story, lore, or game notes here..."
              />
            </div>

            {/* Entity highlights panel at bottom */}
            {noteEntities.length > 0 && (
              <div className="border-t border-white/5 px-6 py-3 bg-bg-secondary/50">
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Users size={10} /> Entities in this note ({noteEntities.length}):
                </div>
                <div className="flex flex-wrap gap-1">
                  {noteEntities.map((entity: any) => {
                    const colorClass = ENTITY_COLORS[entity.type] || ENTITY_COLORS.concept;
                    return (
                      <button
                        key={entity.id}
                        onClick={() => openEntityPanel(entity.id)}
                        className={`px-2 py-0.5 rounded border text-xs cursor-pointer ${colorClass} hover:opacity-80 transition-opacity`}
                      >
                        {entity.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p>Select a note or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      {deleteDialog.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-white/10 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Trash2 size={18} className="text-accent-red" /> Delete Note
            </h3>
            <p className="text-gray-300 text-sm mb-4">Are you sure you want to delete this note?</p>
            {deleteDialog.entities.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">
                  Entities only referenced by this note will also be deleted:
                </p>
                <div className="max-h-40 overflow-auto space-y-1">
                  {deleteDialog.entities.map((entity: any) => (
                    <div key={entity.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-tertiary text-sm">
                      <Users size={12} className="text-gray-500" />
                      <span className="text-white">{entity.name}</span>
                      <span className="text-gray-500 text-xs capitalize">({entity.type})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteDialog({ show: false, entities: [], noteId: null })}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-accent-red/20 text-accent-red rounded-lg text-sm hover:bg-accent-red/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entity Detail Side Panel */}
      {entityPanel && (
        <div className="w-96 border-l border-white/5 bg-bg-secondary flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
          {/* Panel header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white truncate">{entityPanel.name}</h3>
            <div className="flex items-center gap-2">
              <Link
                href={`/entities/${entityPanel.id}`}
                className="text-gray-500 hover:text-accent-blue"
                title="Open full page"
              >
                <ExternalLink size={16} />
              </Link>
              <button
                onClick={() => setEntityPanel(null)}
                className="text-gray-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="p-4">
            {entityPanel.image_path ? (
              <img
                src={entityPanel.image_path}
                alt={entityPanel.name}
                className="w-full h-48 rounded-xl object-cover"
              />
            ) : (
              <div className="w-full h-48 rounded-xl bg-bg-tertiary flex items-center justify-center">
                {(() => {
                  const Icon = ENTITY_TYPE_ICONS[entityPanel.type] || Lightbulb;
                  return <Icon size={64} className="text-gray-600" />;
                })()}
              </div>
            )}
          </div>

          {/* Type badge + description */}
          <div className="px-4 pb-3">
            <span className="px-2 py-0.5 rounded text-xs bg-white/5 text-gray-400 capitalize">
              {entityPanel.type}
            </span>
          </div>

          {entityPanel.description && (
            <div className="px-4 pb-4">
              <p className="text-gray-300 text-sm leading-relaxed">
                {entityPanel.description}
              </p>
            </div>
          )}

          {/* Attributes */}
          {entityPanel.attributes && Object.keys(entityPanel.attributes).length > 0 && (
            <div className="px-4 pb-4">
              <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Attributes</h4>
              <div className="space-y-1">
                {Object.entries(entityPanel.attributes).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-bg-tertiary">
                    <span className="text-gray-400 min-w-[80px]">{key}</span>
                    <span className="text-white">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relations */}
          {entityPanel.relations && entityPanel.relations.length > 0 && (
            <div className="px-4 pb-4 flex-1 overflow-auto">
              <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Relations ({entityPanel.relations.length})
              </h4>
              <div className="space-y-1.5">
                {entityPanel.relations.map((rel: any) => {
                  const isSource = rel.source_entity_id === entityPanel.id;
                  const otherName = isSource ? rel.target_entity_name : rel.source_entity_name;
                  const otherId = isSource ? rel.target_entity_id : rel.source_entity_id;
                  return (
                    <div
                      key={rel.id}
                      className="flex items-center gap-1.5 text-xs py-1.5 px-2 rounded bg-bg-tertiary cursor-pointer hover:bg-bg-tertiary/80"
                      onClick={() => openEntityPanel(otherId)}
                    >
                      <span className={isSource ? "text-white" : "text-accent-blue"}>{isSource ? entityPanel.name : otherName}</span>
                      <span className="text-gray-500">{isSource ? "→" : "→"}</span>
                      <span className="text-accent-purple font-medium">{rel.relation_type}</span>
                      <span className="text-gray-500">→</span>
                      <span className={isSource ? "text-accent-blue" : "text-white"}>{isSource ? otherName : entityPanel.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes count */}
          <div className="p-4 border-t border-white/5 text-xs text-gray-500">
            Mentioned in {entityPanel.note_ids?.length || 0} notes
          </div>
        </div>
      )}
    </div>
  );
}
