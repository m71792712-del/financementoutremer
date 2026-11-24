import { TriangleAlert } from 'lucide-react';
import { getT } from '@/lib/i18n';

export async function DemoBanner() {
  const { t } = await getT();
  return (
    <div role="note" className="bg-navy-950 px-4 py-2 text-center text-[11px] font-medium tracking-wide text-amber-200 sm:text-xs">
      <TriangleAlert className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom text-amber-300" aria-hidden />
      {t('demo.warning')}
    </div>
  );
}
