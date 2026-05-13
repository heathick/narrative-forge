"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Users, AlertTriangle, ArrowRight } from "lucide-react";

interface DashboardData {
  recentNotes: any[];
  recentEntities: any[];
  unresolvedContradictions: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    recentNotes: [],
    recentEntities: [],
    unresolvedContradictions: [],
  });
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [notesRes, entitiesRes, contradictionsRes, healthRes] =
          await Promise.all([
            fetch("/api/notes?limit=5"),
            fetch("/api/entities"),
            fetch("/api/contradictions?resolved=false"),
            fetch("/api/health"),
          ]);

        const notes = await notesRes.json();
        const entities = await entitiesRes.json();
        const contradictions = await contradictionsRes.json();
        const h = await healthRes.json();

        setData({
          recentNotes: Array.isArray(notes) ? notes : [],
          recentEntities: Array.isArray(entities) ? entities : [],
          unresolvedContradictions: Array.isArray(contradictions) ? contradictions : [],
        });
        setHealth(h);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">
          Welcome to NarrativeForge. Your AI-powered writing companion.
        </p>
        {health && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                health.ollama === "connected" ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-gray-400">
              Ollama: {health.ollama} ({health.model})
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats cards */}
        <div className="bg-bg-secondary rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <FileText size={20} className="text-accent-blue" />
            <Link
              href="/notes"
              className="text-xs text-accent-blue hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {data.recentNotes.length}
          </div>
          <div className="text-sm text-gray-400">Recent Notes</div>
        </div>

        <div className="bg-bg-secondary rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <Users size={20} className="text-accent-green" />
            <Link
              href="/entities"
              className="text-xs text-accent-green hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {data.recentEntities.length}
          </div>
          <div className="text-sm text-gray-400">Entities</div>
        </div>

        <div className="bg-bg-secondary rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle size={20} className="text-accent-orange" />
            <Link
              href="/contradictions"
              className="text-xs text-accent-orange hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {data.unresolvedContradictions.length}
          </div>
          <div className="text-sm text-gray-400">Contradictions</div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-secondary rounded-xl p-5 border border-white/5">
          <h2 className="text-lg font-semibold text-white mb-4">
            Recent Notes
          </h2>
          {data.recentNotes.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No notes yet.{" "}
              <Link href="/notes" className="text-accent-blue hover:underline">
                Create your first note
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentNotes.map((note: any) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <div>
                    <div className="text-white text-sm">{note.title}</div>
                    <div className="text-gray-500 text-xs">
                      {note.entity_count} entities
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-gray-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bg-secondary rounded-xl p-5 border border-white/5">
          <h2 className="text-lg font-semibold text-white mb-4">
            Contradictions
          </h2>
          {data.unresolvedContradictions.length === 0 ? (
            <p className="text-green-400 text-sm">
              No contradictions found. Your lore is consistent!
            </p>
          ) : (
            <div className="space-y-3">
              {data.unresolvedContradictions.slice(0, 5).map((c: any) => (
                <div
                  key={c.id}
                  className="py-2 border-b border-white/5 last:border-0"
                >
                  <div className="text-white text-sm">
                    <span className="text-accent-orange">{c.entity_name}</span>{" "}
                    — {c.field}
                  </div>
                  <div className="text-gray-500 text-xs">
                    &quot;{c.value_a}&quot; vs &quot;{c.value_b}&quot;
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
