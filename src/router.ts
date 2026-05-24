import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import React from 'react';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';

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

// ─── Router context ───────────────────────────────────────────────────────────
// Passed via <RouterProvider context={...}> in main.tsx so beforeLoad guards
// can check auth state without React hooks (which can't run in beforeLoad).

export interface RouterContext {
  auth: {
    session: Session | null;
    loading: boolean;
  };
}

const queryClient = new QueryClient();

// ─── Routes ───────────────────────────────────────────────────────────────────

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(Outlet),
    ),
});

// Public route — redirect to / if already signed in
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: ({ context }) => {
    if (!context.auth.loading && context.auth.session) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});

// Protected route — redirect to /login if not authenticated
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: ({ context }) => {
    // Wait for the initial session hydration before redirecting
    if (!context.auth.loading && !context.auth.session) {
      throw redirect({ to: '/login' });
    }
  },
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

const routeTree = rootRoute.addChildren([loginRoute, indexRoute]);

export const router = createRouter({
  routeTree,
  context: {
    // Default context — overridden at runtime by <RouterProvider context={...}>
    auth: { session: null, loading: true },
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
