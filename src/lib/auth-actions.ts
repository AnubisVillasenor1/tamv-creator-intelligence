/**
 * Authentication actions for creator access.
 *
 * These helpers wrap Supabase Auth with explicit validation and stable Spanish
 * messages. They never log credentials, never create anonymous users and never
 * confirm an email on the caller's behalf: confirmation and provider settings
 * belong to the hosted project, not to the repository.
 */

import { supabase } from '@/integrations/supabase/client';

export const PASSWORD_MIN_LENGTH = 8;
// bcrypt (GoTrue) only considers the first 72 bytes of a password, so longer
// values would silently share a prefix. Reject them instead of truncating.
export const PASSWORD_MAX_LENGTH = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthActionResult =
  | { ok: true; hasSession: boolean }
  | { ok: false; message: string };

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length > 0 && email.length <= 254 && EMAIL_PATTERN.test(email);
}

export function validateNewPassword(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`;
  }
  return null;
}

function describeAuthError(error: unknown): string {
  let code = '';
  let message = '';
  if (error && typeof error === 'object') {
    const candidate = error as { code?: unknown; message?: unknown };
    if (typeof candidate.code === 'string') code = candidate.code;
    if (typeof candidate.message === 'string') message = candidate.message;
  }
  const normalized = message.toLowerCase();

  if (code === 'invalid_credentials' || normalized.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (code === 'email_not_confirmed' || normalized.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.';
  }
  if (code === 'user_already_exists' || normalized.includes('already registered')) {
    return 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.';
  }
  if (code === 'weak_password' || normalized.includes('password should be')) {
    return `La contraseña no cumple la política del servicio. Usa al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (code === 'same_password' || normalized.includes('different from the old password')) {
    return 'La nueva contraseña debe ser distinta de la anterior.';
  }
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    normalized.includes('rate limit')
  ) {
    return 'Demasiados intentos seguidos. Espera unos minutos antes de reintentar.';
  }
  if (code === 'session_not_found' || normalized.includes('session')) {
    return 'El enlace ya no es válido o la sesión expiró. Solicita uno nuevo.';
  }
  return 'No se pudo completar la operación de acceso. Inténtalo de nuevo.';
}

function connectionFailure(): AuthActionResult {
  return {
    ok: false,
    message: 'No se pudo conectar con el servicio de acceso. Revisa tu conexión e inténtalo de nuevo.',
  };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthActionResult> {
  if (!isValidEmail(email)) return { ok: false, message: 'Escribe un correo válido.' };
  if (password.length === 0) return { ok: false, message: 'Escribe tu contraseña.' };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { ok: false, message: describeAuthError(error) };
    return { ok: true, hasSession: Boolean(data.session) };
  } catch {
    return connectionFailure();
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  emailRedirectTo?: string,
): Promise<AuthActionResult> {
  if (!isValidEmail(email)) return { ok: false, message: 'Escribe un correo válido.' };
  const passwordProblem = validateNewPassword(password);
  if (passwordProblem) return { ok: false, message: passwordProblem };
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
    });
    if (error) return { ok: false, message: describeAuthError(error) };
    return { ok: true, hasSession: Boolean(data.session) };
  } catch {
    return connectionFailure();
  }
}

export async function requestPasswordReset(
  email: string,
  redirectTo?: string,
): Promise<AuthActionResult> {
  if (!isValidEmail(email)) return { ok: false, message: 'Escribe un correo válido.' };
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      redirectTo ? { redirectTo } : undefined,
    );
    if (error) return { ok: false, message: describeAuthError(error) };
    // The same response is returned whether or not the account exists, so the
    // form does not disclose which addresses are registered.
    return { ok: true, hasSession: false };
  } catch {
    return connectionFailure();
  }
}

export async function updatePassword(password: string): Promise<AuthActionResult> {
  const passwordProblem = validateNewPassword(password);
  if (passwordProblem) return { ok: false, message: passwordProblem };
  try {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, message: describeAuthError(error) };
    return { ok: true, hasSession: Boolean(data.user) };
  } catch {
    return connectionFailure();
  }
}

export async function exchangeCodeForSession(code: string): Promise<AuthActionResult> {
  if (typeof code !== 'string' || code.trim().length === 0) {
    return { ok: false, message: 'El enlace de acceso no contiene un código válido.' };
  }
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code.trim());
    if (error) return { ok: false, message: describeAuthError(error) };
    return { ok: true, hasSession: Boolean(data.session) };
  } catch {
    return connectionFailure();
  }
}

export async function signOut(): Promise<AuthActionResult> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false, message: describeAuthError(error) };
    return { ok: true, hasSession: false };
  } catch {
    return connectionFailure();
  }
}

export async function readSession(): Promise<{ email: string | null }> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { email: null };
    return { email: data.session?.user.email ?? null };
  } catch {
    return { email: null };
  }
}

/**
 * Only same-origin absolute paths are accepted as post-login destinations.
 * Protocol-relative URLs, backslashes and control characters are rejected so a
 * crafted `redirect` query cannot bounce the user to another site.
 */
export function safeRedirectPath(value: string | undefined, fallback = '/'): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.includes('\\')) return fallback;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return fallback;
  }
  if (value.startsWith('/auth-callback') || value.startsWith('/auth/callback')) return fallback;
  return value;
}
