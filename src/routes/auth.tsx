import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AudioLines, LogOut, ShieldCheck } from 'lucide-react';

import { AuthPanel, type AuthMode } from '@/components/auth-panel';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/hooks/use-auth-session';
import { safeRedirectPath, signOut } from '@/lib/auth-actions';

type AuthSearch = {
  mode?: AuthMode;
  redirect?: string;
};

function parseMode(value: unknown): AuthMode | undefined {
  return value === 'signin' || value === 'signup' || value === 'reset' || value === 'recovery'
    ? value
    : undefined;
}

export const Route = createFileRoute('/auth')({
  validateSearch: (search: Record<string, unknown>): AuthSearch => {
    const mode = parseMode(search['mode']);
    const redirect = typeof search['redirect'] === 'string' ? search['redirect'] : undefined;
    return {
      ...(mode ? { mode } : {}),
      ...(redirect ? { redirect } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: 'Acceso de creadores — TAMV PLAY & GO' },
      {
        name: 'description',
        content: 'Inicia sesión, crea una cuenta o recupera tu contraseña para revisar contenido con gobernanza TAMV.',
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, redirect } = Route.useSearch();
  const session = useAuthSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const initialMode: AuthMode = mode ?? 'signin';
  const target = safeRedirectPath(redirect);
  const callbackNext = initialMode === 'reset' ? '/auth?mode=recovery' : target;
  const emailRedirectTo =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}/auth-callback?next=${encodeURIComponent(callbackNext)}`;

  function complete() {
    window.location.assign(target);
  }

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await signOut();
    if (!result.ok) setError(result.message);
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <AudioLines className="text-primary" size={28} />
          <div>
            <div className="font-semibold tracking-tight">
              TAMV<span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">ONLINE NETWORK</span>
            </div>
          </div>
        </div>

        {session.status === 'loading' ? (
          <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
            Comprobando sesión…
          </section>
        ) : session.status === 'authenticated' && initialMode !== 'recovery' ? (
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck size={18} />
              <span className="text-xs font-semibold uppercase tracking-wider">Sesión iniciada</span>
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Tu espacio está listo</h1>
            <p className="mt-2 break-all text-sm text-muted-foreground">{session.email ?? 'Cuenta TAMV'}</p>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              La revisión sigue requiriendo una distribución firmada. Una sesión válida no certifica el release por sí sola.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={complete}>Ir al monitor</Button>
              <Button variant="outline" onClick={handleSignOut} disabled={busy}>
                <LogOut />
                {busy ? 'Saliendo…' : 'Cerrar sesión'}
              </Button>
            </div>
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
          </section>
        ) : (
          <AuthPanel
            key={initialMode}
            initialMode={initialMode}
            redirectTo={emailRedirectTo}
            onAuthenticated={complete}
          />
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <a href="/" className="text-primary hover:underline">
            Volver al monitor
          </a>
        </p>
      </div>
    </main>
  );
}
