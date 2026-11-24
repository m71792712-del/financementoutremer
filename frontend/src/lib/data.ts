import type { SupabaseClient } from '@supabase/supabase-js';
import { PAGE_SIZE } from '@/lib/config';
import type { Bank, CardType, HistoryRow, LoanRow, Purpose } from '@/types/db';

const LOAN_COLUMNS =
  'id,amount,currency,purpose_code,purpose_details,description,custom_bank_name,custom_card_name,status,created_at,banks(name,slug),card_types(name),loan_purposes(label_fr,label_en)';

export type LoanWithPurpose = LoanRow & { loan_purposes: { label_fr: string; label_en: string } | null };

export async function getReferenceData(supabase: SupabaseClient) {
  const [banks, purposes, cards] = await Promise.all([
    supabase.from('banks').select('id,slug,name,territory,type').eq('is_active', true).order('name', { ascending: true }).limit(500),
    supabase.from('loan_purposes').select('code,label_fr,label_en').order('sort_order', { ascending: true }),
    supabase.from('card_types').select('id,family,name').eq('is_active', true).order('sort_order', { ascending: true }),
  ]);
  return {
    banks: (banks.data ?? []) as Bank[],
    purposes: (purposes.data ?? []) as Purpose[],
    cardTypes: (cards.data ?? []) as CardType[],
  };
}

export async function getLoanStats(supabase: SupabaseClient, userId: string) {
  const count = async (statuses?: string[]) => {
    let q = supabase.from('loan_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (statuses) q = q.in('status', statuses);
    const { count: c } = await q;
    return c ?? 0;
  };
  const [total, inProgress, approved, rejected] = await Promise.all([count(), count(['pending', 'under_review']), count(['approved']), count(['rejected'])]);
  return { total, inProgress, approved, rejected };
}

export async function getLoans(supabase: SupabaseClient, userId: string, page: number, size = PAGE_SIZE) {
  const from = (page - 1) * size;
  const { data, count } = await supabase
    .from('loan_requests')
    .select(LOAN_COLUMNS, { count: 'exact' })
    .eq('user_id', userId) // en plus de la RLS
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + size - 1);
  return { loans: (data ?? []) as unknown as LoanWithPurpose[], total: count ?? 0 };
}

export async function getLoan(supabase: SupabaseClient, userId: string, id: string) {
  const { data } = await supabase.from('loan_requests').select(LOAN_COLUMNS).eq('id', id).eq('user_id', userId).maybeSingle();
  return (data as unknown as LoanWithPurpose | null) ?? null;
}

export async function getHistory(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from('loan_status_history')
    .select('id,old_status,new_status,comment,created_at')
    .eq('loan_id', id)
    .order('created_at', { ascending: true });
  return (data ?? []) as HistoryRow[];
}
