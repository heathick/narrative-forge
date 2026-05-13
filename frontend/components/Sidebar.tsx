"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Users,
  Map,
  AlertTriangle,
  Home,
  Search,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/entities", label: "Entities", icon: Users },
  { href: "/graph", label: "Graph", icon: Map },
  { href: "/search", label: "Search", icon: Search },
  { href: "/contradictions", label: "Contradictions", icon: AlertTriangle },
];

export function Sidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState({
    notes: 0,
    entities: 0,
    contradictions: 0,
  });

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .catch(() => null);

    Promise.all([
      fetch("/api/notes").then((r) => r.json()),
      fetch("/api/entities").then((r) => r.json()),
      fetch("/api/contradictions?resolved=false").then((r) => r.json()),
    ])
      .then(([notes, entities, contradictions]) => {
        setStats({
          notes: Array.isArray(notes) ? notes.length : 0,
          entities: Array.isArray(entities) ? entities.length : 0,
          contradictions: Array.isArray(contradictions)
            ? contradictions.length
            : 0,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="w-64 bg-bg-secondary border-r border-white/5 flex flex-col shrink-0">
      <div className="p-4 border-b border-white/5">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-accent-blue">&#9876;</span>
          NarrativeForge
        </h1>
        <p className="text-xs text-gray-500 mt-1">AI-first writing tool</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                isActive
                  ? "bg-accent-blue/20 text-accent-blue"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-white">{stats.notes}</div>
            <div className="text-[10px] text-gray-500">Notes</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">{stats.entities}</div>
            <div className="text-[10px] text-gray-500">Entities</div>
          </div>
          <div>
            <div className="text-lg font-bold text-accent-red">
              {stats.contradictions}
            </div>
            <div className="text-[10px] text-gray-500">Conflicts</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
