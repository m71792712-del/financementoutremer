import { beforeEach, describe, expect, it, vi } from 'vitest';

const signUp = vi.fn();
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { signUp } }) }));
vi.mock('@/lib/i18n', () => ({ getT: async () => ({ t: (k: string) => k, locale: 'fr' }) }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error('REDIRECT:' + url); } }));
vi.mock('next/headers', () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined, getAll: () => [] }) }));

import { register } from '@/lib/actions/auth';

function form() {
  const fd = new FormData();
  fd.set('lastName', 'Curie'); fd.set('firstName', 'Marie'); fd.set('phone', '+590 690 00 00 00');
  fd.set('email', 'marie@exemple.fr'); fd.set('demoCity', 'Martinique'); fd.set('password', 'Motdepasse1'); fd.set('terms', 'on');
  return fd;
}

describe('après l’inscription : directement la demande', () => {
  beforeEach(() => signUp.mockReset());

  it('session immédiate (confirmation e-mail désactivée) : redirection vers /apply', async () => {
    signUp.mockResolvedValue({ data: { session: { access_token: 'x' }, user: { id: 'u' } }, error: null });
    await expect(register(null, form())).rejects.toThrow('REDIRECT:/apply');
  });

  it('confirmation e-mail activée : le lien de confirmation ramène sur /apply', async () => {
    signUp.mockResolvedValue({ data: { session: null, user: { id: 'u' } }, error: null });
    const res = await register(null, form());
    expect(res).toMatchObject({ ok: true });
    const options = (signUp.mock.calls[0][0] as { options: { emailRedirectTo: string; data: Record<string, string> } }).options;
    expect(options.emailRedirectTo).toMatch(/\/auth\/callback\?next=\/apply$/);
    // et les informations d'inscription partent toujours vers le profil
    expect(options.data).toEqual({ first_name: 'Marie', last_name: 'Curie', phone: '+590 690 00 00 00', demo_city: 'Martinique' });
  });

  it('inscription refusée : on reste sur la page, aucune redirection', async () => {
    signUp.mockResolvedValue({ data: { session: null, user: null }, error: { status: 422, code: 'weak_password', message: 'weak' } });
    const res = await register(null, form());
    expect(res).toMatchObject({ ok: false });
  });
});
