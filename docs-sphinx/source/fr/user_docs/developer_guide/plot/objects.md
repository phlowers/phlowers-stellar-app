# Création des objets de données de tracé

`createPlotData.ts` et `createPlotDataObject.ts` sont les deux fichiers qui transforment les tableaux de coordonnées 3D en objets de données Plotly.js pour le rendu. Ils gèrent trois types d'objets :
- **Spans** (bleu) - éléments structurels principaux
- **Supports** (indigo) - structures de support avec étiquettes numérotées
- **Insulators** (rouge) - éléments isolateurs

## Fonctionnement

### `createPlotData.ts`

C'est le point d'entrée. Il prend les données de sortie de la section et les options de tracé, puis :
1. Parcourt les spans, supports et insulators
2. Appelle `createDataObject()` pour chaque type
3. Aplatit le tout en un seul tableau d'objets de données Plotly

```typescript
const plotData = createPlotData(sectionData, {
  view: '3d',
  side: 'profile',
  startSupport: 0,
  endSupport: 5,
  invert: false
});
```

### `createPlotDataObject.ts`

C'est ce fichier qui effectue le travail réel de transformation des coordonnées en objets Plotly.

**`createDataObject()`** - La fonction principale :
- Découpe les données selon les indices de support (les spans excluent la fin, les supports/insulators l'incluent)
- Extrait les coordonnées x, y, z de chaque point
- Transforme les coordonnées selon la vue :
  - **3D** : Utilise x, y, z directement avec `scatter3d`
  - **2D Profile** : Projette sur le plan XZ (x→x, z→z, y→y)
  - **2D Face** : Projette sur le plan YZ (y→x, z→z, échange les axes)
- Applique le style (couleurs, épaisseur de ligne, marqueurs, étiquettes de texte)

**Fonctions utilitaires :**
- `getLine()` - Renvoie la couleur (bleu/indigo/rouge), le style de tirets et l'épaisseur (plus épaisse en 3D)
- `getMode()` - Renvoie `'text+lines+markers'` pour les supports, `'lines+markers'` pour les autres
- `getText()` - Étiquette les supports avec leur champ `number` du modèle `Support` sur le point le plus haut
- `getMarker()` - Définit la taille des marqueurs (varie selon le type et la vue)

## Référence rapide

**Transformations de coordonnées :**
- 3D : `x, y, z` → `x, y, z` (scatter3d)
- 2D Profile : `x, y, z` → `x, z, y` (scatter)
- 2D Face : `x, y, z` → `y, z, y` (scatter, échange x/y)

**Style :**
- Spans : dodgerblue, épaisseur 8 (3D) ou 4 (2D)
- Supports : indigo, épaisseur 8 (3D) ou 4 (2D), affiche des étiquettes numérotées
- Insulators : rouge, épaisseur 8 (3D) ou 4 (2D)

**Remarque :** Les étiquettes des supports affichent le champ `number` du modèle `Support`, pas un index dérivé.

## Résumé de la configuration de style

### Lignes

Tous les styles de ligne utilisent `dash: 'solid'`. L'épaisseur de ligne varie selon le mode de vue (plus épaisse en 3D) :

| Type | Couleur | Épaisseur (3D) | Épaisseur (2D) |
|------|-------|------------|------------|
| **Spans** | `dodgerblue` | 8 | 4 |
| **Supports** | `indigo` | 8 | 4 |
| **Insulators** | `red` | 8 | 4 |
| **Par défaut** | `black` | 8 | 4 |

### Marqueurs

La taille des marqueurs varie selon le type d'objet et le mode de vue :

| Type | Taille (3D) | Taille (2D) |
|------|-----------|-----------|
| **Spans** | 3 | 5 |
| **Supports** | 3 | 4 |
| **Insulators** | 4 | 6 |
| **Par défaut** | 3 | 3 |

### Texte

- **Mode** : 
  - Supports : `'text+lines+markers'` (affiche les étiquettes de texte)
  - Tous les autres : `'lines+markers'` (pas d'étiquettes de texte)
  
- **Étiquettes de texte** (Supports uniquement) :
  - Affichage : champ `number` du support depuis le modèle `Support`, sur le point le plus haut (coordonnée z maximale)
  - Position : `'top center'` (appliquée à tous les objets de données)
  - Logique : seul le point avec la valeur z la plus élevée dans chaque support est étiqueté ; tous les autres points ont des chaînes vides. Se replie sur une chaîne vide si le support ou son `number` n'est pas disponible.

- **Position du texte** : `'top center'` (appliquée globalement à tous les objets de données)
