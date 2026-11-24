# Anciens scripts d'ajout — NE PAS RELANCER

Ces trois scripts (`ajout_carte_autre.sql`, `ajout_mois_verif.sql`, `ajout_verification_fruit_animal.sql`)
ont servi à faire évoluer une base déjà installée, au fil du projet. Leur contenu est **déjà intégré**
dans les migrations (`../migrations`) et dans `../setup_complete.sql`.

Ils sont conservés pour l'historique uniquement : les relancer **remettrait d'anciennes versions de la
fonction `create_loan_request`** (anciennes règles, ancienne signature).

Pour mettre à jour une base existante, utilisez `../modif_finale.sql`.
