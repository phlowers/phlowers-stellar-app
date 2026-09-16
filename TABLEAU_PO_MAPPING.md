| Concept | CSV | Catalogue (DB) | Section (App) | Statut |
|---------|-----|----------------|---------------|--------|
| **LIAISON** | link_idr / link_adr | link_idr / link_adr | link_code / link_name | ❌ Incohérent |
| **LIT** | lit_idr / lit_adr | lit_idr / lit_adr | lit_idr / lit_adr | ✅ OK |
| **BRANCHE** | branch_idr / branch_adr | branch_idr / branch_adr | branch_code / branch_name | ❌ Incohérent |
| **BRANCHE NUMERO** | (absent) | (absent) | (absent) | ❓ À clarifier |
| **VOLTAGE** | voltage_idr / voltage_adr | voltage_idr / voltage_adr | voltage_idr / voltage_adr | ✅ OK |
| **CM (Centre Maintenance)** | (absent) | (absent) | cm_idr / cm_adr | ⚠️ Idr non peuplé |
| **GMR (Groupe Maintenance Régional)** | (absent) | (absent) | gmr_idr / gmr_adr | ⚠️ Idr non peuplé |
| **EEL (Équipe Exploitation Locale)** | (absent) | (absent) | eel_idr / eel_adr | ⚠️ Idr non peuplé |

---

## 🔴 LIAISON — Problème : Renommage incohérent

### Ce qui ne va pas
- **Dans la base de données catalogue** : s'appelle `link_idr`
- **Dans l'application** : s'appelle `link_code`
- C'est la **même donnée**, mais avec deux noms différents

### Pourquoi c'est un problème

```
CSV (link_idr: "230001")
    ↓
Base de données (CatalogLine.link_idr: "230001")
    ↓
Mapping manuel en UI [MAPPING]
    ↓
Application (Section.link_code: "230001")
```

**Confusion pour les développeurs** : On ne sait pas immédiatement que `link_code` = `link_idr`  
**Maintenance complexe** : Chaque fois qu'on ajoute une fonctionnalité, il faut se souvenir du mapping

### Exemple concret
Un développeur voit "Je dois afficher la LIAISON" et cherche `link_idr` → Ne le trouve pas → Cherche dans la doc → Découvre que c'est `link_code` → Perte de temps

### Impact sur les usagers finaux
L'usager final voit la même donnée correctement. Mais les corrections de bug prennent plus longtemps.

### Recommended fix
Renommer partout `link_code` → `link_idr` pour faire correspondre le nom en app avec la base de données

---

## 🔴 BRANCHE — Problème : Même incohérence que LIAISON

### Ce qui ne va pas
- **Dans la base de données catalogue** : `branch_idr`
- **Dans l'application** : `branch_code`
- Exactement le même problème que LIAISON

### Pourquoi c'est un problème
Même confusion, même maintenance complexe. Deux renommages à tracer.

```
CSV (branch_idr: "B1001")
  ↓
Base de données (CatalogLine.branch_idr: "B1001")
  ↓
[MAPPING]
  ↓
Application (Section.branch_code: "B1001")
```

### Impact cumulatif
Avec LIAISON + BRANCHE mal nommées, les développeurs doivent retenir 2 mappings au lieu de zéro.

---

## 🟠 BRANCHE NUMERO — Problème : La propriété n'existe pas du tout

### Ce qu'on demande
Dans vos spécifications, il faut un **BRANCHE NUMERO** (le numéro de la branche)

### Ce qu'on a trouvé dans le code
**Rien**. Aucune propriété pour cela.

### Où ça devrait être
- **CSV** : Il existe peut-être un `branch_id` ou `branch_numero` → À vérifier
- **Catalogue** : Devrait y avoir une propriété analogue
- **Application** : Complètement absent

### Exemple concret
```
Si la branche est "B1001 - Région Nord", alors:
- branch_idr = "B1001"        (identifiant court)
- branch_adr = "Région Nord"  (description)
- branch_numero = ???         (le numéro, absent actuellement)
```

### Ce qui va se passer
- Si un usager demande "affiche le numéro de branche", on ne peut pas le faire
- Il faudra ajouter la propriété + mapper depuis CSV + tests + déploiement

### Décision requise
1. Confirmer si c'est réellement un besoin
2. Si oui : clarifier la source (CSV, calcul, ou manuel)
3. Ajouter à la roadmap de développement

---

## 🟡 CM / GMR / EEL — Problème : Les identifiants (IDR) ne sont jamais remplis

### Ce qui ne va pas
Chaque maintenance a **deux champs** : `_idr` (identifiant) et `_adr` (description)

**Exemple pour CM (Centre de Maintenance)** :
- `cm_idr` = identifiant court (comme "CM-001") → **JAMAIS REMPLI**
- `cm_adr` = description (comme "Centre Bobigny") → **REMPLI OK**

Idem pour :
- `gmr_idr` / `gmr_adr` (Groupe Maintenance Régional)
- `eel_idr` / `eel_adr` (Équipe Exploitation Locale)

### Pourquoi c'est un problème

```
Scénario 1 : On veut afficher la liste des CM disponibles
  ❌ Impossible d'afficher une liste d'IDs si les IDs ne sont jamais remplis

Scénario 2 : Export API
  ❌ On exporte cm_adr ("Bobigny") mais pas cm_idr
  ❌ L'API consommatrice reçoit la description mais pas l'ID pour faire des requêtes

Scénario 3 : Synchronisation avec un autre système
  ❌ On ne peut pas synchroniser par ID si on n'a que la description
```

### Exemple concret

```
Dans la section de Bobigny, on a:
- cm_idr: ???      (vide, devrait être "CM-0092")
- cm_adr: "Bobigny"

Un autre système dit "Synchronise la section pour CM-0092"
On ne peut pas vérifier facilement car on n'a pas l'ID en base
```

### Ce qui devrait se passer
1. **À l'import** : Récupérer l'ID CM depuis le CSV / données externes
2. **En base** : Stocker l'ID en `cm_idr`
3. **En affichage** : Pouvoir utiliser soit l'ID soit la description

### Le code actuellement
```typescript
cm_adr: cmDesignation,    // ✅ Peuplé ("Centre Bobigny")
cm_idr: undefined,        // ❌ Vide (devrait être "CM-0092")
```

### Impact sur les usagers finaux
- Export incomplet
- Pas d'interopérabilité avec d'autres systèmes
- Impossible de faire des jointures par ID

### Décision requise
1. **Activer la capture des IDR** : Modifier l'import pour récupérer les IDs
2. **Ou supprimer les champs** : Si on n'utilise jamais les IDs, ne pas les garder en base

---

## 📋 Récapitulatif des impacts

### Tableau synthétique

| Problème | Usager final | Développeur | Impact business | Urgence |
|----------|-------------|------------|-----------------|---------|
| LIAISON mal nommée | ✅ Aucun | 🔴 Confusion | Medium | 🟡 Moyen |
| BRANCHE mal nommée | ✅ Aucun | 🔴 Confusion | Medium | 🟡 Moyen |
| BRANCHE NUMERO absent | 🔴 Impossibilité | 🟡 À développer | High | 🔴 Haut |
| CM/GMR/EEL IDR vides | 🔴 Export incomplet | 🟡 Support limité | Medium-High | 🟡 Moyen |

---

### Tableau des causes racines

| Concept | Cause | État actuel | Conséquence |
|---------|-------|-------------|------------|
| **LIAISON** | Renommage historique sans cohérence | `link_code` en app, `link_idr` en DB | Mapping manuel requis |
| **BRANCHE** | Renommage historique sans cohérence | `branch_code` en app, `branch_idr` en DB | Mapping manuel requis |
| **BRANCHE NUMERO** | Spécification jamais implémentée | Propriété n'existe pas | Fonctionnalité manquante |
| **CM/GMR/EEL IDR** | Import incomplet, seul `_adr` peuplé | `cm_idr` / `gmr_idr` / `eel_idr` = vides | Pas d'interopérabilité |

---

### Tableau des actions correctives

| Action | Fichiers affectés | Effort | Bénéfice | Timeline |
|--------|------------------|--------|----------|----------|
| **Clarifier BRANCHE NUMERO** | Spécifications | Faible | Validation besoin | 🚀 Immédiat |
| **Renommer LIAISON** | section.model.ts + 15+ fichiers | Moyen | Cohérence code | 📐 Long terme |
| **Renommer BRANCHE** | section.model.ts + 10+ fichiers | Moyen | Cohérence code | 📐 Long terme |
| **Peuplé CM/GMR/EEL IDR** | section-import.service.ts + maintenance.service.ts | Faible | Export complet | 🎯 Court terme |

---

## Recommandations priorisées

### 🚀 **IMMÉDIAT** (Avant le prochain sprint)
| Action | Responsable | Décision |
|--------|-------------|----------|
| Confirmer si BRANCHE NUMERO est un vrai besoin | PO | Oui / Non / Reporter |
| Si oui, clarifier la source de la donnée | Métier | CSV ? Calcul ? Manuel ? |

**Raison** : Détermine si c'est une fonctionnalité urgente ou non

---

### 🎯 **COURT TERME** (Prochain sprint)
| Action | Effort | Bénéfice |
|--------|--------|----------|
| Peuplé `cm_idr`, `gmr_idr`, `eel_idr` lors de l'import | Faible (1-2j) | Export complète + interopérabilité |

**Fichiers à modifier** :
- `section-import.service.ts` (ajouter lookup des IDs)
- `maintenance.service.ts` (retourner aussi les IDs)

---

### 📐 **LONG TERME** (Cleanup technique)
| Action | Effort | Bénéfice |
|--------|--------|----------|
| Renommer `link_code` → `link_idr` | Moyen (3-5j) | Cohérence DB ↔ App |
| Renommer `branch_code` → `branch_idr` | Moyen (3-5j) | Cohérence DB ↔ App |
| Supprimer arrays dépréciés `maintenance_center_names` | Faible (1j) | Simplification modèle |

**Raison** : Réduction de la confusion développeur, moins de bugs

---

## 📊 Tableau de décision pour le PO

**Répondre à ces 3 questions pour prioriser** :

| Question | Impact | Réponse |
|----------|--------|---------|
| BRANCHE NUMERO est-il un besoin réel ? | High | ☐ Oui → Story urgente<br/>☐ Non → À ignorer<br/>☐ Flou → À clarifier avec métier |
| Export API doit-il inclure les IDs (cm_idr, gmr_idr, eel_idr) ? | Medium | ☐ Oui → Priorité moyen terme<br/>☐ Non → Ne rien faire<br/>☐ Flou → À vérifier impact clients |
| La cohérence de nomenclature (LIAISON/BRANCHE) est-elle une priorité ? | Low | ☐ Oui → Ajouter au cleanup<br/>☐ Non → Keeper tel quel<br/>☐ Peut attendre → Backlog technique |
