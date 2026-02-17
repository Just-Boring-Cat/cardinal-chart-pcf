# Dev setup (PCF React control)

## Prereqs
- Node.js (LTS recommended)
- .NET SDK (installed locally)
- Power Platform CLI (`pac`)

Quick check:
```sh
pac --version
node -v
npm -v
dotnet --version
```

## Scaffold (already done in this repo)
The repo contains a PCF project scaffolded with:
```sh
mkdir -p pcf
cd pcf
pac pcf init -ns BoringCat -n CurveChart -t field -fw react -npm
```

## Build
```sh
cd pcf
npm install
npm run build
```

## Test harness (local)
```sh
cd pcf
npm start
```

## Package (import into Power Apps)
This repo includes a Dataverse solution project at `solution/CurveChartSolution/`.

Build the importable solution zip:
```sh
dotnet build solution/CurveChartSolution/CurveChartSolution.cdsproj -c Release
```

Output:
- Unmanaged (default): `solution/CurveChartSolution/bin/Release/CurveChartSolution.zip`

Optional managed build:
```sh
dotnet build solution/CurveChartSolution/CurveChartSolution.cdsproj -c Release /p:SolutionPackageType=Managed
```

## Notes
- This project bundles `uPlot` for chart rendering; React is provided via a platform library.
- `node_modules/` is ignored by git; commit `pcf/package-lock.json` so installs are reproducible.
- If `seriesJson` is blank in the test harness, the control renders a built-in sample series to confirm rendering works.
- If `seriesJson` is non-empty but invalid JSON, the control shows the parse error and also renders the built-in sample series to confirm the renderer is working.
- `npm start` always runs a fresh `npm run build` first to avoid stale bundles.
- The test harness may show React warnings for its own property editor controls (for example, controlled/uncontrolled input warnings). These don’t necessarily mean the PCF chart failed to render.
- The manifest includes both `default-value` (helps the local test harness) and `pfx-default-value` (canvas apps) for inputs so you see sample values by default.

## Canvas app iteration note
When iterating on a canvas app that uses the component, bump the component `ControlManifest.Input.xml` version so runtime picks up the update reliably.
