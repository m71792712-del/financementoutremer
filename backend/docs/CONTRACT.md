# CONTRACT.md — contrat d'interface du backend

> Projet universitaire « Financement des projets en outre-mer » — **données fictives uniquement**.
> Le **frontend** et l'**admin** se conforment à ce document. Toute modification du backend qui change ce contrat doit être reportée ici (version en bas).
> ⚠ Ce contrat décrit le SQL livré ; il n'a pas pu être exécuté contre une vraie base dans l'environnement de rédaction (voir README, « Ce qui est testé »).

## 1. Architecture

```
 Navigateur ──► Frontend (https://erere.vercel.app)      ─┐
 Navigateur ──► Admin    (https://erereadmin.vercel.app) ─┼─► Supabase : Auth + PostgREST (tables protégées par RLS + fonctions RPC)
```

- Les deux applications utilisent **uniquement** l'URL du projet et la clé **anon/publishable**. Aucune clé `service_role`.
- Les cookies de session sont **séparés** (deux domaines `*.vercel.app` distincts) : se connecter au site ne connecte pas à l'admin.
- Toute écriture sensible passe par une **fonction RPC** (validation, limitation de débit, audit en base). Le frontend valide aussi (Zod) pour l'ergonomie, mais **la base fait foi**.

## 2. Variables d'environnement

| Variable | Frontend | Admin | Rôle |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | oui | oui | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | oui | oui | clé anon / publishable (publique, protégée par RLS) |
| `NEXT_PUBLIC_SITE_URL` | `https://erere.vercel.app` | `https://erereadmin.vercel.app` | URL de **l'application elle-même** (redirections e-mail) |
| `NEXT_PUBLIC_CAPTCHA_ENABLED` | `false` par défaut | — | active Turnstile (voir SECURITY.md) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | si CAPTCHA | — | clé publique Turnstile |
| `ADMIN_REQUIRE_MFA` | — | `false` par défaut | l'admin impose l'enrôlement/la vérification MFA (en plus du réglage base `require_admin_mfa`) |

Côté Supabase (Dashboard ou `config.toml`) : `site_url` = URL du site, redirections autorisées = les **deux** domaines + localhost.
Aucune variable secrète n'est nécessaire dans les applications.

## 3. Authentification

- Inscription : `supabase.auth.signUp({ email, password, options: { data: { first_name, last_name, phone, demo_city }, captchaToken? } })`.
  - `first_name`, `last_name` (≤ 60 car.), `phone` (6–20 car. : chiffres, espaces, `+ ( ) . -`), `demo_city` (≤ 60 car.) = **pays** : le formulaire propose une liste (Guyane française, Polynésie française, Nouvelle-Calédonie, Wallis-et-Futuna, Martinique, La Réunion, Guadeloupe, Saint-Pierre-et-Miquelon) **ou** un nom saisi librement. Le nom de la colonne reste `demo_city`.
  - `demo_color` et `demo_digit` ne sont plus demandés à l'inscription (colonnes conservées, facultatives, jamais requises).
  - Le **trigger** `handle_new_user` crée la ligne `profiles` avec le rôle `user` **toujours** (le rôle des métadonnées est ignoré). Il ne lève pas d'erreur : valeurs de repli si un champ manque. **Le frontend doit donc imposer les champs obligatoires.**
- Mot de passe : **8 caractères minimum, au moins une lettre et un chiffre** (appliqué par Supabase Auth ; le frontend le vérifie aussi).
- Connexion : e-mail + mot de passe (`signInWithPassword`). Pas de SMS.
- Rôle : `profiles.role` ∈ `user | admin`. **Un seul admin** (index unique). Promotion uniquement par SQL (`supabase/promote_admin.sql`).
- MFA : TOTP disponible. Imposé aux fonctions/lectures admin si `app_settings.require_admin_mfa = true` (alors le JWT doit avoir `aal = aal2`). Défaut : `false`.

## 4. Tables (RLS activée partout)

Légende accès : **L** = lecture via API, **—** = aucun accès direct (passer par les RPC).

| Table | Colonnes principales | Utilisateur | Admin |
|---|---|---|---|
| `profiles` | `id`, `first_name`, `last_name`, `phone`, `email`, `role`, `demo_color`, `demo_city`, `demo_digit`, `created_at`, `updated_at` | L sa ligne ; **U** (update) de `first_name,last_name,phone,demo_*` uniquement | L tout |
| `banks` | `id`, `slug`, `name`, `territory` (ancien champ, toujours vide), `type` (`bank`/`fintech`), `is_active`, `created_at`, `updated_at` | L tout | L, insert, update, delete (audités) |
| `bank_suggestions` | `id`, `name`, `name_key`, `submit_count`, `status` (`pending`/`approved`/`rejected`/`merged`), `resolved_bank_id`, `reviewed_by`, `reviewed_at`, `created_at` | — | L (écriture via `admin_moderate_bank_suggestion`) |
| `bank_suggestion_votes` | `suggestion_id`, `user_id` | — | — |
| `card_types` | `id`, `family`, `name`, `sort_order`, `is_active` | L | L |
| `loan_purposes` | `code`, `sort_order`, `label_fr`, `label_en`, `requires_details` | L | L |
| `loan_requests` | `id`, `user_id`, `amount`, `currency`, `purpose_code`, `purpose_details`, `description`, `bank_id`, `custom_bank_name`, `bank_suggestion_id`, `card_type_id`, `status`, `created_at`, `updated_at` | L les siennes | L toutes |
| `loan_status_history` | `id`, `loan_id`, `old_status`, `new_status`, `comment`, `changed_by`, `created_at` | L (ses demandes) | L tout |
| `audit_logs` | `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `details`, `created_at` | — | L (append-only) |
| `app_settings` | `key`, `value` (jsonb) | — | L tout (écriture via `admin_update_setting`) |
| `rate_limits` | — | — | — |

Règles de données importantes :
- `loan_requests` : `bank_id` obligatoire pour toute nouvelle demande (banque enregistrée par l'admin) ; `custom_bank_name` ne subsiste que sur d'anciennes demandes ; `purpose_details` renseigné **uniquement** si `purpose_code = 'other'`.
- `status` ∈ `pending | under_review | approved | rejected`. À la création : toujours `pending`. Le « refus » affiché à l'utilisateur après l'animation est une **simulation visuelle** : il n'est pas enregistré.
- `amount` : `numeric(14,2)`, renvoyé par PostgREST comme nombre. **Aucune limite minimum ni maximum** : seulement positif, 2 décimales au plus (plafond technique de la colonne : 999 999 999 999,99).
- `currency` ∈ `EUR | USD | XPF`.
- `description` : **facultative** (le formulaire, en 3 étapes, n'a plus ce champ ; il envoie `p_description = null`). Absente ou vide → chaîne vide ; si elle est fournie : 2000 caractères au plus. Les descriptions des anciennes demandes sont conservées.
- Vérifications saisies à la demande : `verif_number` (étape 1, **1 à 27 lettres/chiffres**, enregistré en majuscules sans espaces), `verif_color` (étape 2, **1 à 16 chiffres**, espaces acceptés puis retirés), `verif_digit`, `verif_month` + `verif_year` (saisie `MM/AA` → mois 1–12 et année 2025–2100 ; « 00 » = 2100), `verif_fruit`, `verif_animal`.
- Type de carte : le formulaire impose le choix (liste + « Autre carte ») ; la base reste tolérante (`card_type_id` et `custom_card_name` peuvent être nuls).

### Exemples de requêtes (PostgREST / supabase-js)

```ts
// Mes demandes (pagination par clé : created_at desc, id desc)
supabase.from('loan_requests')
  .select('id,amount,currency,purpose_code,status,created_at,banks(name,slug),loan_purposes(label_fr,label_en)')
  .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(10)
// page suivante : .or(`created_at.lt.${last.created_at},and(created_at.eq.${last.created_at},id.lt.${last.id})`)

// Admin : demandes avec filtres et demandeur
supabase.from('loan_requests')
  .select('*, profiles(first_name,last_name,email,phone), banks(name), loan_purposes(label_fr)', { count: 'estimated' })
  .eq('status', 'pending').eq('purpose_code', 'personal').order('created_at', { ascending: false }).range(0, 9)
```
Utilisez `count: 'estimated'` ou 'planned' sur les grandes listes ; `exact` seulement si nécessaire. Le serveur plafonne à 500 lignes (`max_rows`).
Recherche admin sur les utilisateurs : `.or('first_name.ilike.%x%,last_name.ilike.%x%,email.ilike.%x%')` après **échappement** de `%`, `,`, `(`, `)`, `*` côté application.

## 5. Fonctions RPC

Toutes : `supabase.rpc(nom, params)`, réservées aux utilisateurs connectés. Erreur = `error.message` contient un **code machine** (ci-dessous).

| Fonction | Paramètres | Retour | Qui |
|---|---|---|---|
| `create_loan_request` | `p_amount numeric, p_currency text, p_purpose_code text, p_purpose_details text, p_description text, p_bank_id uuid, p_custom_bank_name text`, puis facultatifs : `p_card_type_id uuid, p_verif_color text, p_verif_digit integer, p_verif_year integer, p_verif_fruit text, p_verif_animal text, p_custom_card_name text, p_verif_month integer, p_verif_number text` (tous `default null`) | `uuid` (id de la demande) | utilisateur |
| `admin_update_loan_status` | `p_loan_id uuid, p_new_status text, p_comment text` (3–500 car., obligatoire) | `void` | admin |
| `admin_moderate_bank_suggestion` | `p_suggestion_id uuid, p_action text` (`approve`/`reject`/`merge`)`, p_target_bank_id uuid default null, p_territory text default '', p_type text default 'bank'` | `uuid` (banque créée / retenue, ou null si rejet) | admin |
| `admin_stats` | — | `jsonb` : `users, loans, loans_last_7_days, banks_active, pending_suggestions, by_status{…}` | admin |
| `admin_update_setting` | `p_key text, p_value jsonb` ; clés : `loans_per_hour` (1–100), `suggestions_per_day` (1–50), `require_admin_mfa` (bool) | `void` | admin |
| `delete_my_account` | — | `void` (supprime compte + profil + demandes) | utilisateur (pas l'admin) |
| `admin_delete_user` | `p_user_id uuid` | `void` (supprime compte + profil + demandes ; journalisé `user.deleted_by_admin`) ; erreurs `forbidden`, `not_found`, `cannot_delete_admin` | admin (jamais le compte administrateur) |

`create_loan_request` :
- **Banque de la liste** : `p_bank_id` renseigné, `p_custom_bank_name = null`.
- **Plus d'« Autre banque »** : `p_bank_id` est obligatoire (banque active enregistrée par l'admin) et `p_custom_bank_name` doit rester `null`, sinon `invalid_bank`. Aucune suggestion n'est plus créée ; les anciennes suggestions restent consultables et modérables.
- Le statut est toujours `pending`. Limite : **5 demandes/heure/utilisateur** (réglable).

### Codes d'erreur

| Code (`message`) | Signification | HTTP indicatif |
|---|---|---|
| `not_authenticated` | pas de session valide | 403 |
| `forbidden` | rôle admin requis (ou MFA requis si activé) | 403 |
| `invalid_amount` | montant non numérique, ≤ 0, plus de 2 décimales ou supérieur à 999 999 999 999,99 | 400 |
| `invalid_currency` | devise autre que `EUR`, `USD`, `XPF` | 400 |
| `invalid_purpose` | code de motif inconnu | 400 |
| `purpose_details_required` | « other » sans précision (3–300 car.) | 400 |
| `purpose_details_unexpected` | précision fournie pour un motif ≠ « other » | 400 |
| `invalid_description` | description fournie de plus de 2000 caractères, ou avec caractères de contrôle | 400 |
| `invalid_bank` | banque inconnue/inactive, deux choix ou aucun, nom invalide | 400 |
| `invalid_card_type` | type de carte inconnu/inactif | 400 |
| `rate_limited` | quota dépassé (demandes ou suggestions) | 400 |
| `invalid_status` / `invalid_comment` / `status_unchanged` | changement de statut invalide | 400 |
| `not_found` | élément introuvable | 404 |
| `invalid_action` / `invalid_type` / `already_reviewed` / `bank_exists` | modération de suggestion | 400 |
| `invalid_setting` / `mfa_enrollment_required` | réglage invalide / MFA à activer depuis une session MFA | 400 |
| `cannot_delete_admin` | le compte admin ne peut pas être supprimé | 400 |

Le frontend traduit ces codes (FR/EN) et n'affiche **jamais** le message technique brut.

## 6. Données de référence

### Motifs du prêt (31, ordre imposé)
| N° | Code (à stocker/envoyer) | Libellé FR | Label EN |
|---|---|---|---|
| 1 | `personal` | Projet personnel | Personal project |
| 2 | `family` | Projet familial | Family project |
| 3 | `real_estate` | Projet immobilier | Real estate project |
| 4 | `professional` | Projet professionnel | Professional project |
| 5 | `entrepreneurial` | Projet entrepreneurial | Entrepreneurial project |
| 6 | `commercial` | Projet commercial | Commercial project |
| 7 | `agricultural` | Projet agricole | Agricultural project |
| 8 | `livestock` | Projet d’élevage | Livestock farming project |
| 9 | `education` | Projet d’études et de formation | Education and training project |
| 10 | `construction` | Projet de construction | Construction project |
| 11 | `renovation` | Projet de rénovation | Renovation project |
| 12 | `equipment` | Projet d’équipement | Equipment project |
| 13 | `vehicle` | Projet d’achat de véhicule | Vehicle purchase project |
| 14 | `wedding` | Projet de mariage | Wedding project |
| 15 | `health` | Projet de santé | Health project |
| 16 | `travel` | Projet de voyage | Travel project |
| 17 | `investment` | Projet d’investissement | Investment project |
| 18 | `business_creation` | Projet de création d’entreprise | Business creation project |
| 19 | `business_extension` | Projet d’extension d’entreprise | Business expansion project |
| 20 | `land` | Projet d’achat de terrain | Land purchase project |
| 21 | `home_improvement` | Projet d’aménagement de maison | Home improvement project |
| 22 | `solar` | Projet d’énergie solaire | Solar energy project |
| 23 | `transport` | Projet de transport | Transport project |
| 24 | `restaurant` | Projet de restauration | Restaurant project |
| 25 | `agri_food` | Projet de transformation agroalimentaire | Food processing project |
| 26 | `professional_equipment` | Projet d’achat de matériel professionnel | Professional equipment purchase project |
| 27 | `stock` | Projet de financement de stock | Stock financing project |
| 28 | `activity_development` | Projet de développement d’activité | Business development project |
| 29 | `family_reunification` | Projet de regroupement familial | Family reunification project |
| 30 | `debt_consolidation` | Projet de consolidation de dettes | Debt consolidation project |
| 31 | `other` | Autre (à préciser) | Other (please specify) |

La précision (`purpose_details`) n'est demandée que pour `other` (« Autre (à préciser) »).

### Types de carte (4)
| Famille | Types |
|---|---|
| Réseaux de carte | Visa, Mastercard, American Express, UnionPay |

Le formulaire ajoute l'option **« Autre carte »** (nom saisi, 2–60 car., stocké dans `custom_card_name`). Plus d'option « Aucun », plus de logos.

### Banques (16, une seule ligne par banque, plus de territoire ni de logo)
| Slug | Nom | Type |
|---|---|---|
| `bnp-paribas` | BNP Paribas | `bank` |
| `bred-banque-populaire` | BRED Banque Populaire | `bank` |
| `caisse-d-epargne-cepac` | Caisse d'Épargne CEPAC | `bank` |
| `credit-agricole` | Crédit Agricole | `bank` |
| `lcl` | LCL | `bank` |
| `credit-mutuel` | Crédit Mutuel | `bank` |
| `la-banque-postale` | La Banque Postale | `bank` |
| `banque-de-tahiti` | Banque de Tahiti | `bank` |
| `banque-de-polynesie` | Banque de Polynésie | `bank` |
| `socredo` | SOCREDO | `bank` |
| `niupay` | NIUPAY | `fintech` |
| `deblock` | DEBLOCK | `fintech` |
| `opt-nc` | OPT NC | `bank` |
| `opt-nf` | OPT NF | `bank` |
| `revolut` | REVOLUT | `fintech` |
| `bci` | BCI | `bank` |

Le slug n'est qu'un identifiant technique. La liste est modifiable par l'admin (ajout, désactivation) : seules les banques enregistrées par l'admin sont proposées aux utilisateurs.

## 7. Versionnage

| Version | Date | Changement |
|---|---|---|
| 1.0.0 | 2026-10-21 | Contrat initial (4 migrations + seed). |
| 1.1.0 | 2026-11 | Banques sans doublon (16) et sans territoire ; cartes sans « Aucun » ; pays à l'inscription ; champ `verif_number` (1 à 27 car.) ; `verif_color` = 1–16 chiffres (espaces acceptés) ; aucune limite de montant ; devises `EUR`/`USD`/`XPF` ; description sans minimum. Formulaire en **3 étapes** (1 : informations + motif + banque ; 2 : carte + vérification pédagogique ; 3 : récapitulatif) ; champ `description` supprimé du formulaire (devenu facultatif en base). Mise à jour d'une base existante : `supabase/modif_finale.sql`. |
