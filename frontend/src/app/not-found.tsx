import Link from 'next/link';
import { getT } from '@/lib/i18n';

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-display text-8xl font-semibold text-transparent bg-gradient-to-br from-ocean-500 to-lagoon-500 bg-clip-text">404</p>
      <h1 className="mt-4 text-3xl sm:text-4xl">{t('error.notFound.title')}</h1>
      <p className="mt-2 text-slate-600">{t('error.notFound.text')}</p>
      <Link href="/" className="btn btn-primary mt-6">{t('error.home')}</Link>
    </main>
  );
}
