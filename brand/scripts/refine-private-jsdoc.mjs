#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

function signatureInfo(signatureLine) {
    const line = String(signatureLine || "").trim();
    let match = line.match(/^static\s+get\s+([A-Za-z0-9_$]+)\s*\(/);
    if (match) return { kind: "static-getter", name: match[1] };

    match = line.match(/^get\s+([A-Za-z0-9_$]+)\s*\(/);
    if (match) return { kind: "getter", name: match[1] };

    match = line.match(/^set\s+([A-Za-z0-9_$]+)\s*\(/);
    if (match) return { kind: "setter", name: match[1] };

    match = line.match(/^(?:async\s+)?([A-Za-z0-9_$]+)\s*\(/);
    if (match) return { kind: "method", name: match[1] };

    return null;
}

function isPrivateMember(info) {
    return Boolean(info && info.name && info.name.startsWith("_"));
}

function splitPrivateName(name) {
    return String(name || "")
        .replace(/^_+/, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .toLowerCase();
}

const PRIVATE_SUMMARY_EXACT = {
    _styles: "Returns component-scoped style definitions used to generate CSS.",
    _afterConnected: "Performs post-connect setup after the component has its default DOM nodes.",
    _syncVisualState: "Recomputes ring/progress/tick geometry and knob placement from current value state.",
    _syncDialArcConfigFromAttributes: "Reads dial arc-related attributes and updates start/sweep/gap configuration.",
    _syncRotationValueFromAttribute: "Reads `rotation-value` and updates unbounded rotation behavior.",
    _getRotationValue: "Returns how much value a full rotation represents.",
    _hasConfiguredGap: "Returns whether the dial arc has a non-zero configured start or end gap.",
    _isUnboundedMode: "Returns whether the dial should accumulate value across rotations.",
    _resolveDialArc: "Builds normalized arc geometry from start/end offset and anchor configuration.",
    _valueToRatio: "Maps a numeric value into a normalized arc ratio between 0 and 1.",
    _appendDialLabel: "Creates and positions one dial label in the HTML overlay.",
    _renderTicksAndLabels: "Renders dial tick marks and label markers for the active arc.",
    _stepBy: "Applies a signed step increment and commits the resulting dial value.",
    _updateValueFromPointer: "Projects pointer coordinates to the dial arc and commits the nearest stepped value.",
    _clamp: "Clamps a value to the configured minimum/maximum range when bounds exist.",
    _roundToStep: "Rounds a value to the configured step and decimal precision.",
    _setNativeValue: "Writes a value to host/native controls and emits configured input/change events.",
    _drawDirection: "Updates indicator geometry for the current direction vector.",
    _drawRings: "Draws base/progress rings for directional magnitude visualization.",
    _buildRingPath: "Builds an SVG arc path for a ring segment.",
    _commitAxisInputs: "Reads axis sub-inputs, normalizes them, and commits to host value.",
    _commitVectorToHost: "Serializes current vector state into host/native value fields.",
    _projectPointerToArcball: "Projects pointer coordinates onto a virtual arcball for 3D direction control.",
    _readNumberAttribute: "Reads a numeric attribute with fallback handling for invalid values.",
    _vectorDistance: "Computes Euclidean distance between two vectors.",
    _dot: "Computes the dot product of two vectors.",
    _cross: "Computes the cross product of two vectors.",
    _multiplyQuaternion: "Multiplies two quaternions and returns the composed rotation.",
    _quaternionFromUnitVectors: "Builds a quaternion that rotates one unit vector into another.",
    _rotateVector: "Rotates a vector by a quaternion.",
    _serializeVector: "Serializes vector coordinates into the component value format.",
    _formatFloat: "Formats a float using component precision rules.",
    _makeSvgNode: "Creates an SVG element with provided attributes.",
    _tryAutoBindValidation: "Attempts to discover and bind the nearest validation controller.",
    _primeValidationState: "Initializes validation UI state from current fields.",
    _displayNameForField: "Returns the display label used for validation messages for a field.",
    _runAction: "Executes a registered action callback by action id.",
    _bindValidationSource: "Subscribes to validation-source events and keeps validation state synchronized.",
    _ensureStyleNode: "Creates or returns the style element used by the form wrapper.",
    _ensureFormNode: "Creates or returns the internal form node used by the wrapper.",
    _moveUnmanagedChildrenIntoForm: "Moves unassigned light-DOM children into the managed form container.",
    _startResizeObserver: "Starts the resize observer that keeps responsive layout values in sync.",
    _startObserver: "Starts mutation observers needed for runtime slot/child updates.",
    _deriveSpanFromChars: "Derives a grid span estimate from configured character length.",
    _measureLength: "Measures rendered text length for auto-size/layout calculations.",
    _useNativeMode: "Returns whether the select should delegate to native rendering mode.",
    _startOptionObserver: "Starts option observers so option list changes are reflected immediately.",
    _readOptionsFromChildren: "Builds normalized option data from light-DOM option nodes.",
    _readOptions: "Builds normalized option data from configured sources.",
    _refreshOptions: "Rebuilds option UI and selection state from current option data.",
    _selectOptionByValue: "Selects and activates the option matching a value.",
    _expandOptionList: "Opens or closes the custom option list UI.",
    _bindCustomDropdownEvents: "Wires dropdown open/close, option click, and keyboard interactions.",
    _bindConfigEvents: "Wires config-change handlers that keep form layout synchronized.",
    _bindFormEvents: "Wires native form events and re-emits component-level events.",
    _hideOptionPlaceholders: "Hides placeholder options from rendered custom option lists.",
    _uncheckSiblings: "Clears checked state from sibling radios in the same group.",
    _bindCanvasEvents: "Attaches pointer/wheel/keyboard handlers to the canvas and related nodes.",
    _bindAxisInputs: "Attaches input listeners for axis fields and forwards updates to vector state.",
    _stepValue: "Computes the next numeric value using step/min/max constraints.",
    _bindSteppers: "Attaches increment/decrement controls and keyboard shortcuts for stepping.",
    _bindStepers: "Attaches increment/decrement controls and keyboard shortcuts for stepping.",
    _clearStyle: "Clears previously applied status style tokens from the wrapper.",
    _normalizeAngle: "Normalizes a degree value into the `[0, 360)` range.",
    _collectOptions: "Collects dial tick/label configuration from attributes or child options.",
    _getDialBounds: "Returns effective dial bounds based on min/max or default rotation range.",
    _createNativeControl: "Creates the hidden native input used for form integration.",
    _renderDefault: "Builds the default dial DOM (SVG rings, knob, labels, value display)."
};

function buildPrivateSummary(name) {
    if (PRIVATE_SUMMARY_EXACT[name]) return PRIVATE_SUMMARY_EXACT[name];

    const readable = splitPrivateName(name);
    if (name.startsWith("_on")) return `Handles ${readable.replace(/^on\s+/, "")} events and updates component state.`;
    if (name.startsWith("_sync")) return `Synchronizes ${readable.replace(/^sync\s+/, "")} between state, attributes, and UI.`;
    if (name.startsWith("_render")) return `Renders ${readable.replace(/^render\s+/, "")} UI content.`;
    if (name.startsWith("_collect")) return `Collects ${readable.replace(/^collect\s+/, "")} from configured sources.`;
    if (name.startsWith("_resolve")) return `Resolves effective ${readable.replace(/^resolve\s+/, "")} configuration.`;
    if (name.startsWith("_read")) return `Reads ${readable.replace(/^read\s+/, "")} from attributes or DOM.`;
    if (name.startsWith("_write")) return `Writes ${readable.replace(/^write\s+/, "")} to DOM/state targets.`;
    if (name.startsWith("_get")) return `Returns derived ${readable.replace(/^get\s+/, "")} state.`;
    if (name.startsWith("_set")) return `Updates ${readable.replace(/^set\s+/, "")} and applies side effects.`;
    if (name.startsWith("_parse")) return `Parses ${readable.replace(/^parse\s+/, "")} into normalized internal data.`;
    if (name.startsWith("_normalize")) return `Normalizes ${readable.replace(/^normalize\s+/, "")} into a safe internal representation.`;
    if (name.startsWith("_apply")) return `Applies ${readable.replace(/^apply\s+/, "")} to rendered output.`;
    if (name.startsWith("_ensure")) return `Ensures ${readable.replace(/^ensure\s+/, "")} exists and is ready for use.`;
    if (name.startsWith("_start")) return `Starts ${readable.replace(/^start\s+/, "")} subscriptions or observers.`;
    if (name.startsWith("_commit")) return `Commits ${readable.replace(/^commit\s+/, "")} into host and dependent state.`;
    if (name.startsWith("_build")) return `Builds ${readable.replace(/^build\s+/, "")} output.`;
    if (name.startsWith("_format")) return `Formats ${readable.replace(/^format\s+/, "")} for display or serialization.`;
    if (name.startsWith("_serialize")) return `Serializes ${readable.replace(/^serialize\s+/, "")} into component value format.`;
    if (name.startsWith("_create") || name.startsWith("_make")) return `Creates ${readable.replace(/^create\s+|^make\s+/, "")} nodes/data used by the component.`;

    return `Handles internal ${readable} workflow.`;
}

const RETURNS_EXACT = {
    _styles: "Style definition map used for generated component CSS.",
    _hasConfiguredGap: "Boolean indicator of whether a dial gap is configured.",
    _isUnboundedMode: "Boolean indicator of unbounded rotation mode.",
    _getRotationValue: "Numeric value represented by one full rotation.",
    _valueToRatio: "Normalized ratio in the inclusive range `[0, 1]`.",
    _clamp: "Clamped numeric value.",
    _roundToStep: "Step-rounded numeric value.",
    _normalizeAngle: "Normalized degree value in the inclusive range `[0, 360)`.",
    _getDialBounds: "Dial bounds descriptor containing min and max values.",
    _buildRingPath: "SVG path data string for the requested arc segment.",
    _vectorDistance: "Numeric Euclidean distance.",
    _dot: "Numeric dot product.",
    _cross: "Vector cross-product components.",
    _multiplyQuaternion: "Quaternion components representing the composed rotation.",
    _quaternionFromUnitVectors: "Quaternion rotating vector `a` into vector `b`.",
    _rotateVector: "Rotated vector components.",
    _serializeVector: "Serialized vector string value.",
    _formatFloat: "Formatted numeric string.",
    _makeSvgNode: "Created SVG element node.",
    _readNumberAttribute: "Parsed numeric value or provided fallback.",
    _createNativeControl: "Configured native input element.",
    _renderDefault: "Rendered default dial container node.",
    _collectOptions: "Normalized option/tick/label descriptors.",
    _appendDialLabel: "Created label node, or `null` when skipped.",
    _projectPointerToArcball: "Projected unit vector on the arcball surface."
};

function buildPrivateReturns(info) {
    const name = info?.name || "";
    if (!name) return "Operation result.";
    if (RETURNS_EXACT[name]) return RETURNS_EXACT[name];
    if (info.kind === "getter") return `Current internal \`${name}\` value.`;
    if (info.kind === "setter") return "void.";

    if (name.startsWith("_on") || name.startsWith("_sync") || name.startsWith("_render") || name.startsWith("_apply") || name.startsWith("_commit") || name.startsWith("_start") || name.startsWith("_ensure") || name.startsWith("_run") || name.startsWith("_after") || name.startsWith("_bind") || name.startsWith("_clear")) {
        return "void.";
    }
    if (name.startsWith("_is") || name.startsWith("_has") || name.startsWith("_can") || name.startsWith("_should") || name.startsWith("_use")) {
        return "Boolean state value.";
    }
    if (name.startsWith("_get") || name.startsWith("_read") || name.startsWith("_parse") || name.startsWith("_normalize") || name.startsWith("_resolve")) {
        return "Derived value.";
    }
    if (name.startsWith("_create") || name.startsWith("_make")) {
        return "Created node or data value.";
    }
    if (name.includes("count") || name.includes("length") || name.includes("distance") || name.includes("dot") || name.includes("angle")) {
        return "Numeric result.";
    }
    return "Derived internal value or completion status.";
}

const PARAM_EXACT = {
    name: "Attribute or field name.",
    oldValue: "Previous attribute value.",
    newValue: "Next attribute value.",
    value: "Raw value being normalized or assigned.",
    v: "Numeric value candidate.",
    ev: "Pointer/keyboard event payload.",
    event: "Event payload.",
    label: "Label text or label descriptor.",
    ratio: "Normalized position on the active arc.",
    start: "Arc start angle in degrees.",
    sweep: "Arc sweep in degrees.",
    dir: "Signed direction (`-1` or `1`) for stepping.",
    min: "Minimum bound used in calculations.",
    max: "Maximum bound used in calculations.",
    decimals: "Decimal precision used for rounding/formatting.",
    emitInput: "Whether to dispatch an `input` event after update.",
    emitChange: "Whether to dispatch a `change` event after update.",
    a: "First vector/quaternion operand.",
    b: "Second vector/quaternion operand.",
    q: "Quaternion used for vector rotation.",
    x: "X axis component.",
    y: "Y axis component.",
    z: "Z axis component.",
    fallback: "Fallback value used when parsing fails.",
    key: "Key string from keyboard interaction.",
    attrName: "Attribute name to read.",
    tagName: "SVG/HTML tag name to create.",
    attrs: "Attribute map applied to a created node.",
    force: "Whether to force a full rebuild.",
    source: "Source element/value used for synchronization.",
    target: "Target element receiving updates.",
    input: "Native input or axis input element.",
    marker: "Dial label marker descriptor.",
    options: "Options object controlling behavior.",
    param2: "Options object controlling behavior."
};

function buildParamDescription(paramName) {
    const exact = PARAM_EXACT[paramName];
    if (exact) return exact;
    const readable = String(paramName || "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
    return `Input value for ${readable}.`;
}

function isGenericSummary(summary) {
    const text = String(summary || "").trim();
    return (
        text.includes("Implements `") ||
        text.includes("Implements internal ") ||
        text.includes("Synchronizes component state between attributes, DOM, and internals.") ||
        text.includes("Handles a component event or user interaction.") ||
        text.includes("Builds or updates the component's rendered UI.") ||
        text.includes("Computes and returns derived component state.") ||
        text.includes("Collects component data from attributes and child nodes.") ||
        text.includes("Creates and returns a required DOM/native control node.") ||
        text.includes("Resolves effective configuration from attributes and defaults.") ||
        text.includes("Parses incoming values into a normalized internal representation.") ||
        text.includes("Normalizes incoming values into a safe internal form.") ||
        text.includes("Applies computed state to the rendered component.") ||
        text.includes("Attaches event handlers used by the component.") ||
        text.includes("Returns the current `_") ||
        text.includes("Executes ")
    );
}

function isGenericReturns(text) {
    const t = String(text || "").trim();
    return (
        t === "Operation result." ||
        t === "Derived value." ||
        t === "Rendered output." ||
        t === "Derived internal value or completion status." ||
        t.startsWith("Current `_") ||
        t.startsWith("Result of") ||
        t.endsWith(" value.") ||
        t === "Boolean state value."
    );
}

function isGenericParamDescription(text) {
    const t = String(text || "").trim().replace(/\.+$/, "").toLowerCase();
    return (
        t === "input argument" ||
        t === "event payload" ||
        t === "assigned value" ||
        t === "options object" ||
        t === "state value" ||
        t === "parameter value" ||
        t === "attribute or field name" ||
        t === "previous value" ||
        t === "next value" ||
        t === "target element or node" ||
        t === "source element or value"
    );
}

function findNextCodeLine(source, fromIndex) {
    const tail = source.slice(fromIndex);
    const lines = tail.split(/\r?\n/);
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (line.startsWith("/**") || line.startsWith("*") || line.startsWith("*/")) continue;
        if (line.startsWith("//")) continue;
        return line;
    }
    return "";
}

function refineBlock(block, info) {
    const summary = buildPrivateSummary(info.name);
    const returnsText = buildPrivateReturns(info);
    const lines = block.split(/\r?\n/);
    const out = [];
    let summaryProcessed = false;

    for (let i = 0; i < lines.length; i += 1) {
        let line = lines[i];
        const trimmed = line.trim();

        if (!summaryProcessed && /^\*\s/.test(trimmed) && !trimmed.startsWith("* @") && trimmed !== "*" && trimmed !== "*/") {
            const currentSummary = trimmed.replace(/^\*\s*/, "");
            if (isGenericSummary(currentSummary)) {
                line = line.replace(/\*\s+.*/, ` * ${summary}`);
            }
            summaryProcessed = true;
        }

        const paramMatch = line.match(/(@param\s+\{[^}]+\}\s+)([A-Za-z0-9_$]+)(\s+-\s+)(.*)$/);
        if (paramMatch) {
            const [, prefix, paramName, infix, desc] = paramMatch;
            if (isGenericParamDescription(desc)) {
                line = line.replace(paramMatch[0], `${prefix}${paramName}${infix}${buildParamDescription(paramName)}`);
            } else {
                line = line.replace(/\.\.\s*$/, ".");
            }
        }

        const returnsMatch = line.match(/@returns?\s+\{[^}]+\}\s+(.*)$/);
        if (returnsMatch) {
            const current = returnsMatch[1] || "";
            if (isGenericReturns(current)) {
                line = line.replace(/@returns?\s+\{[^}]+\}\s+.*/, `@returns {*} ${returnsText}`);
            }
        }

        line = line.replace(/\.\./g, ".");
        out.push(line);
    }

    return out.join("\n");
}

async function walk(dir, files = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await walk(fullPath, files);
            continue;
        }
        if (!/\.(js|mjs)$/i.test(entry.name)) continue;
        files.push(fullPath);
    }
    return files;
}

async function main() {
    const targetDir = process.argv[2] || "forms/components";
    const files = await walk(targetDir);
    let updatedFiles = 0;

    for (const file of files) {
        const source = await fs.readFile(file, "utf8");
        let changed = false;
        let next = "";
        let last = 0;

        const re = /\/\*\*[\s\S]*?\*\//g;
        let match;
        while ((match = re.exec(source)) !== null) {
            const block = match[0];
            const start = match.index;
            const end = start + block.length;
            const signatureLine = findNextCodeLine(source, end);
            const info = signatureInfo(signatureLine);
            if (!isPrivateMember(info)) continue;

            const refined = refineBlock(block, info);
            if (refined !== block) {
                next += source.slice(last, start);
                next += refined;
                last = end;
                changed = true;
            }
        }

        if (!changed) continue;
        next += source.slice(last);
        await fs.writeFile(file, next, "utf8");
        updatedFiles += 1;
    }

    console.log(`Refined private-method JSDoc in ${updatedFiles} file(s).`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
