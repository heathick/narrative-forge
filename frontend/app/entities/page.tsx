"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Users, MapPin, Sword, Calendar, Lightbulb } from "lucide-react";

const typeIcons: Record<string, any> = {
  character: Users,
  location: MapPin,
  item: Sword,
  event: Calendar,
  concept: Lightbulb,
};

const typeColors: Record<string, string> = {
  character: "text-accent-blue border-accent-blue/30 bg-accent-blue/10",
  location: "text-accent-green border-accent-green/30 bg-accent-green/10",
  item: "text-accent-orange border-accent-orange/30 bg-accent-orange/10",
  event: "text-accent-purple border-accent-purple/30 bg-accent-purple/10",
  concept: "text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10",
};

export default function EntitiesPage() {
  const [entities, setEntities] = useState<any[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (activeType) params.set("type", activeType);
      const res = await fetch(`/api/entities?${params}`);
      const data = await res.json();
      setEntities(Array.isArray(data) ? data : []);
    }
    load();
  }, [search, activeType]);

  useEffect(() => {
    fetch("/api/entities/types")
      .then((r) => r.json())
      .then((data) => setTypes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Entities</h1>
          <p className="text-gray-400 text-sm mt-1">
            Characters, locations, items, events, and concepts from your notes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Search entities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-secondary border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveType(null)}
            className={`px-3 py-2 rounded-lg text-xs ${
              !activeType
                ? "bg-accent-blue/20 text-accent-blue"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`px-3 py-2 rounded-lg text-xs capitalize ${
                activeType === t
                  ? `${typeColors[t]?.split(" ")[0]} ${typeColors[t]?.split(" ")[1]}`
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Entity grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.map((entity) => {
          const Icon = typeIcons[entity.type] || Lightbulb;
          return (
            <Link
              key={entity.id}
              href={`/entities/${entity.id}`}
              className={`block rounded-xl border p-4 hover:border-accent-blue/50 transition-colors ${
                typeColors[entity.type] || "border-white/10 bg-bg-secondary"
              }`}
            >
              <div className="flex items-start gap-3">
                {entity.image_path ? (
                  <img
                    src={entity.image_path}
                    alt={entity.name}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    {entity.name}
                  </div>
                  <div className="text-xs opacity-60 capitalize">
                    {entity.type}
                  </div>
                  {entity.description && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {entity.description}
                    </div>
                  )}
                </div>
              </div>
              {entity.attributes &&
                Object.keys(entity.attributes).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {Object.entries(entity.attributes)
                      .slice(0, 4)
                      .map(([key, value]) => (
                        <span
                          key={key}
                          className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded"
                        >
                          {key}: {String(value)}
                        </span>
                      ))}
                    {Object.keys(entity.attributes).length > 4 && (
                      <span className="text-[10px] text-gray-500">
                        +{Object.keys(entity.attributes).length - 4} more
                      </span>
                    )}
                  </div>
                )}
            </Link>
          );
        })}
      </div>

      {entities.length === 0 && (
        <div className="text-center text-gray-500 py-16">
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p>No entities yet. Create notes and analyze them to extract entities.</p>
        </div>
      )}
    </div>
  );
}
