

# ObstaclesService

Angular service for managing the obstacle type catalog and obstacle point selection in the application.

---

## Purpose

- Centralizes the loading, import, retrieval, and search of obstacle types (e.g., ground, vegetation, buildings) from a CSV file stored client-side (IndexedDB).
- Provides a reactive API for the current obstacle point index, enabling interactive editing and selection in the UI.

---

## Where and Why is it Used?

### 1. Obstacle Type Catalog Management

- **Used in:**  
	- `obstaclesForm.component.ts` (for dynamic dropdowns and validation)
	- `obstaclesForm.service.ts` (for adding/removing points, resetting forms)
	- `app.component.ts` (for global initialization/import)
- **Why:**  
	- To ensure the list of obstacle types is always up-to-date and available for user selection.
	- To allow importing new types from CSV without redeploying the app.

### 2. Obstacle Point Index Management

- **Used in:**  
	- `obstaclesForm.component.ts` (to set the currently selected point for editing)
	- `obstaclesForm.service.ts` (to update the index when adding/removing points)
	- `free-positioning.component.ts` (to synchronize UI selection with the data model)
	- `section-plot.component.ts` (to highlight the selected obstacle point in plots)
- **Why:**  
	- To provide a seamless, reactive editing experience for obstacles with multiple points (e.g., for geometry input).
	- To keep the UI and data model in sync when the user interacts with plots or forms.

---

## Main Methods

- **ready**: `BehaviorSubject<boolean>` — indicates if the service is ready (database initialized).
- **getObstacleTypes()**: retrieves all obstacle types from the catalog.
- **getObstacleType(obstacleType: string)**: retrieves a specific obstacle type by its key.
- **importFromFile()**: imports the catalog from the CSV `/data/obstacle_type_rte.csv` (parses, transforms, and stores locally).
- **setCurrentPointIndex(index: number)** / **resetCurrentPointIndex()**: manages the selected obstacle point index (for interactive editing).

---

## Usage Example

```typescript
// In a component or service
const types = await obstaclesService.getObstacleTypes();
const vegetation = await obstaclesService.getObstacleType('vegetation');
await obstaclesService.importFromFile();

obstaclesService.setCurrentPointIndex(2); // Select the third point for editing
```

---

## Technical Notes

- Uses `Papa.parse` for CSV parsing.
- Stores data in IndexedDB via `StorageService`.
- Private methods handle fetching, parsing, and transforming CSV data.
- The `currentPointIndex` signal is used throughout the UI to synchronize selection state.

---

## Typical Usage Flow

1. **App startup:**  
	 - `importFromFile()` is called to load the latest obstacle types from CSV.
2. **User opens obstacle form:**  
	 - The form subscribes to `ready` and loads types via `getObstacleTypes()`.
3. **User edits obstacle points:**  
	 - The UI updates `currentPointIndex` as the user selects or adds points.
	 - Plots and forms reactively update to reflect the current selection.
