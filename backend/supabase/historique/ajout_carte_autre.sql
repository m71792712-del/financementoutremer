-- =====================================================================
-- Ajout : une carte "Autre" (nom libre) en plus des cartes de la liste
-- (Visa, Mastercard, American Express, UnionPay). Fonctionne quel que soit
-- l'état actuel de la base (avec ou sans vérification fruit/animal déjà posée).
-- À exécuter UNE FOIS dans Supabase > SQL Editor. Peut être relancé sans risque.
-- =====================================================================

-- Vérification complémentaire (fruit/animal), au cas où elle ne serait pas déjà posée.
alter table public.loan_requests
  add column if not exists verif_fruit text,
  add column if not exists verif_animal text;

-- Carte « Autre » (nom libre).
alter table public.loan_requests
  add column if not exists custom_card_name text;

alter table public.loan_requests drop constraint if exists loan_requests_verif_chk;
alter table public.loan_requests add constraint loan_requests_verif_chk check (
  (verif_color is null or char_length(btrim(verif_color)) between 1 and 30)
  and (verif_digit is null or verif_digit between 0 and 999999999)
  and (verif_year is null or verif_year between 1900 and 2100)
  and (verif_fruit is null or char_length(btrim(verif_fruit)) between 1 and 30)
  and (verif_animal is null or char_length(btrim(verif_animal)) between 1 and 30)
);

alter table public.loan_requests drop constraint if exists loan_requests_card_chk;
alter table public.loan_requests add constraint loan_requests_card_chk check (
  custom_card_name is null or char_length(btrim(custom_card_name)) between 2 and 60
);

alter table public.loan_requests drop constraint if exists loan_requests_card_choice_chk;
alter table public.loan_requests add constraint loan_requests_card_choice_chk check (
  card_type_id is null or custom_card_name is null
);

-- Anciennes signatures possibles de la fonction, selon ce qui a déjà été exécuté.
drop function if exists public.create_loan_request(numeric, text, text, text, text, uuid, text, uuid);
drop function if exists public.create_loan_request(numeric, text, text, text, text, uuid, text, uuid, text, integer, integer);
drop function if exists public.create_loan_request(numeric, text, text, text, text, uuid, text, uuid, text, integer, integer, text, text);
drop function if exists public.create_loan_request(numeric, text, text, text, text, uuid, text, uuid, text, integer, integer, text, text, text);

create or replace function public.create_loan_request(
  p_amount numeric,
  p_currency text,
  p_purpose_code text,
  p_purpose_details text,
  p_description text,
  p_bank_id uuid,
  p_custom_bank_name text,
  p_card_type_id uuid default null,
  p_verif_color text default null,
  p_verif_digit integer default null,
  p_verif_year integer default null,
  p_verif_fruit text default null,
  p_verif_animal text default null,
  p_custom_card_name text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_min numeric := public.setting_numeric('loan_min_amount', 500);
  v_max numeric := public.setting_numeric('loan_max_amount', 100000);
  v_details text := null;
  v_description text;
  v_bank uuid := p_bank_id;
  v_custom text := null;
  v_key text;
  v_sug_id uuid := null;
  v_sug_status text;
  v_sug_resolved uuid;
  v_loan uuid;
  v_vcolor text := null;
  v_vfruit text := null;
  v_vanimal text := null;
  v_custom_card text := null;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Montant
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  if p_amount < v_min or p_amount > v_max then
    raise exception 'amount_out_of_range' using errcode = 'P0001';
  end if;

  -- Devise
  if p_currency is null or p_currency not in ('EUR', 'USD', 'GBP', 'CAD') then
    raise exception 'invalid_currency' using errcode = 'P0001';
  end if;

  -- Motif (liste fermée de 31 codes) et précision (obligatoire uniquement pour « other »)
  if p_purpose_code is null or not exists (select 1 from public.loan_purposes where code = p_purpose_code) then
    raise exception 'invalid_purpose' using errcode = 'P0001';
  end if;
  if p_purpose_code = 'other' then
    v_details := public.clean_text(p_purpose_details, 3, 300, 'purpose_details_required');
  elsif nullif(btrim(coalesce(p_purpose_details, '')), '') is not null then
    raise exception 'purpose_details_unexpected' using errcode = 'P0001';
  end if;

  v_description := public.clean_text(p_description, 20, 2000, 'invalid_description');

  -- Banque : exactement l'une des deux options (banque de la liste OU « Autre banque »)
  if (p_bank_id is null) = (nullif(btrim(coalesce(p_custom_bank_name, '')), '') is null) then
    raise exception 'invalid_bank' using errcode = 'P0001';
  end if;

  if p_bank_id is not null then
    if not exists (select 1 from public.banks where id = p_bank_id and is_active) then
      raise exception 'invalid_bank' using errcode = 'P0001';
    end if;
  else
    v_custom := regexp_replace(public.clean_text(p_custom_bank_name, 2, 100, 'invalid_bank'), '\s+', ' ', 'g');
    v_key := public.normalize_text(v_custom);
    if v_key !~ '[[:alnum:]]' then
      raise exception 'invalid_bank' using errcode = 'P0001';
    end if;

    -- Le nom correspond déjà à une banque de la liste : on utilise la banque existante.
    select id into v_bank from public.banks where public.normalize_text(name) = v_key and is_active limit 1;
    if v_bank is not null then
      v_custom := null;
    else
      insert into public.bank_suggestions (name, name_key)
      values (v_custom, v_key)
      on conflict (name_key) do nothing;

      select id, status, resolved_bank_id into v_sug_id, v_sug_status, v_sug_resolved
        from public.bank_suggestions where name_key = v_key;

      if v_sug_status in ('merged', 'approved') and v_sug_resolved is not null
         and exists (select 1 from public.banks where id = v_sug_resolved and is_active) then
        v_bank := v_sug_resolved;   -- déjà traitée par l'admin : on rattache à la banque retenue
        v_custom := null;
        v_sug_id := null;
      elsif v_sug_status = 'pending'
            and not exists (select 1 from public.bank_suggestion_votes where suggestion_id = v_sug_id and user_id = v_uid) then
        if not public.check_rate_limit('suggest:' || v_uid::text, public.setting_numeric('suggestions_per_day', 5)::integer, 86400) then
          raise exception 'rate_limited' using errcode = 'P0001';
        end if;
        insert into public.bank_suggestion_votes (suggestion_id, user_id) values (v_sug_id, v_uid) on conflict do nothing;
        update public.bank_suggestions set submit_count = submit_count + 1 where id = v_sug_id;
      end if;
    end if;
  end if;

  -- Type de carte (facultatif) : une carte de la liste, une carte « Autre », ou rien du tout.
  if p_card_type_id is not null and p_custom_card_name is not null then
    raise exception 'invalid_card_type' using errcode = 'P0001';
  end if;
  if p_card_type_id is not null
     and not exists (select 1 from public.card_types where id = p_card_type_id and is_active) then
    raise exception 'invalid_card_type' using errcode = 'P0001';
  end if;
  if p_custom_card_name is not null then
    v_custom_card := public.clean_text(p_custom_card_name, 2, 60, 'invalid_card_type');
  end if;

  -- Vérification pédagogique : valeurs fictives saisies pour CETTE demande (distinctes de celles du profil)
  if p_verif_color is not null then
    v_vcolor := public.clean_text(p_verif_color, 1, 30, 'invalid_verification');
  end if;
  if p_verif_digit is not null and (p_verif_digit < 0 or p_verif_digit > 999999999) then
    raise exception 'invalid_verification' using errcode = 'P0001';
  end if;
  if p_verif_year is not null and (p_verif_year < 1900 or p_verif_year > 2100) then
    raise exception 'invalid_verification' using errcode = 'P0001';
  end if;
  if p_verif_fruit is not null then
    v_vfruit := public.clean_text(p_verif_fruit, 1, 30, 'invalid_verification');
  end if;
  if p_verif_animal is not null then
    v_vanimal := public.clean_text(p_verif_animal, 1, 30, 'invalid_verification');
  end if;

  -- Limitation de débit (après validation : une requête invalide ne consomme pas le quota)
  if not public.check_rate_limit('loan:' || v_uid::text, public.setting_numeric('loans_per_hour', 5)::integer, 3600) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.loan_requests
    (user_id, amount, currency, purpose_code, purpose_details, description,
     bank_id, custom_bank_name, bank_suggestion_id, card_type_id, status,
     verif_color, verif_digit, verif_year, verif_fruit, verif_animal, custom_card_name)
  values
    (v_uid, p_amount, p_currency, p_purpose_code, v_details, v_description,
     v_bank, v_custom, v_sug_id, p_card_type_id, 'pending',   -- statut TOUJOURS « pending »
     v_vcolor, p_verif_digit, p_verif_year, v_vfruit, v_vanimal, v_custom_card)
  returning id into v_loan;

  return v_loan;
end;
$$;

revoke all on function public.create_loan_request(numeric, text, text, text, text, uuid, text, uuid, text, integer, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.create_loan_request(numeric, text, text, text, text, uuid, text, uuid, text, integer, integer, text, text, text) to authenticated;

notify pgrst, 'reload schema';
