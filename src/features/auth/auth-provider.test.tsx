import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { buildAccessToken, buildSession } from '@/test/factories/auth';
import { signOut } from './api/auth.api';
import { useAuth } from './auth-context';
import { AuthProvider } from './auth-provider';

const STORAGE_KEY = 'sb-127-auth-token';

function AuthProbe() {
  const auth = useAuth();

  return (
    <>
      <output aria-label="user">{auth.user?.email ?? 'signed-out'}</output>
      <output aria-label="roles">{auth.roles.join(',')}</output>
      <output aria-label="admin">{auth.hasRole('admin') ? 'yes' : 'no'}</output>
      <output aria-label="method">{auth.signInMethod?.method ?? 'none'}</output>
    </>
  );
}

function storeSession(session: Session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function renderAuthProvider() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { queryClient };
}

describe('AuthProvider', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('gives the admin role from the claim in the stored session', async () => {
    storeSession(
      buildSession({ access_token: buildAccessToken({ user_roles: ['user', 'admin'] }) }),
    );

    renderAuthProvider();

    expect(await screen.findByRole('status', { name: 'admin' })).toHaveTextContent('yes');
    expect(screen.getByRole('status', { name: 'roles' })).toHaveTextContent('user,admin');
    expect(screen.getByRole('status', { name: 'user' })).toHaveTextContent('ana.ro@example.test');
    expect(screen.getByRole('status', { name: 'method' })).toHaveTextContent('password');
  });

  it('drops a role the app does not know', async () => {
    storeSession(
      buildSession({ access_token: buildAccessToken({ user_roles: ['user', 'superuser'] }) }),
    );

    renderAuthProvider();

    expect(await screen.findByRole('status', { name: 'roles' })).toHaveTextContent(/^user$/);
    expect(screen.getByRole('status', { name: 'admin' })).toHaveTextContent('no');
  });

  it('renders the children without roles when the token cannot be decoded', async () => {
    storeSession(buildSession({ access_token: 'not-a-jwt' }));

    renderAuthProvider();

    expect(await screen.findByRole('status', { name: 'user' })).toHaveTextContent(
      'ana.ro@example.test',
    );
    expect(screen.getByRole('status', { name: 'roles' })).toBeEmptyDOMElement();
    expect(screen.getByRole('status', { name: 'method' })).toHaveTextContent('none');
  });

  it('renders as signed out without a stored session', async () => {
    renderAuthProvider();

    expect(await screen.findByRole('status', { name: 'user' })).toHaveTextContent('signed-out');
    expect(screen.getByRole('status', { name: 'roles' })).toBeEmptyDOMElement();
    expect(screen.getByRole('status', { name: 'admin' })).toHaveTextContent('no');
  });

  it('clears the query cache on sign-out', async () => {
    storeSession(buildSession({ access_token: buildAccessToken() }));
    const { queryClient } = renderAuthProvider();
    expect(await screen.findByRole('status', { name: 'user' })).toHaveTextContent(
      'ana.ro@example.test',
    );
    queryClient.setQueryData(['private-data'], { owner: 'ana' });

    await signOut();

    await waitFor(() => {
      expect(screen.getByRole('status', { name: 'user' })).toHaveTextContent('signed-out');
    });
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
  });
});
