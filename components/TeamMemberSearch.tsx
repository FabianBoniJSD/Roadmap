import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TeamMember } from '@/types';
import { clientDataService } from '@/utils/clientDataService';

interface TeamMemberSearchProps {
  projectId: string;
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
}

const TeamMemberSearch: React.FC<TeamMemberSearchProps> = ({ 
  projectId, 
  teamMembers, 
  setTeamMembers 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TeamMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search function
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

  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Auto-search when query changes
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Function to add a team member to the project
  const handleAddTeamMember = (member: TeamMember) => {
    // Check if member is already added
    const isAlreadyAdded = teamMembers.some(m => 
      m.name.toLowerCase() === member.name.toLowerCase());
    
    if (isAlreadyAdded) return;

    // Create a new team member object
    const newMember = {
      name: member.name,
      role: 'Teammitglied', // Default role
      projectId: projectId,
      id: `temp-${Date.now()}`
    };
    
    // Update the team members state
    setTeamMembers(prevMembers => [...prevMembers, newMember]);
    
    // Clear search
    setSearchQuery('');
    setSearchResults([]);
  };

  // Function to remove a team member from the project
  const handleRemoveTeamMember = (memberId: string) => {
    setTeamMembers(prevMembers => prevMembers.filter(member => member.id !== memberId));
  };

  return (
    <div className="mt-6 bg-gray-700 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">Team-Mitglieder hinzufügen</h3>
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Nach Benutzern suchen..."
          className="w-full px-3 py-2 bg-gray-600 text-white rounded outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isSearching && (
          <div className="absolute right-3 top-2">
            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        
        {/* Dropdown search results */}
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <ul>
              {searchResults.map((user) => (
                <li 
                  key={user.id || user.name} 
                  className="px-3 py-2 hover:bg-gray-600 cursor-pointer flex items-center justify-between border-b border-gray-600 last:border-0"
                  onClick={() => handleAddTeamMember(user)}
                >
                  <span>{user.name}</span>
                  <span className="text-xs text-blue-400">Hinzufügen</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Current team members */}
      <div className="mt-5">
        <h4 className="text-sm font-medium mb-2">Aktuelle Team-Mitglieder:</h4>
        {teamMembers.length > 0 ? (
          <ul className="space-y-2">
            {teamMembers.map((member) => (
              <li 
                key={member.id} 
                className="flex items-center justify-between p-2 bg-gray-600 rounded"
              >
                <div>
                  <span>{member.name}</span>
                  <span className="ml-2 text-xs text-gray-400">({member.role || 'Teammitglied'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={member.role || 'Teammitglied'}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setTeamMembers(prev => 
                        prev.map(m => m.id === member.id ? {...m, role: newRole} : m)
                      );
                    }}
                    className="px-2 py-1 text-xs bg-gray-700 rounded"
                  >
                    <option value="Teammitglied">Teammitglied</option>
                    <option value="Projektleiter">Projektleiter</option>
                    <option value="Fachexperte">Fachexperte</option>
                    <option value="Stakeholder">Stakeholder</option>
                  </select>
                  <button
                    onClick={() => member.id && handleRemoveTeamMember(member.id)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-xs rounded"
                  >
                    Entfernen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">Keine Team-Mitglieder vorhanden</p>
        )}
      </div>
    </div>
  );
};

export default TeamMemberSearch;