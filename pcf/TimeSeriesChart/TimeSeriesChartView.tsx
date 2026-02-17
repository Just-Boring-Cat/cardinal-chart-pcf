import * as React from "react";
import uPlot from "uplot";

export interface HoverSelectionPayload {
  seriesId: string;
  pointIndex: number;
  x: number;
  y: number;
  label?: string;
  pointJson?: string;
}

export interface TimeSeriesChartViewProps {
  seriesJson: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  orderingMode?: string;
  duplicatePolicy?: string;
  renderMode?: string;
  openButtonLabel?: string;
  modalTitle?: string;
  width?: number;
  height?: number;

  tooltipEnabled?: boolean;
  hoverValueLabelEnabled?: boolean;
  snapToNearestPoint?: boolean;
  hoverRadiusPx?: number;
  hoverThrottleMs?: number;

  maxPointsToRender?: number;
  downsampleMode?: string;

  useAxisBounds?: boolean;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;

  lineWidthPx?: number;
  showPoints?: boolean;
  backgroundColor?: string;

  onHoverChanged: (payload: HoverSelectionPayload | null) => void;
  onSelectionChanged: (payload: HoverSelectionPayload | null) => void;
}

interface InputPoint {
  x: number;
  y: number;
  label?: string;
  index?: number;
}

type OrderingMode = "input_order" | "x_ascending" | "x_ascending_unique" | "x_strict";
type DuplicatePolicy = "allow" | "error" | "keep_first" | "keep_last";

interface PointWithIndex {
  x: number;
  y: number;
  label?: string;
  originalIndex: number;
  inputIndex?: number;
  sourceSeriesId?: string;
}

interface NormalizedSeries {
  id: string;
  name?: string;
  color?: string;
  points: PointWithIndex[];
}

interface ChartData {
  x: number[];
  series: NormalizedSeries[];
  yBySeries: (number | null)[][];
  pointBySeries: (PointWithIndex | null)[][];
}

interface TooltipState {
  x: number;
  y: number;
  payload: HoverSelectionPayload;
}

const DEFAULT_HOVER_RADIUS_PX = 8;
const DEFAULT_HOVER_THROTTLE_MS = 50;
const DEFAULT_MAX_POINTS_TO_RENDER = 2000;
const DEFAULT_LINE_WIDTH_PX = 2;
const MIN_RENDER_WIDTH = 80;
const MIN_RENDER_HEIGHT = 80;
const MAX_RENDER_WIDTH = 4096;
const MAX_RENDER_HEIGHT = 2048;

const SAMPLE_SERIES_JSON =
  '[{"x":-1,"y":0},{"x":0,"y":1},{"x":0.5,"y":2},{"x":1,"y":2},{"x":1.5,"y":0},{"x":2,"y":0},{"x":2.5,"y":-1},{"x":3,"y":0},{"x":3.5,"y":2}]';

export function TimeSeriesChartView(props: TimeSeriesChartViewProps): React.ReactElement {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const plotRef = React.useRef<uPlot | null>(null);

  const hoverPayloadRef = React.useRef<HoverSelectionPayload | null>(null);
  const selectionPayloadRef = React.useRef<HoverSelectionPayload | null>(null);

  const plotOffsetRef = React.useRef<{ left: number; top: number }>({ left: 0, top: 0 });

  const [error, setError] = React.useState<string | null>(null);
  const [renderError, setRenderError] = React.useState<string | null>(null);
  const [tooltip, setTooltip] = React.useState<TooltipState | null>(null);

  const hoverValueLabelEnabled = props.hoverValueLabelEnabled ?? true;
  const tooltipEnabled = (props.tooltipEnabled ?? true) && hoverValueLabelEnabled;
  const snapToNearestPoint = props.snapToNearestPoint ?? true;
  const hoverRadiusPx = props.hoverRadiusPx ?? DEFAULT_HOVER_RADIUS_PX;
  const hoverThrottleMs = props.hoverThrottleMs ?? DEFAULT_HOVER_THROTTLE_MS;
  const maxPointsToRender = props.maxPointsToRender ?? DEFAULT_MAX_POINTS_TO_RENDER;
  const lineWidthPx = props.lineWidthPx ?? DEFAULT_LINE_WIDTH_PX;
  const orderingMode = props.orderingMode ?? "input_order";
  const duplicatePolicy = props.duplicatePolicy ?? "allow";

  const sampleDecision = getSampleDecision(props.seriesJson);
  const isUsingSampleData = sampleDecision.useSample;
  const effectiveSeriesJson = isUsingSampleData ? SAMPLE_SERIES_JSON : props.seriesJson;

  const [fallbackReason, setFallbackReason] = React.useState<string | null>(null);

  const allocatedWidth = clampFinite(props.width, MIN_RENDER_WIDTH, MAX_RENDER_WIDTH);
  const allocatedHeight = clampFinite(props.height, MIN_RENDER_HEIGHT, MAX_RENDER_HEIGHT);

  const safeWidth = allocatedWidth;
  const safeHeight = allocatedHeight;

  const parsed = React.useMemo<{
    data: ChartData | null;
    error: string | null;
    fallbackReason: string | null;
    usingSampleData: boolean;
  }>(() => {
    const tryParse = (json: string): { data: ChartData | null; error: string | null } => {
      const result = parseAndNormalizeSeriesJson(
        json,
        maxPointsToRender,
        props.downsampleMode,
        orderingMode,
        duplicatePolicy
      );
      if (result.error) {
        return { data: null, error: result.error };
      }
      if (result.data.series.length === 0) {
        return { data: null, error: null };
      }
      return { data: result.data, error: null };
    };

    if (isUsingSampleData) {
      const r = tryParse(SAMPLE_SERIES_JSON);
      return { data: r.data, error: r.error, fallbackReason: "seriesJson blank", usingSampleData: true };
    }

    const primary = tryParse(effectiveSeriesJson);
    if (primary.data) {
      return { data: primary.data, error: null, fallbackReason: null, usingSampleData: false };
    }

    if (primary.error) {
      const sample = tryParse(SAMPLE_SERIES_JSON);
      return {
        data: sample.data,
        error: primary.error,
        fallbackReason: "Invalid JSON; showing sample data",
        usingSampleData: true,
      };
    }

    if (!primary.data) {
      const sample = tryParse(SAMPLE_SERIES_JSON);
      return {
        data: sample.data,
        error: null,
        fallbackReason: "No series provided; showing sample data",
        usingSampleData: true,
      };
    }

    return { data: null, error: null, fallbackReason: null, usingSampleData: false };
  }, [effectiveSeriesJson, isUsingSampleData, maxPointsToRender, props.downsampleMode, orderingMode, duplicatePolicy]);

  React.useEffect(() => {
    setError(parsed.error);
    setFallbackReason(parsed.fallbackReason);
  }, [parsed.error, parsed.fallbackReason]);

  const chartData = parsed.data;

  const plotSignature = React.useMemo(() => {
    if (!chartData) {
      return "no-data";
    }

    const seriesSig = chartData.series
      .map((s) => `${s.id}:${s.color ?? ""}:${s.points.length}`)
      .join("|");

    return `${chartData.x.length}:${seriesSig}`;
  }, [chartData]);

  const emitHoverThrottled = useThrottledEmitter<HoverSelectionPayload | null>(hoverThrottleMs, (payload) => {
    hoverPayloadRef.current = payload;
    props.onHoverChanged(payload);
  });

  const emitSelection = React.useCallback(
    (payload: HoverSelectionPayload | null) => {
      selectionPayloadRef.current = payload;
      props.onSelectionChanged(payload);
    },
    [props]
  );

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host || !chartData) {
      destroyPlot(plotRef);
      if (host) {
        host.replaceChildren();
      }
      emitHoverThrottled.cancel();
      setTooltip(null);
      setRenderError(null);
      return;
    }

    if (safeWidth < 40 || safeHeight < 40) {
      return;
    }

    const needsRecreate =
      plotRef.current == null ||
      plotRef.current.series.length !== chartData.series.length + 1 ||
      (plotRef.current as unknown as { __sig?: string }).__sig !== plotSignature;

    const options: uPlot.Options = buildUPlotOptions(chartData, {
      width: safeWidth,
      height: safeHeight,
      xAxisLabel: props.xAxisLabel ?? "",
      yAxisLabel: props.yAxisLabel ?? "",
      lineWidthPx,
      showPoints: props.showPoints ?? true,
      useAxisBounds: props.useAxisBounds ?? false,
      xMin: props.xMin,
      xMax: props.xMax,
      yMin: props.yMin,
      yMax: props.yMax,
    });

    const data = toUPlotData(chartData);

    if (needsRecreate) {
      destroyPlot(plotRef);
      try {
        const plot = new uPlot(options, data, host);
        (plot as unknown as { __sig?: string }).__sig = plotSignature;
        plotRef.current = plot;
        updatePlotOffset(wrapperRef.current, plot, plotOffsetRef);

        setRenderError(null);

        const handleClick = (): void => {
          const hovered = hoverPayloadRef.current;
          if (hovered) {
            emitSelection(hovered);
          } else {
            emitSelection(null);
          }
        };

        plot.over.addEventListener("click", handleClick);

        const handleMouseLeave = (): void => {
          emitHoverThrottled.emit(null);
          setTooltip(null);
        };

        plot.over.addEventListener("mouseleave", handleMouseLeave);

          if (plot.hooks.setCursor) {
            plot.hooks.setCursor.push((u) => {
              const payloadWithPos = computeHoverPayloadByCursor(
                u,
                chartData,
                snapToNearestPoint,
                selectionPayloadRef.current?.seriesId,
                hoverRadiusPx,
                plotOffsetRef.current
              );
              if (!payloadWithPos) {
                emitHoverThrottled.emit(null);
                setTooltip(null);
                return;
              }

              emitHoverThrottled.emit(payloadWithPos.payload);

              if (tooltipEnabled) {
                setTooltip(payloadWithPos.tooltip);
              } else {
                setTooltip(null);
              }
            });
          }

        return () => {
          plot.over.removeEventListener("click", handleClick);
          plot.over.removeEventListener("mouseleave", handleMouseLeave);
          destroyPlot(plotRef);
        };
      } catch (e: unknown) {
        setRenderError(String(e));
        destroyPlot(plotRef);
        return;
      }
    }

    const plot = plotRef.current;
    if (!plot) {
      return;
    }

    try {
      plot.setSize({ width: safeWidth, height: safeHeight });
      plot.setData(data);
      updatePlotOffset(wrapperRef.current, plot, plotOffsetRef);
      setRenderError(null);
    } catch (e: unknown) {
      setRenderError(String(e));
      destroyPlot(plotRef);
    }
  }, [
    chartData,
    emitHoverThrottled,
    emitSelection,
    hoverRadiusPx,
    lineWidthPx,
    plotSignature,
    props.showPoints,
    props.xAxisLabel,
    props.xMax,
    props.xMin,
    props.yAxisLabel,
    props.yMax,
    props.yMin,
    safeHeight,
	    safeWidth,
	    snapToNearestPoint,
	    tooltipEnabled,
	  ]);

  const onKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLDivElement>) => {
      if (!chartData) {
        return;
      }

      if (ev.key === "Escape") {
        emitSelection(null);
        ev.preventDefault();
        return;
      }

      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") {
        return;
      }

      const direction = ev.key === "ArrowLeft" ? -1 : 1;
      const current = selectionPayloadRef.current ?? hoverPayloadRef.current;
      if (!current) {
        return;
      }

      const next = moveSelection(chartData, current, direction);
      if (next) {
        emitSelection(next);
        ev.preventDefault();
      }
    },
    [chartData, emitSelection]
  );

  const backgroundColor = props.backgroundColor?.trim() ? props.backgroundColor.trim() : undefined;

  const chart = (
    <div
      ref={wrapperRef}
      className="boringcat-chartRoot"
      style={backgroundColor ? { backgroundColor } : undefined}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Time series chart"
    >
      {fallbackReason ? (
        <div style={{ padding: 8, fontSize: 12, opacity: 0.75 }}>
          {fallbackReason}. Set <code>seriesJson</code> to render your series.
        </div>
      ) : null}
      {sampleDecision.note ? (
        <div style={{ padding: "0 8px 8px", fontSize: 12, opacity: 0.75 }}>
          {sampleDecision.note}
        </div>
      ) : null}
      {error ? (
        <div style={{ padding: 8, fontSize: 12, color: "#b42318" }}>
          Error: {error} (size: {safeWidth}×{safeHeight})
        </div>
      ) : null}
      {renderError ? (
        <div style={{ padding: 8, fontSize: 12, color: "#b42318" }}>
          Render error: {renderError}
        </div>
      ) : null}
      {!error && !chartData ? (
        <div style={{ padding: 8, fontSize: 12, opacity: 0.8 }}>
          No data (size: {safeWidth}×{safeHeight})
        </div>
      ) : null}
      <div ref={hostRef} className="boringcat-chartHost" style={{ width: safeWidth, height: safeHeight }} />
      {tooltip ? (
        <div className="boringcat-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="boringcat-tooltipTitle">{tooltip.payload.seriesId}</div>
          <div className="boringcat-tooltipRow">
            <div className="boringcat-tooltipKey">x</div>
            <div className="boringcat-tooltipValue">{formatNumber(tooltip.payload.x)}</div>
          </div>
          <div className="boringcat-tooltipRow">
            <div className="boringcat-tooltipKey">y</div>
            <div className="boringcat-tooltipValue">{formatNumber(tooltip.payload.y)}</div>
          </div>
          {tooltip.payload.label ? (
            <div className="boringcat-tooltipRow">
              <div className="boringcat-tooltipKey">label</div>
              <div className="boringcat-tooltipValue">{tooltip.payload.label}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
  return chart;
}

function destroyPlot(plotRef: React.MutableRefObject<uPlot | null>): void {
  const plot = plotRef.current;
  if (!plot) {
    return;
  }

  plot.destroy();
  plotRef.current = null;
}

function buildUPlotOptions(
  chartData: ChartData,
  opts: {
    width: number;
    height: number;
    xAxisLabel: string;
    yAxisLabel: string;
    lineWidthPx: number;
    showPoints: boolean;
    useAxisBounds: boolean;
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
  }
): uPlot.Options {
  const axisStroke = "#6b7280";
  const gridStroke = "rgba(0,0,0,0.08)";

  const series: uPlot.Options["series"] = [
    {},
    ...chartData.series.map((s) => ({
      label: s.name ?? s.id,
      stroke: s.color ?? "#3b82f6",
      width: opts.lineWidthPx,
      points: opts.showPoints
        ? { show: true, size: 8, width: 2, stroke: "#f59e0b", fill: "#ffffff" }
        : { show: false },
    })),
  ];

  const axes: uPlot.Options["axes"] = [
    {
      label: opts.xAxisLabel,
      stroke: axisStroke,
      grid: { stroke: gridStroke },
      ticks: { stroke: gridStroke },
      values: (_u, ticks) => ticks.map((v) => formatNumber(v)),
    },
    {
      label: opts.yAxisLabel,
      stroke: axisStroke,
      grid: { stroke: gridStroke },
      ticks: { stroke: gridStroke },
      values: (_u, ticks) => ticks.map((v) => formatNumber(v)),
    },
  ];

  let xMin = opts.useAxisBounds ? opts.xMin : undefined;
  let xMax = opts.useAxisBounds ? opts.xMax : undefined;
  let yMin = opts.useAxisBounds ? opts.yMin : undefined;
  let yMax = opts.useAxisBounds ? opts.yMax : undefined;

  if (!opts.useAxisBounds && chartData.x.length > 0) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const v of chartData.x) {
      if (!Number.isFinite(v)) {
        continue;
      }
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (Number.isFinite(min) && Number.isFinite(max)) {
      xMin = min;
      xMax = max;
    }
  }

  if (!opts.useAxisBounds) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const ys of chartData.yBySeries) {
      for (const v of ys) {
        if (v == null || !Number.isFinite(v)) {
          continue;
        }
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    if (Number.isFinite(min) && Number.isFinite(max)) {
      yMin = min;
      yMax = max;
    }
  }

  const scales: uPlot.Options["scales"] = {
    x: {
      time: false,
      min: xMin,
      max: xMax,
    },
    y: {
      min: yMin,
      max: yMax,
    },
  };

  return {
    width: opts.width,
    height: opts.height,
    legend: { show: false },
    series,
    axes,
    scales,
    cursor: {
      focus: { prox: 24 },
      drag: { x: false, y: false },
      points: { show: false },
    },
  };
}

function toUPlotData(chartData: ChartData): uPlot.AlignedData {
  return [chartData.x, ...chartData.yBySeries];
}

function updatePlotOffset(
  wrapper: HTMLDivElement | null,
  plot: uPlot,
  offsetRef: React.MutableRefObject<{ left: number; top: number }>
): void {
  if (!wrapper) {
    return;
  }

  const wrapperRect = wrapper.getBoundingClientRect();
  const overRect = plot.over.getBoundingClientRect();
  offsetRef.current = { left: overRect.left - wrapperRect.left, top: overRect.top - wrapperRect.top };
}

function computeHoverPayloadByCursor(
  plot: uPlot,
  chartData: ChartData,
  snapToNearestPoint: boolean,
  preferredSeriesId: string | undefined,
  hoverRadiusPx: number,
  plotOffset: { left: number; top: number }
): { payload: HoverSelectionPayload; tooltip: TooltipState } | null {
  const cursorLeft = plot.cursor.left ?? 0;
  const cursorTop = plot.cursor.top ?? 0;
  if (!Number.isFinite(cursorLeft) || !Number.isFinite(cursorTop)) {
    return null;
  }

  let best: { seriesIdx: number; dist2: number; point: PointWithIndex } | null = null;
  for (let seriesIdx = 0; seriesIdx < chartData.series.length; seriesIdx++) {
    const pts = chartData.pointBySeries[seriesIdx];
    for (const point of pts) {
      if (!point) {
        continue;
      }

      const xPos = plot.valToPos(point.x, "x");
      const yPos = plot.valToPos(point.y, "y");
      const dx = xPos - cursorLeft;
      const dy = yPos - cursorTop;
      const dist2 = dx * dx + dy * dy;

      if (!best || dist2 < best.dist2) {
        best = { seriesIdx, dist2, point };
      }
    }
  }

  if (!best) {
    return null;
  }

  const radius2 = hoverRadiusPx * hoverRadiusPx;

  // For single-series charts this doesn't change much, but keep the logic for forward compatibility.
  if (!snapToNearestPoint && preferredSeriesId) {
    const preferredIdx = chartData.series.findIndex((s) => s.id === preferredSeriesId);
    if (preferredIdx >= 0) {
      const pts = chartData.pointBySeries[preferredIdx];
      let preferredBest: { dist2: number; point: PointWithIndex } | null = null;
      for (const point of pts) {
        if (!point) {
          continue;
        }
        const xPos = plot.valToPos(point.x, "x");
        const yPos = plot.valToPos(point.y, "y");
        const dx = xPos - cursorLeft;
        const dy = yPos - cursorTop;
        const dist2 = dx * dx + dy * dy;
        if (!preferredBest || dist2 < preferredBest.dist2) {
          preferredBest = { dist2, point };
        }
      }
      if (preferredBest && preferredBest.dist2 <= radius2) {
        best = { seriesIdx: preferredIdx, dist2: preferredBest.dist2, point: preferredBest.point };
      }
    }
  }

  if (best.dist2 > radius2) {
    return null;
  }

  const series = chartData.series[best.seriesIdx];
  const seriesId = best.point.sourceSeriesId ?? series.id;

  const payload: HoverSelectionPayload = {
    seriesId,
    pointIndex: best.point.originalIndex,
    x: best.point.x,
    y: best.point.y,
    label: best.point.label,
    pointJson: JSON.stringify({ seriesId, x: best.point.x, y: best.point.y, label: best.point.label }),
  };

  const tooltipXRaw = plotOffset.left + cursorLeft + 12;
  const tooltipYRaw = plotOffset.top + cursorTop + 12;
  const tooltipX = Number.isFinite(tooltipXRaw) ? tooltipXRaw : 0;
  const tooltipY = Number.isFinite(tooltipYRaw) ? tooltipYRaw : 0;

  return {
    payload,
    tooltip: { x: tooltipX, y: tooltipY, payload },
  };
}

function moveSelection(chartData: ChartData, current: HoverSelectionPayload, direction: -1 | 1): HoverSelectionPayload | null {
  if (chartData.series.length === 0) {
    return null;
  }

  let seriesIdx = chartData.series.findIndex((s) => s.id === current.seriesId);
  if (seriesIdx < 0) {
    seriesIdx = 0;
  }

  const startIdx = findNearestPointArrayIndex(chartData.pointBySeries[seriesIdx], current);
  if (startIdx < 0) {
    return null;
  }

  let idx = startIdx + direction;
  const len = chartData.pointBySeries[seriesIdx].length;
  while (idx >= 0 && idx < len) {
    const point = chartData.pointBySeries[seriesIdx][idx];
    if (point) {
      const series = chartData.series[seriesIdx];
      const seriesId = point.sourceSeriesId ?? series.id;
      return {
        seriesId,
        pointIndex: point.originalIndex,
        x: point.x,
        y: point.y,
        label: point.label,
        pointJson: JSON.stringify({ seriesId, x: point.x, y: point.y, label: point.label }),
      };
    }
    idx += direction;
  }

  return null;
}

function findNearestPointArrayIndex(points: (PointWithIndex | null)[], current: HoverSelectionPayload): number {
  if (points.length === 0) {
    return -1;
  }

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p && p.originalIndex === current.pointIndex) {
      return i;
    }
  }

  let bestIdx = -1;
  let bestDist2 = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p) {
      continue;
    }
    const dx = p.x - current.x;
    const dy = p.y - current.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function parseAndNormalizeSeriesJson(
  raw: string,
  maxPointsToRender: number,
  downsampleMode: string | undefined,
  orderingModeInput: string,
  duplicatePolicyInput: string
): { data: ChartData; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { data: emptyChartData(), error: "Invalid JSON in seriesJson" };
  }

  const defaultMode = normalizeOrderingMode(orderingModeInput);
  const defaultDuplicatePolicy = normalizeDuplicatePolicy(duplicatePolicyInput);

  let mode: OrderingMode = defaultMode;
  let duplicatePolicy: DuplicatePolicy = defaultDuplicatePolicy;
  let pointsRaw: unknown[];

  if (Array.isArray(parsed)) {
    pointsRaw = parsed;
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as { points?: unknown; mode?: unknown; duplicatePolicy?: unknown };
    if (!Array.isArray(obj.points)) {
      return {
        data: emptyChartData(),
        error: "seriesJson object format must be { mode?, duplicatePolicy?, points:[{x,y,label?,index?}] }",
      };
    }
    pointsRaw = obj.points;

    if (typeof obj.mode === "string") {
      const normalized = normalizeOrderingModeStrict(obj.mode);
      if (!normalized) {
        return { data: emptyChartData(), error: `Invalid mode '${obj.mode}'. Allowed: input_order, x_ascending, x_ascending_unique, x_strict` };
      }
      mode = normalized;
    }

    if (typeof obj.duplicatePolicy === "string") {
      const normalized = normalizeDuplicatePolicyStrict(obj.duplicatePolicy);
      if (!normalized) {
        return { data: emptyChartData(), error: `Invalid duplicatePolicy '${obj.duplicatePolicy}'. Allowed: allow, error, keep_first, keep_last` };
      }
      duplicatePolicy = normalized;
    }
  } else {
    return { data: emptyChartData(), error: "seriesJson must be an array of points or an object with a points array" };
  }

  const points = parsePoints(pointsRaw);
  if (points.length === 0) {
    return { data: emptyChartData() };
  }

  const orderedResult = orderPoints(points, mode, duplicatePolicy);
  if (orderedResult.error) {
    return { data: emptyChartData(), error: orderedResult.error };
  }

  const ordered = orderedResult.points;
  const downsampled =
    maxPointsToRender > 0 && ordered.length > maxPointsToRender
      ? downsamplePoints(ordered, maxPointsToRender, downsampleMode)
      : ordered;

  const xs = downsampled.map((p) => p.x);
  const ys: (number | null)[] = downsampled.map((p) => p.y);
  const pts: (PointWithIndex | null)[] = downsampled.map((p) => p);

  return {
    data: {
      x: xs,
      series: [{ id: "s1", name: "Series", color: "#2dd4bf", points: downsampled }],
      yBySeries: [ys],
      pointBySeries: [pts],
    },
  };
}

function parsePoints(pointsRaw: unknown[]): PointWithIndex[] {
  const points: PointWithIndex[] = [];
  for (let pi = 0; pi < pointsRaw.length; pi++) {
    const p = pointsRaw[pi] as Partial<InputPoint> | null;
    if (!p || typeof p !== "object") {
      continue;
    }

    const x =
      typeof p.x === "number"
        ? p.x
        : typeof (p as unknown as { t?: unknown }).t === "number"
          ? (p as unknown as { t: number }).t
          : Number.NaN;
    const y = typeof p.y === "number" ? p.y : Number.NaN;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }

    const label = typeof p.label === "string" ? p.label : undefined;
    const inputIndex = typeof p.index === "number" && Number.isFinite(p.index) ? p.index : undefined;
    points.push({ x, y, label, originalIndex: pi, inputIndex, sourceSeriesId: "s1" });
  }
  return points;
}

function orderPoints(
  points: PointWithIndex[],
  orderingMode: OrderingMode,
  duplicatePolicy: DuplicatePolicy
): { points: PointWithIndex[]; error?: string } {
  if (orderingMode === "x_strict") {
    for (let i = 1; i < points.length; i++) {
      if (!(points[i].x > points[i - 1].x)) {
        return { points: [], error: "x_strict mode requires strictly increasing x in input order (no duplicates or descending steps)" };
      }
    }
    return { points };
  }

  if (orderingMode === "input_order") {
    if (!points.some((p) => p.inputIndex !== undefined)) {
      return { points };
    }

    const keyed = points.map((p) => ({ key: p.inputIndex ?? p.originalIndex, point: p }));
    keyed.sort((a, b) => (a.key - b.key) || (a.point.originalIndex - b.point.originalIndex));

    for (let i = 1; i < keyed.length; i++) {
      if (keyed[i].key === keyed[i - 1].key) {
        return { points: [], error: "input_order mode requires unique index values when index is provided" };
      }
    }

    return { points: keyed.map((k) => k.point) };
  }

  const sorted = [...points].sort((a, b) => (a.x - b.x) || (a.originalIndex - b.originalIndex));
  const requiresUnique = orderingMode === "x_ascending_unique";
  return applyDuplicatePolicy(sorted, requiresUnique, duplicatePolicy);
}

function applyDuplicatePolicy(
  sorted: PointWithIndex[],
  requiresUnique: boolean,
  duplicatePolicy: DuplicatePolicy
): { points: PointWithIndex[]; error?: string } {
  const effectivePolicy: DuplicatePolicy = requiresUnique && duplicatePolicy === "allow" ? "error" : duplicatePolicy;
  if (effectivePolicy === "allow") {
    return { points: sorted };
  }

  const deduped: PointWithIndex[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && sorted[j].x === sorted[i].x) {
      j++;
    }

    const group = sorted.slice(i, j);
    if (group.length === 1) {
      deduped.push(group[0]);
    } else if (effectivePolicy === "error") {
      return { points: [], error: `Duplicate x value '${formatNumber(group[0].x)}' is not allowed for current ordering settings` };
    } else if (effectivePolicy === "keep_first") {
      deduped.push(group[0]);
    } else if (effectivePolicy === "keep_last") {
      deduped.push(group[group.length - 1]);
    }

    i = j;
  }

  return { points: deduped };
}

function normalizeOrderingMode(mode: string | undefined): OrderingMode {
  return normalizeOrderingModeStrict(mode) ?? "input_order";
}

function normalizeOrderingModeStrict(mode: unknown): OrderingMode | null {
  if (typeof mode !== "string") {
    return null;
  }
  const normalized = mode.trim().toLowerCase();
  if (normalized === "input_order" || normalized === "x_ascending" || normalized === "x_ascending_unique" || normalized === "x_strict") {
    return normalized;
  }
  return null;
}

function normalizeDuplicatePolicy(policy: string | undefined): DuplicatePolicy {
  return normalizeDuplicatePolicyStrict(policy) ?? "allow";
}

function normalizeDuplicatePolicyStrict(policy: unknown): DuplicatePolicy | null {
  if (typeof policy !== "string") {
    return null;
  }
  const normalized = policy.trim().toLowerCase();
  if (normalized === "allow" || normalized === "error" || normalized === "keep_first" || normalized === "keep_last") {
    return normalized;
  }
  return null;
}

function emptyChartData(): ChartData {
  return { x: [], series: [], yBySeries: [], pointBySeries: [] };
}

function downsamplePoints(points: PointWithIndex[], maxPoints: number, mode?: string): PointWithIndex[] {
  const normalized = (mode ?? "none").trim().toLowerCase();
  if (maxPoints < 3) {
    return points.slice(0, Math.max(1, maxPoints));
  }

  if (normalized === "lttb") {
    return downsampleLttb(points, maxPoints);
  }

  if (normalized === "minmax") {
    return downsampleMinMax(points, maxPoints);
  }

  return downsampleUniform(points, maxPoints);
}

function downsampleUniform(points: PointWithIndex[], maxPoints: number): PointWithIndex[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const sampled: PointWithIndex[] = [];
  const stride = (points.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round(i * stride);
    sampled.push(points[idx]);
  }
  return sampled;
}

function downsampleMinMax(points: PointWithIndex[], maxPoints: number): PointWithIndex[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const buckets = Math.max(1, Math.floor((maxPoints - 2) / 2));
  const bucketSize = (points.length - 2) / buckets;

  const out: PointWithIndex[] = [points[0]];
  for (let b = 0; b < buckets; b++) {
    const start = 1 + Math.floor(b * bucketSize);
    const end = 1 + Math.floor((b + 1) * bucketSize);
    const slice = points.slice(start, Math.max(start + 1, Math.min(end, points.length - 1)));

    let min = slice[0];
    let max = slice[0];
    for (const p of slice) {
      if (p.y < min.y) {
        min = p;
      }
      if (p.y > max.y) {
        max = p;
      }
    }

    if (min.x <= max.x) {
      out.push(min);
      if (max !== min) {
        out.push(max);
      }
    } else {
      out.push(max);
      if (max !== min) {
        out.push(min);
      }
    }

    if (out.length >= maxPoints - 1) {
      break;
    }
  }

  out.push(points[points.length - 1]);
  if (out.length > maxPoints) {
    return downsampleUniform(out, maxPoints);
  }
  return out;
}

function downsampleLttb(points: PointWithIndex[], threshold: number): PointWithIndex[] {
  if (threshold >= points.length || threshold === 0) {
    return points;
  }

  const sampled: PointWithIndex[] = [];
  let sampledIndex = 0;

  const every = (points.length - 2) / (threshold - 2);

  let a = 0;
  sampled[sampledIndex++] = points[a];

  for (let i = 0; i < threshold - 2; i++) {
    const rangeStart = Math.floor((i + 1) * every) + 1;
    const rangeEnd = Math.floor((i + 2) * every) + 1;
    const rangeEndClamped = Math.min(rangeEnd, points.length);

    let avgX = 0;
    let avgY = 0;
    const avgRangeStart = Math.floor((i + 1) * every) + 1;
    const avgRangeEnd = Math.floor((i + 2) * every) + 1;
    const avgRangeEndClamped = Math.min(avgRangeEnd, points.length);
    const avgRangeLength = avgRangeEndClamped - avgRangeStart;

    for (let j = avgRangeStart; j < avgRangeEndClamped; j++) {
      avgX += points[j].x;
      avgY += points[j].y;
    }
    avgX /= Math.max(1, avgRangeLength);
    avgY /= Math.max(1, avgRangeLength);

    const rangeOffs = Math.floor(i * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;
    const rangeToClamped = Math.min(rangeTo, points.length - 1);

    const pointA = points[a];

    let maxArea = -1;
    let nextA = rangeOffs;

    for (let j = rangeOffs; j < rangeToClamped; j++) {
      const pointB = points[j];
      const area = Math.abs((pointA.x - avgX) * (pointB.y - pointA.y) - (pointA.x - pointB.x) * (avgY - pointA.y));
      if (area > maxArea) {
        maxArea = area;
        nextA = j;
      }
    }

    sampled[sampledIndex++] = points[nextA];
    a = nextA;

    if (rangeStart >= rangeEndClamped) {
      break;
    }
  }

  sampled[sampledIndex++] = points[points.length - 1];
  return sampled;
}

function formatNumber(v: number): string {
  if (!Number.isFinite(v)) {
    return "";
  }
  return Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function useThrottledEmitter<T>(waitMs: number, emit: (value: T) => void): { emit: (value: T) => void; cancel: () => void } {
  const timeoutRef = React.useRef<number | null>(null);
  const lastRef = React.useRef<number>(0);
  const pendingRef = React.useRef<T | null>(null);

  const cancel = React.useCallback(() => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  const emitThrottled = React.useCallback(
    (value: T) => {
      const now = Date.now();
      const elapsed = now - lastRef.current;

      if (waitMs <= 0 || elapsed >= waitMs) {
        lastRef.current = now;
        emit(value);
        return;
      }

      pendingRef.current = value;
      if (timeoutRef.current != null) {
        return;
      }

      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        lastRef.current = Date.now();
        if (pendingRef.current != null) {
          const v = pendingRef.current;
          pendingRef.current = null;
          emit(v);
        }
      }, waitMs - elapsed);
    },
    [emit, waitMs]
  );

  return { emit: emitThrottled, cancel };
}

function clampFinite(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function getSampleDecision(seriesJson: string): { useSample: boolean; note?: string } {
  const s = seriesJson.trim();
  if (!s) {
    return { useSample: true };
  }
  if (s === "[]" || s === "null") {
    return { useSample: true };
  }

  // The PCF test harness may not evaluate Power Fx default expressions; it can pass them as literal strings.
  // If it looks like a Power Fx expression, show sample data instead of surfacing a JSON parse error.
  const normalized = s.startsWith("=") ? s.slice(1).trim() : s;
  const looksLikePowerFx =
    normalized.includes("JSON(") ||
    normalized.includes("Table(") ||
    normalized.includes("With(") ||
    normalized.includes("Set(") ||
    normalized.includes("Collect(") ||
    normalized.includes("ClearCollect(");

  if (looksLikePowerFx) {
    return {
      useSample: true,
      note: "Detected a Power Fx expression in seriesJson (test harness may not evaluate it). Showing sample data.",
    };
  }

  return { useSample: false };
}
