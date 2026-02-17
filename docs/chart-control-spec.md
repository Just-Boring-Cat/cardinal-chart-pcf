# Curve Chart PCF spec

## Goal
Provide a React virtual PCF field control for Canvas apps that renders XY curve data from JSON.

## Migration notes
If you are upgrading from older project builds:
- Control constructor is now `CurveChart`.
- Solution package is now `CurveChartSolution`.
- `seriesJson` still supports array format, and now also supports advanced object format.
- New input properties were added:
  - `orderingMode`
  - `duplicatePolicy`
  - `hoverValueLabelEnabled`
- Existing deprecated properties are kept for compatibility and ignored:
  - `renderMode`
  - `openButtonLabel`
  - `modalTitle`

## Supported chart behavior
- Single-series XY curve.
- X value uses `x` (or legacy `t`).
- Y value uses `y`.
- Optional point label (`label`).
- Optional explicit order index (`index`) for index-driven rendering.
- Hover and click selection with outputs and events.

## Data contracts
The control accepts either input format in `seriesJson`.

### 1) Point array format
```json
[
  { "x": 0, "y": 1.2, "label": "start" },
  { "x": 1, "y": 1.5 },
  { "x": 2, "y": 1.1 }
]
```

### 2) Advanced object format
```json
{
  "mode": "x_ascending_unique",
  "duplicatePolicy": "error",
  "points": [
    { "x": 2, "y": 1.1 },
    { "x": 0, "y": 1.2 },
    { "x": 1, "y": 1.5 }
  ]
}
```

Notes:
- `mode` and `duplicatePolicy` in JSON override control properties.
- Unknown properties are ignored.

## Ordering modes
- `input_order`: preserve input order. If `index` is provided, points are ordered by `index`.
- `x_ascending`: sort by `x` ascending.
- `x_ascending_unique`: sort by `x` ascending and enforce unique `x`.
- `x_strict`: input must already be strictly increasing by `x`.

## Duplicate policy
Used for sorted modes:
- `allow`: keep duplicate `x` points.
- `error`: fail on duplicate `x`.
- `keep_first`: keep first point for each duplicate `x` group.
- `keep_last`: keep last point for each duplicate `x` group.

Rule:
- In `x_ascending_unique`, `allow` is treated as `error` because mode requires uniqueness.

## Events and outputs
- Event `onHoverChanged` updates `hovered*` outputs.
- Event `onSelectionChanged` updates `selected*` outputs.

Hover and selection outputs include:
- series id
- point index
- x and y values
- label
- compact point JSON

## Property catalog
Use `docs/properties-reference.md` for full property definitions, default values, and valid value sets.

## Example catalog
Use `docs/examples.md` for tested JSON examples by mode.
