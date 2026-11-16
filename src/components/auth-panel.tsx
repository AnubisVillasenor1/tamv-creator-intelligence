import { useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  isValidEmail,
  requestPasswordReset,
  signInWithEmail,
  signUpWithEmail,
  updatePassword,
  validateNewPassword,
  type AuthActionResult,
} from '@/lib/auth-actions';

export type AuthMode = 'signin' | 'signup' | 'reset' | 'recovery';

type AuthPanelProps = {
  initialMode?: AuthMode;
  /**
   * Heading level for the panel title. The access page owns the document
   * heading, so the inline copy nested in a view uses `h2` to avoid two `h1`s.
   */
  headingLevel?: 'h1' | 'h2';
  /**
   * Absolute URL used by confirmation and recovery emails. Declared as
   * `string | undefined` so callers can forward a value computed only in the
   * browser under `exactOptionalPropertyTypes`.
   */
  redirectTo?: string | undefined;
  onAuthenticated: () => void;
};

const COPY: Record<AuthMode, { title: string; subtitle: string; action: string }> = {
  signin: {
    title: 'Inicia sesión',
    subtitle: 'Accede para solicitar una revisión con control humano y trazabilidad.',
    action: 'Iniciar sesión',
  },
  signup: {
    title: 'Crea tu cuenta',
    subtitle: 'La confirmación por correo la decide el proyecto alojado, no este formulario.',
    action: 'Crear cuenta',
  },
  reset: {
    title: 'Recupera tu contraseña',
    subtitle: 'Enviaremos un enlace al correo indicado si la cuenta existe.',
    action: 'Enviar instrucciones',
  },
  recovery: {
    title: 'Nueva contraseña',
    subtitle: 'Establece una contraseña nueva para la sesión abierta por el enlace.',
    action: 'Actualizar contraseña',
  },
};

export function AuthPanel({
  initialMode = 'signin',
  headingLevel = 'h1',
  redirectTo,
  onAuthenticated,
}: AuthPanelProps) {
  const Heading = headingLevel;
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const copy = COPY[mode];

  function switchMode(next: AuthMode) {
    setMode(next);
    setPassword('');
    setConfirm('');
    setError('');
    setNotice('');
  }

  function fail(message: string) {
    setError(message);
  }

  function succeed(result: AuthActionResult) {
    if (!result.ok) {
      fail(result.message);
      return;
    }
    if (mode === 'signin') {
      if (result.hasSession) onAuthenticated();
      else fail('El servicio no devolvió una sesión. Confirma tu correo o inténtalo de nuevo.');
      return;
    }
    if (mode === 'signup') {
      if (result.hasSession) onAuthenticated();
      else
        setNotice(
          'Cuenta creada. Revisa tu correo y confirma la dirección antes de iniciar sesión. No se ha iniciado una sesión automáticamente.',
        );
      return;
    }
    if (mode === 'recovery') {
      setNotice('Contraseña actualizada. Abriendo tu espacio de trabajo…');
      onAuthenticated();
      return;
    }
    setNotice(
      'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña. Revisa también la carpeta de spam.',
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setNotice('');

    if (mode !== 'recovery' && !isValidEmail(email)) {
      fail('Escribe un correo válido.');
      return;
    }
    if (mode === 'signin' && password.length === 0) {
      fail('Escribe tu contraseña.');
      return;
    }
    if (mode === 'signup' || mode === 'recovery') {
      const problem = validateNewPassword(password);
      if (problem) {
        fail(problem);
        return;
      }
      if (password !== confirm) {
        fail('Las contraseñas no coinciden.');
        return;
      }
    }

    setBusy(true);
    try {
      const result =
        mode === 'signin'
          ? await signInWithEmail(email, password)
          : mode === 'signup'
            ? await signUpWithEmail(email, password, redirectTo)
            : mode === 'reset'
              ? await requestPasswordReset(email, redirectTo)
              : await updatePassword(password);
      succeed(result);
    } catch {
      fail('No se pudo completar la operación de acceso. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck size={18} />
        <span className="text-xs font-semibold uppercase tracking-wider">Acceso de creadores</span>
      </div>
      <Heading className="mt-4 text-2xl font-semibold tracking-tight">{copy.title}</Heading>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.subtitle}</p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {mode !== 'recovery' && (
          <div className="space-y-2">
            <Label htmlFor="auth-email">Correo electrónico</Label>
            <Input
              id="auth-email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              disabled={busy}
              required
            />
          </div>
        )}

        {mode !== 'reset' && (
          <div className="space-y-2">
            <Label htmlFor="auth-password">
              {mode === 'recovery' ? 'Nueva contraseña' : 'Contraseña'}
            </Label>
            <Input
              id="auth-password"
              type="password"
              name="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              minLength={mode === 'signin' ? undefined : PASSWORD_MIN_LENGTH}
              maxLength={mode === 'signin' ? undefined : PASSWORD_MAX_LENGTH}
              aria-describedby={mode === 'signin' ? undefined : 'auth-password-hint'}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === 'signin' ? 'Tu contraseña' : `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
              disabled={busy}
              required
            />
            {mode !== 'signin' && (
              <p id="auth-password-hint" className="text-xs leading-5 text-muted-foreground">
                Entre {PASSWORD_MIN_LENGTH} y {PASSWORD_MAX_LENGTH} caracteres.
              </p>
            )}
          </div>
        )}

        {(mode === 'signup' || mode === 'recovery') && (
          <div className="space-y-2">
            <Label htmlFor="auth-confirm">Confirma la contraseña</Label>
            <Input
              id="auth-confirm"
              type="password"
              name="confirm"
              autoComplete="new-password"
              value={confirm}
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              aria-describedby="auth-confirm-hint"
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Repite la contraseña"
              disabled={busy}
              required
            />
            <p id="auth-confirm-hint" className="text-xs leading-5 text-muted-foreground">
              Debe coincidir con la contraseña anterior.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="flex gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 shrink-0" size={16} />
            <span>{notice}</span>
          </p>
        )}

        <Button type="submit" className="h-11 w-full" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="animate-spin" />
              Procesando…
            </>
          ) : (
            <>
              {mode === 'reset' ? <KeyRound /> : null}
              {copy.action}
              <ArrowRight />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
        {mode !== 'signin' && (
          <button type="button" className="text-primary hover:underline" onClick={() => switchMode('signin')}>
            Volver a iniciar sesión
          </button>
        )}
        {mode === 'signin' && (
          <>
            <button type="button" className="text-primary hover:underline" onClick={() => switchMode('signup')}>
              Crear cuenta
            </button>
            <button type="button" className="text-primary hover:underline" onClick={() => switchMode('reset')}>
              Olvidé mi contraseña
            </button>
          </>
        )}
      </div>

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        No se crean cuentas anónimas ni se confirma el correo automáticamente. Los proveedores sociales solo
        aparecen cuando el proyecto alojado los tiene habilitados.
      </p>
    </section>
  );
}
