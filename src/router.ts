import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import Dashboard from './components/Dashboard';

export type MapTab = 'usa' | 'world';
export type EventTypeFilter = 'all' | 'half' | 'full' | 'other';

export interface SearchParams {
  tab?: MapTab;
  state?: string;
  fs?: string;           // finished search
  ff?: EventTypeFilter;  // finished type filter
  ps?: string;           // planned search
  pf?: EventTypeFilter;  // planned type filter
}

const queryClient = new QueryClient();

const rootRoute = createRootRoute({
  component: () =>
    React.createElement(QueryClientProvider, { client: queryClient },
      React.createElement(Outlet)
    ),
});

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (raw: Record<string, unknown>): SearchParams => ({
    tab: raw.tab === 'world' ? 'world' : raw.tab === 'usa' ? 'usa' : undefined,
    state: typeof raw.state === 'string' && raw.state ? raw.state : undefined,
    fs: typeof raw.fs === 'string' && raw.fs ? raw.fs : undefined,
    ff: raw.ff === 'half' || raw.ff === 'full' || raw.ff === 'other' || raw.ff === 'all' ? raw.ff : undefined,
    ps: typeof raw.ps === 'string' && raw.ps ? raw.ps : undefined,
    pf: raw.pf === 'half' || raw.pf === 'full' || raw.pf === 'other' || raw.pf === 'all' ? raw.pf : undefined,
  }),
  component: Dashboard,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
