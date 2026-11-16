import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      signOut: mocks.signOut,
      getSession: mocks.getSession,
    },
  },
}));

import {
  exchangeCodeForSession,
  isValidEmail,
  readSession,
  requestPasswordReset,
  safeRedirectPath,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updatePassword,
  validateNewPassword,
} from '@/lib/auth-actions';

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
});

describe('auth actions', () => {
  it('rejects malformed addresses before calling the service', async () => {
    expect(isValidEmail('no-es-un-correo')).toBe(false);
    const result = await signInWithEmail('no-es-un-correo', 'password1');
    expect(result).toEqual({ ok: false, message: 'Escribe un correo válido.' });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs in with trimmed credentials and reports a session', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null });

    const result = await signInWithEmail('  creator@example.com ', 'password1');

    expect(result).toEqual({ ok: true, hasSession: true });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'creator@example.com',
      password: 'password1',
    });
  });

  it('maps invalid credentials without leaking provider details', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    });

    const result = await signInWithEmail('creator@example.com', 'wrong-password');

    expect(result).toEqual({ ok: false, message: 'Correo o contraseña incorrectos.' });
  });

  it('signs up with an explicit confirmation redirect and no automatic session', async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });

    const result = await signUpWithEmail(
      'creator@example.com',
      'password1',
      'https://app.example.com/auth-callback?next=%2F',
    );

    expect(result).toEqual({ ok: true, hasSession: false });
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'creator@example.com',
      password: 'password1',
      options: { emailRedirectTo: 'https://app.example.com/auth-callback?next=%2F' },
    });
  });

  it('requests a recovery link without disclosing whether the account exists', async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    const result = await requestPasswordReset('creator@example.com', 'https://app.example.com/auth-callback');

    expect(result).toEqual({ ok: true, hasSession: false });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('creator@example.com', {
      redirectTo: 'https://app.example.com/auth-callback',
    });
  });

  it('enforces the local password policy before updating', async () => {
    expect(validateNewPassword('short')).toMatch(/al menos 8/);
    expect(validateNewPassword('x'.repeat(73))).toMatch(/no puede superar los 72/);
    expect(validateNewPassword('x'.repeat(72))).toBeNull();
    const result = await updatePassword('short');
    expect(result.ok).toBe(false);
    expect(mocks.updateUser).not.toHaveBeenCalled();

    const tooLong = await updatePassword('x'.repeat(73));
    expect(tooLong.ok).toBe(false);
    expect(mocks.updateUser).not.toHaveBeenCalled();

    mocks.updateUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    await expect(updatePassword('password1')).resolves.toEqual({ ok: true, hasSession: true });
  });

  it('exchanges a PKCE code and trims surrounding whitespace', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null });

    const result = await exchangeCodeForSession('  abc123  ');

    expect(result).toEqual({ ok: true, hasSession: true });
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
  });

  it('signs out and reads the current session safely', async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).resolves.toEqual({ ok: true, hasSession: false });

    mocks.getSession.mockResolvedValue({ data: { session: { user: { email: 'creator@example.com' } } }, error: null });
    await expect(readSession()).resolves.toEqual({ email: 'creator@example.com' });

    mocks.getSession.mockRejectedValue(new Error('offline'));
    await expect(readSession()).resolves.toEqual({ email: null });
  });

  it('only accepts same-origin redirects', () => {
    expect(safeRedirectPath('/monitor')).toBe('/monitor');
    expect(safeRedirectPath('/auth?mode=recovery')).toBe('/auth?mode=recovery');
    expect(safeRedirectPath('//evil.example')).toBe('/');
    expect(safeRedirectPath('https://evil.example')).toBe('/');
    expect(safeRedirectPath('/\\evil.example')).toBe('/');
    expect(safeRedirectPath('/mon\u0000itor')).toBe('/');
    expect(safeRedirectPath('/auth-callback?code=1')).toBe('/');
    expect(safeRedirectPath('/auth/callback?code=1')).toBe('/');
    expect(safeRedirectPath(undefined, '/fallback')).toBe('/fallback');
  });
});
