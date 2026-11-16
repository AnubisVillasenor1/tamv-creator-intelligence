/**
 * Reactive Supabase session state for the browser.
 *
 * The hook never runs during SSR, so importing it does not instantiate the
 * Supabase client on the server. A missing hosted configuration degrades to
 * `anonymous` instead of crashing the page; the access form still explains that
 * the service is not configured.
 */

import { useEffect, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';

export type AuthSessionState =
  | { status: 'loading'; email: null }
  | { status: 'authenticated'; email: string | null }
  | { status: 'anonymous'; email: null };

const INITIAL: AuthSessionState = { status: 'loading', email: null };

export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>(INITIAL);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    function apply(email: string | null) {
      if (!active) return;
      setState(email ? { status: 'authenticated', email } : { status: 'anonymous', email: null });
    }

    try {
      void supabase.auth
        .getSession()
        .then(({ data, error }) => {
          if (!active) return;
          apply(error ? null : (data.session?.user.email ?? null));
        })
        .catch(() => apply(null));

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        apply(session?.user.email ?? null);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      apply(null);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return state;
}
