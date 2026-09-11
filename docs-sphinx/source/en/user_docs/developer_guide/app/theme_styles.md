# theme styles

## colors
Colors for this project are to be used through **`sass (scss)` maps** *(array or vars)* or **`css` custom properties**.  
Custom properties are dynamicly generated from SASS for each color collection (primary, secondary, greys, etc).  

### SASS use
SASS colors variables are exposed through abstracts.extracts.scss file *src/styles/abstracts/_abstract.extracts.scss* and requires sass:map built in module.  
ex:  
```text
@use 'sass:map';
@use 'abstract.extracts.scss' as app;

.random-class {
  background-color: map.get(app.$primary, 600);
}
```
### CSS use
Custom properties are directly exposed to the whole app through `:root` selector.
ex: 
``` CSS
.random-class {
  background-color: var(--primary-600);
}
```

### Colors collections
|              | primary SASS  | primary CSS    | secondary SASS  | secondary CSS    |
| -----------: | :-----------: | -------------- | :-------------: | ---------------- |
| **map name** | $primary      |                | $secondary      |                  |
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
| **main use** | $main-primary | --main-primary | $main-secondary | --main-secondary |

|              | tertiary SASS  | tertiary CSS    | rte blue SASS  | rte blue CSS |
| -----------: | :------------: | --------------- | :------------: | ------------ |
| **map name** | $tertiary      |                 | $rte-blue      |              |
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
| **main use** | $main-tertiary | --main-tertiary | $main-rte-blue | --main-rte   |

⚠ `$rte-blue` custom properties drop the "blue" part: they are `--rte-*` and `--main-rte`, *not* `--rte-blue-*`.

|              | success SASS  | success CSS    | warning SASS  | warning CSS    | error SASS  | error CSS    |
| -----------: | :-----------: |--------------- | :-----------: | -------------- | :---------: | ------------ |
| **map name** | $success      |                | $warning      |                | $error      |              |
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
| **main use** | $main-success | --main-success | $main-warning | --main-warning | $main-error | --main-error |

|              | grey SASS        | grey CSS     |
| -----------: | :--------------: |------------- |
| **map name** | $grey *or* $gray |              |
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
| **main use** | $main-grey       | --main-grey  |

|              | star dust SASS | star dust CSS   |
| -----------: | :------------: | --------------- |
| **map name** | $star-dust     |                 |
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
| **main use** | *none*         | *none*          |

⚠ `$star-dust` is the only collection with a `1000` step and the only one **without** a `main use` shade.
It is the neutral used for UI chrome (separators, disabled texts) and it is the base of every elevation shadow.

## Icons
In compliance with RTE design system, we use Google's [material icons](https://fonts.google.com/icons) are self hosted for icons and we're using its symbols variant.  
You can insert any available icon with any tag wrapper with `app-icon` class and the name of the icon as plain text inside the tag.  
We recommanded using semanticly blank tags like `span` or `div` for accessibility reasons.  

Integration ex:
```HTML
<!-- 
  I will display a circled arrow 
  in any modern browser ↴ 
-->
<span class="app-icon">arrow_circle_right</span>
```

All base display options are included in `app-icon` but you can override some of them for your current needs.
- icon size can be change with `font-size` property.  
It must always be in `rem` or `em` unit ! *(use <u>em</u> at your own risk)*
- emphazis can be increased or decreased for a singular icon with `font-variation-settings: 'GRAD' /*value*/;` css property.  
Default value is 0 and can be -25, 0 or 200.
  - -25 will decreased icon's thickness
  - 0 is the default value
  - 200 will increased icon's thickness

## Fonts and texts styles
In compliance with RTE design system, we use "Nunito" font-family and the different texts styles can be applied with a `sass map`, a `sass placeholder` or an `OOCSS` *(object oriented CSS)*.

### SASS use
SASS texts styles variables and placeholder are exposed through abstract.extracts.scss file *src/styles/abstracts/_abstract.extracts.scss* and requires sass:map built in module for variables.  
ex:  
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

### OOCSS use
As the name implies, class is ready to use in your HTML
ex: 
``` HTML
<p class="heading-3xl">text</p>
```

### list of available text styles
|          |             | Heading      |                  |              |
| -------: | ----------- | ------------ | ---------------- | ------------ |
|          | name        | SASS map     | SASS placehloder | OOCSS        |
| map name |             | $txt-heading |                  |              |
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
|          | name             | SASS map | SASS placehloder | OOCSS        | 
| map name |                  | $text    |                  |              |
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

## Elevations
Elevations represents all shadows possible to use in the application.  
They could be applied with a `sass map` or a `custom property`.  
 
### Elevation list
|          | SASS map      | CSS                       |
| -------: | ------------- | ------------------------- |
| map name | $elevation    |                           |
|          | neutral-inner | --elevation-neutral-inner |
|          | neutral-1     | --elevation-neutral-1     |
|          | neutral-2     | --elevation-neutral-2     |
|          | neutral-3     | --elevation-neutral-3     |
|          | neutral-4     | --elevation-neutral-4     |
|          | neutral-5     | --elevation-neutral-5     |
|          | neutral-6     | --elevation-neutral-6     |

## Other placeholders
Beyond the text styles, *src/styles/abstracts/_mixins-placeholders.scss* exposes a few placeholders for
recurring UI patterns. They are used the same way, with `@extend` and without namespace.  
ex:
```text
@use 'abstract.extracts' as app;

.random-class {
  @extend %focus-state;
}
```

| placeholder          | what it does                                                                                     |
| -------------------: | ------------------------------------------------------------------------------------------------ |
| %label-spacing       | Sole margin of a form label. Extracted so a custom label can keep the alignment without the typo. |
| %label-style         | Full form label style: %label-spacing + inline block + 0.75rem text in `--star-dust-900`.         |
| %focus-state         | Accessibility focus ring: 1px outline in `--primary-900` with an offset. **Always prefer it over a hand written outline** so the focus stays consistent across the app. |
| %vertical-separator  | 1px full height vertical rule in `--star-dust-300`, to separate inline blocks.                     |
| %tools-grid-layout   | 5 equal columns grid used by the studio toolbars. Cell width is computed from the column gap so the 5 cells always fit. |
| %read-only-info      | Text that must align with the input fields next to it (mostly in definition lists): %text-m-400, `--grey-900` and the input padding. |

## Ready to use classes
Some placeholders are also exposed as plain classes in *src/styles/_utils.scss*, ready to be dropped in a template.  
Use the class in the HTML, use the placeholder in the SCSS.

| class            | equivalent        | usage                                                                     |
| ---------------: | ----------------- | ------------------------------------------------------------------------- |
| .heading-*       | %heading-*        | See *list of available text styles* above.                                 |
| .text-*          | %text-*           | See *list of available text styles* above.                                 |
| .label           | %label-style      | A label style on something that is not a `<label>` tag.                    |
| .read-only-info  | %read-only-info   | A read only value displayed where an input would be.                       |
| .underline-text  | *none*            | Draws a 2px `--primary-700` bar under an inline text, tight to its width.  |
| .title-underline | *none*            | Underlines a title with the primeNG primary color and a large offset.      |
| sup.mandatory    | *none*            | The mandatory field marker. Only styles a `<sup>` tag, in `--error-700`.   |

ex:
```HTML
<p class="label">cable length <sup class="mandatory">*</sup></p>
<p class="read-only-info">42.5</p>
```

## Automatic element styling
A bunch of HTML tags are already styled globally in *src/styles/_typography.scss* and *src/styles/_core.scss*.  
**Do not re-apply the matching class or placeholder on those tags**, it is already done.

| tag                       | applied style                                                             |
| ------------------------: | ------------------------------------------------------------------------- |
| body                      | %text-s-400. This is the default text of the whole app.                    |
| h1                        | %heading-xl                                                                |
| h2                        | %heading-l                                                                 |
| h3                        | %heading-m                                                                 |
| h4                        | %heading-s                                                                 |
| h5                        | %heading-xs                                                                |
| h6                        | %heading-2xs                                                               |
| h1 to h6                  | `1.5rem 0 1rem` margin, top margin removed on a first child.               |
| p                         | `0 0 1rem` margin, bottom margin removed on a last child.                  |
| label                     | %label-style                                                               |
| input, select, textarea   | Inherited font family, browsers do not inherit it by default.              |
| input[type='number']      | Spin buttons removed, on every engine.                                     |
| del                       | Strike through removed, greyed out in `--star-dust-400` instead.           |
| hr                        | 1px top border in `--surface-border` with a `1rem` vertical margin.        |
| blockquote                | 4px left border and a `2rem` horizontal padding.                           |
| mark                      | Amber background, monospace font and the app border radius.                |







