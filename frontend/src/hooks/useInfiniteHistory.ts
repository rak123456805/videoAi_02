"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchSessions, SessionListResponse } from "@/lib/api";

export function useInfiniteHistory(token: string | null) {
  return useInfiniteQuery<SessionListResponse, Error>({
    queryKey: ["sessions", "history"],
    queryFn: ({ pageParam = 1 }) =>
      fetchSessions(token!, pageParam as number, 10),
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!token,
    staleTime: 30_000,
  });
}
