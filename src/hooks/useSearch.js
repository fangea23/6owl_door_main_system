import { useState, useMemo } from 'react';
import { getAllSystems } from '../data/systems';

export default function useSearch() {
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const allSystems = getAllSystems();

    return allSystems.filter(system => {
      const nameMatch = system.name.toLowerCase().includes(query);
      const descMatch = system.description.toLowerCase().includes(query);
      const categoryMatch = system.categoryName.toLowerCase().includes(query);
      return nameMatch || descMatch || categoryMatch;
    });
  }, [searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching: searchQuery.trim().length > 0,
  };
}
