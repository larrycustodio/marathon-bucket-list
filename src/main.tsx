import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { router } from './router';
import './index.css';

// Separate component so useAuth() can read from the AuthProvider above it,
// then pass the live session into the router context for beforeLoad guards.
function App() {
  const { session, loading } = useAuth();
  return (
    <RouterProvider
      router={router}
      context={{ auth: { session, loading } }}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
