/**
 * AUTODOC:START
 * Component: <input-wysiwyg>
 * Class: InputWysiwyg
 * Overview: Rich text editor with a floating formatting toolbar for inline HTML tags.
 *
 * Features:
 * - Contenteditable editing surface synced to a hidden textarea for form submission.
 * - Toolbar with formatting buttons pinned above the editor (default: bold, italic, underline, strikethrough, code).
 * - Toggle buttons map to HTML wrapper tags (`strong`, `em`, `u`, etc.) and optional classes (`b.extra-bold`).
 * - Default toolbar tools: `strong`, `em`, `u`, `s`, `source` (`</>` toggles HTML source view; `code` is an alias).
 * - Applies tags to selected text or to text typed while a toggle is active.
 *
 * Example:
 * `<input-wysiwyg label="Body" name="body" tools="strong,em,u,code,b.extra-bold" maxlength="200" length-basis="text"></input-wysiwyg>`
 *
 * Attribute Reference:
 * - `tools`: Optional comma-separated specs. Use `source` or `code` for the `</>` HTML source toggle.
 * - `minlength`, `maxlength`, and `validation` min/max rules apply to measured content length.
 * - `length-basis="text"` (default) excludes markup tags from length checks.
 * - `length-basis="html"` counts stored HTML, including tags.
 * - Inherits base input attributes (`label`, `name`, `value`, `validation`, etc).
 *
 * Property Reference:
 * - Inherits base properties (`value`, `disabled`, `nativeInput`, ...).
 *
 * CSS Variables:
 * - Inherits shared InputComponent variables.
 *
 * Part Names:
 * - `wysiwyg-editor`: Editable surface.
 * - `wysiwyg-toolbar`: Floating formatting menu.
 * AUTODOC:END
 */

import InputComponent from "./input-component.mjs";
import {
    DEFAULT_TOOLS,
    createToolElement,
    findWrappingTool,
    flattenTools,
    isSourceTool,
    parseToolList,
    toolLabel
} from "./wysiwyg-tool-spec.mjs";
import {
    getEditorMeasuredLength,
    getEditorValidationContent,
    getSelectedMeasuredLength,
    incomingMeasuredLength,
    resolveLengthLimits
} from "./wysiwyg-length.mjs";

function selectionInsideNode(root, selection = window.getSelection()) {
    if (!root || !selection || selection.rangeCount === 0) return false;
    const anchor = selection.anchorNode;
    if (!anchor) return false;
    if (anchor === root) return true;

    const rootNode = root.getRootNode?.() || document;
    const anchorRoot = anchor.getRootNode?.() || document;
    if (rootNode !== anchorRoot) return false;

    return root.contains(anchor);
}

function getSelectionForRoot(root) {
    if (!root) return window.getSelection();
    const rootNode = root.getRootNode?.();
    if (rootNode instanceof ShadowRoot && typeof rootNode.getSelection === "function") {
        return rootNode.getSelection();
    }
    return window.getSelection();
}

const EXEC_COMMAND_FOR_TAG = {
    strong: "bold",
    b: "bold",
    em: "italic",
    i: "italic",
    u: "underline",
    s: "strikeThrough"
};

function unwrapElement(element) {
    if (!element || !element.parentNode) return;
    const parent = element.parentNode;
    while (element.firstChild) parent.insertBefore(element.firstChild, element);
    parent.removeChild(element);
    parent.normalize();
}

function wrapRangeContents(range, tool) {
    const element = createToolElement(tool);
    try {
        range.surroundContents(element);
    } catch {
        const fragment = range.extractContents();
        element.appendChild(fragment);
        range.insertNode(element);
    }
    return element;
}

function moveCaretAfter(node) {
    const selection = window.getSelection();
    if (!selection || !node) return;
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function moveCaretInsideEnd(element) {
    const selection = window.getSelection();
    if (!selection || !element) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
}

class InputWysiwyg extends InputComponent {
    static get observedAttributes() {
        return [...InputComponent.observedAttributes, "tools", "length-basis"];
    }

    get _styles() {
        return {
            ".input-wrapper": {
                position: "relative",
                padding: 0,
                minWidth: "12rem",
                flexDirection: "column",
                alignItems: "stretch",
                overflow: "visible"
            },
            ".input-wrapper .status-wrapper": {
                position: "absolute",
                top: "0",
                right: "0",
                width: "var(--input-control-size)",
                height: "var(--input-control-size)",
                padding: "0.2rem",
                boxSizing: "border-box"
            },
            ".native-wrapper": {
                display: "none"
            },
            ".wysiwyg-shell": {
                position: "relative",
                display: "flex",
                flexDirection: "column",
                width: "100%",
                minWidth: 0
            },
            ".wysiwyg-toolbar": {
                display: "flex",
                flexWrap: "wrap",
                gap: "0.25rem",
                padding: "0.25rem 0.35rem",
                borderBottom: "1px solid var(--input-border, #c8c8c8)",
                background: "var(--input-bgcolor, #ffffff)"
            },
            ".wysiwyg-tool": {
                minWidth: "1.75rem",
                border: "1px solid var(--input-border, #c8c8c8)",
                borderRadius: "4px",
                background: "var(--wysiwyg-tool-bg, #f4f4f5)",
                color: "inherit",
                fontSize: "0.78rem",
                fontWeight: "700",
                lineHeight: 1.2,
                padding: "0.2rem 0.45rem",
                cursor: "pointer"
            },
            ".wysiwyg-tool[aria-pressed='true']": {
                background: "var(--wysiwyg-tool-active-bg, #2563eb)",
                borderColor: "var(--wysiwyg-tool-active-bg, #2563eb)",
                color: "#ffffff"
            },
            ".wysiwyg-editor": {
                minHeight: "8rem",
                margin: "0.2rem",
                padding: "0.45rem 0.55rem",
                outline: 0,
                overflow: "auto",
                resize: "vertical",
                width: "calc(100% - 0.4rem)",
                boxSizing: "border-box",
                fontSize: "1em",
                fontFamily: "inherit",
                lineHeight: 1.5
            },
            ".wysiwyg-editor strong, .wysiwyg-editor b": {
                fontWeight: "700"
            },
            ".wysiwyg-editor em, .wysiwyg-editor i": {
                fontStyle: "italic"
            },
            ".wysiwyg-editor u": {
                textDecoration: "underline"
            },
            ".wysiwyg-editor s": {
                textDecoration: "line-through"
            },
            ".wysiwyg-editor code": {
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                background: "var(--wysiwyg-code-bg, #f4f4f5)",
                padding: "0 0.15rem",
                borderRadius: "3px"
            },
            ".wysiwyg-source": {
                display: "block",
                minHeight: "8rem",
                margin: "0.2rem",
                padding: "0.45rem 0.55rem",
                border: 0,
                outline: 0,
                overflow: "auto",
                resize: "vertical",
                width: "calc(100% - 0.4rem)",
                boxSizing: "border-box",
                fontSize: "0.85em",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                background: "var(--wysiwyg-source-bg, #f8fafc)",
                color: "inherit"
            },
            ".wysiwyg-source[hidden]": {
                display: "none"
            },
            ":host(.source-mode) .wysiwyg-tool:not([data-tool='source'])": {
                opacity: 0.45,
                pointerEvents: "none"
            },
            ".wysiwyg-editor:empty::before": {
                content: "attr(data-placeholder)",
                color: "var(--form-guidance-color, #94a3b8)",
                pointerEvents: "none"
            },
            ".wysiwyg-length": {
                margin: "0 0.2rem 0.2rem",
                padding: "0 0.55rem",
                color: "var(--form-guidance-color, #64748b)",
                fontSize: "0.75rem",
                textAlign: "right"
            },
            ".wysiwyg-length.is-over": {
                color: "var(--juice-validation-color-invalid, #b1302e)"
            }
        };
    }

    constructor() {
        super({ _layout: "label:input:>:default:native:>:status:<:validation" });
        this.inputType = "wysiwyg";
        this._activeTools = new Set();
        this._toolButtons = new Map();
        this._toolbar = null;
        this._editor = null;
        this._sourceEditor = null;
        this._sourceMode = false;
        this._lengthCounter = null;
        this._lastValidHtml = "";
        this._editorEventsBound = false;
        this._sourceEventsBound = false;
        this._savedRange = null;
        this._onSelectionChange = () => {
            if (this._sourceMode) {
                this._syncToolbar();
                return;
            }
            this._saveEditorSelection();
            this._syncToolbar();
        };
    }

    _supportsFormatting() {
        return false;
    }

    getEditorValidationValue() {
        if (this._sourceMode && this._sourceEditor) {
            return getEditorValidationContent(
                { textContent: this._sourceEditor.value, innerHTML: this._sourceEditor.value },
                this._getLengthBasis(),
                this._sourceEditor.value
            );
        }
        return getEditorValidationContent(
            this._editor,
            this._getLengthBasis(),
            this._dom?.native?.value ?? ""
        );
    }

    _getLengthBasis() {
        return String(this.getAttribute("length-basis") || "text").trim().toLowerCase() === "html"
            ? "html"
            : "text";
    }

    _getMeasuredLength() {
        if (this._sourceMode && this._sourceEditor) {
            return getEditorMeasuredLength(
                { textContent: this._sourceEditor.value, innerHTML: this._sourceEditor.value },
                this._getLengthBasis(),
                this._sourceEditor.value
            );
        }
        return getEditorMeasuredLength(
            this._editor,
            this._getLengthBasis(),
            this._dom?.native?.value ?? ""
        );
    }

    _getLengthLimits() {
        return resolveLengthLimits({
            minlength: this.getAttribute("minlength"),
            maxlength: this.getAttribute("maxlength"),
            validation: this.getAttribute("validation") || this.getAttribute("validate")
        });
    }

    _syncLengthUi() {
        const surface = this._sourceMode ? this._sourceEditor : this._editor;
        if (!surface) return;

        const { min, max } = this._getLengthLimits();
        const length = this._getMeasuredLength();
        const basis = this._getLengthBasis();

        if (min != null) {
            surface.setAttribute("aria-valuemin", String(min));
        } else {
            surface.removeAttribute("aria-valuemin");
        }

        if (max != null) {
            surface.setAttribute("aria-valuemax", String(max));
        } else {
            surface.removeAttribute("aria-valuemax");
        }

        surface.setAttribute("aria-valuenow", String(length));

        if (!this._lengthCounter) return;

        if (max != null) {
            this._lengthCounter.hidden = false;
            this._lengthCounter.textContent =
                basis === "html" ? `${length} / ${max} html` : `${length} / ${max}`;
            this._lengthCounter.classList.toggle("is-over", length > max);
        } else if (min != null) {
            this._lengthCounter.hidden = false;
            this._lengthCounter.textContent =
                basis === "html" ? `${length} html (min ${min})` : `${length} (min ${min})`;
            this._lengthCounter.classList.toggle("is-over", length < min);
        } else {
            this._lengthCounter.hidden = true;
            this._lengthCounter.textContent = "";
            this._lengthCounter.classList.remove("is-over");
        }
    }

    _wouldExceedMaxLength(incomingLength, selectedLength = 0) {
        const { max } = this._getLengthLimits();
        if (max == null || !this._editor) return false;
        const current = this._getMeasuredLength();
        return current - selectedLength + incomingLength > max;
    }

    _handleBeforeInput(event) {
        if (!this._editor || this.hasAttribute("readonly") || this.hasAttribute("disabled")) return;
        if (this._getLengthBasis() === "html") return;

        const type = String(event.inputType || "");
        if (!type.startsWith("insert")) return;

        const selection = this._getSelection();
        let selectedLength = 0;
        if (selection && selection.rangeCount && selectionInsideNode(this._editor, selection)) {
            selectedLength = getSelectedMeasuredLength(selection, this._editor, "text");
        }

        if (this._wouldExceedMaxLength(incomingMeasuredLength(event, "text"), selectedLength)) {
            event.preventDefault();
        }
    }

    _enforceHtmlLengthLimit() {
        if (!this._editor || this._getLengthBasis() !== "html") return;

        const { max } = this._getLengthLimits();
        if (max == null) {
            this._lastValidHtml = this._editor.innerHTML;
            return;
        }

        if (this._editor.innerHTML.length > max && this._lastValidHtml !== "") {
            this._editor.innerHTML = this._lastValidHtml;
            return;
        }

        this._lastValidHtml = this._editor.innerHTML;
    }

    /**
     * Resolve the toolbar spec. Precedence:
     * 1. `tools="@name"`  -> forms.wysiwyg.presets[name] from the juice config.
     * 2. `tools="..."`    -> inline per-instance spec.
     * 3. forms.wysiwyg.tools from the juice config (admin-panel default).
     * 4. Built-in DEFAULT_TOOLS.
     */
    _getConfiguredTools() {
        const typeConfig = this._getFormTypeConfig();
        const presets =
            typeConfig && typeof typeConfig.presets === "object" && typeConfig.presets
                ? typeConfig.presets
                : {};

        const attr = String(this.getAttribute("tools") || "").trim();
        let spec;
        if (attr.startsWith("@")) {
            spec = presets[attr.slice(1)];
        } else if (attr) {
            spec = attr;
        } else {
            spec = typeConfig?.tools;
        }

        const configured = parseToolList(spec);
        if (configured.length) return configured;

        return parseToolList(DEFAULT_TOOLS);
    }

    _createNativeControl() {
        const textarea = document.createElement("textarea");
        textarea.classList.add("native");
        textarea.tabIndex = -1;
        textarea.setAttribute("aria-hidden", "true");
        return textarea;
    }

    _resetDefaultView() {
        this._dom.default?.remove();
        this._dom.default = null;
        this._toolbar = null;
        this._editor = null;
        this._sourceEditor = null;
        this._sourceMode = false;
        this.classList.remove("source-mode");
        this._lengthCounter = null;
        this._toolButtons = new Map();
        this._activeTools.clear();
        this._editorEventsBound = false;
        this._sourceEventsBound = false;
        this._savedRange = null;
    }

    _getSelection() {
        return getSelectionForRoot(this._editor);
    }

    _saveEditorSelection() {
        const selection = this._getSelection();
        if (!this._editor || !selection?.rangeCount || !selectionInsideNode(this._editor, selection)) {
            return;
        }
        this._savedRange = selection.getRangeAt(0).cloneRange();
    }

    _restoreEditorSelection() {
        if (!this._savedRange || !this._editor) return false;
        const selection = this._getSelection();
        if (!selection) return false;
        try {
            selection.removeAllRanges();
            selection.addRange(this._savedRange);
        } catch {
            return false;
        }
        return selectionInsideNode(this._editor, selection);
    }

    _resolveEditorRange() {
        const selection = this._getSelection();
        if (this._editor && selection?.rangeCount && selectionInsideNode(this._editor, selection)) {
            return selection.getRangeAt(0).cloneRange();
        }
        if (this._restoreEditorSelection()) {
            const restored = this._getSelection();
            if (restored?.rangeCount) {
                return restored.getRangeAt(0).cloneRange();
            }
        }
        return null;
    }

    _applySelectionRange(range) {
        if (!range) return;
        const selection = this._getSelection();
        if (!selection) return;
        selection.removeAllRanges();
        selection.addRange(range);
    }

    _ensureEditorSelection() {
        if (!this._editor) return false;
        if (this._resolveEditorRange()) return true;

        this._editor.focus();
        const selection = this._getSelection();
        const range = document.createRange();
        range.selectNodeContents(this._editor);
        range.collapse(this._editor.childNodes.length > 0);
        selection?.removeAllRanges();
        selection?.addRange(range);
        this._savedRange = range.cloneRange();
        return true;
    }

    _commitEditorChange() {
        this._saveEditorSelection();
        this._syncToolbar();
        this._syncEditorToNative();
        this._syncLengthUi();
        this._updateFormValue();
        this._queueValidation();
        this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    }

    _ensureEditorId() {
        if (!this._editor || this._editor.id) return;
        const baseId = this._dom.native?.id || `inp-${Math.random().toString(36).slice(2, 10)}`;
        this._editor.id = `${baseId}-surface`;
        if (this._sourceEditor) {
            this._sourceEditor.id = `${baseId}-source`;
        }
    }

    _toggleSourceMode() {
        if (this._sourceMode) {
            this._exitSourceMode();
        } else {
            this._enterSourceMode();
        }
        this._syncToolbar();
    }

    _enterSourceMode() {
        if (!this._editor || !this._sourceEditor || this._sourceMode) return;

        this._syncEditorToNative();
        const html = this._dom.native?.value ?? this._editor.innerHTML ?? "";
        this._sourceEditor.value = html;
        this._editor.hidden = true;
        this._sourceEditor.hidden = false;
        this._sourceMode = true;
        this.classList.add("source-mode");
        this._ensureEditorId();
        if (this._dom.label) {
            this._dom.label.setAttribute("for", this._sourceEditor.id);
        }
        this._sourceEditor.focus();
        this._syncLengthUi();
    }

    _exitSourceMode() {
        if (!this._editor || !this._sourceEditor || !this._sourceMode) return;

        const html = this._sourceEditor.value;
        this._editor.innerHTML = html;
        this._lastValidHtml = html;
        this._sourceEditor.hidden = true;
        this._editor.hidden = false;
        this._sourceMode = false;
        this.classList.remove("source-mode");
        this._ensureEditorId();
        if (this._dom.label) {
            this._dom.label.setAttribute("for", this._editor.id);
        }
        this._syncEditorToNative();
        this._syncLengthUi();
        this._updateFormValue();
        this._queueValidation();
        this._editor.focus();
    }

    _renderDefault() {
        if (this._dom.default) return;

        const shell = document.createElement("div");
        shell.className = "wysiwyg-shell";
        shell.part = "wysiwyg-shell";

        const toolbar = document.createElement("div");
        toolbar.className = "wysiwyg-toolbar";
        toolbar.part = "wysiwyg-toolbar";
        toolbar.setAttribute("role", "toolbar");
        toolbar.setAttribute("aria-label", "Text formatting");

        this._toolButtons = new Map();
        this._tools = this._getConfiguredTools();
        this._tools.forEach((tool) => {
            if (tool.type === "group") {
                toolbar.appendChild(this._createToolGroup(tool));
                return;
            }
            toolbar.appendChild(this._createToolButton(tool));
        });

        const editor = document.createElement("div");
        editor.className = "wysiwyg-editor";
        editor.part = "wysiwyg-editor";
        editor.contentEditable = "true";
        editor.setAttribute("role", "textbox");
        editor.setAttribute("aria-multiline", "true");
        editor.spellcheck = true;
        editor.dataset.placeholder = this.getAttribute("placeholder") || "";

        const sourceEditor = document.createElement("textarea");
        sourceEditor.className = "wysiwyg-source";
        sourceEditor.part = "wysiwyg-source";
        sourceEditor.hidden = true;
        sourceEditor.spellcheck = false;
        sourceEditor.setAttribute("aria-label", "HTML source");

        const lengthCounter = document.createElement("div");
        lengthCounter.className = "wysiwyg-length";
        lengthCounter.part = "wysiwyg-length";
        lengthCounter.hidden = true;

        shell.append(toolbar, editor, sourceEditor, lengthCounter);
        this._toolbar = toolbar;
        this._editor = editor;
        this._sourceEditor = sourceEditor;
        this._lengthCounter = lengthCounter;
        this._dom.default = shell;
    }

    _createToolButton(tool) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "wysiwyg-tool";
        button.dataset.tool = tool.key;
        button.setAttribute("aria-pressed", "false");
        button.setAttribute(
            "aria-label",
            isSourceTool(tool) ? "Toggle HTML source" : `Toggle ${tool.key}`
        );
        button.textContent = toolLabel(tool);
        if (isSourceTool(tool)) {
            button.addEventListener("mousedown", (event) => this._onSourceToolPointerDown(event), true);
            button.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                this._toggleSourceMode();
            });
        } else {
            button.addEventListener("mousedown", (event) => this._onToolPointerDown(tool, event), true);
            button.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                this._activateTool(tool);
            });
        }
        this._toolButtons.set(tool.key, button);
        return button;
    }

    /**
     * A disclosure group: a single toolbar button that reveals a flyout of the
     * same class-toggle tools. The bracket grouping is purely toolbar layout —
     * each child remains an ordinary toggle.
     */
    _createToolGroup(group) {
        const wrapper = document.createElement("div");
        wrapper.className = "wysiwyg-group";

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "wysiwyg-tool wysiwyg-group-trigger";
        trigger.setAttribute("aria-haspopup", "true");
        trigger.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-label", `${group.label} options`);
        trigger.textContent = toolLabel(group);

        const menu = document.createElement("div");
        menu.className = "wysiwyg-group-menu";
        menu.setAttribute("role", "menu");
        group.tools.forEach((tool) => menu.appendChild(this._createToolButton(tool)));

        const close = () => {
            wrapper.classList.remove("is-open");
            trigger.setAttribute("aria-expanded", "false");
        };
        const open = () => {
            wrapper.classList.add("is-open");
            trigger.setAttribute("aria-expanded", "true");
        };

        trigger.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this._saveEditorSelection();
            wrapper.classList.contains("is-open") ? close() : open();
        }, true);
        trigger.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                close();
                return;
            }
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            wrapper.classList.contains("is-open") ? close() : open();
        });

        wrapper.append(trigger, menu);
        return wrapper;
    }

    _bindNativeEvents() {
        super._bindNativeEvents();
        this._bindEditorEvents();
    }

    _bindEditorEvents() {
        if (!this._editor || this._editorEventsBound) return;
        this._editorEventsBound = true;

        const sync = () => {
            this._enforceHtmlLengthLimit();
            this._syncEditorToNative();
            this._syncLengthUi();
            this._syncToolbar();
        };

        this._editor.addEventListener("beforeinput", (event) => this._handleBeforeInput(event));
        this._editor.addEventListener("input", sync);
        this._editor.addEventListener("focus", () => {
            this.classList.add("focused");
            this.classList.add("touched");
            this._saveEditorSelection();
            this._syncToolbar();
        });
        this._editor.addEventListener("blur", () => {
            window.setTimeout(() => {
                this.classList.remove("focused");
                this._syncFieldFeedback();
                this._queueValidation();
            }, 0);
        });
        this._editor.addEventListener("keyup", () => {
            this._saveEditorSelection();
            this._syncToolbar();
        });
        this._editor.addEventListener("mouseup", () => {
            this._saveEditorSelection();
            this._syncToolbar();
        });
        document.addEventListener("selectionchange", this._onSelectionChange);

        if (!this._sourceEditor || this._sourceEventsBound) return;
        this._sourceEventsBound = true;

        const syncSource = () => {
            if (!this._sourceMode || !this._sourceEditor || !this._dom.native) return;
            if (this._dom.native.value !== this._sourceEditor.value) {
                this._dom.native.value = this._sourceEditor.value;
            }
            this._syncHostFromNative();
            this._syncLengthUi();
            this._queueValidation();
            this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        };

        this._sourceEditor.addEventListener("input", syncSource);
        this._sourceEditor.addEventListener("focus", () => {
            this.classList.add("focused");
            this.classList.add("touched");
        });
        this._sourceEditor.addEventListener("blur", () => {
            window.setTimeout(() => {
                if (this._sourceMode) return;
                this.classList.remove("focused");
                this._syncFieldFeedback();
                this._queueValidation();
            }, 0);
        });
    }

    _afterRender() {
        this._bindEditorEvents();
        this._syncNativeToEditor();
        this._syncLengthUi();
        this._syncToolbar();
    }

    disconnectedCallback() {
        document.removeEventListener("selectionchange", this._onSelectionChange);
        super.disconnectedCallback();
    }

    _renderLabel() {
        super._renderLabel();
        if (!this._editor || !this._dom.label) return;

        this._ensureEditorId();
        this._dom.label.setAttribute("for", this._editor.id);

        const labelText = this.getAttribute("label") || "";
        if (labelText) {
            this._editor.setAttribute("aria-label", labelText);
            this._dom.native?.removeAttribute("aria-label");
        } else {
            this._editor.removeAttribute("aria-label");
        }
    }

    _syncSingleAttribute(name) {
        if (name === "placeholder") {
            if (this._editor) {
                this._editor.dataset.placeholder = this.getAttribute("placeholder") || "";
            }
            return;
        }
        if (name === "value") {
            this._syncNativeToEditor();
            this._syncLengthUi();
            return;
        }
        if (name === "minlength" || name === "maxlength" || name === "validation" || name === "validate" || name === "length-basis") {
            this._syncLengthUi();
            this._setupValidation();
            this._queueValidation();
            return;
        }
        if (name === "tools") {
            this._resetDefaultView();
            this._renderDefault();
            this._ensureDefaultMountedInInputContainer();
            this._eventsBound = false;
            this._bindNativeEvents();
            this._syncNativeToEditor();
            this._syncLengthUi();
            this._syncToolbar();
            return;
        }
        super._syncSingleAttribute(name);
        if (name === "disabled" && this._editor) {
            this._editor.contentEditable = this.hasAttribute("disabled") ? "false" : "true";
        }
        if (name === "readonly" && this._editor) {
            this._editor.contentEditable = this.hasAttribute("readonly") ? "false" : "true";
        }
    }

    _syncEditorToNative() {
        if (!this._editor || !this._dom.native) return;
        const html = this._editor.innerHTML;
        if (this._dom.native.value !== html) {
            this._dom.native.value = html;
        }
        this._syncHostFromNative();
    }

    _syncNativeToEditor() {
        if (!this._editor || !this._dom.native) return;
        const html = this.getAttribute("value") ?? this._dom.native.value ?? "";
        if (this._sourceMode && this._sourceEditor) {
            this._sourceEditor.value = html;
        } else if (this._editor.innerHTML !== html) {
            this._editor.innerHTML = html;
        }
        this._lastValidHtml = html;
    }

    _getFormValue() {
        if (!this._dom.native) return "";
        return this._dom.native.value;
    }

    _onSourceToolPointerDown(event) {
        event.preventDefault();
        event.stopPropagation();
        this._toggleSourceMode();
    }

    _onToolPointerDown(tool, event) {
        if (this._sourceMode) return;
        event.preventDefault();
        event.stopPropagation();
        this._activateTool(tool);
    }

    _activateTool(tool) {
        if (!this._editor || this._sourceMode || this.hasAttribute("disabled") || this.hasAttribute("readonly")) {
            return;
        }

        const range = this._resolveEditorRange();
        if (!range) return;

        const command = !tool.className ? EXEC_COMMAND_FOR_TAG[tool.tag] : null;
        if (command && typeof document.execCommand === "function") {
            this._applySelectionRange(range);
            if (document.execCommand(command, false, null)) {
                this._commitEditorChange();
                return;
            }
        }

        this._applySelectionRange(range);
        const liveRange = this._getSelection()?.rangeCount ? this._getSelection().getRangeAt(0) : range;

        if (!liveRange.collapsed) {
            this._toggleSelectionTool(tool, liveRange);
        } else {
            this._toggleTypingTool(tool);
        }

        this._commitEditorChange();
    }

    _toggleSelectionTool(tool, range) {
        this._applySelectionRange(range);
        const liveRange = this._getSelection()?.rangeCount ? this._getSelection().getRangeAt(0) : range;
        if (!liveRange) return;

        const wrapped = findWrappingTool(liveRange.startContainer, tool, this._editor);
        const endWrapped = findWrappingTool(liveRange.endContainer, tool, this._editor);
        if (wrapped && wrapped === endWrapped) {
            unwrapElement(wrapped);
            return;
        }

        const element = wrapRangeContents(liveRange, tool);
        const selection = this._getSelection();
        if (!selection) return;
        const next = document.createRange();
        next.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(next);
    }

    _toggleTypingTool(tool) {
        const selection = this._getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const current = findWrappingTool(range.startContainer, tool, this._editor);

        if (this._activeTools.has(tool.key)) {
            this._activeTools.delete(tool.key);
            if (current && current.dataset.wysiwygTyping === tool.key) {
                moveCaretAfter(current);
                if (!current.textContent.trim()) {
                    unwrapElement(current);
                } else {
                    delete current.dataset.wysiwygTyping;
                }
            }
            return;
        }

        this._activeTools.add(tool.key);
        if (current) {
            moveCaretInsideEnd(current);
            return;
        }

        const element = createToolElement(tool);
        element.dataset.wysiwygTyping = tool.key;
        element.appendChild(document.createTextNode("\u200B"));
        range.insertNode(element);
        moveCaretInsideEnd(element);
    }

    _syncToolbar() {
        if (!this._toolbar || !this._editor) return;

        const selection = this._sourceMode ? null : this._getSelection();
        const hasSelection =
            selection?.rangeCount && selectionInsideNode(this._editor, selection);
        const range = hasSelection ? selection.getRangeAt(0) : null;
        const tools = flattenTools(this._tools || this._getConfiguredTools());

        this._toolButtons.forEach((button, toolKey) => {
            const tool = tools.find((entry) => entry.key === toolKey);
            if (!tool) return;

            if (isSourceTool(tool)) {
                button.setAttribute("aria-pressed", this._sourceMode ? "true" : "false");
                return;
            }

            if (this._sourceMode) {
                button.setAttribute("aria-pressed", "false");
                return;
            }

            if (range && !tool.className && EXEC_COMMAND_FOR_TAG[tool.tag] && typeof document.queryCommandState === "function") {
                button.setAttribute(
                    "aria-pressed",
                    document.queryCommandState(EXEC_COMMAND_FOR_TAG[tool.tag]) ? "true" : "false"
                );
                return;
            }

            if (!range) {
                button.setAttribute("aria-pressed", this._activeTools.has(tool.key) ? "true" : "false");
                return;
            }

            const typing = this._activeTools.has(tool.key);
            const wrapped = findWrappingTool(range.startContainer, tool, this._editor);
            const pressed = typing || Boolean(wrapped);
            button.setAttribute("aria-pressed", pressed ? "true" : "false");
        });
    }

    _getFieldFeedbackPlacementPreference() {
        return "below";
    }

    _isValidationFieldFocused() {
        if (super._isValidationFieldFocused()) return true;
        const root = this._editor?.getRootNode?.();
        const active = root && "activeElement" in root ? root.activeElement : null;
        return Boolean(active === this._editor || active === this._sourceEditor);
    }
}

customElements.define("input-wysiwyg", InputWysiwyg);

export default InputWysiwyg;
