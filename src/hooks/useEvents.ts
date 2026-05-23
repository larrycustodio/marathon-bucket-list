import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as db from '../db';
import type { MarathonEventInput } from '../types';

const QUERY_KEY = ['events'];

export function useEvents() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: db.getEvents,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarathonEventInput) => db.createEvent(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MarathonEventInput> }) =>
      db.updateEvent(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.deleteEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
