import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin, ChevronDown, Compass, FileText, Search, ShieldCheck, UserPlus, Zap, Accessibility, Eye } from 'lucide-react';
import { getT } from '@/lib/i18n';

export default async function HomePage() {
  const { t } = await getT();
  const benefits = [
    { icon: Zap, key: 'fast' },
    { icon: ShieldCheck, key: 'secure' },
    { icon: Accessibility, key: 'accessible' },
    { icon: Compass, key: 'support' },
  ];
  const territories = ['Guadeloupe', 'Martinique', 'Guyane', 'La Réunion', 'Mayotte', 'Saint-Martin', 'Saint-Barthélemy', 'Polynésie française', 'Nouvelle-Calédonie', 'Wallis-et-Futuna', 'Saint-Pierre-et-Miquelon'];
  const steps = [
    { icon: UserPlus, n: 1 },
    { icon: FileText, n: 2 },
    { icon: Search, n: 3 },
    { icon: Eye, n: 4 },
  ];
  return (
    <>
      {/* Hero : la photo contient déjà le logo et le slogan → titre visible uniquement pour les lecteurs d'écran */}
      <section className="mx-auto max-w-[96rem] px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="relative isolate h-[540px] overflow-hidden rounded-[2rem] shadow-lift sm:h-[620px] lg:h-[680px] lg:rounded-[2.5rem]">
          <Image
            src="/images/hero-1536.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            quality={82}
            className="-z-10 object-cover object-[28%_50%] md:object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950/80 via-navy-950/5 to-transparent" aria-hidden />
          <h1 className="sr-only">{t('home.h1')}</h1>
          <div className="absolute left-5 top-5 flex items-center gap-3 sm:left-10 sm:top-9" aria-hidden>
            <span className="rounded-full bg-white p-1 shadow-lift"><Image src="/images/logo-icon.png" alt="" width={60} height={60} className="rounded-full" priority /></span>
            <span className="max-w-[15rem] font-display text-xl font-semibold leading-tight text-white drop-shadow-[0_2px_10px_rgba(8,31,68,0.45)] sm:text-2xl">{t('brand.name')}</span>
          </div>
          <div className="mx-auto flex h-full max-w-7xl items-end px-4 pb-6 sm:px-8 sm:pb-10">
            <div className="w-full max-w-xl animate-fade-up rounded-[1.75rem] border border-white/20 bg-navy-950/55 p-6 text-white shadow-lift backdrop-blur-xl sm:p-8">
              <p className="inline-flex items-center gap-2 rounded-full bg-lagoon-500/25 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-lagoon-200 ring-1 ring-lagoon-300/30">
                <span className="h-1.5 w-1.5 rounded-full bg-lagoon-300" aria-hidden /> {t('home.badge')}
              </p>
              <p className="mt-4 font-display text-xl leading-snug sm:text-2xl">{t('home.subtitle')}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/apply" className="btn btn-green px-7 py-3.5 text-base">
                  {t('home.cta')} <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
                <a href="#how" className="btn border border-white/30 px-6 py-3.5 text-base text-white hover:bg-white/10">{t('how.title')}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="benefits" aria-label={t('benefits.title')} className="relative z-10 mx-auto -mt-12 max-w-6xl scroll-mt-24 px-4 sm:px-6">
        <ul className="grid gap-px overflow-hidden rounded-[1.75rem] border border-line bg-line shadow-lift sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-start gap-4 bg-white p-6 transition hover:bg-lagoon-50/50">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ocean-50 to-lagoon-50 text-ocean-600 ring-1 ring-line"><Icon className="h-5 w-5" aria-hidden /></span>
              <div>
                <p className="font-semibold text-navy-900">{t(`benefit.${key}.title`)}</p>
                <p className="mt-1 text-sm text-slate-500">{t(`benefit.${key}.text`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={t('home.territories')} className="mx-auto mt-20 max-w-6xl px-4 text-center sm:px-6">
        <p className="eyebrow justify-center">{t('home.territories')}</p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2.5">
          {territories.map((name) => (
            <li key={name} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-navy-800 shadow-sm transition hover:-translate-y-0.5 hover:border-lagoon-300 hover:shadow-soft">
              <MapPin className="h-3.5 w-3.5 text-lagoon-600" aria-hidden /> {name}
            </li>
          ))}
        </ul>
      </section>

      <section id="about" className="mx-auto mt-24 grid max-w-6xl scroll-mt-24 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow">{t('nav.about')}</p>
          <h2 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">{t('about.title')}</h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">{t('about.text')}</p>
          <Link href="/register" className="btn btn-primary mt-8 px-7 py-3.5">{t('nav.register')} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-4 -z-10 rotate-3 rounded-[2.5rem] bg-gradient-to-br from-lagoon-200 to-ocean-100" aria-hidden />
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-lift">
            <Image src="/images/panel.webp" alt="" fill sizes="(min-width:1024px) 400px, 80vw" className="object-cover" />
          </div>
          <div className="absolute -bottom-5 -left-5 flex animate-float items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-lift">
            <Image src="/images/logo-icon.png" alt="" width={40} height={40} className="rounded-full" />
            <p className="max-w-[10rem] text-xs font-semibold leading-snug text-navy-900">{t('band.text')}</p>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto mt-32 max-w-6xl scroll-mt-24 px-4 sm:px-6">
        <div className="text-center">
          <p className="eyebrow">01 — 04</p>
          <h2 className="mt-4 text-4xl sm:text-5xl">{t('how.title')}</h2>
        </div>
        <ol className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-[12%] right-[12%] top-10 hidden h-px bg-gradient-to-r from-transparent via-navy-200 to-transparent lg:block" aria-hidden />
          {steps.map(({ icon: Icon, n }) => (
            <li key={n} className="group relative rounded-[1.75rem] border border-line bg-white p-6 pt-8 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-lift">
              <span className="absolute -top-5 left-6 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-navy-800 to-ocean-600 font-display text-xl font-semibold text-white shadow-lift">{n}</span>
              <Icon className="h-6 w-6 text-lagoon-600" aria-hidden />
              <h3 className="mt-4 text-lg">{t(`how.${n}.title`)}</h3>
              <p className="mt-2 text-sm text-slate-500">{t(`how.${n}.text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-navy-900 via-navy-800 to-ocean-600 p-8 shadow-lift sm:p-12">
          <div className="absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-lagoon-400/30 blur-3xl" aria-hidden />
          <div className="absolute -bottom-24 left-1/4 -z-10 h-64 w-64 rounded-full bg-ocean-400/30 blur-3xl" aria-hidden />
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <span className="rounded-full bg-white/15 p-1 ring-1 ring-white/30"><Image src="/images/logo-icon.png" alt="" width={64} height={64} className="rounded-full" /></span>
              <p className="max-w-xl font-display text-2xl leading-snug text-white sm:text-3xl">{t('band.text')}</p>
            </div>
            <Link href="/apply" className="btn btn-green px-8 py-4 text-base">{t('home.cta')} <ArrowRight className="h-5 w-5" aria-hidden /></Link>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto mt-32 max-w-3xl scroll-mt-24 px-4 sm:px-6">
        <div className="text-center">
          <p className="eyebrow">{t('nav.faq')}</p>
          <h2 className="mt-4 text-4xl sm:text-5xl">{t('faq.title')}</h2>
        </div>
        <div className="mt-12 space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <details key={n} className="group rounded-3xl border border-line bg-white shadow-soft transition open:border-lagoon-200 open:shadow-lift">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-navy-900 marker:hidden">
                {t(`faq.${n}.q`)}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-700 transition group-open:rotate-180 group-open:bg-lagoon-100 group-open:text-lagoon-700">
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </span>
              </summary>
              <p className="px-6 pb-6 text-sm leading-relaxed text-slate-600">{t(`faq.${n}.a`)}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
