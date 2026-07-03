import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 10, // Cache results as fresh for 10 minutes to avoid re-fetching
      gcTime: 1000 * 60 * 15,    // Keep unused cache data for 15 minutes in memory
    },
  },
});
