# styles du thème

## couleurs
Les couleurs de ce projet doivent être utilisées via des **maps `sass (scss)`** *(tableaux ou variables)* ou des **propriétés personnalisées `css`**.  
Les propriétés personnalisées sont générées dynamiquement depuis SASS pour chaque collection de couleurs (primary, secondary, greys, etc).  

### Utilisation SASS
Les variables de couleurs SASS sont exposées via le fichier abstracts.extracts.scss *src/app/styles/abstracts/_abstract.extracts.scss* et nécessitent le module intégré sass:map.  
ex :  
```text
@use 'sass:map';
@use '/*path to styles folder*/abstracts/abstracts.extracts.scss' as app;

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
| **nom de la map** | $grey *or* $gray |              |
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

## Icônes
Conformément au design system RTE, nous utilisons les [material icons](https://fonts.google.com/icons) de Google pour les icônes, en utilisant sa variante symbols.  
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
- l'accentuation peut être augmentée ou diminuée pour une icône individuelle avec la propriété css `font-variation-settings: 'grad' /*value*/;`.  
La valeur par défaut est 0 et peut être -25, 0 ou 200.
  - -25 diminuera l'épaisseur de l'icône
  - 0 est la valeur par défaut
  - 200 augmentera l'épaisseur de l'icône

## Polices et styles de texte
Conformément au design system RTE, nous utilisons la police "Nunito" et les différents styles de texte peuvent être appliqués via une `sass map`, un `sass placeholder` ou une approche `OOCSS` *(CSS orienté objet)*.

### Utilisation SASS
Les variables et placeholders de styles de texte SASS sont exposés via le fichier abstracts.extracts.scss *src/app/styles/abstracts/_abstract.extracts.scss* et nécessitent le module intégré sass:map pour les variables.  
ex :  
```text
// sass map use
@use 'sass:map';
@use '/*path to styles folder*/abstracts/abstracts.extracts.scss' as app;

.random-class {
  map.get(app.$text-heading, 3xl);
}
```

```text
@use 'sass:map';
@use '/*path to styles folder*/abstracts/abstracts.extracts.scss' as app;

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







