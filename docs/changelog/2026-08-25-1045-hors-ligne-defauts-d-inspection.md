# 2026-08-25 — Hors-ligne : défauts d'inspection (#491)

Un état des lieux se fait sur le bateau, à la remise des clés — souvent sans réseau. Consigner un défaut est la saisie centrale de ce moment-là et n'avait aucun support hors-ligne. Dernier formulaire du lot 3 de l'épic #481 : la file couvre désormais 9 formulaires.

- **Conversion `<Form>` → `useForm`.** `InspectionDefectModal.vue` passait par `<Form :action>` sans `handleSubmit` interceptable. Converti en `useForm` + `@submit.prevent` ; les champs optionnels vides sont omis du payload (`form.transform`), comme les strippait l'envoi natif — `estimatedCost` part en nombre.
- **Chemin hors-ligne.** Hors connexion, le défaut part en file (`create-inspection-defect`, POST sur la route imbriquée inspection) et est rejoué à la reconnexion ; un refus 4xx au rejeu est conservé dans le store `failed` (#487).
- **Limite structurelle assumée.** Un défaut ne peut viser qu'une inspection **déjà créée en ligne** (l'URL exige un `inspectionId` réel ; la création d'inspection hors-ligne demanderait des IDs temporaires — hors périmètre v1, cf. #481). La prop `inspectionId` devient nullable : hors-ligne sans inspection synchronisée, l'ajout est **désactivé avec un message explicite** (`role="alert"`) au lieu d'échouer silencieusement au rejeu.
- **i18n.** `offline.queue.type.create-inspection-defect` (common) + `equipmentActions.defects.offlineNoInspection` (vouvoiement FR), deux locales.
- **Doc.** Tableau des formulaires + limite documentée dans `docs/frontend/pwa.md` ; section « Origine inspection » de `docs/domain/equipment-actions.md`.
- **Tests.** 7 cas Vitest (`inspection_defect_modal.spec.ts`) : soumission en ligne (payload nettoyé, `estimatedCost` numérique), erreurs de validation affichées, enqueue hors-ligne avec inspection synchronisée, **refus hors-ligne sans inspection** (message affiché, bouton désactivé, aucun enqueue), pas de blocage en ligne, clés traduites. Suite frontend : 1250 verts.
