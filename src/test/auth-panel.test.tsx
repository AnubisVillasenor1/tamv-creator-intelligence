import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  isValidEmail: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  validateNewPassword: (value: string) =>
    value.length < 8
      ? 'La contraseña debe tener al menos 8 caracteres.'
      : value.length > 72
        ? 'La contraseña no puede superar los 72 caracteres.'
        : null,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 72,
}));

vi.mock('@/lib/auth-actions', () => actions);

import { AuthPanel } from '@/components/auth-panel';

const onAuthenticated = vi.fn();

function fill(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  actions.signInWithEmail.mockReset();
  actions.signUpWithEmail.mockReset();
  actions.requestPasswordReset.mockReset();
  actions.updatePassword.mockReset();
  onAuthenticated.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('creator access panel', () => {
  it('does not render social providers that the hosted project has not confirmed', () => {
    render(<AuthPanel onAuthenticated={onAuthenticated} />);
    expect(screen.queryByRole('button', { name: /Google|Lovable|GitHub/i })).not.toBeInTheDocument();
    expect(screen.getByText(/No se crean cuentas anónimas/)).toBeInTheDocument();
  });

  it('caps new passwords at the provider limit and explains the rule', () => {
    render(<AuthPanel initialMode="signup" onAuthenticated={onAuthenticated} />);

    const password = screen.getByLabelText('Contraseña');
    expect(password).toHaveAttribute('maxLength', '72');
    expect(password).toHaveAttribute('aria-describedby', 'auth-password-hint');
    expect(screen.getByText('Entre 8 y 72 caracteres.')).toBeInTheDocument();
  });

  it('signs in and hands control back to the caller', async () => {
    actions.signInWithEmail.mockResolvedValue({ ok: true, hasSession: true });
    render(<AuthPanel onAuthenticated={onAuthenticated} />);

    fill('Correo electrónico', 'creator@example.com');
    fill('Contraseña', 'password1');
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
    expect(actions.signInWithEmail).toHaveBeenCalledWith('creator@example.com', 'password1');
  });

  it('shows the mapped access error and stays on the form', async () => {
    actions.signInWithEmail.mockResolvedValue({ ok: false, message: 'Correo o contraseña incorrectos.' });
    render(<AuthPanel onAuthenticated={onAuthenticated} />);

    fill('Correo electrónico', 'creator@example.com');
    fill('Contraseña', 'wrong-password');
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('validates the local form before calling the service', async () => {
    render(<AuthPanel initialMode="signup" onAuthenticated={onAuthenticated} />);

    fill('Correo electrónico', 'creator@example.com');
    fill('Contraseña', 'password1');
    fill('Confirma la contraseña', 'password2');
    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.');
    expect(actions.signUpWithEmail).not.toHaveBeenCalled();
  });

  it('reports that email confirmation is still required after signup', async () => {
    actions.signUpWithEmail.mockResolvedValue({ ok: true, hasSession: false });
    render(
      <AuthPanel
        initialMode="signup"
        redirectTo="https://app.example.com/auth-callback?next=%2F"
        onAuthenticated={onAuthenticated}
      />,
    );

    fill('Correo electrónico', 'creator@example.com');
    fill('Contraseña', 'password1');
    fill('Confirma la contraseña', 'password1');
    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta/ }));

    expect(await screen.findByRole('status')).toHaveTextContent('Revisa tu correo');
    expect(actions.signUpWithEmail).toHaveBeenCalledWith(
      'creator@example.com',
      'password1',
      'https://app.example.com/auth-callback?next=%2F',
    );
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('requests a reset link with a response that does not disclose account existence', async () => {
    actions.requestPasswordReset.mockResolvedValue({ ok: true, hasSession: false });
    render(<AuthPanel initialMode="reset" onAuthenticated={onAuthenticated} />);

    fill('Correo electrónico', 'creator@example.com');
    fireEvent.click(screen.getByRole('button', { name: /Enviar instrucciones/ }));

    expect(await screen.findByRole('status')).toHaveTextContent('Si existe una cuenta');
    expect(actions.requestPasswordReset).toHaveBeenCalledWith('creator@example.com', undefined);
  });

  it('updates the password from a recovery session', async () => {
    actions.updatePassword.mockResolvedValue({ ok: true, hasSession: true });
    render(<AuthPanel initialMode="recovery" onAuthenticated={onAuthenticated} />);

    expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument();
    fill('Nueva contraseña', 'password1');
    fill('Confirma la contraseña', 'password1');
    fireEvent.click(screen.getByRole('button', { name: /Actualizar contraseña/ }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
    expect(actions.updatePassword).toHaveBeenCalledWith('password1');
  });
});
