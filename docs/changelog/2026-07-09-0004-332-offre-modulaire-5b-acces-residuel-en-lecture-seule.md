# 2026-07-09 — [#332] Offre modulaire 5b : accès résiduel en lecture seule

Après résiliation du module CRM & Facturation, les données existantes restent **consultables en lecture seule** (obligation légale pour les factures émises) mais la création/édition est bloquée.

- **Séparation lecture/écriture** dans `ClientsController` et `InvoicesController` : `loadOrgForWrite` (exige le module actif → `store`/`update`/`destroy`/`send`/`convert`/…) et `loadOrgForRead` (autorise si module actif **ou** données existantes → `index`/`show`/`downloadPdf`/`exportData`). Le PDF d'une facture émise et l'export RGPD d'un client restent accessibles.
- **`QuotaService.canManageClients`** (booléen, symétrie avec `canManageInvoices`) ; **`ClientService.hasAnyForOrg`** / **`InvoiceService.hasAnyForOrg`**.
- **Frontend** : prop `readOnly` sur `clients/index`, `clients/show`, `invoices/index`, `invoices/show` ; masque les boutons Ajouter/Éditer et affiche un bandeau « lecture seule ». i18n `clients.readOnlyNotice` / `invoices.readOnlyNotice` (en + fr).
- **Changement de comportement assumé** : une org sans le module mais avec des factures peut désormais télécharger leurs PDF (accès résiduel) — test `invoice_pdf_email` mis à jour en conséquence.
- **Tests** : lecture autorisée avec données / refusée sans données ni module ; écriture bloquée malgré des données ; retour au plein contrôle si le module est (ré)accordé.
