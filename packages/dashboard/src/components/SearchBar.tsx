import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardStore } from "../store";

const typeBadgeColors: Record<string, string> = {
  file: "bg-blue-700 text-blue-200",
  function: "bg-green-700 text-green-200",
  class: "bg-purple-700 text-purple-200",
  module: "bg-orange-700 text-orange-200",
  concept: "bg-pink-700 text-pink-200",
};

export default function SearchBar() {
  const searchQuery = useDashboardStore((s) => s.searchQuery);
  const searchResults = useDashboardStore((s) => s.searchResults);
  const graph = useDashboardStore((s) => s.graph);
  const setSearchQuery = useDashboardStore((s) => s.setSearchQuery);
  const selectNode = useDashboardStore((s) => s.selectNode);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build a lookup map for node details
  const nodeMap = useMemo(
    () => new Map((graph?.nodes ?? []).map((n) => [n.id, n])),
    [graph],
  );

  const topResults = searchResults.slice(0, 5);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setDropdownOpen(true);
    },
    [setSearchQuery],
  );

  const handleResultClick = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      setDropdownOpen(false);
    },
    [selectNode],
  );

  // Close dropdown on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = dropdownOpen && searchQuery.trim() && topResults.length > 0;

  return (
    <div ref={containerRef} className="relative z-10">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
        <svg
          className="w-4 h-4 text-gray-400 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setDropdownOpen(true)}
          placeholder="Search nodes by name, summary, or tags..."
          className="flex-1 bg-gray-700 text-white text-sm rounded px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-500 placeholder-gray-400"
        />
        {searchQuery.trim() && (
          <span className="text-xs text-gray-400 shrink-0">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}{" "}
            <span className="text-gray-500">(fuzzy)</span>
          </span>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute left-4 right-4 top-full mt-0.5 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden">
          {topResults.map((result) => {
            const node = nodeMap.get(result.nodeId);
            if (!node) return null;

            const relevance = Math.round((1 - result.score) * 100);
            const badgeColor = typeBadgeColors[node.type] ?? typeBadgeColors.file;

            return (
              <button
                key={result.nodeId}
                type="button"
                onClick={() => handleResultClick(result.nodeId)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 transition-colors text-left"
              >
                {/* Type badge */}
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeColor} shrink-0`}
                >
                  {node.type}
                </span>

                {/* Node name */}
                <span className="text-sm text-white truncate flex-1">
                  {node.name}
                </span>

                {/* Relevance bar */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-16 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full"
                      style={{ width: `${relevance}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 w-7 text-right">
                    {relevance}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
