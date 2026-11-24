# Financement des projets en outre-mer — backend (SQL Supabase) : à lire en premier

Le backend n'est pas déployé : c'est le dossier de référence (SQL, tests, documentation).

## Ordre de mise en ligne
1. **Supabase d'abord** : SQL Editor → coller le contenu de `supabase/modif_finale.sql` → Run.
   Résultat attendu : `banques = 16 | fonctions = 1 | contraintes = 4`.
   Ce script ajoute aussi `admin_delete_user` (suppression d'un utilisateur par l'admin) et retire l'option « Autre banque ».
   Sans danger (aucune demande ni aucun compte supprimé) et relançable, même s'il a déjà été exécuté.
   ⚠ À faire AVANT de déployer le frontend : le formulaire en 3 étapes n'envoie plus de description,
   et l'ancienne fonction SQL la refuserait.
2. **Frontend** : remplacer le dossier du dépôt par `frontend/`, commit + push (Vercel redéploie).
3. **Admin** : idem avec `admin/`.

Variables d'environnement Vercel : inchangées (voir `.env.example` dans chaque dossier).
Supabase > Authentication > URL Configuration : les *Redirect URLs* doivent contenir `https://<votre-site>/**`
(le lien de confirmation d'e-mail ramène maintenant sur `/auth/callback?next=/apply`).

## Résumé de toutes les modifications
- Banques : 16, une seule ligne par banque, sans logo ni territoire (OPT NC, OPT NF, REVOLUT, BCI ajoutées) ; cartes sans logo, sans « Aucun ».
- Inscription : champ « Pays » (liste + saisie libre), plus de couleur préférée ; arrivée directe sur la demande après l'inscription.
- Formulaire de demande en **3 étapes** : 1 informations + motif + banque (+ numéro, fruit, animal) · 2 carte + vérification pédagogique
  (barre verte, passage automatique) · 3 récapitulatif. Champ « Description » supprimé (facultatif en base).
- Numéro : 1 à 27 caractères (lettres/chiffres), espace automatique tous les 4. Couleur préférée : 16 chiffres max, espace tous les 4.
- Banques : **plus d'option « Autre banque »** (seules les banques enregistrées par l'admin sont proposées). Admin : bouton **Supprimer cet utilisateur** (fiche utilisateur ; le compte admin est protégé).
- Devises EUR / USD / XPF ; aucune limite de montant. Bouton « Demande de subvention ».
- Écran d'échec : bouton « Tableau de bord ». Admin : historique = badge seul, date MM/AA, pays, numéro groupé.

## Vérifié
Frontend : typecheck, tests, build. Backend : 17 tests statiques + suite SQL de sécurité (sections A à L) sur PostgreSQL 16,
installation neuve ET bases mises à jour avec `modif_finale.sql`. Non testé : Supabase / Vercel réels, rendu visuel.
