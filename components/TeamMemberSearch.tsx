import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TeamMember } from '@/types';
import { clientDataService } from '@/utils/clientDataService';
import JSDoITLoader from './JSDoITLoader';

interface TeamMemberSearchProps {
  projectId: string;
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
}

const TeamMemberSearch: React.FC<TeamMemberSearchProps> = ({
  projectId,
  teamMembers,
  setTeamMembers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TeamMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const results = await clientDataService.searchUsers(trimmedQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching for users:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleAddTeamMember = (member: TeamMember) => {
    const isAlreadyAdded = teamMembers.some(
      (existing) => existing.name.toLowerCase() === member.name.toLowerCase()
    );

    if (isAlreadyAdded) {
      return;
    }

    const newMember = {
      name: member.name,
      role: 'Teammitglied',
      projectId,
      id: `temp-${Date.now()}`,
    };

    setTeamMembers((prev) => [...prev, newMember]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveTeamMember = (memberId: string) => {
    setTeamMembers((prev) => prev.filter((member) => member.id !== memberId));
  };

  return (
    <div className="mt-6 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
      <h3 className="mb-4 text-lg font-semibold text-slate-100">Teammitglieder hinzufügen</h3>
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Nach Personen suchen …"
          className="w-full rounded-2xl border border-slate-800/80 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition focus:border-sky-400/80 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
        {isSearching && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <JSDoITLoader
              sizeRem={1}
              message=""
              showGlow={false}
              className="flex-row gap-1 px-0 py-0 text-sky-200"
            />
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-950/95 shadow-xl shadow-slate-950/40 backdrop-blur">
            <ul>
              {searchResults.map((user) => (
                <li
                  key={user.id || user.name}
                  className="flex cursor-pointer items-center justify-between border-b border-slate-800/60 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/70 last:border-0"
                  onClick={() => handleAddTeamMember(user)}
                >
                  <span>{user.name}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                    Neu
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
          Aktuelles Team
        </h4>
        {teamMembers.length > 0 ? (
          <ul className="space-y-2">
            {teamMembers.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 shadow-inner shadow-slate-950/30"
              >
                <div>
                  <span>{member.name}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    ({member.role || 'Teammitglied'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={member.role || 'Teammitglied'}
                    onChange={(event) => {
                      const newRole = event.target.value;
                      setTeamMembers((prev) =>
                        prev.map((existing) =>
                          existing.id === member.id ? { ...existing, role: newRole } : existing
                        )
                      );
                    }}
                    className="rounded-full border border-slate-800/70 bg-slate-950 px-3 py-1 text-xs text-slate-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                  >
                    <option value="Teammitglied">Teammitglied</option>
                    <option value="Projektleiter">Projektleiter</option>
                    <option value="Fachexperte">Fachexperte</option>
                    <option value="Stakeholder">Stakeholder</option>
                  </select>
                  <button
                    onClick={() => member.id && handleRemoveTeamMember(member.id)}
                    className="rounded-full border border-red-500/50 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400 hover:text-red-100"
                  >
                    Entfernen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Noch keine Teammitglieder hinzugefügt.</p>
        )}
      </div>
    </div>
  );
};

export default TeamMemberSearch;
