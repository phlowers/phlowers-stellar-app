# taskfile-reglage-cable.md
Plan de réalisation agentique — US.REG Réglage d'un câble
> Généré par le skill `rte-taskfile` le 2026-09-30. Norme : gemini-taskfile. Révision 2 (structure feature field-measuring).

---

## Contrat qualité / Definition of Done (NON NÉGOCIABLE)

```yaml
quality_contract:
  model:            "GitHub Copilot, mode agent"
  depth:            "MAX — un sizing S/M n'autorise jamais à bâcler"
  method:           "Méthode complète, raisonnement explicite, pas de raccourci"
  sources:          "Toute affirmation factuelle est sourcée et vérifiée avant usage"
  self_review:      "Auto-revue adversariale avant de marquer une tâche done"
  no_stub:          "Zéro stub, zéro mock, zéro TODO sur la logique cœur — code/livrable production-ready"
  no_stub_exception: "DÉROGATION HUMAINE EXPLICITE (2026-09-30) : le corps de calculate_cable_adjustment (P0-01)
                     est un mock déterministe en attendant la vraie formule. Suivi : BL-01. Rien d'autre n'est couvert."
  human_in_loop:    "L'intention et les exigences restent une responsabilité HUMAINE ;
                     les agents proposent, observent, signalent — ils ne formulent pas l'intention."
```

---

## Règle de découpage des tâches

```yaml
task_sizing:
  max_human_effort:      "4h"
  max_augmented_effort:  "10min"
  target_augmented:      "5min"
  sizing_guide:
    XS: "< 5min augmente  / < 30min humain"
    S:  "< 10min augmente / < 1h humain"
    M:  "< 20min augmente / < 2h humain"
    L:  "< 30min augmente / < 4h humain"
    XL: "A redecouper obligatoirement"
  split_triggers:
    - "Plus de 3 livrables distincts"
    - "Plus de 5 success_criteria"
    - "Plus de 3 domaines techniques"
    - "Estimation > L"
```

---

## Project Toolings

```yaml
toolings:
  stack:
    frontend:   ["Angular (standalone, OnPush, signals)", "PrimeNG (Select, InputText)", "Transloco", "SCSS/BEM"]
    backend:    ["Pyodide Web Worker (WorkerPythonService)", "stellar-engine (Python)", "mechaphlowers"]
    database:   []
    infra:      []
  languages:
    - ["TypeScript", "Python", "HTML", "SCSS"]
  mcp_servers: []
  skills:
    - name: "skill-test"
      path: ".github/skills/skill-test/SKILL.md"
    - name: "skill-fix-test"
      path: ".github/skills/skill-fix-test/SKILL.md"
    - name: "skill-review"
      path: ".github/skills/skill-review/SKILL.md"
  agents:
    - name: "Explore"
      role: "Recherche read-only dans le dépôt"
  external_tools:
    - name: "uv"
      purpose: "stellar-engine : make test / check-lint ; rebuild wheel via npm run set-up-mechaphlowers:engine-only"
  conventions:
    branch_strategy: "feature branch — commit/push faits par l'humain uniquement"
    commit_format:   "défini par l'humain"
    test_framework:  "Vitest (front) · pytest (stellar-engine)"
    coverage_min:    "non configuré explicitement — cible 100% sur fichiers créés (skill-test)"
    lint:            "npm run lint-check · make check-lint / check-format"
    env_file:        "aucun"
  instructions:
    - ".github/copilot-instructions.md"
    - ".github/instructions/i18n.instructions.md"
    - ".github/instructions/testing.instructions.md"
    - ".github/instructions/scss.instructions.md"
    - ".github/instructions/pyodide.instructions.md"
```

---

## Conventions

```yaml
priority_levels: { critical: "Bloquant", high: "Phase courante", medium: "Valeur ajoutée", low: "Backlog" }
naming_convention: { phases: "P{n}", tasks: "P{phase}-{seq}", backlog: "BL-{seq}" }
feature_root: "src/app/features/studio/cable-adjustment"   # FA = alias de ce dossier dans ce document
```

---

## Phase 0 - Moteur de calcul (mock)

### P0-01: Fonction Python mock calculate_cable_adjustment
```yaml
id: P0-01
title: "Fonction Python mock calculate_cable_adjustment"
phase: "Phase 0 - Moteur de calcul (mock)"
priority: critical
status: done
completion: 100%
last_update: "2026-09-30"
responsible: { lead: "dev-python", support: ["dev-angular"] }
sizing: { estimate: S, human_effort: "~45min", augmented_effort: "~5min" }
description: |
  Point d'entrée métier stellar-engine, contrat d'E/S définitif, corps MOCK déterministe (BL-01).
  Entrées : span_index:int, span_length:float, left_horizontal_angle, right_horizontal_angle,
  left_vertical_angle, right_vertical_angle (float, grades), support:'LEFT'|'RIGHT',
  tacheometer_horizontal_distance:float, adjustment_parameter:int.
  Sorties : horizontal_sight_angle:float, vertical_sight_angle:float (grades, [0;4000]).
  Mock : constantes fixes ; docstring "MOCK — à remplacer (BL-01)".
dependencies: []
toolings_used: { stack: ["Python", "stellar-engine", "pytest", "ruff"], mcp_servers: [], skills: [], agents: [], external_tools: ["uv"] }
definition_of_ready:
  - "Option A validée par l'humain (2026-09-30)"
  - "Contrat d'E/S accepté (D-01)"
success_criteria:
  - description: "calculate_cable_adjustment exporté par stellar_engine/tools/__init__.py (__all__)"
    validated: false
  - description: "Sortie = exactement 2 clés, valeurs dans [0;4000]"
    validated: false
  - description: "Docstring signale le MOCK et référence BL-01"
    validated: false
tests:
  - { name: "test_output_keys", type: "unit", assertion: "pytest : clés == {'horizontal_sight_angle','vertical_sight_angle'}", validated: false }
  - { name: "test_output_range", type: "unit", assertion: "pytest : 0 <= valeurs <= 4000 sur entrée synthétique", validated: false }
  - { name: "python-quality", type: "review", assertion: "cd stellar-engine && make test && make check-lint && make check-format → exit 0", validated: false }
definition_of_done:
  - "Tous les success_criteria validés"
  - "Tous les tests passés"
  - "Contrat qualité respecté (dérogation limitée au corps de la fonction)"
  - "Auto-revue adversariale ; relu par l'humain pilote"
files:
  create:
    - "stellar-engine/src/stellar_engine/tools/cable_adjustment.py"
    - "stellar-engine/test/tools/test_cable_adjustment.py"
  modify:
    - "stellar-engine/src/stellar_engine/tools/__init__.py"
  reference:
    - "stellar-engine/src/stellar_engine/tools/papoto.py"
    - "stellar-engine/test/tools/test_papoto.py"
```

### P0-02: Câblage worker Task.calculateCableAdjustment
```yaml
id: P0-02
title: "Câblage worker Task.calculateCableAdjustment"
phase: "Phase 0 - Moteur de calcul (mock)"
priority: critical
status: in_progress  # reste : worker-smoke manuel (npm run start)
completion: 90%
last_update: "2026-09-30"
responsible: { lead: "dev-angular", support: ["dev-python"] }
sizing: { estimate: S, human_effort: "~1h", augmented_effort: "~5min" }
description: |
  Modèle exact calculatePapoto :
  - types.ts : Task.calculateCableAdjustment + TaskInputs (camelCase) + TaskOutputs → CableAdjustmentResult
  - CableAdjustmentResult { horizontalSightAngle, verticalSightAngle } dans shared/domain/models (+ export models/index.ts)
  - handle-task.ts : { function: 'calculate_cable_adjustment', externalPackages: [] }
  - api.py : calculate_cable_adjustment(js_inputs) avec conversion camelCase↔snake_case cohérente avec api.py
  - Rebuild : npm run set-up-mechaphlowers:engine-only
dependencies: [P0-01]
toolings_used: { stack: ["TypeScript", "Pyodide", "Python", "Vitest"], mcp_servers: [], skills: ["skill-test"], agents: [], external_tools: ["uv"] }
definition_of_ready:
  - "P0-01 done"
  - ".github/instructions/pyodide.instructions.md lu"
success_criteria:
  - description: "runTask(Task.calculateCableAdjustment, …) typé de bout en bout"
    validated: false
  - description: "Worker rebuildé retourne le mock en dev"
    validated: false
tests:
  - { name: "handle-task-mapping", type: "unit", assertion: "handle-task.spec.ts : la tâche appelle la fonction Python 'calculate_cable_adjustment'", validated: false }
  - { name: "typecheck", type: "review", assertion: "npx tsc -p tsconfig.app.json --noEmit → 0 erreur", validated: false }
  - { name: "worker-smoke", type: "manual", assertion: "npm run start : calcul depuis la modale (P1-03) renvoie un résultat sans error", validated: false }
definition_of_done:
  - "Tous les success_criteria validés"
  - "Tous les tests passés"
  - "Contrat qualité global respecté"
  - "Auto-revue adversariale ; relu par l'humain pilote"
files:
  create:
    - "src/app/shared/domain/models/cable-adjustment.model.ts"
  modify:
    - "src/app/shared/domain/models/index.ts"
    - "src/app/core/services/worker_python/tasks/types.ts"
    - "src/app/core/services/worker_python/tasks/handle-task.ts"
    - "src/app/core/services/worker_python/tasks/handle-task.spec.ts"
    - "src/app/core/services/worker_python/tasks/python-scripts/api.py"
  reference:
    - "src/app/shared/domain/models/field-measure.model.ts (PapotoResult)"
    - "scripts/set_up_mechaphlowers_v2.py"
```

---

## Phase 1 - Interface Studio

### P1-01: Squelette feature, enregistrement outil, menu
```yaml
id: P1-01
title: "Squelette feature cable-adjustment, enregistrement 'cable-adjustment', activation menu"
phase: "Phase 1 - Interface Studio"
priority: high
status: done
completion: 100%
last_update: "2026-09-30"
responsible: { lead: "dev-angular", support: [] }
sizing: { estimate: S, human_effort: "~45min", augmented_effort: "~5min" }
description: |
  - Créer FA/domain et FA/presentation (structure field-measuring)
  - CableAdjustmentComponent vide (standalone, OnPush), titre via Transloco
  - ToolbarDialogService : Tool += 'cable-adjustment', toolMap (dialogStyle aligné vtl-and-guying)
  - top-toolbar item id 8 : disabled:false, action openTool('cable-adjustment') (supprime l'alert)
  - Clés studio.cable-adjustment.title (fr/en)
dependencies: []
toolings_used: { stack: ["Angular", "PrimeNG Dialog", "Transloco", "Vitest"], mcp_servers: [], skills: ["skill-test"], agents: [], external_tools: [] }
definition_of_ready:
  - "toolbar-dialog.service.ts et vtl-and-guying lus"
  - "i18n.instructions.md lu"
success_criteria:
  - description: "Outils > Réglage d'un câble ouvre la modale ; Fermer ramène au Studio"
    validated: false
tests:
  - { name: "top-toolbar-open-tool", type: "unit", assertion: "top-toolbar.component.spec.ts : item 8 → openTool('cable-adjustment') (remplace le test alert)", validated: false }
  - { name: "toolbar-dialog-map", type: "unit", assertion: "toolbar-dialog.service.spec.ts : openTool('cable-adjustment') → currentTool()==='cable-adjustment' && isOpen()", validated: false }
definition_of_done:
  - "Tous les success_criteria validés"
  - "Tous les tests passés"
  - "Contrat qualité global respecté"
  - "Auto-revue adversariale ; relu par l'humain pilote"
files:
  create:
    - "src/app/features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component.ts"
    - "src/app/features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component.html"
    - "src/app/features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component.scss"
    - "src/app/features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component.spec.ts"
  modify:
    - "src/app/features/studio/toolbar/presentation/services/toolbar-dialog.service.ts"
    - "src/app/features/studio/toolbar/presentation/services/toolbar-dialog.service.spec.ts"
    - "src/app/features/studio/core/presentation/components/top-toolbar/top-toolbar.component.ts"
    - "src/app/features/studio/core/presentation/components/top-toolbar/top-toolbar.component.spec.ts"
    - "public/i18n/fr.json"
    - "public/i18n/en.json"
  reference:
    - "src/app/features/studio/field-measuring (structure)"
    - "src/app/features/studio/toolbar/presentation/components/vtl-and-guying/vtl-and-guying.component.ts"
```

### P1-02: Formulaire Réglage
```yaml
id: P1-02
title: "Formulaire Réglage : champs, défauts, validations (POR/LON/AHG/AHD/AVG/AVD/SUP/DIS/PAR)"
phase: "Phase 1 - Interface Studio"
priority: high
status: done
completion: 100%
last_update: "2026-09-30"
responsible: { lead: "dev-angular", support: [] }
sizing: { estimate: M, human_effort: "~2h", augmented_effort: "~10min" }
description: |
  Reactive form typé + toSignal (pattern vtl-and-guying) :
  - Portée : p-select [filter]=true, options PlotSpanService.getSpanOptionsWithIndex(), défaut = 1re portée (D-03)
  - Longueur : dl/dt/dd lecture seule, supports[spanIndex].spanLength
  - HG/HD/VG/VD : input type=number pInputText, Validators.required/min(-200)/max(200), maxDecimalsValidator(2), défaut 0
  - Support : p-select, PlotSpanService.getSupportOptions(uuid) ; disabled + [] sans portée ; reset au changement de portée
  - Distance tachéomètre : required, min 0, max 5000, maxDecimalsValidator(2), défaut null
  - Paramètre : required, min 20, max 5000, maxDecimalsValidator(0), défaut null
  - Erreurs : common.min-value-error / common.max-value-error / common.max-decimals-error, role=alert
  - Bornes/défauts : FA/domain/cable-adjustment.constantes.ts ; types form : FA/domain/cable-adjustment.interfaces.ts
dependencies: [P1-01]
toolings_used: { stack: ["Angular Reactive Forms", "PrimeNG Select", "PrimeNG InputText", "Transloco", "Vitest"], mcp_servers: [], skills: ["skill-test"], agents: [], external_tools: [] }
definition_of_ready:
  - "P1-01 done"
  - "D-02 (champs obligatoires) et D-03 (portée courante) tranchées"
success_criteria:
  - description: "Chaque RG POR/LON/AHG/AHD/AVG/AVD/SUP/DIS/PAR couverte par ≥1 test dont le nom contient le code RG"
    validated: false
  - description: "Changement de portée → longueur et supports mis à jour, support réinitialisé"
    validated: false
  - description: "Valeurs hors bornes / décimales refusées (form invalid + message)"
    validated: false
tests:
  - { name: "RG.REG.POR.1-3", type: "unit", assertion: "options = portées de la section, labels tronqués 5 car. ; filter actif ; défaut = 1re portée", validated: false }
  - { name: "RG.REG.LON.1-2", type: "unit", assertion: "portée i → longueur = supports[i].spanLength ; aucun input éditable", validated: false }
  - { name: "RG.REG.AHG/AHD/AVG/AVD", type: "unit", assertion: "défaut 0 ; -200.01, 200.01, 1.234 invalides ; -200, 200, 12.34 valides", validated: false }
  - { name: "RG.REG.SUP.1-2", type: "unit", assertion: "sans portée : [] + disabled ; avec portée : 2 options LEFT/RIGHT", validated: false }
  - { name: "RG.REG.DIS/PAR", type: "unit", assertion: "défaut null ; DIS -0.01/5000.01/1.234 invalides ; PAR 19/5001/20.5 invalides ; 20 et 5000 valides", validated: false }
definition_of_done:
  - "Tous les success_criteria validés"
  - "Tous les tests passés ; données 100% synthétiques"
  - "Contrat qualité global respecté ; a11y : label for/id sur chaque champ"
  - "Auto-revue adversariale ; relu par l'humain pilote"
files:
  create:
    - "src/app/features/studio/cable-adjustment/domain/cable-adjustment.interfaces.ts"
    - "src/app/features/studio/cable-adjustment/domain/cable-adjustment.constantes.ts"
  modify:
    - "src/app/features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component.ts"
    - "src/app/features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component.html"
    - "src/app/features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component.scss"
    - "src/app/features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component.spec.ts"
    - "public/i18n/fr.json"
    - "public/i18n/en.json"
  reference:
    - "src/app/core/services/plot/plot-span.service.ts"
    - "src/app/shared/helpers/numberValidators.ts"
    - "src/app/shared/helpers/formatSupportNumber.ts"
```

### P1-03: Calcul, Résultats, Rapport
```yaml
id: P1-03
title: "Bouton Calculer, cadre Résultats, boutons Rapport et Aide inactifs"
phase: "Phase 1 - Interface Studio"
priority: high
status: done
completion: 100%
last_update: "2026-09-30"
responsible: { lead: "dev-angular", support: [] }
sizing: { estimate: M, human_effort: "~1h30", augmented_effort: "~10min" }
description: |
  - app-btn Calculer : [disabled]=!isFormValid(), [btnLoading]=isCalculating(), icône rocket_launch
  - Clic : markAllAsTouched, mapping pur toCableAdjustmentTaskInputs() (FA/presentation/cable-adjustment.helpers.ts),
    runTask(Task.calculateCableAdjustment) ; aria-busy sur le conteneur
  - Résultats : signal result ; cadre rendu seulement si result non null ; result remis à null à tout changement du form (D-04)
  - H et V : roundSightAngle() (Math.round, D-05), lecture seule, unité "gr"
  - Erreur : LoggerService + NotificationService ; result reste null
  - app-btn Rapport : disabled (D-07)
  - Bouton aide "?" (icône, aria-label traduit) au-dessus des angles : disabled (D-07)
dependencies: [P0-02, P1-02]
toolings_used: { stack: ["Angular signals", "WorkerPythonService", "LoggerService", "NotificationService", "Vitest"], mcp_servers: [], skills: ["skill-test"], agents: [], external_tools: [] }
definition_of_ready:
  - "P0-02 et P1-02 done"
  - "D-04 et D-05 tranchées"
success_criteria:
  - description: "Calcul valide → cadre Résultats avec 2 entiers dans [0;4000]"
    validated: false
  - description: "Chaque RG CAL-BTN/RES-CAD/AHF/AVF/RAP-BTN couverte par ≥1 test nommé avec son code RG"
    validated: false
  - description: "Erreur worker → notification utilisateur, cadre masqué"
    validated: false
tests:
  - { name: "RG.REG.CAL-BTN.1", type: "unit", assertion: "form invalide → disabled ; valide → enabled", validated: false }
  - { name: "RG.REG.CAL-BTN.2", type: "unit", assertion: "clic → runTask appelé 1 fois avec Task.calculateCableAdjustment et inputs mappés", validated: false }
  - { name: "RG.REG.RES-CAD.1", type: "unit", assertion: "data-testid cadre absent avant clic, présent après succès, absent après modif d'un champ", validated: false }
  - { name: "RG.REG.AHF/AVF", type: "unit", assertion: "résultat 73.802/96.918 → '74'/'97' gr, non éditables", validated: false }
  - { name: "RG.REG.RAP-BTN.1", type: "unit", assertion: "bouton Rapport présent et disabled", validated: false }
  - { name: "US.REG.AID-placeholder", type: "unit", assertion: "bouton aide '?' présent, disabled, avec aria-label", validated: false }
  - { name: "helpers", type: "unit", assertion: "cable-adjustment.helpers.spec.ts : mapping + arrondi couverts 100%", validated: false }
definition_of_done:
  - "Tous les success_criteria validés"
  - "Tous les tests passés"
  - "Contrat qualité global respecté"
  - "Auto-revue adversariale ; relu par l'humain pilote"
files:
  create:
    - "src/app/features/studio/cable-adjustment/presentation/cable-adjustment.helpers.ts"
    - "src/app/features/studio/cable-adjustment/presentation/cable-adjustment.helpers.spec.ts"
  modify:
    - "src/app/features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component.ts"
    - "src/app/features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component.html"
    - "src/app/features/studio/cable-adjustment/presentation/components/cable-adjustment/cable-adjustment.component.spec.ts"
    - "public/i18n/fr.json"
    - "public/i18n/en.json"
  reference:
    - "src/app/features/studio/toolbar/presentation/components/vtl-and-guying/vtl-and-guying.component.html"
```

---

## Phase 2 - Validation

### P2-01: Validation globale et recette RG
```yaml
id: P2-01
title: "Validation globale et recette RG par RG"
phase: "Phase 2 - Validation"
priority: high
status: in_progress  # suites + lint OK ; reste : recette manuelle RG (PO)
completion: 70%
last_update: "2026-09-30"
responsible: { lead: "dev-angular", support: ["PO"] }
sizing: { estimate: S, human_effort: "~1h", augmented_effort: "~10min" }
description: |
  Suites complètes + lint + recette manuelle traçable (matrice RG) pour le PO. Pas de commit/push par l'agent.
dependencies: [P1-03]
toolings_used: { stack: ["Vitest", "ESLint", "pytest", "ruff"], mcp_servers: [], skills: ["skill-fix-test", "skill-review"], agents: [], external_tools: ["uv"] }
definition_of_ready:
  - "P0-01..P1-03 done"
success_criteria:
  - description: "Suites front et Python vertes, lint propre"
    validated: false
  - description: "Matrice RG 100% cochée en recette manuelle"
    validated: false
tests:
  - { name: "front-suite", type: "integration", assertion: "npm run test && npm run lint-check → 0 échec/erreur", validated: false }
  - { name: "python-suite", type: "integration", assertion: "cd stellar-engine && make test && make check-lint → exit 0", validated: false }
  - { name: "recette-rg", type: "manual", assertion: "RG.REG.POR.1 → RG.REG.RAP-BTN.1 cochées sur étude synthétique", validated: false }
definition_of_done:
  - "Tous les success_criteria validés"
  - "Tous les tests passés"
  - "Contrat qualité respecté ; dérogation mock rappelée au PO (BL-01)"
  - "Auto-revue adversariale ; relu par l'humain pilote"
files: { create: [], modify: [], reference: ["US.REG"] }
```

---

## Backlog (différé)

```yaml
- id: BL-01
  title: "Remplacer le mock calculate_cable_adjustment par la vraie formule"
  priority: critical
  status: blocked
  description: "Formule/fonction mechaphlowers indisponible. Seul le corps Python + tests changent."
- id: BL-02
  title: "Génération du rapport Réglage d'un câble (action du bouton Rapport)"
  priority: medium
  status: todo
  description: "Hors US.REG. Modèle : vtl-guying-report.service.ts."
- id: BL-03
  title: "Aide '?' — US.REG.AID (action du bouton)"
  priority: low
  status: todo
  description: "US distincte."
```

## Décisions (validées par l'humain 2026-09-30)
- D-01 Formule : worker Python, mock déterministe, contrat d'E/S accepté ; vraie formule = BL-01.
- D-02 Tous les champs du formulaire sont obligatoires.
- D-03 Portée courante = 1re portée de la section (index 0).
- D-04 Résultats remis à null (cadre masqué) à tout changement du formulaire après calcul.
- D-05 Arrondi Math.round, unité affichée "gr".
- D-06 Libellé portée : format existant PlotSpanService "12 - 13" (pas de format spécifique).
- D-07 Boutons "?" (aide) et "Rapport" PRÉSENTS mais disabled ; actions = BL-02 / BL-03.
- D-08 (2026-10-01) Liste Support : libellés "Gauche" / "Droite" (common.left / common.right) au lieu des N° de support.

## Légende statuts

| Status | Signification |
|--------|--------------|
| `todo` | Pas encore démarré |
| `in_progress` | En cours d'implémentation |
| `blocked` | Bloqué — attente input ou dépendance |
| `done` | Livré et validé |
