# styles du thème

## couleurs
Les couleurs de ce projet doivent être utilisées via des **maps `sass (scss)`** *(tableaux ou variables)* ou des **propriétés personnalisées `css`**.  
Les propriétés personnalisées sont générées dynamiquement depuis SASS pour chaque collection de couleurs (primary, secondary, greys, etc).  

### Utilisation SASS
Les variables de couleurs SASS sont exposées via le fichier abstract.extracts.scss *src/styles/abstracts/_abstract.extracts.scss* et nécessitent le module intégré sass:map.  
ex :  
```text
@use 'sass:map';
@use 'abstract.extracts.scss' as app;

.random-class {
  background-color: map.get(app.$primary, 600);
}
```
### Utilisation CSS
Les propriétés personnalisées sont directement exposées à toute l'application via le sélecteur `:root`.
ex : 
``` CSS
.random-class {
  background-color: var(--primary-600);
}
```

### Collections de couleurs
|              | primary SASS  | primary CSS    | secondary SASS  | secondary CSS    |
| -----------: | :-----------: | -------------- | :-------------: | ---------------- |
| **nom de la map** | $primary      |                | $secondary      |                  |
|              | 0             | --primary-0    | 0               | --secondary-0    |
|              | 50            | --primary-50   | 50              | --secondary-50   |
|              | 100           | --primary-100  | 100             | --secondary-100  |
|              | 200           | --primary-200  | 200             | --secondary-200  |
|              | 300           | --primary-300  | 300             | --secondary-300  |
|              | 400           | --primary-400  | 400             | --secondary-400  |
|              | 500           | --primary-500  | 500             | --secondary-500  |
|              | 600           | --primary-600  | 600             | --secondary-600  |
|              | 700           | --primary-700  | 700             | --secondary-700  |
|              | 800           | --primary-800  | 800             | --secondary-800  |
|              | 900           | --primary-900  | 900             | --secondary-900  |
|              | 950           | --primary-950  | 950             | --secondary-950  |
| **utilisation principale** | $main-primary | --main-primary | $main-secondary | --main-secondary |

|              | tertiary SASS  | tertiary CSS    | rte blue SASS  | rte blue CSS |
| -----------: | :------------: | --------------- | :------------: | ------------ |
| **nom de la map** | $tertiary      |                 | $rte-blue      |              |
|              | 0              | --tertiary-0    | 0              | --rte-0      |
|              | 50             | --tertiary-50   | 50             | --rte-50     |
|              | 100            | --tertiary-100  | 100            | --rte-100    |
|              | 200            | --tertiary-200  | 200            | --rte-200    |
|              | 300            | --tertiary-300  | 300            | --rte-300    |
|              | 400            | --tertiary-400  | 400            | --rte-400    |
|              | 500            | --tertiary-500  | 500            | --rte-500    |
|              | 600            | --tertiary-600  | 600            | --rte-600    |
|              | 700            | --tertiary-700  | 700            | --rte-700    |
|              | 800            | --tertiary-800  | 800            | --rte-800    |
|              | 900            | --tertiary-900  | 900            | --rte-900    |
|              | 950            | --tertiary-950  | 950            | --rte-950    |
| **utilisation principale** | $main-tertiary | --main-tertiary | $main-rte-blue | --main-rte   |

⚠ Les propriétés personnalisées de `$rte-blue` perdent la partie « blue » : elles s'appellent `--rte-*` et `--main-rte`, et *non* `--rte-blue-*`.

|              | success SASS  | success CSS    | warning SASS  | warning CSS    | error SASS  | error CSS    |
| -----------: | :-----------: |--------------- | :-----------: | -------------- | :---------: | ------------ |
| **nom de la map** | $success      |                | $warning      |                | $error      |              |
|              | 0             | --success-0    | 0             | --warning-0    | 0           | --error-0    |
|              | 50            | --success-50   | 50            | --warning-50   | 50          | --error-50   |
|              | 100           | --success-100  | 100           | --warning-100  | 100         | --error-100  |
|              | 200           | --success-200  | 200           | --warning-200  | 200         | --error-200  |
|              | 300           | --success-300  | 300           | --warning-300  | 300         | --error-300  |
|              | 400           | --success-400  | 400           | --warning-400  | 400         | --error-400  |
|              | 500           | --success-500  | 500           | --warning-500  | 500         | --error-500  |
|              | 600           | --success-600  | 600           | --warning-600  | 600         | --error-600  |
|              | 700           | --success-700  | 700           | --warning-700  | 700         | --error-700  |
|              | 800           | --success-800  | 800           | --warning-800  | 800         | --error-800  |
|              | 900           | --success-900  | 900           | --warning-900  | 900         | --error-900  |
|              | 950           | --success-950  | 950           | --warning-950  | 950         | --error-950  |
| **utilisation principale** | $main-success | --main-success | $main-warning | --main-warning | $main-error | --main-error |

|              | grey SASS        | grey CSS     |
| -----------: | :--------------: |------------- |
| **nom de la map** | $grey *ou* $gray |              |
|              | 'white'          | --grey-white |
|              | 0                | --grey-0     |
|              | 50               | --grey-50    |
|              | 100              | --grey-100   |
|              | 150              | --grey-150   |
|              | 200              | --grey-200   |
|              | 250              | --grey-250   |
|              | 300              | --grey-300   |
|              | 350              | --grey-350   |
|              | 400              | --grey-400   |
|              | 450              | --grey-450   |
|              | 500              | --grey-500   |
|              | 550              | --grey-550   |
|              | 600              | --grey-600   |
|              | 650              | --grey-650   |
|              | 700              | --grey-700   |
|              | 750              | --grey-750   |
|              | 800              | --grey-800   |
|              | 850              | --grey-850   |
|              | 900              | --grey-900   |
|              | 950              | --grey-950   |
| **utilisation principale** | $main-grey       | --main-grey  |

|              | star dust SASS | star dust CSS   |
| -----------: | :------------: | --------------- |
| **nom de la map** | $star-dust     |                 |
|              | 0              | --star-dust-0   |
|              | 50             | --star-dust-50  |
|              | 100            | --star-dust-100 |
|              | 200            | --star-dust-200 |
|              | 300            | --star-dust-300 |
|              | 400            | --star-dust-400 |
|              | 500            | --star-dust-500 |
|              | 600            | --star-dust-600 |
|              | 700            | --star-dust-700 |
|              | 800            | --star-dust-800 |
|              | 900            | --star-dust-900 |
|              | 950            | --star-dust-950 |
|              | 1000           | --star-dust-1000 |
| **utilisation principale** | *aucune*       | *aucune*        |

⚠ `$star-dust` est la seule collection à disposer d'un palier `1000` et la seule **sans** teinte d'utilisation principale.
C'est le neutre utilisé pour l'habillage de l'interface (séparateurs, textes désactivés) et c'est la base de toutes les ombres d'élévation.

## Icônes
Conformément au design system RTE, nous utilisons les [material icons](https://fonts.google.com/icons) de Google, auto-hébergées, pour les icônes, en utilisant sa variante symbols.  
Vous pouvez insérer n'importe quelle icône disponible dans n'importe quelle balise conteneur avec la classe `app-icon` et le nom de l'icône en texte brut à l'intérieur de la balise.  
Nous recommandons d'utiliser des balises sémantiquement neutres comme `span` ou `div` pour des raisons d'accessibilité.  

Exemple d'intégration :
```HTML
<!-- 
  I will display a circled arrow 
  in any modern browser ↴ 
-->
<span class="app-icon">arrow_circle_right</span>
```

Toutes les options d'affichage de base sont incluses dans `app-icon`, mais vous pouvez en surcharger certaines selon vos besoins.
- la taille de l'icône peut être modifiée avec la propriété `font-size`.  
Elle doit toujours être exprimée en unité `rem` ou `em` ! *(l'utilisation de <u>em</u> se fait à vos risques et périls)*
- l'accentuation peut être augmentée ou diminuée pour une icône individuelle avec la propriété css `font-variation-settings: 'GRAD' /*value*/;`.  
La valeur par défaut est 0 et peut être -25, 0 ou 200.
  - -25 diminuera l'épaisseur de l'icône
  - 0 est la valeur par défaut
  - 200 augmentera l'épaisseur de l'icône

## Polices et styles de texte
Conformément au design system RTE, nous utilisons la police "Nunito" et les différents styles de texte peuvent être appliqués via une `sass map`, un `sass placeholder` ou une approche `OOCSS` *(CSS orienté objet)*.

### Utilisation SASS
Les variables et placeholders de styles de texte SASS sont exposés via le fichier abstract.extracts.scss *src/styles/abstracts/_abstract.extracts.scss* et nécessitent le module intégré sass:map pour les variables.  
ex :  
```text
// sass map use
@use 'sass:map';
@use 'abstract.extracts.scss' as app;

.random-class {
  map.get(app.$text-heading, 3xl);
}
```

```text
@use 'abstract.extracts.scss' as app;

.random-class {
  @extend %heading-3xl; // SASS placeholders do not work with SASS namespaces yet.
}
```

### Utilisation OOCSS
Comme son nom l'indique, la classe est prête à l'emploi dans votre HTML
ex : 
``` HTML
<p class="heading-3xl">text</p>
```

### liste des styles de texte disponibles
|          |             | Heading      |                  |              |
| -------: | ----------- | ------------ | ---------------- | ------------ |
|          | nom         | SASS map     | SASS placeholder | OOCSS        |
| nom de la map |             | $txt-heading |                  |              |
|          | heading 5xl | 5xl          | %heading-5xl     | .heading-5xl |
|          | heading 4xl | 4xl          | %heading-4xl     | .heading-4xl |
|          | heading 3xl | 3xl          | %heading-3xl     | .heading-3xl |
|          | heading 2xl | 2xl          | %heading-2xl     | .heading-2xl |
|          | heading xl  | xl           | %heading-xl      | .heading-xl  |
|          | heading l   | l            | %heading-l       | .heading-l   |
|          | heading m   | m            | %heading-m       | .heading-m   |
|          | heading s   | s            | %heading-s       | .heading-s   |
|          | heading xs  | xs           | %heading-xs      | .heading-xs  |
|          | heading 2xs | 2xs          | %heading-2xs     | .heading-2xs |

|          |                  | Text     |                  |              | 
| -------: | ---------------- | -------- | ---------------- | ------------ |
|          | nom              | SASS map | SASS placeholder | OOCSS        | 
| nom de la map |                  | $text    |                  |              |
|          | text xl regular  | xl-400   | %text-xl-400     | .text-xl-400 |
|          | text xl semibold | xl-600   | %text-xl-600     | .text-xl-600 |
|          | text l regular   | l-400    | %text-l-400      | .text-l-400  |
|          | text l semibold  | l-600    | %text-l-600      | .text-l-600  |
|          | text m regular   | m-400    | %text-m-400      | .text-m-400  |
|          | text m semibold  | m-600    | %text-m-600      | .text-m-600  |
|          | text s regular   | s-400    | %text-s-400      | .text-s-400  |
|          | text s semibold  | s-600    | %text-s-600      | .text-s-600  |
|          | text xs regular  | xs-400   | %text-xs-400     | .text-xs-400 |
|          | text xs semibold | xs-600   | %text-xs-600     | .text-xs-600 |

## Élévations
Les élévations représentent toutes les ombres portées disponibles pour l'application.  
Elles peuvent être appliquées via une `sass map` ou une `propriété personnalisée`.  
 
### Liste des élévations
|          | SASS map      | CSS                       |
| -------: | ------------- | ------------------------- |
| nom de la map | $elevation    |                           |
|          | neutral-inner | --elevation-neutral-inner |
|          | neutral-1     | --elevation-neutral-1     |
|          | neutral-2     | --elevation-neutral-2     |
|          | neutral-3     | --elevation-neutral-3     |
|          | neutral-4     | --elevation-neutral-4     |
|          | neutral-5     | --elevation-neutral-5     |
|          | neutral-6     | --elevation-neutral-6     |

## Autres placeholders
Au-delà des styles de texte, *src/styles/abstracts/_mixins-placeholders.scss* expose quelques placeholders
pour des motifs d'interface récurrents. Ils s'utilisent de la même manière, avec `@extend` et sans namespace.  
ex :
```text
@use 'abstract.extracts' as app;

.random-class {
  @extend %focus-state;
}
```

| placeholder          | rôle                                                                                              |
| -------------------: | ------------------------------------------------------------------------------------------------- |
| %label-spacing       | Marge seule d'un label de formulaire. Extraite pour qu'un label personnalisé garde l'alignement sans reprendre la typo. |
| %label-style         | Style complet d'un label de formulaire : %label-spacing + bloc en ligne + texte 0.75rem en `--star-dust-900`. |
| %focus-state         | Anneau de focus accessible : contour de 1px en `--primary-900` avec un décalage. **À préférer systématiquement à un `outline` écrit à la main** pour garder un focus cohérent dans toute l'application. |
| %vertical-separator  | Filet vertical de 1px sur toute la hauteur, en `--star-dust-300`, pour séparer des blocs en ligne.  |
| %tools-grid-layout   | Grille de 5 colonnes égales utilisée par les barres d'outils du studio. La largeur des cellules est calculée à partir de l'écart entre colonnes pour que les 5 cellules tiennent toujours. |
| %read-only-info      | Texte devant s'aligner avec les champs de saisie voisins (principalement dans les listes de définitions) : %text-m-400, `--grey-900` et le padding des champs. |

## Classes prêtes à l'emploi
Certains placeholders sont également exposés sous forme de classes simples dans *src/styles/_utils.scss*, prêtes à être posées dans un template.  
Utilisez la classe dans le HTML, le placeholder dans le SCSS.

| classe           | équivalent        | utilisation                                                               |
| ---------------: | ----------------- | ------------------------------------------------------------------------- |
| .heading-*       | %heading-*        | Voir *liste des styles de texte disponibles* ci-dessus.                    |
| .text-*          | %text-*           | Voir *liste des styles de texte disponibles* ci-dessus.                    |
| .label           | %label-style      | Un style de label sur autre chose qu'une balise `<label>`.                 |
| .read-only-info  | %read-only-info   | Une valeur en lecture seule affichée là où se trouverait un champ de saisie. |
| .underline-text  | *aucun*           | Trace un trait de 2px en `--primary-700` sous un texte en ligne, ajusté à sa largeur. |
| .title-underline | *aucun*           | Souligne un titre avec la couleur primaire de primeNG et un large décalage. |
| sup.mandatory    | *aucun*           | Le marqueur de champ obligatoire. Ne style qu'une balise `<sup>`, en `--error-700`. |

ex :
```HTML
<p class="label">cable length <sup class="mandatory">*</sup></p>
<p class="read-only-info">42.5</p>
```

## Styles appliqués automatiquement aux balises
Un certain nombre de balises HTML sont déjà stylées globalement dans *src/styles/_typography.scss* et *src/styles/_core.scss*.  
**Ne réappliquez pas la classe ou le placeholder correspondant sur ces balises**, c'est déjà fait.

| balise                    | style appliqué                                                            |
| ------------------------: | ------------------------------------------------------------------------- |
| body                      | %text-s-400. C'est le texte par défaut de toute l'application.             |
| h1                        | %heading-xl                                                                |
| h2                        | %heading-l                                                                 |
| h3                        | %heading-m                                                                 |
| h4                        | %heading-s                                                                 |
| h5                        | %heading-xs                                                                |
| h6                        | %heading-2xs                                                               |
| h1 à h6                   | Marge `1.5rem 0 1rem`, marge haute supprimée sur un premier enfant.        |
| p                         | Marge `0 0 1rem`, marge basse supprimée sur un dernier enfant.             |
| label                     | %label-style                                                               |
| input, select, textarea   | Famille de police héritée, les navigateurs ne l'héritent pas par défaut.   |
| input[type='number']      | Boutons d'incrément supprimés, sur tous les moteurs.                       |
| del                       | Barré supprimé, grisé en `--star-dust-400` à la place.                     |
| hr                        | Bordure haute de 1px en `--surface-border` avec une marge verticale de `1rem`. |
| blockquote                | Bordure gauche de 4px et padding horizontal de `2rem`.                     |
| mark                      | Fond ambré, police monospace et rayon de bordure de l'application.         |
