-- =====================================================================
-- TESTS DE SÉCURITÉ SQL — à exécuter sur un projet Supabase de TEST (jamais la production).
-- Comment : SQL Editor > coller ce fichier > Run. Tout est annulé à la fin (ROLLBACK) : aucune donnée ne reste.
-- Résultat attendu : la dernière ligne « NOTICE: TOUS LES TESTS SQL SONT PASSÉS ». En cas d'échec :
-- une erreur « TEST_FAILED ... » ou « Assertion failed » indique le test fautif.
-- Prérequis : migrations + seed appliqués (supabase/setup_complete.sql).
-- Ce fichier a été exécuté sur PostgreSQL 16 avec les migrations finales.
-- =====================================================================
begin;

create schema tests_tmp;
grant usage on schema tests_tmp to authenticated;

-- Simule la session d'un utilisateur (claims JWT lus par auth.uid() / auth.jwt()).
create function tests_tmp.claims(p_uid uuid, p_aal text default 'aal1') returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$f$;

-- Vérifie qu'une instruction échoue avec un message contenant `p_fragment`.
create function tests_tmp.expect_error(p_sql text, p_fragment text) returns void language plpgsql as $f$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_fragment in sqlerrm) = 0 then
      raise exception 'TEST_FAILED: erreur attendue "%" mais reçu "%" (SQL : %)', p_fragment, sqlerrm, p_sql;
    end if;
    return;
  end;
  raise exception 'TEST_FAILED: aucune erreur pour : %', p_sql;
end;
$f$;

grant execute on all functions in schema tests_tmp to authenticated;

-- Utilisateurs de test (le trigger crée les profils). '00000000-0000-4000-8000-000000000009' n'a pas de métadonnées : valeurs de repli.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-4000-8000-000000000001', 'u1@test.invalid', '{"first_name":"Test","last_name":"Un","phone":"+590 690 00 00 01","demo_color":"Bleu","demo_city":"Test","demo_digit":"7"}'::jsonb, 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000002', 'u2@test.invalid', '{"first_name":"Test","last_name":"Deux","phone":"+590 690 00 00 02"}'::jsonb, 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000003', 'u3@test.invalid', '{"first_name":"Test","last_name":"Trois","role":"admin"}'::jsonb, 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000009', 'adm@test.invalid', '{}'::jsonb, 'authenticated', 'authenticated');

-- ---------------------------------------------------------------------
-- A. Création des profils et données de référence
-- ---------------------------------------------------------------------
do $t$
begin
  reset role;
  assert (select count(*) from public.profiles where id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000009')) = 4, 'A1 profils non créés par le trigger';
  assert (select role from public.profiles where id = '00000000-0000-4000-8000-000000000001') = 'user', 'A2 rôle par défaut';
  assert (select role from public.profiles where id = '00000000-0000-4000-8000-000000000003') = 'user', 'A3 le rôle des métadonnées doit être ignoré';
  assert (select demo_digit from public.profiles where id = '00000000-0000-4000-8000-000000000001') = 7, 'A4 métadonnées démo';
  assert (select first_name from public.profiles where id = '00000000-0000-4000-8000-000000000009') = 'adm', 'A5 valeur de repli du prénom';
  assert (select count(*) from public.loan_purposes) = 31, 'A6 31 motifs attendus';
  assert (select count(*) from public.card_types) = 4, 'A7 4 types de carte attendus (Visa, Mastercard, American Express, UnionPay)';
  assert (select count(*) from public.banks) >= 16, 'A8 16 banques attendues';
  assert (select count(*) from public.banks where territory <> '') = 0, 'A9 plus aucun territoire';
  assert (select count(*) from (select public.normalize_text(name) from public.banks group by 1 having count(*) > 1) d) = 0, 'A10 aucune banque en double';
  raise notice 'OK A : profils et données de référence';
end;
$t$;

-- ---------------------------------------------------------------------
-- B. Un seul administrateur possible
-- ---------------------------------------------------------------------
do $t$
begin
  reset role;
  update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000009';
  perform tests_tmp.expect_error($q$update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000001'$q$, 'profiles_single_admin');
  assert (select count(*) from public.audit_logs where action = 'profile.role_changed') >= 1, 'B1 changement de rôle non journalisé';
  raise notice 'OK B : un seul admin';
end;
$t$;

-- ---------------------------------------------------------------------
-- C. Un utilisateur ne peut pas se promouvoir ni modifier le profil d'autrui
-- ---------------------------------------------------------------------
do $t$
declare n integer;
begin
  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000001');
  set local role authenticated;
  perform tests_tmp.expect_error($q$update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000001'$q$, 'permission denied');
  perform tests_tmp.expect_error($q$update public.profiles set email = 'x@y.z' where id = '00000000-0000-4000-8000-000000000001'$q$, 'permission denied');
  update public.profiles set first_name = 'Nouveau' where id = '00000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'C1 modification de son propre profil refusée';
  update public.profiles set first_name = 'Pirate' where id = '00000000-0000-4000-8000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'C2 modification du profil d''un autre utilisateur possible !';
  assert (select count(*) from public.profiles) = 1, 'C3 un utilisateur ne doit voir que son profil';
  raise notice 'OK C : protection des profils';
end;
$t$;

-- ---------------------------------------------------------------------
-- D. Création d'une demande, isolation entre utilisateurs, écritures directes interdites
-- ---------------------------------------------------------------------
do $t$
declare v_bank uuid; v_loan uuid; n integer;
begin
  reset role;
  select id into v_bank from public.banks where slug = 'lcl';
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000001');
  set local role authenticated;
  v_loan := public.create_loan_request(1500, 'EUR', 'personal', null,
    'Description de test suffisamment longue pour la validation.', v_bank, null, null);
  perform set_config('tests.loan1', v_loan::text, true);

  assert (select status from public.loan_requests where id = v_loan) = 'pending', 'D1 statut initial';
  assert (select count(*) from public.loan_status_history where loan_id = v_loan) = 1, 'D2 historique initial';

  perform tests_tmp.expect_error($q$insert into public.loan_requests (user_id, amount, purpose_code, description, bank_id, status)
    values ('00000000-0000-4000-8000-000000000001', 100, 'personal', 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx', (select id from public.banks limit 1), 'approved')$q$, 'permission denied');
  perform tests_tmp.expect_error($q$update public.loan_requests set status = 'approved'$q$, 'permission denied');
  perform tests_tmp.expect_error($q$delete from public.loan_requests$q$, 'permission denied');
  perform tests_tmp.expect_error($q$insert into public.loan_status_history (loan_id, new_status) values (gen_random_uuid(), 'approved')$q$, 'permission denied');

  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000002');
  set local role authenticated;
  select count(*) into n from public.loan_requests where id = v_loan;
  assert n = 0, 'D3 un utilisateur voit la demande d''un autre !';
  select count(*) into n from public.loan_status_history where loan_id = v_loan;
  assert n = 0, 'D4 un utilisateur voit l''historique d''un autre !';
  raise notice 'OK D : isolation et écritures directes interdites';
end;
$t$;

-- ---------------------------------------------------------------------
-- E. Validation côté base (indépendante du frontend)
-- ---------------------------------------------------------------------
do $t$
begin
  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000001');
  set local role authenticated;
  -- Aucune limite de montant : 1 € et 5 milliards sont acceptés (la création est annulée par le ROLLBACK final).
  perform set_config('tests.loan_nodesc', public.create_loan_request(1, 'EUR', 'personal', null, null, (select id from public.banks where slug='lcl'), null, null)::text, true); -- description absente
  perform set_config('tests.loan_blank', public.create_loan_request(5000000000, 'USD', 'personal', null, '   ', (select id from public.banks where slug='lcl'), null, null)::text, true); -- description vide
  perform public.create_loan_request(150000, 'XPF', 'personal', null, 'x', (select id from public.banks where slug='lcl'), null, null);
  perform tests_tmp.expect_error($q$select public.create_loan_request(0, 'EUR', 'personal', null, 'x', (select id from public.banks where slug='lcl'), null, null)$q$, 'invalid_amount');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000000000000, 'EUR', 'personal', null, 'x', (select id from public.banks where slug='lcl'), null, null)$q$, 'invalid_amount');
  perform tests_tmp.expect_error($q$select public.create_loan_request(-5, 'EUR', 'personal', null, 'Description de test suffisamment longue.', (select id from public.banks where slug='lcl'), null, null)$q$, 'invalid_amount');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000.123, 'EUR', 'personal', null, 'Description de test suffisamment longue.', (select id from public.banks where slug='lcl'), null, null)$q$, 'invalid_amount');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'JPY', 'personal', null, 'Description de test suffisamment longue.', (select id from public.banks where slug='lcl'), null, null)$q$, 'invalid_currency');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'GBP', 'personal', null, 'Description de test suffisamment longue.', (select id from public.banks where slug='lcl'), null, null)$q$, 'invalid_currency');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'CAD', 'personal', null, 'Description de test suffisamment longue.', (select id from public.banks where slug='lcl'), null, null)$q$, 'invalid_currency');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'hack', null, 'Description de test suffisamment longue.', (select id from public.banks where slug='lcl'), null, null)$q$, 'invalid_purpose');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'other', null, 'Description de test suffisamment longue.', (select id from public.banks where slug='lcl'), null, null)$q$, 'purpose_details_required');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'personal', 'texte', 'Description de test suffisamment longue.', (select id from public.banks where slug='lcl'), null, null)$q$, 'purpose_details_unexpected');
  -- Description : facultative (le formulaire n'a plus ce champ) ; absente ou vide -> chaîne vide ; 2000 caractères maximum si fournie.
  assert (select description from public.loan_requests where id = current_setting('tests.loan_nodesc')::uuid) = '', 'E-description absente -> vide';
  assert (select description from public.loan_requests where id = current_setting('tests.loan_blank')::uuid) = '', 'E-description vide -> vide';
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'personal', null, repeat('x', 2001), (select id from public.banks where slug='lcl'), null, null)$q$, 'invalid_description');
  -- Couleur (1 à 16 chiffres, espaces acceptés) et Numéro (1 à 27 lettres/chiffres)
  perform set_config('tests.loan_e', public.create_loan_request(1000, 'EUR', 'personal', null, 'x', (select id from public.banks where slug='lcl'), null, null, '1234 5678 9012 3456', 7, 2027, 'Mangue', 'Iguane', null, 8, 'ab12 cd34 ef56 gh78 ij90 kl12 mn3')::text, true);
  assert (select verif_color from public.loan_requests where id = current_setting('tests.loan_e')::uuid) = '1234567890123456', 'E-couleur enregistrée sans espaces';
  assert (select verif_number from public.loan_requests where id = current_setting('tests.loan_e')::uuid) = 'AB12CD34EF56GH78IJ90KL12MN3', 'E-numéro enregistré en majuscules, sans espaces';
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'personal', null, 'x', (select id from public.banks where slug='lcl'), null, null, 'Bleu', 7, 2027, 'Mangue', 'Iguane', null, 8, null)$q$, 'invalid_verification');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'personal', null, 'x', (select id from public.banks where slug='lcl'), null, null, '12345678901234567', 7, 2027, 'Mangue', 'Iguane', null, 8, null)$q$, 'invalid_verification');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'personal', null, 'x', (select id from public.banks where slug='lcl'), null, null, '1234', 7, 2027, 'Mangue', 'Iguane', null, 8, 'AB12CD34EF56GH78IJ90KL12MN34')$q$, 'invalid_verification'); -- 28 caractères : refusé
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'personal', null, 'Description de test suffisamment longue.', (select id from public.banks where slug='lcl'), 'Autre', null)$q$, 'invalid_bank');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'personal', null, 'Description de test suffisamment longue.', null, null, null)$q$, 'invalid_bank');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'personal', null, 'Description de test suffisamment longue.', gen_random_uuid(), null, null)$q$, 'invalid_bank');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'personal', null, 'Description de test suffisamment longue.', null, '!!!', null)$q$, 'invalid_bank');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'personal', null, 'Description de test suffisamment longue.', (select id from public.banks where slug='lcl'), null, gen_random_uuid())$q$, 'invalid_card_type');
  -- Les créations réussies ci-dessus ont consommé une partie du quota horaire de cet utilisateur : on le remet à zéro.
  reset role;
  delete from public.rate_limits;
  raise notice 'OK E : validations';
end;
$t$;

-- ---------------------------------------------------------------------
-- F. Limitation de débit : 5 demandes par heure et par utilisateur
-- ---------------------------------------------------------------------
do $t$
declare i integer;
begin
  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000003');
  set local role authenticated;
  for i in 1..5 loop
    perform public.create_loan_request(1000, 'EUR', 'travel', null, 'Description de test suffisamment longue.',
      (select id from public.banks where slug = 'lcl'), null, null);
  end loop;
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'travel', null, 'Description de test suffisamment longue.', (select id from public.banks where slug='lcl'), null, null)$q$, 'rate_limited');
  raise notice 'OK F : limitation de débit';
end;
$t$;

-- ---------------------------------------------------------------------
-- G. Plus d'« Autre banque » : seule une banque enregistrée par l'admin est acceptée
-- ---------------------------------------------------------------------
do $t$
begin
  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000001');
  set local role authenticated;
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'travel', null, 'x', null, '  Banque   Locale ', null)$q$, 'invalid_bank');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'travel', null, 'x', null, 'lcl', null)$q$, 'invalid_bank');
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'travel', null, 'x', (select id from public.banks where slug='lcl'), 'Banque Locale', null)$q$, 'invalid_bank');
  perform public.create_loan_request(1000, 'EUR', 'travel', null, 'Description de test suffisamment longue.', (select id from public.banks where slug = 'lcl'), null, null);
  perform public.create_loan_request(1000, 'EUR', 'travel', null, 'Description de test suffisamment longue.', (select id from public.banks where slug = 'lcl'), null, null);

  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000002');
  set local role authenticated;
  perform tests_tmp.expect_error($q$select public.create_loan_request(1000, 'EUR', 'travel', null, 'x', null, 'banque locale', null)$q$, 'invalid_bank');
  perform public.create_loan_request(1000, 'EUR', 'travel', null, 'Description de test suffisamment longue.', (select id from public.banks where slug = 'lcl'), null, null);
  perform public.create_loan_request(1000, 'EUR', 'travel', null, 'Description de test suffisamment longue.', (select id from public.banks where slug = 'lcl'), null, null);
  -- « Autre (à préciser) » reste valide pour le MOTIF
  perform public.create_loan_request(1000, 'EUR', 'other', 'Achat de matériel agricole', 'Description de test suffisamment longue.',
    (select id from public.banks where slug = 'lcl'), null, null);

  reset role;
  assert (select count(*) from public.bank_suggestions) = 0, 'G1 aucune suggestion de banque ne doit être créée';
  assert (select count(*) from public.loan_requests where custom_bank_name is not null) = 0, 'G2 aucune demande avec un nom de banque libre';
  raise notice 'OK G : seules les banques enregistrées par l''admin sont acceptées';
end;
$t$;

-- ---------------------------------------------------------------------
-- H. Un utilisateur simple n'a accès à aucune fonction ni donnée d'administration
-- ---------------------------------------------------------------------
do $t$
declare n integer;
begin
  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000001');
  set local role authenticated;
  perform tests_tmp.expect_error($q$select public.admin_stats()$q$, 'forbidden');
  perform tests_tmp.expect_error($q$select public.admin_update_loan_status(gen_random_uuid(), 'approved', 'commentaire')$q$, 'forbidden');
  perform tests_tmp.expect_error($q$select public.admin_moderate_bank_suggestion(gen_random_uuid(), 'reject')$q$, 'forbidden');
  perform tests_tmp.expect_error($q$select public.admin_update_setting('loans_per_hour', '50'::jsonb)$q$, 'forbidden');
  assert (select count(*) from public.audit_logs) = 0, 'H1 journal d''audit visible';
  assert (select count(*) from public.bank_suggestions) = 0, 'H2 suggestions visibles';
  assert (select count(*) from public.app_settings) = 0, 'H3 les réglages ne sont visibles que de l''admin';
  perform tests_tmp.expect_error($q$select * from public.rate_limits$q$, 'permission denied');
  perform tests_tmp.expect_error($q$select * from public.bank_suggestion_votes$q$, 'permission denied');
  perform tests_tmp.expect_error($q$insert into public.banks (slug, name) values ('pirate', 'Banque Pirate')$q$, 'row-level security');
  update public.banks set name = 'Banque piratée' where slug = 'lcl';
  get diagnostics n = row_count;
  assert n = 0, 'H4 modification d''une banque par un utilisateur !';
  delete from public.banks where slug = 'lcl';
  get diagnostics n = row_count;
  assert n = 0, 'H5 suppression d''une banque par un utilisateur !';
  raise notice 'OK H : aucune fonction admin pour un utilisateur';
end;
$t$;

-- ---------------------------------------------------------------------
-- I. Administrateur : changement de statut, historique, audit, réglages, MFA optionnel
-- ---------------------------------------------------------------------
do $t$
declare v_loan uuid := current_setting('tests.loan1')::uuid; n integer;
begin
  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000009', 'aal1');
  set local role authenticated;

  assert ((public.admin_stats()) ->> 'users')::integer >= 4, 'I1 statistiques';
  assert (select count(*) from public.loan_requests) >= 8, 'I2 l''admin doit voir toutes les demandes';
  assert (select count(*) from public.profiles) >= 4, 'I3 l''admin doit voir tous les profils';

  perform public.admin_update_loan_status(v_loan, 'under_review', 'Dossier en cours d''examen');
  assert (select count(*) from public.loan_status_history where loan_id = v_loan) = 2, 'I4 historique après changement';
  perform tests_tmp.expect_error(format($q$select public.admin_update_loan_status(%L, 'under_review', 'Encore')$q$, v_loan), 'status_unchanged');
  perform tests_tmp.expect_error(format($q$select public.admin_update_loan_status(%L, 'pirate', 'Commentaire')$q$, v_loan), 'invalid_status');
  perform tests_tmp.expect_error(format($q$select public.admin_update_loan_status(%L, 'approved', 'ab')$q$, v_loan), 'invalid_comment');
  perform tests_tmp.expect_error($q$select public.admin_update_loan_status(gen_random_uuid(), 'approved', 'Commentaire')$q$, 'not_found');
  assert (select count(*) from public.audit_logs where action = 'loan.status_changed') >= 1, 'I5 audit du changement de statut';

  -- réglages : validation stricte
  perform tests_tmp.expect_error($q$select public.admin_update_setting('loan_min_amount', '300'::jsonb)$q$, 'invalid_setting'); -- plus de limite de montant
  perform tests_tmp.expect_error($q$select public.admin_update_setting('loans_per_hour', '0'::jsonb)$q$, 'invalid_setting');
  perform tests_tmp.expect_error($q$select public.admin_update_setting('une_cle_inconnue', '1'::jsonb)$q$, 'invalid_setting');
  perform tests_tmp.expect_error($q$select public.admin_update_setting('loans_per_hour', '"abc"'::jsonb)$q$, 'invalid_setting');
  perform public.admin_update_setting('loans_per_hour', '7'::jsonb);
  -- anti-verrouillage : impossible d'imposer le MFA depuis une session sans MFA
  perform tests_tmp.expect_error($q$select public.admin_update_setting('require_admin_mfa', 'true'::jsonb)$q$, 'mfa_enrollment_required');

  -- l'utilisateur voit le commentaire administratif dans son historique
  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000001');
  set local role authenticated;
  assert (select count(*) from public.loan_status_history where loan_id = v_loan) = 2, 'I6 historique visible du propriétaire';

  reset role;
  assert (select value from public.app_settings where key = 'loans_per_hour') = '7'::jsonb, 'I7 réglage enregistré';
  update public.app_settings set value = '5'::jsonb where key = 'loans_per_hour';
  raise notice 'OK I : fonctions administrateur';
end;
$t$;

do $t$
declare n integer;
begin
  -- MFA imposé : une session aal1 est refusée, une session aal2 est acceptée.
  reset role;
  update public.app_settings set value = 'true'::jsonb where key = 'require_admin_mfa';

  perform tests_tmp.claims('00000000-0000-4000-8000-000000000009', 'aal1');
  set local role authenticated;
  perform tests_tmp.expect_error($q$select public.admin_stats()$q$, 'forbidden');
  assert (select count(*) from public.loan_requests) = 0, 'I8 admin sans MFA : lecture globale refusée';

  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000009', 'aal2');
  set local role authenticated;
  assert ((public.admin_stats()) ->> 'loans')::integer >= 8, 'I9 admin avec MFA';
  perform public.admin_update_setting('require_admin_mfa', 'false'::jsonb);

  reset role;
  assert (select value from public.app_settings where key = 'require_admin_mfa') = 'false'::jsonb, 'I10 MFA désactivé';
  raise notice 'OK I bis : MFA optionnel';
end;
$t$;

-- ---------------------------------------------------------------------
-- J. Modération des anciennes suggestions « Autre banque » (fonction conservée pour les données existantes)
-- ---------------------------------------------------------------------
do $t$
declare v_sug uuid; v_bank uuid; v_sug2 uuid; v_sug3 uuid; v_mutuel uuid; v_loan uuid;
begin
  reset role;
  -- Anciennes suggestions « Autre banque » (les utilisateurs n'en créent plus : on les insère directement).
  insert into public.bank_suggestions (name, name_key, submit_count) values ('Banque Locale', 'banque locale', 2) returning id into v_sug;
  insert into public.bank_suggestions (name, name_key, submit_count) values ('Zeta Crédit', 'zeta credit', 1);
  insert into public.bank_suggestions (name, name_key, submit_count) values ('Crédit Mutuel Antilles', 'credit mutuel antilles', 1);
  insert into public.loan_requests (user_id, amount, purpose_code, custom_bank_name, bank_suggestion_id)
    select u, 1000, 'travel', 'Banque Locale', v_sug
    from unnest(array['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002']::uuid[]) as u;
  insert into public.loan_requests (user_id, amount, purpose_code, custom_bank_name, bank_suggestion_id)
    select '00000000-0000-4000-8000-000000000002', 1000, 'travel', 'Zeta Crédit', id from public.bank_suggestions where name_key = 'zeta credit';
  insert into public.loan_requests (user_id, amount, purpose_code, custom_bank_name, bank_suggestion_id)
    select '00000000-0000-4000-8000-000000000002', 1000, 'travel', 'Crédit Mutuel Antilles', id from public.bank_suggestions where name_key = 'credit mutuel antilles';

  select id into v_sug from public.bank_suggestions where name_key = 'banque locale';
  select id into v_mutuel from public.banks where slug = 'credit-mutuel';

  perform tests_tmp.claims('00000000-0000-4000-8000-000000000009', 'aal1');
  set local role authenticated;
  v_bank := public.admin_moderate_bank_suggestion(v_sug, 'approve', null, 'Territoire test', 'bank');
  perform tests_tmp.expect_error(format($q$select public.admin_moderate_bank_suggestion(%L, 'approve')$q$, v_sug), 'already_reviewed');

  reset role;
  assert (select name from public.banks where id = v_bank) = 'Banque Locale', 'J1 banque créée';
  assert (select status from public.bank_suggestions where id = v_sug) = 'approved', 'J2 statut approuvé';
  assert (select count(*) from public.loan_requests where bank_suggestion_id = v_sug and bank_id = v_bank and custom_bank_name is null) = 3,
    'J3 les 3 demandes doivent être rattachées à la nouvelle banque';
  assert (select count(*) from public.audit_logs where action = 'bank_suggestion.approve') = 1, 'J4 audit';
  assert (select count(*) from public.audit_logs where action = 'bank.created') >= 1, 'J5 audit de la création de banque';

  -- rejet et fusion
  select id into v_sug2 from public.bank_suggestions where name_key = 'zeta credit';
  select id into v_sug3 from public.bank_suggestions where name_key = 'credit mutuel antilles';
  assert v_sug2 is not null and v_sug3 is not null, 'J6 suggestions créées (accents ignorés dans la clé)';

  perform tests_tmp.claims('00000000-0000-4000-8000-000000000009', 'aal1');
  set local role authenticated;
  perform public.admin_moderate_bank_suggestion(v_sug2, 'reject');
  perform public.admin_moderate_bank_suggestion(v_sug3, 'merge', v_mutuel);
  perform tests_tmp.expect_error($q$select public.admin_moderate_bank_suggestion(gen_random_uuid(), 'merge', gen_random_uuid())$q$, 'not_found');

  reset role;
  assert (select status from public.bank_suggestions where id = v_sug2) = 'rejected', 'J7 rejet';
  assert (select count(*) from public.loan_requests where bank_suggestion_id = v_sug2 and custom_bank_name = 'Zeta Crédit') = 1, 'J8 la demande rejetée garde le nom saisi';
  assert (select count(*) from public.loan_requests where bank_suggestion_id = v_sug3 and bank_id = v_mutuel and custom_bank_name is null) = 1, 'J9 fusion';
  raise notice 'OK J : modération des suggestions';
end;
$t$;

-- ---------------------------------------------------------------------
-- K. Le journal d'audit est en ajout seul (même pour le propriétaire)
-- ---------------------------------------------------------------------
do $t$
begin
  reset role;
  perform tests_tmp.expect_error($q$update public.audit_logs set action = 'x'$q$, 'append_only');
  perform tests_tmp.expect_error($q$delete from public.audit_logs$q$, 'append_only');
  perform tests_tmp.expect_error($q$truncate public.audit_logs$q$, 'append_only');
  raise notice 'OK K : audit en ajout seul';
end;
$t$;

-- ---------------------------------------------------------------------
-- L. Suppression de compte (RGPD) : l'utilisateur oui, l'admin non
-- ---------------------------------------------------------------------
do $t$
begin
  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000009', 'aal1');
  set local role authenticated;
  perform tests_tmp.expect_error($q$select public.delete_my_account()$q$, 'cannot_delete_admin');

  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000002');
  set local role authenticated;
  perform public.delete_my_account();

  reset role;
  assert not exists (select 1 from auth.users where id = '00000000-0000-4000-8000-000000000002'), 'L1 compte d''authentification supprimé';
  assert not exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000002'), 'L2 profil supprimé';
  assert not exists (select 1 from public.loan_requests where user_id = '00000000-0000-4000-8000-000000000002'), 'L3 demandes supprimées';
  assert (select count(*) from public.audit_logs where action = 'account.deleted' and actor_id = '00000000-0000-4000-8000-000000000002') = 1, 'L4 suppression journalisée';
  raise notice 'OK L : suppression de compte';
end;
$t$;

-- ---------------------------------------------------------------------
-- M. L'admin peut supprimer n'importe quel utilisateur (jamais le compte administrateur)
-- ---------------------------------------------------------------------
do $t$
begin
  reset role;
  -- un utilisateur simple ne peut pas
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000001');
  set local role authenticated;
  perform tests_tmp.expect_error($q$select public.admin_delete_user('00000000-0000-4000-8000-000000000003')$q$, 'forbidden');

  -- l'admin supprime un utilisateur, pas lui-même, pas un inconnu
  reset role;
  perform tests_tmp.claims('00000000-0000-4000-8000-000000000009', 'aal1');
  set local role authenticated;
  perform tests_tmp.expect_error($q$select public.admin_delete_user('00000000-0000-4000-8000-000000000009')$q$, 'cannot_delete_admin');
  perform tests_tmp.expect_error($q$select public.admin_delete_user(gen_random_uuid())$q$, 'not_found');
  perform public.admin_delete_user('00000000-0000-4000-8000-000000000001');

  reset role;
  assert not exists (select 1 from auth.users where id = '00000000-0000-4000-8000-000000000001'), 'M1 compte d''authentification supprimé';
  assert not exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000001'), 'M2 profil supprimé';
  assert not exists (select 1 from public.loan_requests where user_id = '00000000-0000-4000-8000-000000000001'), 'M3 demandes supprimées';
  assert (select count(*) from public.audit_logs where action = 'user.deleted_by_admin' and entity_id = '00000000-0000-4000-8000-000000000001') = 1, 'M4 suppression journalisée';
  raise notice 'OK M : suppression d''un utilisateur par l''admin';
end;
$t$;

do $t$
begin
  raise notice 'TOUS LES TESTS SQL SONT PASSÉS';
end;
$t$;

rollback;
