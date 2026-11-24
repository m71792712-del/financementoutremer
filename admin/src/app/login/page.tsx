import Image from 'next/image';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/components/Forms';
import { getAdminProfile } from '@/lib/auth';
import { one } from '@/lib/utils';

export const metadata = { title: 'Connexion' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await getAdminProfile()) redirect('/');
  const sp = await searchParams;
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md animate-fade-up flex-col justify-center px-6 py-12">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="rounded-full bg-white p-1 shadow-lift ring-1 ring-line"><Image src="/images/logo-icon.png" alt="" width={64} height={64} className="rounded-full" priority /></span>
        <h1 className="mt-5 text-4xl">Administration</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><ShieldCheck className="h-4 w-4 text-lagoon-600" aria-hidden /> Accès réservé à l’administrateur</p>
      </div>
      <div className="card">
        <LoginForm denied={one(sp.erreur) === 'acces'} />
      </div>
    </main>
  );
}
