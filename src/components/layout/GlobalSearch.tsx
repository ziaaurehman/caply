"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, Briefcase, Users, Building, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrentOrganization } from "@/lib/stores/organizationStore";
import Link from "next/link";
import { getInitials } from "@/lib/utils";

// Types corresponding to API response
interface SearchResults {
    projects: Array<{ id: string; name: string; code?: string; status: string }>;
    members: Array<{ id: string; userId: string; name: string; email: string; avatarUrl?: string; role: string }>;
    clients: Array<{ id: string; name: string; email?: string }>;
}

export default function GlobalSearch() {
    const router = useRouter();
    const { currentOrganization } = useCurrentOrganization();
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResults>({ projects: [], members: [], clients: [] });
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2 && currentOrganization?.id) {
                setLoading(true);
                setIsOpen(true);
                try {
                    const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&organizationId=${currentOrganization.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        setResults(data.results || { projects: [], members: [], clients: [] });
                    }
                } catch (error) {
                    console.error("Search failed", error);
                } finally {
                    setLoading(false);
                }
            } else if (query.length < 2) {
                setResults({ projects: [], members: [], clients: [] });
                setLoading(false);
                // Don't close immediately if user just backspaced, let them type
                if (query.length === 0) setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, currentOrganization?.id]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (path: string) => {
        setIsOpen(false);
        setQuery("");
        router.push(path);
    };

    const hasResults = results.projects.length > 0 || results.members.length > 0 || results.clients.length > 0;

    return (
        <div ref={containerRef} className="relative w-full max-w-md lg:max-w-lg z-50">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={18} className="text-gray-400" />
                </div>
                <input
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors"
                    placeholder="Search projects, people, clients..."
                    type="search"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.length >= 2) setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (query.length >= 2) setIsOpen(true);
                    }}
                />
                {loading && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <Loader2 size={16} className="animate-spin text-orange-500" />
                    </div>
                )}
                {!loading && query && (
                    <button
                        onClick={() => {
                            setQuery("");
                            setIsOpen(false);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && query.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] overflow-y-auto">
                    {!loading && !hasResults ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                            No results found for "{query}"
                        </div>
                    ) : (
                        <>
                            {results.projects.length > 0 && (
                                <div className="py-2">
                                    <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Briefcase size={12} /> Projects
                                    </div>
                                    {results.projects.map((project) => (
                                        <button
                                            key={project.id}
                                            onClick={() => handleSelect(`/projects?search=${encodeURIComponent(project.name)}`)}
                                            className="w-full text-left px-4 py-2 hover:bg-orange-50 transition-colors flex items-center justify-between group"
                                        >
                                            <div>
                                                <div className="font-medium text-sm text-gray-900 group-hover:text-orange-700">{project.name}</div>
                                                {project.code && <div className="text-xs text-gray-500">{project.code}</div>}
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {project.status}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {results.members.length > 0 && (
                                <div className="py-2 border-t border-gray-100">
                                    <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Users size={12} /> People
                                    </div>
                                    {results.members.map((member) => (
                                        <button
                                            key={member.id}
                                            // Navigation to "Team Members" list typically. 
                                            // Let's settle on navigating to the Team Members page for now, or if there is a detail view.
                                            // Based on file list, maybe /team-members.
                                            onClick={() => handleSelect(`/teams?search=${encodeURIComponent(member.name)}`)}
                                            className="w-full text-left px-4 py-2 hover:bg-orange-50 transition-colors flex items-center gap-3 group"
                                        >
                                            {member.avatarUrl ? (
                                                <img src={member.avatarUrl} alt={member.name} className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                    {getInitials(member.name)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-sm text-gray-900 group-hover:text-orange-700">{member.name}</div>
                                                <div className="text-xs text-gray-500">{member.role}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {results.clients.length > 0 && (
                                <div className="py-2 border-t border-gray-100">
                                    <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Building size={12} /> Clients
                                    </div>
                                    {results.clients.map((client) => (
                                        <button
                                            key={client.id}
                                            onClick={() => handleSelect(`/clients`)} // Generic link for now unless specific client page exists
                                            className="w-full text-left px-4 py-2 hover:bg-orange-50 transition-colors flex items-center justify-between group"
                                        >
                                            <div>
                                                <div className="font-medium text-sm text-gray-900 group-hover:text-orange-700">{client.name}</div>
                                                {client.email && <div className="text-xs text-gray-500">{client.email}</div>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
