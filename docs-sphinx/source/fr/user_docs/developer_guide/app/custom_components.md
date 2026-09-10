# Composants personnalisés
Nous utilisons la bibliothèque PrimeNG pour nos composants de base, et non le dernier design system de RTE puisque nous sommes en avance sur sa sortie.  
Cependant, nous devons respecter son design à ce jour (et dans une certaine mesure). Nous avons donc dû créer des composants atomiques personnalisés à des fins de design ou de fonctionnalité, ainsi que des composants d'interface pour pré-initialiser certains composants PrimeNG.

## Icônes
- sélecteur : app-icon
- input : icon = `input.required<PossibleIconNames>()` // définit l'icône à afficher
Le type **PossibleIconNames** référence un tableau de toutes les valeurs possibles de la police material symbols chargée depuis le dossier `public/`

exemple d'implémentation :  
```text
<app-icon icon="electric_bolt" />
<app-icon [icon]="dynamicImplementationValue" />
```

## Bouton
- sélecteurs :
  - button[app-btn]
  - button[app-button]
  - a[app-btn]
  - a[app-button]
- inputs :
  - btnSize = `input<'s' | 'm' | 'l'>('m')` // définit la taille du bouton
  - btnStyle = `input<'base' | 'outlined' | 'text' | 'danger'>('base')` // définit l'aspect du bouton
  - btnLoading = `input<boolean>(false)` // désactive le clic, ajoute un aspect désactivé et un spinner de chargement au bouton

Tout son contenu est projeté.  
Les icônes utilisées via le composant `<app-icon>` ou la classe OOCSS `.app-icon` iront à droite du texte grâce à l'attribut `iconRight`.  
Tous les autres contenus projetés seront dans un conteneur orienté texte.

exemple d'implémentation :  
```text
<button icon="electric_bolt">
  <span class="app-icon" iconRight>android</span> <!-- icon is on right side of button -->
  my button label
</button>

<a app-button [routerLink]="routeToAComponent" btnSize="s" btnStyle="text">
  link text
</a>
```

## card
- sélecteur : app-card
- input : role = `input.required<string>()` // Définit le rôle aria (aria-role) de la carte

Le tabindex est ajouté dynamiquement pour les rôles `button` et `link`. Ce n'est pas implémenté pour les autres rôles potentiellement interactifs comme menuitem ou tooltip, car il est peu probable qu'ils soient utilisés comme tels.  
Tout son contenu est projeté.

exemple d'implémentation :
```text
<app-card role="button" (click)="alertClick()" (keyup)="EnterKey($event)">
  I'm a button card
</app-card>

<app-card role="article">
  <header>
    <h3>article title</h3>
  </header>

  <main>article card</main>
</app-card>
```

## Accordéon
L'accordéon provient entièrement de PrimeNG, mais nous avons dû utiliser les mécanismes intégrés pour modifier les icônes de chevron de l'en-tête. 
Ce changement est intégré dans le composant app-accordion-header, vous devriez donc l'utiliser à la place de p-accordion-header.  
Le contenu est projeté à l'intérieur de p-accordion-header, donc n'hésitez pas à y injecter ce dont vous avez besoin.

exemple d'implémentation :
```HTML
<p-accordion value="0">
  <p-accordion-panel value="0">
    <app-accordion-header>
      <app-icon icon="search" />
      Header title
    </app-accordion-header>

    <p-accordion-content>
      <p class="m-0">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
        eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
        minim veniam, quis nostrud exercitation ullamco laboris nisi ut
        aliquip ex ea commodo consequat. Duis aute irure dolor in
        reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
        pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
        culpa qui officia deserunt mollit anim id est laborum.
      </p>
    </p-accordion-content>
  </p-accordion-panel>
</p-accordion>
```

## side-tabs & side-tab
Le composant side-tabs est un ensemble d'onglets horizontaux, comme des intercalaires, qui se replient comme un accordéon.  
Le conteneur est side-tabs et tout le contenu est injecté avec side-tab via un input signal et un templateRef

### side-tabs
- sélecteur : app-side-tabs
- pas d'input

### side-tab
- sélecteur : app-side-tab
- input : label = `input.required<string>()` // Définit le bouton de contrôle de l'onglet

exemple d'implémentation :
```HTML
<app-side-tabs>
  <app-side-tab label="button label 1">
    <ng-template>
      content is anything you want but must be in a ng-template
    </ng-template>
  </app-side-tab>

  <app-side-tab label="button label 2">
    <ng-template>
      content is anything you want but must be in a ng-template
    </ng-template>
  </app-side-tab>
</app-side-tabs>
```
