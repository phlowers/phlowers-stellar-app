# Rapports PDF

L'application génère ses rapports PDF dans le navigateur avec [jsPDF](https://github.com/parallax/jsPDF).
Chaque rapport est un service héritant de `PdfBaseService`, qui dessine le document avec les helpers
partagés de `src/app/shared/pdf/`. Cette page décrit ces helpers et la façon dont un service de rapport
les utilise.

---

## Fichiers partagés

| Fichier (`src/app/shared/pdf/`) | Contenu |
|---|---|
| `pdf-base.service.ts` | `PdfBaseService` : chargement de la police Nunito et création du document |
| `pdf-primitives.helpers.ts` | En-têtes, pieds de page, titres de section, séparateurs, listes à puces, cartouche, formatage des valeurs, résolution des étiquettes, `generatePdfReport()` |
| `pdf-table.helpers.ts` | Tableaux de résultats transposés : construction, mesure, dessin, enchaînement sur les pages |
| `pdf-layout.constantes.ts` | Formats et marges des pages, hauteur de ligne, tailles de police, unités, nom de l'application |
| `pdf-table.constantes.ts` | Dimensions des tableaux : colonnes par tableau, hauteur de ligne, marge intérieure, écart entre tableaux |
| `pdf-report.interfaces.ts` | Polices, éléments à puce, étiquettes et données du cartouche, `BaseReportLabels` |
| `pdf-table.interfaces.ts` | `MetricDescriptor`, modèles de tableau, `PdfResultSection`, options du flux |

## Rapports qui les utilisent

| Service | Déclenché depuis | Pages | Tableaux de résultats dessinés avec |
|---|---|---|---|
| `SectionDataReportService` | `SectionsTabComponent` | Page 1 en portrait, tableaux en paysage | `drawResultTablesSection()` |
| `SectionStateReportService` | `StudioPageComponent` | Page 1 en portrait, tableaux en paysage | `drawResultTablesSection()` |
| `LoadsReportService` | `LoadsTableComponent` | Page 1 en portrait, tableaux en paysage | `drawResultTablesFlow()` |
| `ObstaclesTableReportService` | `ObstaclesTableComponent` | Page 1 en portrait, tableaux en paysage | `drawResultTablesFlow()` avec l'en-tête compact |
| `HangingTableReportService` | `HangingTableComponent` | Portrait uniquement | `drawTable()` |
| `VtlGuyingReportService` | `VtlAndGuyingComponent` | Portrait uniquement, avec une image de schéma | — |

Les services de rapport se trouvent dans `src/app/features/studio/toolbar/presentation/services/<name>-report/`,
répartis en `*.service.ts`, `*.helpers.ts` (dessin des pages), `*.constantes.ts` (métriques et clés
d'étiquettes) et `*.interfaces.ts` (données et étiquettes).

---

## Anatomie d'un service de rapport

```typescript
@Injectable({ providedIn: 'root' })
export class ObstaclesTableReportService extends PdfBaseService {
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  async generateReport(data: ObstaclesTableReportData): Promise<void> {
    const translate = (key: string): string => this.translocoService.translate(key);

    await generatePdfReport({
      logger: this.logger,
      notificationService: this.notificationService,
      translate,
      errorLogMessage: 'Failed to generate obstacles table report',
      successKey: 'common.report-generated-successfully-label',
      errorKey: 'common.failed-to-generate-report',
      build: async () => {
        const doc = await this.createDoc();
        const labels = buildReportLabels<ObstaclesTableReportLabels>(translate, PDF_OBSTACLES_TABLE_LABEL_KEYS);

        drawObstaclesReportPage1(doc, data, labels);

        const tables = buildTables(data.rows, OBSTACLES_TABLE_METRICS, translate);
        const labelColWidth = computeLabelColWidth(doc, tables);
        drawResultTablesFlow(
          doc,
          data.date || '-',
          labels.reportTitle,
          [{ title: labels.obstaclesTitle, tables }],
          labelColWidth,
          { compactHeader: true, tableGap: OBSTACLES_TABLES_VERTICAL_GAP }
        );

        drawPageFooters(doc, labels.pageLabel, true);

        return { doc, filename: buildObstaclesReportFilename(labels.reportTitle, data) };
      }
    });
  }
}
```

1. **`createDoc()`** (hérité de `PdfBaseService`) renvoie un document A4 portrait en millimètres, avec
   la police Nunito enregistrée. Les fichiers de police (`fonts/Nunito-*.ttf`) sont récupérés au
   premier appel puis mis en cache par le service.
2. **`generatePdfReport()`** exécute `build`, enregistre le document sous le nom de fichier renvoyé et
   affiche la notification de succès. Si `build` lève une erreur, il la journalise et affiche la
   notification d'erreur : l'erreur n'est jamais propagée à l'appelant.
3. **`buildReportLabels()`** résout les étiquettes fixes du rapport via Transloco, à partir d'une
   constante qui associe chaque champ de l'interface d'étiquettes à sa clé de traduction.
4. **La page 1** est dessinée par les helpers propres au rapport, à partir des primitives partagées.
5. **Les tableaux de résultats** sont construits à partir des lignes, puis dessinés sur des pages en
   paysage.
6. **`drawPageFooters()`** est appelé en dernier, une fois le nombre total de pages connu.
7. **Le nom du fichier** assemble ses parties via `sanitizeFilenamePart()`
   (`@shared/helpers/filename.helpers`), qui remplace par `-` les caractères interdits dans un nom de
   fichier (`/ \ : * ? " < > |`).

Le composant qui lance le rapport fige les données qu'il affiche (lignes déjà traduites, date
formatée dans la langue active), et pilote l'état `[disabled]` et `[btnLoading]` de son bouton à
partir d'un signal réinitialisé dans un bloc `finally`.

---

## Coordonnées et convention Y

- Toutes les positions et dimensions sont en **millimètres**. L'A4 portrait mesure 210 × 297
  (`PAGE_SIZE`), le paysage 297 × 210 (`LANDSCAPE_PAGE`). Le contenu commence à `PAGE_MARGIN` (haut 10,
  droite 15, bas 15, gauche 15).
- Chaque fonction de dessin prend le Y où elle commence et **renvoie le Y où commence l'élément
  suivant** : une page se dessine donc en enchaînant les appels :

  ```typescript
  let y = drawHeader(doc, data.date || '-', labels.reportTitle);
  y = drawStudyAndCantonSection(doc, data, labels, y);
  drawHangingCalculationSection(doc, data, labels, y);
  ```

- Pour vérifier qu'un élément tient encore sur la page avant de le dessiner, utilisez les constantes
  et fonctions qui donnent sa hauteur plutôt que de la recalculer : `SECTION_TITLE_HEIGHT`,
  `SEPARATOR_HEIGHT` et `computeTableHeight()`.

---

## Primitives — `pdf-primitives.helpers.ts`

### Mise en page

| Fonction | Dessine | Renvoie |
|---|---|---|
| `drawHeader(doc, date, reportTitle, pageWidth?)` | Nom de l'application, titre du rapport, date, ligne de séparation | Y suivant (25 mm) |
| `drawCompactHeader(doc, pageWidth?)` | Nom de l'application et ligne de séparation uniquement | Y suivant (18 mm) |
| `drawSectionTitle(doc, title, y)` | Titre de section souligné | `y + SECTION_TITLE_HEIGHT` |
| `drawSeparator(doc, y, width?)` | Ligne horizontale avec une marge au-dessus et au-dessous | `y + SEPARATOR_HEIGHT` |
| `drawFooter(doc, text, pageWidth?, pageHeight?)` | Texte de pied de page, en bas à droite | — |
| `drawPageFooters(doc, pageLabel, landscapeFromPage2?)` | « Page n / total » sur chaque page | — |

`pageWidth` et `pageHeight` valent par défaut les dimensions du portrait : passez
`LANDSCAPE_PAGE.width` / `.height` sur les pages en paysage. `drawPageFooters(doc, label, true)`
suppose que toutes les pages après la première sont en paysage ; un rapport qui ajoute des pages en
portrait (le rapport du tableau de pose) l'appelle sans ce paramètre.

### Sections de métadonnées

| Fonction | Dessine |
|---|---|
| `drawBulletItem()` / `drawWrappingBulletItem()` | Une ligne « • Étiquette : valeur » ; la variante à retour à la ligne répartit la valeur sur plusieurs lignes |
| `drawBulletList()` | Une colonne d'éléments à puce |
| `drawTitledBulletSection()` | Titre, une colonne d'éléments à puce, séparateur |
| `drawTwoColumnBullets()` / `drawTwoColumnBulletSection()` | Deux colonnes d'éléments à puce indépendantes, avec titre et séparateur pour la variante section |
| `drawStudyCartoucheSection(doc, title, labels, data, y)` | Le cartouche étude et canton partagé par les rapports de canton : auteur, étude, description de l'étude, canton, commentaire, condition initiale, cas de charge et sa description, `-` pour une valeur vide |

### Valeurs et étiquettes

| Fonction | Rôle |
|---|---|
| `formatValue(value, unit, decimals?)` | Nombre de décimales fixe (`DECIMAL_PLACES` = 3 par défaut) suivi de l'unité, ou `-` pour `null`/`undefined` |
| `buildReportLabels(translate, keys)` | Résout une constante `{ champ: cléDeTraduction }` en objet d'étiquettes typé |
| `generatePdfReport(options)` | Exécute `build`, enregistre le document et notifie le succès ou l'échec |
| `loadFileAsBase64()` / `loadImageAsBase64()` | Récupère une police ou une image pour `addFileToVFS()` / `addImage()` |
| `registerNunitoFont()` | Enregistre les trois variantes de Nunito dans un document (appelée par `createDoc()`) |

---

## Tableaux de résultats — `pdf-table.helpers.ts`

### Tableaux transposés

Les tableaux de résultats sont **transposés** : chaque entité (portée, support, charge, point
d'obstacle…) devient une **colonne**, et chaque métrique une **ligne**. Un rapport décrit ses lignes
avec des `MetricDescriptor` :

```typescript
export const OBSTACLES_TABLE_METRICS: MetricDescriptor<ObstacleTableRow>[] = [
  { labelKey: 'studio.obstacles-table.obstacle-name-column-label', unit: null, decimals: 0, field: 'obstacleName' },
  { labelKey: 'studio.obstacles-table.point-column-label', unit: '', decimals: 0, field: 'pointNumber' },
  { labelKey: 'studio.shared.oblique', unit: PDF_UNITS.meters, decimals: 2, field: 'oblique' }
];
```

`buildTables(rows, metrics, translate, maxCols?)` transforme les lignes en `PdfTableModel` : les lignes
sont découpées en tableaux de `MAX_COLS_PER_TABLE` (5) colonnes, sauf si `maxCols` est fourni, et
l'étiquette de chaque métrique est traduite. Chaque cellule est formatée par `formatCell()` :

| `unit` | Cellule |
|---|---|
| `null` | La chaîne brute, ou `-` si elle est vide |
| `''` | Le nombre sans unité (l'étiquette la porte déjà) |
| Une unité | `formatValue(value, unit, decimals)` |

### Largeur des colonnes

- `computeLabelColWidth(doc, tables)` dimensionne la colonne des étiquettes sur l'étiquette de
  métrique la plus large. Passez-lui tous les tableaux du rapport pour que les colonnes restent
  alignées d'une section à l'autre.
- Chaque colonne de valeurs mesure `(largeur du contenu − colonne des étiquettes) / max(5, nombre de colonnes)` :
  le dernier bloc d'une section garde la largeur d'un tableau complet, et ses colonnes restent
  alignées avec celles du dessus.

### Retour à la ligne dans les cellules

Le texte d'une cellule passe à la ligne autant que nécessaire, dans la limite de **2** lignes
(`MAX_CELL_LINES`) ; `splitTextToSize()` de jsPDF coupe aussi un mot plus long que la cellule. Un
texte plus long est coupé après la deuxième ligne, qui se termine alors par « … ». Une ligne du
tableau est aussi haute que sa cellule la plus haute, par pas de `TABLE_ROW_HEIGHT` (5,5 mm).

`computeTableHeight()` mesure un tableau de la même façon que `drawTable()` le dessine, sans le
dessiner.

### Placement des tableaux sur les pages

| Fonction | Comportement | Utilisée par |
|---|---|---|
| `drawTable(doc, table, y, pageWidth, labelColWidth)` | Dessine un tableau à `y`, sans aucune gestion de page | Tableau de pose (portrait, toutes les colonnes dans un seul tableau) |
| `drawResultTablesSection(doc, date, reportTitle, sectionTitle, tables, labelColWidth)` | Commence une nouvelle page en paysage, puis `MAX_TABLES_PER_PAGE` (2) tableaux par page, chaque page avec l'en-tête complet et le titre de section | Données de canton, état du canton |
| `drawResultTablesFlow(doc, date, reportTitle, sections, labelColWidth, options?)` | Enchaîne plusieurs sections titrées en continu et ne commence une nouvelle page en paysage que si le tableau suivant ne tient pas | Charges, tableau d'obstacles |

`drawResultTablesFlow()` en détail :

- Il commence toujours sur une nouvelle page en paysage.
- Une section sans tableau est ignorée.
- Un titre de section n'est dessiné que là où son premier tableau et le séparateur de fin tiennent
  aussi : un titre n'est jamais laissé seul en bas de page.
- Quand une section continue sur une nouvelle page, son titre est redessiné.
- Un séparateur ferme chaque section, pas chaque bloc de tableau.
- `options.compactHeader` dessine `drawCompactHeader()` au lieu de `drawHeader()` sur chaque page en
  paysage : `date` et `reportTitle` ne sont alors pas dessinés. Le rapport du tableau d'obstacles
  l'utilise, sa date et son titre ne figurant qu'en page 1.
- `options.tableGap` règle l'écart entre deux tableaux d'une section (`TABLE_VERTICAL_GAP`, 6 mm, par
  défaut). Le rapport du tableau d'obstacles utilise 12 mm, place libérée par l'en-tête compact.

---

## Étiquettes et traduction

- Les **étiquettes fixes** (titre du rapport, titres de section, étiquettes du cartouche, étiquette
  de page) sont déclarées dans une interface d'étiquettes qui étend `BaseReportLabels`, avec une
  constante `PDF_*_LABEL_KEYS` donnant leurs clés de traduction, et résolues par `buildReportLabels()`.
- Les **étiquettes des lignes de métriques** sont les `labelKey` des `MetricDescriptor`, traduites par
  `buildTables()`. Elles ne sont pas répétées dans l'interface d'étiquettes.
- Les **valeurs d'énumération** (type d'obstacle, type d'altitude, type de charge…) sont traduites par
  le composant avant d'arriver au service : les helpers de tableau impriment les chaînes telles
  quelles.

---

## Tests

Les specs des rapports remplacent jsPDF par un document simulé, ce qui permet de vérifier les appels de
dessin :

```typescript
vi.mock('jspdf', () => {
  const mockDoc = {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setPage: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    addPage: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(2),
    getTextWidth: vi.fn().mockReturnValue(30),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text]),
    save: vi.fn()
  };
  const mockJsPDF = vi.fn(function () {
    return mockDoc;
  });
  return { default: mockJsPDF, jsPDF: mockJsPDF, __mockDoc: mockDoc };
});
```

- Un `splitTextToSize` qui renvoie `[text]` garde chaque cellule sur une ligne ; renvoyez plusieurs
  lignes pour tester les retours à la ligne et les sauts de page.
- Les cellules des tableaux sont dessinées avec `rect()` : la cellule d'étiquette d'une ligne est celle
  placée à `PAGE_MARGIN.left`, ce qui donne le Y de chaque ligne.
- Les specs des helpers (`pdf-primitives.helpers.spec.ts`, `pdf-table.helpers.spec.ts`) construisent
  directement le document simulé, sans `vi.mock`.
