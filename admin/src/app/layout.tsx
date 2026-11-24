import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap', axes: ['opsz'] });

export const metadata: Metadata = {
  title: { default: 'Administration · Financement des projets en outre-mer', template: '%s · Administration' },
  description: 'Interface d’administration (projet universitaire, données fictives uniquement).',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#081f44', width: 'device-width', initialScale: 1 };

// Rendu dynamique volontaire : CSP avec nonce par requête et pages lisant la session.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen">
        <div className="bg-navy-950 px-4 py-2 text-center text-[11px] font-medium tracking-wide text-amber-200 sm:text-xs">
          Projet universitaire — données fictives uniquement. Aucune décision de financement réelle.
        </div>
        {children}
      </body>
    </html>
  );
}
