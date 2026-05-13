"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Search, FileText, Users, ArrowRight } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      doSearch(query);
    }
  };

  const total = results
    ? results.notes.length + results.entities.length + results.relations.length
    : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Global Search</h1>

      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search notes, entities, relations..."
          className="w-full bg-bg-secondary border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-accent-blue"
          autoFocus
        />
        <button
          onClick={() => doSearch(query)}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-accent-blue rounded-lg text-white text-sm hover:bg-accent-blue/80"
        >
          Search
        </button>
      </div>

      {loading && (
        <div className="text-gray-400 text-center py-8">Searching...</div>
      )}

      {results && !loading && (
        <div className="space-y-6">
          <p className="text-gray-500 text-sm">{total} results found</p>

          {/* Notes */}
          {results.notes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <FileText size={14} /> Notes ({results.notes.length})
              </h2>
              <div className="space-y-2">
                {results.notes.map((note: any) => (
                  <Link
                    key={note.id}
                    href="/notes"
                    className="block bg-bg-secondary rounded-lg p-4 border border-white/5 hover:border-accent-blue/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">{note.title}</div>
                        {note.folder && (
                          <div className="text-gray-500 text-xs mt-1">{note.folder}</div>
                        )}
                      </div>
                      <ArrowRight size={14} className="text-gray-500" />
                    </div>
                    <div className="text-gray-400 text-sm mt-2 line-clamp-2">
                      {note.snippet}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Entities */}
          {results.entities.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <Users size={14} /> Entities ({results.entities.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {results.entities.map((entity: any) => (
                  <Link
                    key={entity.id}
                    href={`/entities/${entity.id}`}
                    className="block bg-bg-secondary rounded-lg p-3 border border-white/5 hover:border-accent-blue/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{entity.name}</span>
                      <span className="text-gray-500 text-xs capitalize">({entity.type})</span>
                    </div>
                    {entity.description && (
                      <div className="text-gray-400 text-xs mt-1 line-clamp-1">
                        {entity.description}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Relations */}
          {results.relations.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <ArrowRight size={14} /> Relations ({results.relations.length})
              </h2>
              <div className="space-y-2">
                {results.relations.map((rel: any) => (
                  <div
                    key={rel.id}
                    className="bg-bg-secondary rounded-lg p-3 border border-white/5"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Link href={`/entities/${rel.source_entity_id}`} className="text-accent-blue hover:underline">
                        {rel.source_entity_name}
                      </Link>
                      <span className="text-accent-purple">{rel.relation_type}</span>
                      <Link href={`/entities/${rel.target_entity_id}`} className="text-accent-blue hover:underline">
                        {rel.target_entity_name}
                      </Link>
                    </div>
                    {rel.context && (
                      <div className="text-gray-500 text-xs mt-1">&quot;{rel.context}&quot;</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {total === 0 && (
            <div className="text-center text-gray-500 py-12">
              No results for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="text-center text-gray-500 py-12">
          <Search size={48} className="mx-auto mb-4 opacity-30" />
          <p>Search across all your notes, entities, and relations</p>
        </div>
      )}
    </div>
  );
}
