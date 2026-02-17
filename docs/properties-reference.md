# Curve Chart property reference

## Input properties

| Property | Type | Default | Allowed values | Description |
|---|---|---|---|---|
| `seriesJson` | string | sample JSON | point array or object with `points` | Main chart data payload. |
| `xAxisLabel` | string | `Seconds` | any text | X-axis label. |
| `yAxisLabel` | string | `Value` | any text | Y-axis label. |
| `orderingMode` | string | `input_order` | `input_order`, `x_ascending`, `x_ascending_unique`, `x_strict` | Point ordering and validation mode. |
| `duplicatePolicy` | string | `allow` | `allow`, `error`, `keep_first`, `keep_last` | Duplicate-x handling policy for sorted modes. |
| `tooltipEnabled` | boolean | `true` | `true`/`false` | Base tooltip switch. |
| `hoverValueLabelEnabled` | boolean | `true` | `true`/`false` | Show hover point value label. |
| `snapToNearestPoint` | boolean | `true` | `true`/`false` | Hover chooses nearest point in radius. |
| `hoverRadiusPx` | number | `8` | positive integer | Hover hit radius in pixels. |
| `hoverThrottleMs` | number | `50` | non-negative integer | Hover event/output throttle interval. |
| `maxPointsToRender` | number | `2000` | positive integer | Per-series point cap before downsampling. |
| `downsampleMode` | string | `none` | `none`, `lttb`, `minmax` | Downsampling strategy for large datasets. |
| `useAxisBounds` | boolean | `false` | `true`/`false` | Enables fixed min/max bounds. |
| `xMin` | decimal | blank | number | Fixed X minimum when bounds enabled. |
| `xMax` | decimal | blank | number | Fixed X maximum when bounds enabled. |
| `yMin` | decimal | blank | number | Fixed Y minimum when bounds enabled. |
| `yMax` | decimal | blank | number | Fixed Y maximum when bounds enabled. |
| `lineWidthPx` | number | `2` | positive integer | Curve stroke width. |
| `showPoints` | boolean | `true` | `true`/`false` | Show or hide point markers. |
| `backgroundColor` | string | `#ffffff` | CSS color string | Chart background color. |
| `renderMode` | string | `inline` | deprecated | Deprecated, ignored. |
| `openButtonLabel` | string | `Display Chart` | deprecated | Deprecated, ignored. |
| `modalTitle` | string | `Chart` | deprecated | Deprecated, ignored. |

## Output properties

| Property | Type | Description |
|---|---|---|
| `hoveredSeriesId` | string | Series id for hovered point. |
| `hoveredPointIndex` | number | Original point index in parsed points list. |
| `hoveredX` | number | Hovered X value. |
| `hoveredT` | number | Deprecated alias of `hoveredX`. |
| `hoveredY` | number | Hovered Y value. |
| `hoveredLabel` | string | Hovered point label. |
| `hoveredPointJson` | string | Compact JSON payload for hovered point. |
| `selectedSeriesId` | string | Series id for selected point. |
| `selectedPointIndex` | number | Original point index in parsed points list. |
| `selectedX` | number | Selected X value. |
| `selectedT` | number | Deprecated alias of `selectedX`. |
| `selectedY` | number | Selected Y value. |
| `selectedLabel` | string | Selected point label. |
| `selectedPointJson` | string | Compact JSON payload for selected point. |

## Event actions

| Event | Trigger |
|---|---|
| `onHoverChanged` | Fired when hovered point changes. |
| `onSelectionChanged` | Fired when selected point changes. |

## String property examples

### `orderingMode`
```text
input_order
```

### `duplicatePolicy`
```text
keep_last
```

### `downsampleMode`
```text
minmax
```

### `backgroundColor`
```text
#f8fafc
```
