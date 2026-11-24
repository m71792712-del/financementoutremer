import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';

import { APP_NAME } from '@/lib/config';
import { getT } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/provider';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap', axes: ['opsz'] });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: 'Plateforme universitaire de financement des projets en outre-mer.',
};
export const viewport: Viewport = { themeColor: '#081f44', width: 'device-width', initialScale: 1 };

// Rendu dynamique volontaire : langue lue dans les cookies / en-têtes et CSP avec nonce par requête.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, t } = await getT();
  return (
    <html lang={locale} className={`${sans.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col">
        <I18nProvider locale={locale}>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
            {t('nav.skip')}
          </a>
          
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
