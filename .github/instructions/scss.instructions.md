---
applyTo: "**/*.scss"
---

# SCSS — BEM strict, avoid deep nesting

```scss
.my-component {
  gap: var(--spacing-md);

  &__header { }
  &__header--sticky { }

  &__item {
    &--selected { }

    &__icon { // element-of-element: keep exceptions like this shallow
      &--active { }
    }
  }
}
```

Prefer flat `&__block--modifier` selectors. Nesting an element inside another element
(`&__item__icon`) or a state modifier inside it (`&__item__icon--active`) is tolerated when it
mirrors the actual DOM structure, but never nest beyond what's needed to express block → element →
modifier for that specific node.

One SCSS file per component. Tailwind only in HTML templates for one-off tweaks.
Style overrides for PrimeNG must use PrimeNG CSS variables only — no global selectors.
