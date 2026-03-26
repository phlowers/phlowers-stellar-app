# Plan : Feature "Modification longueur câble" — Implémentation end-to-end

## TL;DR
L'UI `CableSpanComponent` est déjà scaffoldée. Il faut câbler la stack complète :
tâche Python (mockée en attendant l'API mechaphlowers), service Angular, persistance du modèle domaine, et tests.

---

## Phase 1 — Modèle domaine : `CableModification` ✅

1. ~~**CRÉER** `src/app/shared/domain/models/cable-modification.model.ts`~~
   - ✅ Interface : `uuid`, `spanUuid`, `supportRef`, `widthCable`, `sizeCable`, `distanceSupportRef`
2. ~~**MODIFIER** `src/app/shared/domain/models/section.model.ts`~~
   - ✅ `cable_modifications: CableModification[]` et `selected_cable_modification_uuid: string | null` ajoutés
3. ~~**MODIFIER** `src/app/shared/domain/models/index.ts`~~ — ✅ modèle exporté

---

## Phase 2 — Tâche Python (mockée) ✅

4. ~~**CRÉER** `src/app/core/services/worker_python/tasks/python-scripts/cable_modification.py`~~
   - ✅ Signature `cable_modification(js_inputs)` — parse `spanIndex`, `widthCable`, `sizeCable`, `distanceSupportRef`, `supportRef`
   - ✅ **Mock** : appelle `engine.solve_adjustment()` + `engine.solve_change_state()` sans modifier le câble
   - ✅ TODO commenté pour le vrai appel mechaphlowers
   - ✅ Retourne `{ current: get_coordinates(...), base: get_coordinates(...) }` (même format que `change_state`)
5. ~~**MODIFIER** `src/app/core/services/worker_python/worker-python.ts`~~
   - ✅ Script importé + ajouté à `pythonFiles`

---

## Phase 3 — Câblage TypeScript de la tâche *(parallèle avec Phase 2)*

6. **MODIFIER** `src/app/core/services/worker_python/tasks/types.ts`
   - Ajouter `Task.cableModification = 'cableModification'`
   - Ajouter `TaskInputs[Task.cableModification]` : `{ spanIndex: number; widthCable: 'lengthening' | 'shortening'; sizeCable: number; distanceSupportRef: number; supportRef: 'LEFT' | 'RIGHT' }`
   - Ajouter `TaskOutputs[Task.cableModification]: GetSectionWithBaseOutput`
7. **MODIFIER** `src/app/core/services/worker_python/tasks/handle-task.ts`
   - Ajouter `[Task.cableModification]: { function: 'cable_modification', externalPackages: [] }`

---

## Phase 4 — `CableModificationsService` *(dépend des Phases 2 & 3)*

8. **CRÉER** `src/app/features/studio/loads/presentation/services/cableModifications.service.ts`
   - Injecte : `PlotService`, `WorkerPythonService`, `StudiesService`
   - `calculate(params)` → `plotService.loading.set(true)` → `getSupportIndex(spanUuid)` → `runTask(Task.cableModification, {...})` → met à jour `plotService.litData / baseLitData / error`
   - `save(modification: CableModification)` → persiste dans `section.cable_modifications` via `StudiesService.updateStudy()`
   - `delete(uuid)` → supprime de `section.cable_modifications`
   - Patron de référence : `loadForms.service.ts`

---

## Phase 5 — Câblage du composant *(dépend de Phase 4)*

9. **MODIFIER** `src/app/features/studio/loads/presentation/components/cable-span/cable-span.ts`
   - Injecter `CableModificationsService`
   - Implémenter `calculate()`, `saveForm()`, `deleteForm()` (actuellement des no-ops)
   - Ajouter `isLoading = signal(false)` et `error = signal<string | null>(null)`
10. **MODIFIER** `src/app/features/studio/loads/presentation/components/cable-span/cable-span.html`
    - Ajouter `[attr.aria-busy]="isLoading()"`, désactiver les boutons en loading, afficher les erreurs

---

## Phase 6 — Tests *(parallèle avec Phase 5)*

11. **CRÉER** `src/app/features/studio/loads/presentation/services/cableModifications.service.spec.ts`
    - `calculate()` appelle le worker et met à jour les signaux PlotService
    - `save()` persiste dans StudiesService
    - `delete()` supprime correctement
12. **CRÉER** `src/app/features/studio/loads/presentation/components/cable-span/cable-span.spec.ts`
    - Rendu HTML : tous les `data-testid` présents, boutons désactivés si form invalide

---

## Fichiers clés

| Fichier | Action |
|---|---|
| `src/app/features/studio/loads/presentation/components/cable-span/cable-span.ts` | Compléter |
| `src/app/features/studio/loads/presentation/components/cable-span/cable-span.html` | Compléter |
| `src/app/core/services/worker_python/tasks/types.ts` | Ajouter enum + types |
| `src/app/core/services/worker_python/tasks/handle-task.ts` | Ajouter entrée tâche |
| `src/app/core/services/worker_python/worker-python.ts` | Importer le script Python |
| `src/app/shared/domain/models/section.model.ts` | Étendre avec `cable_modifications` |
| `src/app/features/studio/loads/presentation/services/loadForms.service.ts` | Patron de référence |

---

## Vérification

1. `npm run lint` passe sans erreur
2. `npm run test` passe pour les spec files
3. Dans l'app : formulaire rempli → **Calculer** → le graphique se met à jour (même état pour le mock)
4. **Enregistrer** → `CableModification` persisté dans la section (IndexedDB)
5. **Supprimer** → retiré de la section

---

## Décisions

- **Python mocké** : la tâche Python ne modifie pas encore le câble (TODO réel mechaphlowers)
- **`distanceSupportRef`** : transmis au worker Python dès maintenant (prêt pour l'API future)
- **Pas de migration Dexie** : `cable_modifications` est JSON imbriqué dans `Study` → aucun bump de version requis
