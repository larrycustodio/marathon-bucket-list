export type EventType = 'half' | 'full';
export type EventStatus = 'planned' | 'finished';

export interface MarathonEvent {
  id: string;
  name: string;
  eventType: EventType;
  plannedDate: string; // ISO date string
  finishedDate?: string;
  finishedTime?: string; // e.g. "3:45:22"
  goalFinishTime?: string;
  city: string;
  state: string;
  country: string;
  website?: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MarathonEventInput {
  name: string;
  eventType: EventType;
  plannedDate: string;
  finishedDate?: string;
  finishedTime?: string;
  goalFinishTime?: string;
  city: string;
  state: string;
  country: string;
  website?: string;
}
