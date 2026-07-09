/**
 * Form-level progress summary and field checklist.
 */

const FIELD_SELECTOR = [
    "input-text",
    "input-textarea",
    "input-wysiwyg",
    "input-select",
    "input-checkbox",
    "input-radio",
    "input-number",
    "input-range",
    "input-file",
    "[validation]",
    "[validate]"
].join(",");

const STATUS_LABELS = {
    complete: "Complete",
    invalid: "Error",
    incomplete: "Incomplete",
    untouched: "Not started"
};

class FormInfo extends HTMLElement {
    static get observedAttributes() {
        return ["error", "warning", "message", "description", "for"];
    }

    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: "open" });
        this._form = null;
        this._hooks = {};
        this._historyBound = false;
        this._validationTarget = null;
        this._fieldStates = [];
        this._fieldObserver = null;
        this._refreshFrame = 0;
        this._onValidationChange = () => this._queueRefresh();
        this._onFieldActivity = () => this._queueRefresh();
        this._onDocumentPointerDown = (event) => {
            if (!this._open || event.composedPath().includes(this)) return;
            this._setOpen(false);
        };
        this._onDocumentKeyDown = (event) => {
            if (event.key === "Escape" && this._open) {
                this._setOpen(false);
                this._refs.toggle.focus();
            }
        };

        this._shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    margin: 0;
                    box-sizing: border-box;
                    font-family: var(--form-font-family, system-ui, sans-serif);
                    margin-bottom: var(--input-margin-bottom, 1rem);
                }

                *, *::before, *::after {
                    box-sizing: border-box;
                }

                .form-info {
                    position: relative;
                    width: 100%;
                }

                .summary {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    width: 100%;
                    min-height: var(--input-control-size, 38px);
                    padding: 0.55rem 0.7rem 0.55rem 0.85rem;
                    border: var(--input-border, 1px solid #c8c8c8);
                    border-radius: var(--input-border-radius, 5px);
                    background: var(--input-bgcolor, #fff);
                }

                .summary-copy {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: baseline;
                    gap: 0.3rem 0.75rem;
                    min-width: 0;
                }

                .progress {
                    color: var(--input-color, #293241);
                    font-size: 0.9rem;
                }

                .health {
                    color: #5f6b7a;
                    font-size: 0.8rem;
                }

                .health.has-errors {
                    color: var(--juice-validation-color-invalid, #d41111);
                }

                .toggle {
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    width: 34px;
                    height: 34px;
                    padding: 5px;
                    border: 0;
                    border-radius: 5px;
                    color: var(--form-accent-color, #0059bf);
                    background: transparent;
                    cursor: pointer;
                }

                .toggle:hover,
                .toggle:focus-visible,
                .toggle[aria-expanded="true"] {
                    background: color-mix(in srgb, currentColor 12%, transparent);
                    outline: none;
                }

                .toggle svg {
                    width: 100%;
                    height: 100%;
                    fill: none;
                    stroke: currentColor;
                    stroke-width: 1.8;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }

                .popover {
                    position: absolute;
                    z-index: 100100;
                    top: calc(100% + 0.5rem);
                    right: 0;
                    width: min(760px, calc(100vw - 2rem));
                    max-height: min(70vh, 620px);
                    overflow: auto;
                    border: var(--input-border, 1px solid #c8c8c8);
                    border-radius: 8px;
                    background: var(--input-bgcolor, #fff);
                    box-shadow: 0 18px 50px rgb(0 0 0 / 20%);
                }

                .popover[hidden] {
                    display: none;
                }

                .popover-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    padding: 0.8rem 1rem;
                    border-bottom: 1px solid #d9e1ea;
                }

                .popover-title {
                    margin: 0;
                    color: var(--form-label-color, #293241);
                    font-size: 0.95rem;
                }

                .popover-summary {
                    color: #5f6b7a;
                    font-size: 0.78rem;
                }

                .details {
                    display: grid;
                    grid-template-columns: minmax(180px, 0.75fr) minmax(280px, 1.25fr);
                    gap: 1rem;
                    padding: 1rem;
                }

                .map-panel,
                .checklist-panel {
                    min-width: 0;
                }

                .section-title {
                    margin: 0 0 0.55rem;
                    color: var(--form-label-color, #293241);
                    font-size: 0.72rem;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .form-map {
                    position: relative;
                    width: 100%;
                    min-height: 190px;
                    border: 1px solid #d9e1ea;
                    border-radius: 6px;
                    background: #f7f9fc;
                    overflow: hidden;
                }

                .map-field {
                    position: absolute;
                    min-width: 18px;
                    min-height: 14px;
                    padding: 0;
                    border: 1px solid rgb(0 0 0 / 16%);
                    border-radius: 4px;
                    cursor: pointer;
                    appearance: none;
                    transition: opacity 140ms ease, filter 140ms ease;
                }

                .form-map.has-highlight .map-field:not(.is-highlighted) {
                    opacity: 0.5;
                }

                .complete {
                    --field-status-color: var(--juice-validation-color-valid, #73c322);
                }

                .invalid {
                    --field-status-color: var(--juice-validation-color-invalid, #d41111);
                }

                .incomplete,
                .untouched {
                    --field-status-color: var(--juice-validation-color-incomplete, #ffab1a);
                }

                .map-field {
                    background: var(--field-status-color);
                }

                .legend {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.4rem 0.75rem;
                    margin-top: 0.55rem;
                    color: #5f6b7a;
                    font-size: 0.7rem;
                }

                .legend span::before {
                    content: "";
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    margin-right: 0.3rem;
                    border-radius: 2px;
                    background: var(--field-status-color);
                }

                .field-list {
                    display: grid;
                    gap: 0.45rem;
                    margin: 0;
                    padding: 0;
                    list-style: none;
                }

                .field-item {
                    display: grid;
                    grid-template-columns: auto minmax(0, 1fr) auto;
                    gap: 0.55rem;
                    align-items: start;
                    padding: 0.5rem;
                    border: 1px solid #d9e1ea;
                    border-left: 4px solid var(--field-status-color);
                    border-radius: 5px;
                    background: #fff;
                    cursor: pointer;
                    transition: border-color 140ms ease, box-shadow 140ms ease;
                }

                .field-item.is-highlighted {
                    border-color: var(--field-status-color);
                    box-shadow: 0 0 0 2px color-mix(in srgb, var(--field-status-color) 18%, transparent);
                }

                .field-status-icon {
                    width: 18px;
                    height: 18px;
                }

                .field-copy {
                    min-width: 0;
                }

                .field-name {
                    display: block;
                    color: #293241;
                    font-size: 0.82rem;
                }

                .field-message {
                    display: block;
                    margin-top: 0.18rem;
                    color: #5f6b7a;
                    font-size: 0.72rem;
                    line-height: 1.3;
                }

                .field-state {
                    color: var(--field-status-color);
                    font-size: 0.68rem;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .callouts {
                    display: none;
                    gap: 0.35rem;
                    padding: 0 1rem 1rem;
                    font-size: 0.78rem;
                }

                .callouts.has-content {
                    display: grid;
                }

                .callout-error { color: #d41111; }
                .callout-warning { color: #b26a00; }
                .callout-message { color: #007cc7; }

                .actions {
                    display: none;
                    justify-content: flex-end;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    border-top: 1px solid #d9e1ea;
                }

                .form-info.has-history .actions {
                    display: flex;
                }

                .action {
                    border: 0;
                    background: transparent;
                    color: #5f6b7a;
                    font: inherit;
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    cursor: pointer;
                }

                @media (max-width: 640px) {
                    .details {
                        grid-template-columns: 1fr;
                    }

                    .form-map {
                        min-height: 150px;
                    }
                }
            </style>
            <div class="form-info" data-ref="wrapper">
                <div class="summary" role="status" aria-live="polite">
                    <div class="summary-copy">
                        <strong class="progress" data-ref="progress">Completed 0 of 0 fields</strong>
                        <span class="health" data-ref="health">No errors</span>
                    </div>
                    <button type="button" class="toggle" data-ref="toggle" aria-expanded="false"
                        aria-label="Open form checklist" title="Open form checklist">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M9 6h11M9 12h11M9 18h11"/>
                            <path d="m3.5 6 1.4 1.4L7.5 4.8M3.5 12l1.4 1.4 2.6-2.6M3.5 18l1.4 1.4 2.6-2.6"/>
                        </svg>
                    </button>
                </div>
                <section class="popover" data-ref="popover" role="dialog" tabindex="-1" hidden>
                    <header class="popover-header">
                        <h2 class="popover-title">Form checklist</h2>
                        <span class="popover-summary" data-ref="popover-summary"></span>
                    </header>
                    <div class="details">
                        <section class="map-panel">
                            <h3 class="section-title">Form map</h3>
                            <div class="form-map" data-ref="form-map"></div>
                            <div class="legend">
                                <span class="complete">Complete</span>
                                <span class="invalid">Error</span>
                                <span class="untouched">Not started</span>
                            </div>
                        </section>
                        <section class="checklist-panel">
                            <h3 class="section-title">Fields</h3>
                            <ol class="field-list" data-ref="field-list"></ol>
                        </section>
                    </div>
                    <div class="callouts" data-ref="callouts">
                        <div class="callout-error" data-ref="error-message"></div>
                        <div class="callout-warning" data-ref="warning-message"></div>
                        <div class="callout-message" data-ref="form-message"></div>
                    </div>
                    <footer class="actions">
                        <button type="button" class="action" data-action="undo">Undo</button>
                        <button type="button" class="action" data-action="revert">Revert</button>
                    </footer>
                </section>
            </div>
        `;

        this._refs = {};
        this._shadow.querySelectorAll("[data-ref]").forEach((element) => {
            this._refs[element.getAttribute("data-ref")] = element;
        });
        const checklistId = `form-info-checklist-${Math.random().toString(36).slice(2, 10)}`;
        const title = this._shadow.querySelector(".popover-title");
        this._refs.popover.id = checklistId;
        title.id = `${checklistId}-title`;
        this._refs.popover.setAttribute("aria-labelledby", title.id);
        this._refs.toggle.setAttribute("aria-controls", checklistId);
    }

    connectedCallback() {
        this._refs.toggle.addEventListener("click", () => this._setOpen(!this._open));
        this._shadow.querySelectorAll("[data-action]").forEach((button) => {
            button.addEventListener("click", () => this._runAction(button.getAttribute("data-action")));
        });
        document.addEventListener("pointerdown", this._onDocumentPointerDown);
        document.addEventListener("keydown", this._onDocumentKeyDown);
        this._tryAutoBindValidation();
        this._syncView();
    }

    disconnectedCallback() {
        document.removeEventListener("pointerdown", this._onDocumentPointerDown);
        document.removeEventListener("keydown", this._onDocumentKeyDown);
        this._unbindValidationSource();
        if (this._refreshFrame) cancelAnimationFrame(this._refreshFrame);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === "for") this._tryAutoBindValidation(true);
        this._syncView();
    }

    hook(action, fn) {
        if (typeof fn === "function") this._hooks[action] = fn;
    }

    bindForm(form) {
        this._form = form;
        const history = form && form.history;
        if (history && !this._historyBound && typeof history.on === "function") {
            history.on("notEmpty", () => this._refs.wrapper.classList.add("has-history"));
            history.on("empty", () => this._refs.wrapper.classList.remove("has-history"));
            this._historyBound = true;
        }
        this._bindValidationSource(this._resolveValidationSource(form));
    }

    _resolveValidationSource(source) {
        if (!source) return null;
        if (source instanceof HTMLFormElement) return source;
        if (source instanceof HTMLElement && source.tagName.toLowerCase() === "juice-forms") {
            return source.form instanceof HTMLFormElement ? source.form : null;
        }
        return source.form instanceof HTMLFormElement ? source.form : null;
    }

    _tryAutoBindValidation(force = false) {
        if (this._validationTarget && !force) return;
        const forId = (this.getAttribute("for") || "").trim();
        const explicit = forId ? document.getElementById(forId) : null;
        const closest = this.closest("juice-forms, form");
        const target = this._resolveValidationSource(explicit) || this._resolveValidationSource(closest);
        this._bindValidationSource(target);
        if (!this._form && target) this._form = target;
    }

    _bindValidationSource(target) {
        if (this._validationTarget === target) {
            this._queueRefresh();
            return;
        }
        this._unbindValidationSource();
        this._validationTarget = target;
        if (!target) {
            this._fieldStates = [];
            this._renderProgress();
            return;
        }

        target.addEventListener("validation:change", this._onValidationChange);
        target.addEventListener("input", this._onFieldActivity);
        target.addEventListener("change", this._onFieldActivity);
        target.addEventListener("focusout", this._onFieldActivity);
        this._fieldObserver = new MutationObserver(() => this._queueRefresh());
        this._fieldObserver.observe(target, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["label", "name", "value", "checked", "validation-state"]
        });
        this._refreshFieldStates();
    }

    _unbindValidationSource() {
        const target = this._validationTarget;
        if (target) {
            target.removeEventListener("validation:change", this._onValidationChange);
            target.removeEventListener("input", this._onFieldActivity);
            target.removeEventListener("change", this._onFieldActivity);
            target.removeEventListener("focusout", this._onFieldActivity);
        }
        if (this._fieldObserver) this._fieldObserver.disconnect();
        this._fieldObserver = null;
        this._validationTarget = null;
    }

    _queueRefresh() {
        if (this._refreshFrame) cancelAnimationFrame(this._refreshFrame);
        this._refreshFrame = requestAnimationFrame(() => {
            this._refreshFrame = 0;
            this._refreshFieldStates();
        });
    }

    _refreshFieldStates() {
        if (!this._validationTarget) return;
        const groups = new Map();
        const fields = Array.from(this._validationTarget.querySelectorAll(FIELD_SELECTOR)).filter(
            (field) => !field.disabled && !field.hasAttribute("disabled")
        );

        fields.forEach((field, index) => {
            const property = (field.getAttribute("name") || field.id || `field-${index + 1}`).trim();
            if (!groups.has(property)) groups.set(property, []);
            groups.get(property).push(field);
        });

        this._fieldStates = Array.from(groups.entries()).map(([property, groupedFields], index) =>
            this._createFieldState(property, groupedFields, index)
        );
        this._renderProgress();
    }

    _createFieldState(property, fields, index) {
        const primary = fields[0];
        const values = fields.map((field) => this._fieldValue(field));
        const hasValue = values.some((value) => value !== "" && value !== false && value != null);
        const touched = fields.some((field) => field.classList.contains("touched")) || hasValue;
        const rawStates = fields.map((field) => (field.getAttribute("validation-state") || "none").toLowerCase());
        const messages = fields.flatMap((field) =>
            Array.isArray(field._validationMessages) ? field._validationMessages.filter(Boolean) : []
        );

        let status = "untouched";
        if (touched && rawStates.includes("invalid")) status = "invalid";
        else if (touched && (rawStates.includes("incomplete") || !hasValue)) status = "incomplete";
        else if (hasValue && !rawStates.includes("invalid") && !rawStates.includes("incomplete")) status = "complete";

        return {
            index: index + 1,
            property,
            label: primary.getAttribute("label") || primary.getAttribute("name") || `Field ${index + 1}`,
            fields,
            primary,
            status,
            messages
        };
    }

    _fieldValue(field) {
        const type = String(field.getAttribute("type") || field.type || "").toLowerCase();
        const checkableHost = /checkbox|radio/.test(field.tagName.toLowerCase());
        if (type === "checkbox" || type === "radio" || ("checked" in field && checkableHost)) {
            return field.checked ? field.value || true : false;
        }
        return field.value == null ? field.getAttribute("value") || "" : field.value;
    }

    _renderProgress() {
        const total = this._fieldStates.length;
        const completed = this._fieldStates.filter((field) => field.status === "complete").length;
        const errors = this._fieldStates.filter((field) => field.status === "invalid").length;
        const remaining = total - completed;

        this._refs.progress.textContent = `Completed ${completed} of ${total} fields`;
        this._refs.health.textContent = errors
            ? `${errors} ${errors === 1 ? "error" : "errors"}`
            : remaining
              ? `No errors · ${remaining} remaining`
              : "No errors";
        this._refs.health.classList.toggle("has-errors", errors > 0);
        this._refs["popover-summary"].textContent = `${completed}/${total} complete`;

        this._renderFieldList();
        this._renderFormMap();
        this._syncView();
    }

    _renderFieldList() {
        const list = this._refs["field-list"];
        list.replaceChildren();
        this._fieldStates.forEach((field) => {
            const item = document.createElement("li");
            item.className = `field-item ${field.status}`;
            item.tabIndex = 0;
            item.dataset.fieldIndex = String(field.index);

            const icon = document.createElement("input-status");
            icon.className = "field-status-icon";
            icon.setAttribute("size", "18");
            icon.setAttribute("icon-only", "");
            icon.setAttribute("colored", "");
            icon.setAttribute("state", this._statusIconState(field.status));

            const copy = document.createElement("div");
            copy.className = "field-copy";
            const name = document.createElement("strong");
            name.className = "field-name";
            name.textContent = field.label;
            const message = document.createElement("span");
            message.className = "field-message";
            message.textContent = field.messages.join(" ") || this._defaultFieldMessage(field.status);
            copy.append(name, message);

            const state = document.createElement("span");
            state.className = "field-state";
            state.textContent = STATUS_LABELS[field.status];

            item.append(icon, copy, state);
            item.addEventListener("pointerenter", () => this._highlightField(field.index));
            item.addEventListener("pointerleave", () => this._clearFieldHighlight());
            item.addEventListener("focus", () => this._highlightField(field.index));
            item.addEventListener("blur", () => this._clearFieldHighlight());
            item.addEventListener("click", () => this._focusField(field));
            item.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    this._focusField(field);
                }
            });
            list.appendChild(item);
        });
    }

    _renderFormMap() {
        const map = this._refs["form-map"];
        map.replaceChildren();
        if (!this._validationTarget || !this._fieldStates.length) return;

        const formRect = this._validationTarget.getBoundingClientRect();
        if (!formRect.width || !formRect.height) return;

        this._fieldStates.forEach((field) => {
            const rects = field.fields
                .map((element) => element.getBoundingClientRect())
                .filter((rect) => rect.width > 0 && rect.height > 0);
            if (!rects.length) return;

            const left = Math.min(...rects.map((rect) => rect.left));
            const top = Math.min(...rects.map((rect) => rect.top));
            const right = Math.max(...rects.map((rect) => rect.right));
            const bottom = Math.max(...rects.map((rect) => rect.bottom));
            const block = document.createElement("button");
            block.type = "button";
            block.className = `map-field ${field.status}`;
            block.dataset.fieldIndex = String(field.index);
            block.title = `${field.label}: ${STATUS_LABELS[field.status]}`;
            block.style.left = `${Math.max(0, ((left - formRect.left) / formRect.width) * 100)}%`;
            block.style.top = `${Math.max(0, ((top - formRect.top) / formRect.height) * 100)}%`;
            block.style.width = `${Math.min(100, ((right - left) / formRect.width) * 100)}%`;
            block.style.height = `${Math.min(100, ((bottom - top) / formRect.height) * 100)}%`;
            block.addEventListener("pointerenter", () => this._highlightField(field.index));
            block.addEventListener("pointerleave", () => this._clearFieldHighlight());
            block.addEventListener("focus", () => this._highlightField(field.index));
            block.addEventListener("blur", () => this._clearFieldHighlight());
            block.addEventListener("click", () => this._focusField(field));
            map.appendChild(block);
        });
    }

    _statusIconState(status) {
        if (status === "complete") return "success";
        if (status === "invalid") return "error";
        return "warning";
    }

    _highlightField(index) {
        const selector = `[data-field-index="${index}"]`;
        this._refs["form-map"].classList.add("has-highlight");
        this._shadow.querySelectorAll(".map-field, .field-item").forEach((element) => {
            element.classList.toggle("is-highlighted", element.matches(selector));
        });
    }

    _clearFieldHighlight() {
        this._refs["form-map"].classList.remove("has-highlight");
        this._shadow.querySelectorAll(".is-highlighted").forEach((element) => {
            element.classList.remove("is-highlighted");
        });
    }

    _defaultFieldMessage(status) {
        if (status === "complete") return "This field is complete.";
        if (status === "invalid") return "This field needs attention.";
        if (status === "incomplete") return "Finish entering this field.";
        return "This field has not been started.";
    }

    _focusField(field) {
        this._setOpen(false);
        const target = field.primary;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        requestAnimationFrame(() => {
            if (target._dom && typeof target._dom.native?.focus === "function") target._dom.native.focus();
            else if (typeof target.focus === "function") target.focus();
        });
    }

    _setOpen(open) {
        this._open = Boolean(open);
        this._refs.popover.hidden = !this._open;
        this._refs.toggle.setAttribute("aria-expanded", String(this._open));
        this._refs.toggle.setAttribute("aria-label", this._open ? "Close form checklist" : "Open form checklist");
        if (this._open) {
            this._refreshFieldStates();
            requestAnimationFrame(() => {
                this._renderFormMap();
                const firstField = this._refs["field-list"].querySelector(".field-item");
                (firstField || this._refs.popover).focus();
            });
        }
    }

    _runAction(action) {
        if (!this._form) return;
        if (action === "undo" && typeof this._form.undo === "function") {
            this._form.undo();
        } else if (action === "revert") {
            if (typeof this._form.fill === "function" && "default" in this._form) {
                this._form.fill(this._form.default);
            }
            if (typeof this._form.history?.reset === "function") this._form.history.reset();
        }
        if (this._hooks[action]) this._hooks[action]();
        this._queueRefresh();
    }

    _syncView() {
        const description = this.getAttribute("description") || "";
        const error = this.getAttribute("error") || "";
        const warning = this.getAttribute("warning") || "";
        const slottedDescription = String(this.textContent || "").trim();
        const message = this.getAttribute("message") || description || slottedDescription;
        this._refs["error-message"].textContent = error;
        this._refs["warning-message"].textContent = warning;
        this._refs["form-message"].textContent = message;
        this._refs.callouts.classList.toggle("has-content", Boolean(error || warning || message));
    }

    get error() {
        return this.getAttribute("error");
    }

    set error(value) {
        if (value == null || value === "") this.removeAttribute("error");
        else this.setAttribute("error", value);
    }

    get warning() {
        return this.getAttribute("warning");
    }

    set warning(value) {
        if (value == null || value === "") this.removeAttribute("warning");
        else this.setAttribute("warning", value);
    }

    get message() {
        return this.getAttribute("message");
    }

    set message(value) {
        if (value == null || value === "") this.removeAttribute("message");
        else this.setAttribute("message", value);
    }
}

customElements.define("form-info", FormInfo);

export default FormInfo;
