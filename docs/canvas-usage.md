# Canvas app usage

## 1) Bind `seriesJson`
Set `seriesJson` to compact JSON text.

Basic shape:
```json
[
  { "x": 0, "y": 1.23, "label": "Start" },
  { "x": 1, "y": 1.10 }
]
```

Advanced shape with embedded mode:
```json
{
  "mode": "x_ascending_unique",
  "duplicatePolicy": "error",
  "points": [
    { "x": 1, "y": 1.10 },
    { "x": 0, "y": 1.23 }
  ]
}
```

Power Fx example:
```powerfx
Set(
  varSeriesJson,
  JSON(
    {
      mode: "x_ascending",
      duplicatePolicy: "keep_last",
      points: Table(
        { x: 1, y: 1.23, label: "Start" },
        { x: 1, y: 1.10, label: "Adjusted" },
        { x: 2, y: 1.44 }
      )
    },
    JSONFormat.Compact
  )
);
```

## 2) Configure key behavior properties
Recommended defaults:
- `orderingMode = "input_order"`
- `duplicatePolicy = "allow"`
- `hoverValueLabelEnabled = true`
- `showPoints = true`
- `maxPointsToRender = 2000`

Notes:
- `seriesJson` object `mode` and `duplicatePolicy` override these properties.
- Use `x_strict` when your data source already guarantees increasing X.

## 3) Handle chart events
Use component actions to react in Power Fx:
- `onHoverChanged`
- `onSelectionChanged`

Example:
```powerfx
// CurveChart1.onSelectionChanged
Set(varSelectedPointJson, CurveChart1.selectedPointJson);

// CurveChart1.onHoverChanged
Set(varHoveredPointJson, CurveChart1.hoveredPointJson);
```

## 4) Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Invalid mode '...'` | Unsupported `mode` value | Use one of `input_order`, `x_ascending`, `x_ascending_unique`, `x_strict`. |
| `Invalid duplicatePolicy '...'` | Unsupported `duplicatePolicy` value | Use one of `allow`, `error`, `keep_first`, `keep_last`. |
| Duplicate x error in unique mode | `x_ascending_unique` requires unique X values | Remove duplicates or use `keep_first` / `keep_last` in non-unique mode. |
| `x_strict` validation error | Input not strictly increasing by X | Sort data first or use `x_ascending`. |
| Empty chart with no error | Points missing valid numeric `x` or `y` | Ensure each point has finite numeric `x` and `y`. |

## 5) Property reference and examples
- Full property catalog: `docs/properties-reference.md`
- JSON examples: `docs/examples.md`
