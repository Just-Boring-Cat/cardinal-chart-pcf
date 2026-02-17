# Curve Chart JSON examples

## Basic input order
```json
[
  { "x": -1, "y": 0 },
  { "x": 0, "y": 1 },
  { "x": 1, "y": 2 },
  { "x": 2, "y": 2 },
  { "x": 1, "y": 0 },
  { "x": 0, "y": 0 },
  { "x": -1, "y": -1 },
  { "x": -1, "y": 0 },
  { "x": 0.5, "y": 2 }
]
```

Recommended property values:
- `orderingMode = input_order`
- `duplicatePolicy = allow`

## Index-driven input order
```json
[
  { "x": 3, "y": 0.03, "index": 1 },
  { "x": 3, "y": 0.04, "index": 2 },
  { "x": 4, "y": 0.2, "index": 3 },
  { "x": 2, "y": 0.05, "index": 4 }
]
```

Recommended property values:
- `orderingMode = input_order`
- `duplicatePolicy = allow`

## X ascending with duplicates kept
```json
{
  "mode": "x_ascending",
  "duplicatePolicy": "allow",
  "points": [
    { "x": 3, "y": 10 },
    { "x": 1, "y": 5 },
    { "x": 1, "y": 8 },
    { "x": 2, "y": 7 }
  ]
}
```

## X ascending unique with strict duplicate rejection
```json
{
  "mode": "x_ascending_unique",
  "duplicatePolicy": "error",
  "points": [
    { "x": 3, "y": 10 },
    { "x": 1, "y": 5 },
    { "x": 2, "y": 7 }
  ]
}
```

## X ascending unique with keep_last dedupe
```json
{
  "mode": "x_ascending_unique",
  "duplicatePolicy": "keep_last",
  "points": [
    { "x": 1, "y": 5 },
    { "x": 1, "y": 8 },
    { "x": 2, "y": 7 }
  ]
}
```

## X strict (already sorted)
```json
{
  "mode": "x_strict",
  "points": [
    { "x": 0, "y": 1.0 },
    { "x": 1, "y": 1.1 },
    { "x": 2, "y": 1.4 }
  ]
}
```

## Legacy `t` compatibility
```json
[
  { "t": 0, "y": 1.0 },
  { "t": 1, "y": 1.2 },
  { "t": 2, "y": 1.4 }
]
```
