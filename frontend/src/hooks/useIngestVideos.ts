"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ingestVideos, IngestResponse } from "@/lib/api";

export function useIngestVideos(token: string | null) {
  const qc = useQueryClient();
  return useMutation<IngestResponse, Error, { urls: string[]; sessionId?: string }>({
    mutationFn: ({ urls, sessionId }) => ingestVideos(urls, token!, sessionId),
    onSuccess: () => {
      // Invalidate history so new session appears
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
