"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Eye } from "lucide-react";

export default function ContradictionsPage() {
  const [contradictions, setContradictions] = useState<any[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [selectedContradiction, setSelectedContradiction] = useState<any>(null);
  const [notes, setNotes] = useState<Record<number, any>>({});

  useEffect(() => {
    loadContradictions();
  }, [showResolved]);

  const loadContradictions = async () => {
    const res = await fetch(
      `/api/contradictions?resolved=${showResolved}`
    );
    const data = await res.json();
    setContradictions(Array.isArray(data) ? data : []);
  };

  const loadNotes = async (noteAId: number | null, noteBId: number | null) => {
    const loaded: Record<number, any> = {};
    if (noteAId) {
      const resA = await fetch(`/api/notes/${noteAId}`);
      loaded[noteAId] = await resA.json();
    }
    if (noteBId) {
      const resB = await fetch(`/api/notes/${noteBId}`);
      loaded[noteBId] = await resB.json();
    }
    setNotes(loaded);
  };

  const resolveContradiction = async (id: number) => {
    await fetch(`/api/contradictions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    });
    loadContradictions();
    setSelectedContradiction(null);
  };

  const selectContradiction = (c: any) => {
    setSelectedContradiction(c);
    loadNotes(c.note_a_id, c.note_b_id);
  };

  return (
    <div className="flex h-full">
      {/* Left panel - list */}
      <div className="w-96 border-r border-white/5 flex flex-col bg-bg-secondary">
        <div className="p-4 border-b border-white/5">
          <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <AlertTriangle size={20} className="text-accent-orange" />
            Contradictions
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowResolved(false)}
              className={`px-3 py-1.5 rounded text-xs ${
                !showResolved
                  ? "bg-accent-orange/20 text-accent-orange"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setShowResolved(true)}
              className={`px-3 py-1.5 rounded text-xs ${
                showResolved
                  ? "bg-accent-green/20 text-accent-green"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Resolved
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {contradictions.length === 0 ? (
            <div className="text-center text-gray-500 py-12 px-4">
              {showResolved ? (
                <p>No resolved contradictions</p>
              ) : (
                <div>
                  <CheckCircle
                    size={36}
                    className="mx-auto mb-3 text-accent-green opacity-50"
                  />
                  <p>No contradictions found!</p>
                  <p className="text-xs mt-1">Your lore is consistent.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {contradictions.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectContradiction(c)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedContradiction?.id === c.id
                      ? "bg-accent-orange/10 border border-accent-orange/30"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-accent-blue text-sm font-medium">
                      {c.entity_name}
                    </span>
                    <span className="text-gray-500 text-xs">/ {c.field}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-300 bg-white/5 px-2 py-0.5 rounded">
                      &quot;{c.value_a}&quot;
                    </span>
                    <span className="text-gray-500">vs</span>
                    <span className="text-gray-300 bg-white/5 px-2 py-0.5 rounded">
                      &quot;{c.value_b}&quot;
                    </span>
                  </div>
                  {c.explanation && (
                    <div className="text-gray-500 text-xs mt-2 line-clamp-2">
                      {c.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel - detail */}
      <div className="flex-1 p-6 overflow-auto">
        {selectedContradiction ? (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">
                Conflict: {selectedContradiction.field}
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Entity:</span>
                <span className="text-accent-blue">
                  {selectedContradiction.entity_name}
                </span>
              </div>
              {selectedContradiction.explanation && (
                <div className="mt-3 bg-accent-orange/10 border border-accent-orange/20 rounded-lg p-3">
                  <p className="text-sm text-gray-300">
                    {selectedContradiction.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Side by side comparison */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-bg-secondary rounded-xl border border-white/5 p-4">
                <h3 className="text-sm text-gray-400 mb-2">Value A</h3>
                <div className="text-xl text-white font-medium">
                  &quot;{selectedContradiction.value_a}&quot;
                </div>
                {selectedContradiction.note_a_id &&
                  notes[selectedContradiction.note_a_id] && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-1">
                        From: {notes[selectedContradiction.note_a_id].title}
                      </div>
                      <div className="text-xs text-gray-400 bg-bg-tertiary rounded p-2 max-h-32 overflow-auto">
                        {notes[selectedContradiction.note_a_id].content.substring(
                          0,
                          300
                        )}
                        ...
                      </div>
                    </div>
                  )}
              </div>

              <div className="bg-bg-secondary rounded-xl border border-white/5 p-4">
                <h3 className="text-sm text-gray-400 mb-2">Value B</h3>
                <div className="text-xl text-white font-medium">
                  &quot;{selectedContradiction.value_b}&quot;
                </div>
                {selectedContradiction.note_b_id &&
                  notes[selectedContradiction.note_b_id] && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-1">
                        From: {notes[selectedContradiction.note_b_id].title}
                      </div>
                      <div className="text-xs text-gray-400 bg-bg-tertiary rounded p-2 max-h-32 overflow-auto">
                        {notes[selectedContradiction.note_b_id].content.substring(
                          0,
                          300
                        )}
                        ...
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {!selectedContradiction.resolved && (
              <button
                onClick={() =>
                  resolveContradiction(selectedContradiction.id)
                }
                className="flex items-center gap-2 px-4 py-2 bg-accent-green/20 text-accent-green rounded-lg hover:bg-accent-green/30 transition-colors"
              >
                <CheckCircle size={16} />
                Mark as Resolved
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Eye size={48} className="mx-auto mb-4 opacity-30" />
              <p>Select a contradiction to see details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
