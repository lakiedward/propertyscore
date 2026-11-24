import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { smartCheckQueries } from '../api/smart-check.queries';

const SEARCH_DELAY_MS = 350;
const MIN_QUERY_LENGTH = 3;

export function useAddressSearch(text: string, isEnabled: boolean) {
  const [query, setQuery] = useState('');
  const trimmed = text.trim();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(trimmed);
    }, SEARCH_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  const canSearch = isEnabled && query.length >= MIN_QUERY_LENGTH && query === trimmed;
  const search = useQuery({
    ...smartCheckQueries.addressSearch(query),
    enabled: canSearch,
    placeholderData: keepPreviousData,
  });

  return {
    query,
    matches: canSearch ? (search.data ?? []) : [],
    isSearching:
      isEnabled && trimmed.length >= MIN_QUERY_LENGTH && (query !== trimmed || search.isFetching),
    isEmpty: canSearch && search.isSuccess && !search.isPlaceholderData && search.data.length === 0,
    isError: canSearch && search.isError,
  };
}
