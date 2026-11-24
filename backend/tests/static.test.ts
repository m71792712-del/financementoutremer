import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Tests statiques : s'exécutent sans base de données (npm run test:static).
const root = new URL('../supabase/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), 'utf8');
const migrations = readdirSync(new URL('migrations/', root)).filter((f) => f.endsWith('.sql')).sort();
const allMigrations = migrations.map((f) => read(`migrations/${f}`)).join('\n');
const seed = read('seed.sql');
const stripComments = (sql: string) => sql.replace(/--.*$/gm, '');
const code = stripComments(allMigrations);

describe('migrations', () => {
  it('sont numérotées et ordonnées', () => {
    expect(migrations).toHaveLength(4);
    expect([...migrations].sort()).toEqual(migrations);
  });

  it('activent la RLS sur chaque table du schéma public', () => {
    const tables = [...code.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThanOrEqual(11);
    for (const t of tables) {
      expect(code, `RLS manquante sur ${t}`).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`));
    }
  });

  it('fixent search_path sur TOUTES les fonctions', () => {
    const chunks = code.split(/create or replace function /i).slice(1);
    expect(chunks.length).toBeGreaterThanOrEqual(20);
    for (const chunk of chunks) {
      const name = chunk.split('(')[0];
      const header = chunk.split(/\$\$/)[0];
      expect(header, `search_path manquant : ${name}`).toMatch(/set search_path\s*=\s*''/);
    }
  });

  it('n\'accordent rien à anon et n\'utilisent jamais service_role', () => {
    expect(code).not.toMatch(/service_role/i);
    expect(code).not.toMatch(/grant[^;]*\bto\b[^;]*\banon\b/i);
  });

  it('exposent les RPC uniquement à authenticated', () => {
    for (const fn of ['create_loan_request', 'admin_update_loan_status', 'admin_moderate_bank_suggestion', 'admin_stats', 'admin_update_setting', 'delete_my_account', 'admin_delete_user']) {
      expect(code).toMatch(new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to authenticated`));
    }
    expect(code).not.toMatch(/grant execute on function public\.(check_rate_limit|clean_text|handle_new_user)/);
  });

  it('les fonctions admin vérifient admin_access_ok()', () => {
    for (const fn of ['admin_update_loan_status', 'admin_moderate_bank_suggestion', 'admin_stats', 'admin_update_setting', 'admin_delete_user']) {
      const body = code.split(new RegExp(`create or replace function public\\.${fn}`))[1].split(/\n\$\$;/)[0];
      expect(body, fn).toMatch(/admin_access_ok\(\)/);
    }
  });

  it('garantissent un seul admin, un audit en ajout seul et aucun champ carte/CVV', () => {
    expect(code).toMatch(/create unique index profiles_single_admin on public\.profiles \(\(role\)\) where role = 'admin'/);
    expect(code).toMatch(/audit_logs_are_append_only/);
    expect(code).toMatch(/before truncate on public\.audit_logs/);
    expect(/\b(cvv|iban|card_number|pan)\b/i.test(code)).toBe(false);
  });

  it('empêchent les écritures directes sur les demandes', () => {
    expect(code).not.toMatch(/grant[^;]*(insert|update|delete)[^;]*on public\.loan_requests/i);
    expect(code).not.toMatch(/grant[^;]*(insert|update|delete)[^;]*on public\.audit_logs/i);
  });
});

describe('règles de la demande de financement', () => {
  const schema = stripComments(read('migrations/20261021000100_schema.sql'));
  const rpc = stripComments(read('migrations/20261021000300_rpc.sql'));
  const loanFn = rpc.slice(rpc.indexOf('create or replace function public.create_loan_request('), rpc.indexOf('admin_update_loan_status'));

  it('aucune limite de montant (seulement positif)', () => {
    expect(schema).toMatch(/amount\s+numeric\(14, 2\) not null check \(amount > 0\)/);
    expect(code).not.toMatch(/amount_out_of_range|loan_min_amount|loan_max_amount/);
    expect(seed).not.toMatch(/loan_min_amount|loan_max_amount/);
  });

  it('devises limitées à EUR, USD et XPF', () => {
    expect(schema).toMatch(/check \(currency in \('EUR', 'USD', 'XPF'\)\)/);
    expect(loanFn).toMatch(/p_currency not in \('EUR', 'USD', 'XPF'\)/);
    expect(code).not.toMatch(/'GBP'|'CAD'/);
  });

  it('« Autre banque » supprimée : seule une banque enregistrée par l\'admin est acceptée', () => {
    const body = code.split(/create or replace function public\.create_loan_request/)[1].split(/\n\$\$;/)[0];
    expect(body).toMatch(/if p_bank_id is null or nullif\(btrim\(coalesce\(p_custom_bank_name, ''\)\), ''\) is not null then/);
    expect(body).toMatch(/select 1 from public\.banks where id = p_bank_id and is_active/);
    expect(body).not.toMatch(/insert into public\.bank_suggestions/);
  });

  it('l\'admin peut supprimer un utilisateur, jamais le compte administrateur', () => {
    const body = code.split(/create or replace function public\.admin_delete_user/)[1].split(/\n\$\$;/)[0];
    expect(body).toMatch(/admin_access_ok\(\)/);
    expect(body).toMatch(/cannot_delete_admin/);
    expect(body).toMatch(/user\.deleted_by_admin/);
    expect(body).toMatch(/delete from auth\.users where id = p_user_id/);
  });

  it('description facultative (2000 caractères au plus si elle est fournie)', () => {
    expect(schema).toMatch(/description\s+text not null default ''/);
    expect(schema).toMatch(/char_length\(btrim\(description\)\) <= 2000/);
    expect(loanFn).toMatch(/if p_description is null or btrim\(p_description\) = ''/);
    expect(loanFn).toMatch(/clean_text\(p_description, 1, 2000/);
  });

  it('champ « Numéro » (1 à 27 caractères) et « couleur » (1 à 16 chiffres) contrôlés par la base', () => {
    expect(schema).toMatch(/verif_number\s+text/);
    expect(schema).toMatch(/verif_number ~ '\^\[A-Z0-9\]\{1,27\}\$'/);
    expect(loanFn).toMatch(/p_verif_number text default null/);
    expect(loanFn).toMatch(/\^\[0-9\]\{1,16\}\$/);
  });
});

describe('seed.sql', () => {
  const rows = (table: string) => {
    const block = seed.split(new RegExp(`insert into public\\.${table} `))[1].split(/on conflict/)[0];
    return [...block.matchAll(/^\s+\((.*)\),?$/gm)].map((m) => m[1]);
  };

  it('contient 31 motifs uniques dont « other » en dernier', () => {
    const r = rows('loan_purposes');
    expect(r).toHaveLength(31);
    expect(new Set(r.map((x) => x.split(',')[0])).size).toBe(31);
    expect(r[30].startsWith("'other'")).toBe(true);
  });

  it('contient les 4 types de carte (Visa, Mastercard, American Express, UnionPay)', () => {
    const r = rows('card_types');
    expect(r).toHaveLength(4);
    expect(r.map((x) => x.split(',')[1].trim())).toEqual(["'Visa'", "'Mastercard'", "'American Express'", "'UnionPay'"]);
  });

  it('contient les 16 banques, sans doublon, sans territoire', () => {
    const r = rows('banks');
    expect(r).toHaveLength(16);
    const slugs = r.map((x) => x.match(/^'([^']+)'/)![1]);
    expect(new Set(slugs).size).toBe(16);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    const names = r.map((x) => x.split(/',\s*'/)[1].replace(/''/g, "'").toLowerCase());
    expect(new Set(names).size).toBe(16); // aucune banque en double
    for (const n of ['opt nc', 'opt nf', 'revolut', 'bci', 'bnp paribas', 'socredo', 'niupay', 'banque de tahiti']) expect(names).toContain(n);
    for (const x of r) expect(x).toMatch(/'',\s*'(bank|fintech)'\)?,?$/); // territoire vide
  });

  it('est idempotent', () => {
    expect((seed.match(/on conflict/g) ?? []).length).toBe(4);
  });
});

describe('setup_complete.sql', () => {
  it('est à jour (migrations + seed)', () => {
    const setup = read('setup_complete.sql');
    for (const f of migrations) expect(setup).toContain(read(`migrations/${f}`).trim());
    expect(setup).toContain(seed.trim());
  });
});
