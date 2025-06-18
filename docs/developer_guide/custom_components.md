# Custom components
We're using PrimeNG library for our base components and not RTE's latest design system since we're ahead of it's release.  
However we do have to respect it's design to date (and to a degree). Therefore we had to create some custom atomic components for design or feature purpose.

## Icons
- selector: app-icon
- input: icon = `input.required<PossibleIconNames>()` // defines icon to display
**PossibleIconNames** type reference an array of all possible values from material symbols font loaded from `public/` folder

implementation ex:  
``` HTML
<app-icon icon="electric_bolt" />
<app-icon [icon]="dynamicImplementationValue" />
```

## Button
- selectors:
  - button[app-btn]
  - button[app-button]
  - a[app-btn]
  - a[app-button]
- inputs:
  - btnSize = `input<'s' | 'm' | 'l'>('m')` // defines button sizings
  - btnStyle = `input<'base' | 'outlined' | 'text'>('base')` // defines button aspect

All It's content is projected.  
Icons used through `<app-icon>` component or the OOCSS `.app-icon` will go on the right of the text with attribute `iconRight`.  
All other projected contents will be in text oriented wrapper.

implementation ex:  
``` HTML
<button icon="electric_bolt">
  <span class="app-icon" iconRight>android</span> <!-- icon is on right side of button -->
  my button label
</button>

<a app-button [routerLink]="routeToAComponent" btnSize="s" btnStyle="text">
  link text
</a>
```

## card
- selector: app-card
- input: role = `input.required<string>()` // Defines the aria-role for the card

tabindex is dynamicaly added for role `button` and `link`. It is not implemented for other potentially interactive oriented roles like menuitem or tooltip as it will unlikly be used as such elements.  
All It's content is projected.

implementation ex:
```HTML
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
