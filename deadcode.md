# Dead Code Inventory — phlowers-stellar-app

> Ce fichier liste tout le code mort identifié dans le projet. Chaque entrée nécessite une validation avant suppression.

## Légende
- **📍 Source** : fichier et numéro de ligne
- **🔍 Preuve** : pourquoi c'est considéré comme mort
- **⚠️ Confiance** : HIGH (certain), MEDIUM (probable), LOW (à vérifier)

---

## 1. LoggedLayoutComponent — `currentRoute` + `ngOnInit()`

| | |
|---|---|
| 📍 Source | `src/app/ui/shared/components/layout/logged-layout/logged-layout.component.ts` lignes 25, 28-32 |
| Code | `currentRoute = window.location.pathname;` + `ngOnInit()` avec `router.events.subscribe()` qui met à jour `this.currentRoute = event.url` |
| 🔍 Preuve | `currentRoute` n'est référencé nulle part dans le template (`logged-layout.component.html`). Aucune autre référence dans le codebase hors de ce fichier. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Supprimer la propriété, la méthode `ngOnInit`, l'interface `OnInit`, et les imports `NavigationEnd`, `filter` devenus inutiles |
| ✅ Validé | ☐ |

---

## 2. StudioPageComponent — `spanData` + `supportData`

| | |
|---|---|
| 📍 Source | `src/app/ui/pages/studio/studio-page.component.ts` lignes 106-116 |
| Code | `spanData = [{ label: 'Span 1-2', ... }, ...]` et `supportData = [{ label: 'Support 1', ... }, ...]` |
| 🔍 Preuve | Aucune référence dans `studio-page.component.html`. Données mock jamais consommées. |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Supprimer les 2 propriétés (11 lignes) |
| ✅ Validé | ☐ |

---

## 3. StudioPageComponent — `subscription` (type Dexie.Subscription)

| | |
|---|---|
| 📍 Source | `src/app/ui/pages/studio/studio-page.component.ts` ligne 75 |
| Code | `subscription: Subscription | null = null;` — utilisée dans `ngOnInit()` et `ngOnDestroy()` pour gérer le cycle de vie d'un abonnement Dexie |
| 🔍 Preuve | N'est PAS du code mort — c'est du code interne de gestion de cycle de vie. Non référencé dans le template mais nécessaire. |
| ⚠️ Confiance | **NOT DEAD** — à ne pas supprimer |
| ✅ Validé | N/A |

---

*Dernière mise à jour : 12/03/2026 — Audit Phase 3A*

---

## 4. `ServerStatus` — `core/services/news/news.service.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/news/news.service.ts` |
| Code | `export enum ServerStatus { LOADING, ONLINE, OFFLINE }` |
| 🔍 Preuve | Duplicate of `ServerStatus` in `online.service.ts`, never imported by any file |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Enum removed during DDD migration |
| ✅ Validé | 🗑️ SUPPRIMÉ (Phase 3A) |

---

## 5. `ServerStatus` — `core/services/changelog/changelog.service.ts`

| | |
|---|---|
| 📍 Source | `src/app/core/services/changelog/changelog.service.ts` |
| Code | `export enum ServerStatus { LOADING, ONLINE, OFFLINE }` |
| 🔍 Preuve | Duplicate of `ServerStatus` in `online.service.ts`, never imported by any file |
| ⚠️ Confiance | **HIGH** |
| Impact suppression | Enum removed during DDD migration |
| ✅ Validé | 🗑️ SUPPRIMÉ (Phase 3A) |
