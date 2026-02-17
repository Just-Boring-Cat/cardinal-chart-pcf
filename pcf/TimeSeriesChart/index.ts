import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { HoverSelectionPayload, TimeSeriesChartView } from "./TimeSeriesChartView";
import * as React from "react";

const DEFAULT_X_AXIS_LABEL = "Seconds";
const DEFAULT_Y_AXIS_LABEL = "Value";
const DEFAULT_ORDERING_MODE = "input_order";
const DEFAULT_DUPLICATE_POLICY = "allow";
const DEFAULT_RENDER_MODE = "inline";
const DEFAULT_OPEN_BUTTON_LABEL = "Display Chart";
const DEFAULT_MODAL_TITLE = "Chart";

const DEFAULT_TOOLTIP_ENABLED = true;
const DEFAULT_HOVER_VALUE_LABEL_ENABLED = true;
const DEFAULT_SNAP_TO_NEAREST_POINT = true;
const DEFAULT_HOVER_RADIUS_PX = 8;
const DEFAULT_HOVER_THROTTLE_MS = 50;
const DEFAULT_MAX_POINTS_TO_RENDER = 2000;
const DEFAULT_DOWNSAMPLE_MODE = "none";
const DEFAULT_LINE_WIDTH_PX = 2;
const DEFAULT_SHOW_POINTS = true;
const DEFAULT_USE_AXIS_BOUNDS = false;

export class CurveChart implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged: () => void;
    private context: ComponentFramework.Context<IInputs>;

    private hovered: HoverSelectionPayload | null = null;
    private selected: HoverSelectionPayload | null = null;

    /**
     * Empty constructor.
     */
    constructor() {
        // Empty
    }

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     */
    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this.context = context;
        this.notifyOutputChanged = notifyOutputChanged;
        context.mode.trackContainerResize(true);
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     * @returns ReactElement root react element for the control
     */
    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        this.context = context;

        return React.createElement(TimeSeriesChartView, {
            seriesJson: context.parameters.seriesJson.raw ?? "",
            xAxisLabel: stringOrDefault(context.parameters.xAxisLabel.raw, DEFAULT_X_AXIS_LABEL),
            yAxisLabel: stringOrDefault(context.parameters.yAxisLabel.raw, DEFAULT_Y_AXIS_LABEL),
            orderingMode: stringOrDefault(context.parameters.orderingMode.raw, DEFAULT_ORDERING_MODE),
            duplicatePolicy: stringOrDefault(context.parameters.duplicatePolicy.raw, DEFAULT_DUPLICATE_POLICY),
            renderMode: stringOrDefault(context.parameters.renderMode.raw, DEFAULT_RENDER_MODE),
            openButtonLabel: stringOrDefault(context.parameters.openButtonLabel.raw, DEFAULT_OPEN_BUTTON_LABEL),
            modalTitle: stringOrDefault(context.parameters.modalTitle.raw, DEFAULT_MODAL_TITLE),
            width: numberOrUndefined(context.mode.allocatedWidth),
            height: numberOrUndefined(context.mode.allocatedHeight),
            tooltipEnabled: boolOrDefault(context.parameters.tooltipEnabled.raw, DEFAULT_TOOLTIP_ENABLED),
            hoverValueLabelEnabled: boolOrDefault(context.parameters.hoverValueLabelEnabled.raw, DEFAULT_HOVER_VALUE_LABEL_ENABLED),
            snapToNearestPoint: boolOrDefault(context.parameters.snapToNearestPoint.raw, DEFAULT_SNAP_TO_NEAREST_POINT),
            hoverRadiusPx: numberOrDefault(context.parameters.hoverRadiusPx.raw, DEFAULT_HOVER_RADIUS_PX),
            hoverThrottleMs: numberOrDefault(context.parameters.hoverThrottleMs.raw, DEFAULT_HOVER_THROTTLE_MS),
            maxPointsToRender: numberOrDefault(context.parameters.maxPointsToRender.raw, DEFAULT_MAX_POINTS_TO_RENDER),
            downsampleMode: stringOrDefault(context.parameters.downsampleMode.raw, DEFAULT_DOWNSAMPLE_MODE),
            useAxisBounds: boolOrDefault(context.parameters.useAxisBounds.raw, DEFAULT_USE_AXIS_BOUNDS),
            xMin: numberOrUndefined(context.parameters.xMin.raw),
            xMax: numberOrUndefined(context.parameters.xMax.raw),
            yMin: numberOrUndefined(context.parameters.yMin.raw),
            yMax: numberOrUndefined(context.parameters.yMax.raw),
            lineWidthPx: numberOrDefault(context.parameters.lineWidthPx.raw, DEFAULT_LINE_WIDTH_PX),
            showPoints: boolOrDefault(context.parameters.showPoints.raw, DEFAULT_SHOW_POINTS),
            backgroundColor: stringOrUndefined(context.parameters.backgroundColor.raw),
            onHoverChanged: this.handleHoverChanged,
            onSelectionChanged: this.handleSelectionChanged,
        });
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
     */
    public getOutputs(): IOutputs {
        return {
            hoveredSeriesId: this.hovered?.seriesId ?? "",
            hoveredPointIndex: this.hovered?.pointIndex ?? -1,
            hoveredX: this.hovered?.x ?? 0,
            hoveredT: this.hovered?.x ?? 0,
            hoveredY: this.hovered?.y ?? 0,
            hoveredLabel: this.hovered?.label ?? "",
            hoveredPointJson: this.hovered?.pointJson ?? "",

            selectedSeriesId: this.selected?.seriesId ?? "",
            selectedPointIndex: this.selected?.pointIndex ?? -1,
            selectedX: this.selected?.x ?? 0,
            selectedT: this.selected?.x ?? 0,
            selectedY: this.selected?.y ?? 0,
            selectedLabel: this.selected?.label ?? "",
            selectedPointJson: this.selected?.pointJson ?? "",
        };
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void {
        // Add code to cleanup control if necessary
    }

    private handleHoverChanged = (payload: HoverSelectionPayload | null): void => {
        if (samePayload(this.hovered, payload)) {
            return;
        }

        this.hovered = payload;
        this.notifyOutputChanged();
        this.context.events.onHoverChanged?.();
    };

    private handleSelectionChanged = (payload: HoverSelectionPayload | null): void => {
        if (samePayload(this.selected, payload)) {
            return;
        }

        this.selected = payload;
        this.notifyOutputChanged();
        this.context.events.onSelectionChanged?.();
    };
}

function samePayload(a: HoverSelectionPayload | null, b: HoverSelectionPayload | null): boolean {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return (
        a.seriesId === b.seriesId &&
        a.pointIndex === b.pointIndex &&
        a.x === b.x &&
        a.y === b.y &&
        (a.label ?? "") === (b.label ?? "") &&
        (a.pointJson ?? "") === (b.pointJson ?? "")
    );
}

function boolOrUndefined(raw: unknown): boolean | undefined {
    if (typeof raw === "boolean") {
        return raw;
    }
    return undefined;
}

function boolOrDefault(raw: unknown, fallback: boolean): boolean {
    return boolOrUndefined(raw) ?? fallback;
}

function numberOrUndefined(raw: unknown): number | undefined {
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return raw;
    }
    if (typeof raw === "string" && raw.trim()) {
        const n = Number(raw);
        if (Number.isFinite(n)) {
            return n;
        }
    }
    return undefined;
}

function numberOrDefault(raw: unknown, fallback: number): number {
    return numberOrUndefined(raw) ?? fallback;
}

function stringOrUndefined(raw: unknown): string | undefined {
    if (typeof raw !== "string") {
        return undefined;
    }
    const s = raw.trim();
    return s ? s : undefined;
}

function stringOrDefault(raw: unknown, fallback: string): string {
    return stringOrUndefined(raw) ?? fallback;
}
