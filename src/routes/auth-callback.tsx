import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { LoaderCircle } from 'lucide-react';

import { exchangeCodeForSession, readSession, safeRedirectPath } from '@/lib/auth-actions';

export const Route = createFileRoute('/auth-callback')({
  head: () => ({
    meta: [
      { title: 'Verificando acceso — TAMV PLAY & GO' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function finish() {
      const url = new URL(window.location.href);
      // Capture the fragment before Supabase initializes: implicit-flow tokens
      // live there and the client removes them after parsing.
      const initialHash = window.location.hash;
      const code = url.searchParams.get('code');

      if (code) {
        const exchanged = await exchangeCodeForSession(code);
        if (!exchanged.ok) {
          if (active) setError(exchanged.message);
          return;
        }
      }

      const { email } = await readSession();
      if (!active) return;
      if (!email) {
        setError(
          'El enlace no abrió una sesión válida. Puede haber expirado o haberse usado ya. Solicita uno nuevo.',
        );
        return;
      }

      const requestedNext = url.searchParams.get('next');
      const recovery =
        initialHash.includes('type=recovery') || requestedNext?.includes('mode=recovery') === true;
      const next = safeRedirectPath(
        requestedNext ?? (recovery ? '/auth?mode=recovery' : '/'),
      );
      // Replace the URL so tokens in the fragment do not remain in history.
      window.location.replace(next);
    }

    void finish();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="text-lg font-semibold">No se pudo verificar el enlace</h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-muted-foreground">
              {error}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/auth?mode=reset"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Solicitar un enlace nuevo
              </a>
              <a href="/auth" className="text-sm text-primary hover:underline">
                Volver al acceso
              </a>
            </div>
          </>
        ) : (
          <>
            <LoaderCircle className="mx-auto animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              Verificando enlace de acceso…
            </p>
          </>
        )}
      </section>
    </main>
  );
}
