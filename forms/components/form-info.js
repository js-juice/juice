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
        this._managedMessages = {
            error: "",
            warning: "",
            message: ""
        };
        this._fieldValidation = new Map();
        this._validationTarget = null;
        this._onValidationChange = this._onValidationChange.bind(this);

        this._shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-top: 1rem;
                }

                .form-info {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 1rem;
                    padding-bottom: 1rem;
                }

                .form-message {
                    width: 100%;
                    position: relative;
                }

                .description {
                    width: 75%;
                }

                .messages {
                    display: none;
                    flex-direction: row;
                    align-items: flex-end;
                    gap: 0.75rem;
                    padding-top: 0.5rem;
                }

                .form-info.has-message .messages {
                    display: flex;
                }

                .icon-wrap {
                    width: 20px;
                    height: 20px;
                    flex: 0 0 auto;
                }

                .message {
                    width: 100%;
                }

                .message > div:empty {
                    display: none;
                }

                .error-message {
                    color: #D41111;
                }

                .warning-message {
                    color: #FFAB1A;
                }

                .field-errors {
                    display: none;
                    margin-top: 0.5rem;
                    padding-left: 1.75rem;
                }

                .form-info.has-field-errors .field-errors {
                    display: block;
                }

                .field-error-list {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }

                .field-error-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.35rem;
                    color: #3a3a3a;
                    line-height: 1.2;
                    font-size: 0.9em;
                }

                .field-error-item .field-icon {
                    flex: 0 0 auto;
                    margin-top: 0.05rem;
                }

                .field-error-item .field-name {
                    font-weight: 700;
                    margin-right: 0.3rem;
                }

                .field-error-item.invalid .field-name {
                    color: #D41111;
                }

                .field-error-item.incomplete .field-name {
                    color: #B26A00;
                }

                .actions {
                    display: flex;
                    flex-direction: row;
                    align-items: flex-end;
                    gap: 0.75rem;
                    white-space: nowrap;
                }

                .action {
                    display: none;
                    align-items: center;
                    gap: 0.4rem;
                    color: #b9b9b9;
                    cursor: pointer;
                    background: none;
                    border: 0;
                    padding: 0;
                    font: inherit;
                }

                .form-info.has-history .action {
                    display: inline-flex;
                }

                .action .btn-icon {
                    width: 20px;
                    height: 20px;
                }

                .action .btn-label {
                    text-transform: uppercase;
                    font-weight: 700;
                    line-height: 20px;
                }

                .action.undo:hover {
                    color: #FFAB1A;
                }

                .action.revert:hover {
                    color: #D41111;
                }
            </style>
            <div class="form-info" data-ref="wrapper">
                <div class="form-message">
                    <div class="description" data-ref="description"><slot></slot></div>
                    <div class="messages">
                        <div class="icon-wrap">
                            <input-status data-ref="status-icon" size="20"></input-status>
                        </div>
                        <div class="message">
                            <div class="form-message-text" data-ref="form-message"></div>
                            <div class="error-message" data-ref="error-message"></div>
                            <div class="warning-message" data-ref="warning-message"></div>
                        </div>
                    </div>
                    <div class="field-errors" data-ref="field-errors">
                        <ul class="field-error-list" data-ref="field-error-list"></ul>
                    </div>
                </div>
                <div class="actions">
                    <button type="button" class="action undo" data-action="undo">
                        <span class="btn-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
                                <g fill="currentColor">
                                    <path d="M20.45,15.28V9.6c0-1.37-1.66-2.06-2.63-1.09L7.39,18.94c-0.6,0.6-0.6,1.58,0,2.18l10.43,10.43 c0.97,0.97,2.63,0.28,2.63-1.09v-5.01c6.07,1.55,10.77,7.2,11.62,14.2c0.16,1.32,1.33,2.29,2.67,2.29h4.63 c1.62,0,2.85-1.41,2.68-3.02C40.77,26.69,31.8,16.91,20.45,15.28z"></path>
                                </g>
                            </svg>
                        </span>
                        <span class="btn-label">undo</span>
                    </button>
                    <button type="button" class="action revert" data-action="revert">
                        <span class="btn-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
                                <g fill="currentColor">
                                    <path d="M27.67,6.98c-0.12-0.02-0.24-0.02-0.36-0.02V2.12c0-1.07-1.3-1.61-2.05-0.85L17.12,9.4c-0.47,0.47-0.47,1.23,0,1.7 l8.13,8.13c0.76,0.76,2.05,0.22,2.05-0.85v-4.32c4.42,1.17,7.73,5.62,7.73,10.93c0,6.2-4.5,11.25-10.03,11.25 c-4.96,0-9.09-4.05-9.89-9.35c-0.17-1.1-1.15-1.89-2.27-1.89h-2.4c-1.4,0-2.48,1.24-2.29,2.62c1.19,8.82,8.3,15.62,16.86,15.62 c9.39,0,17.03-8.19,17.03-18.25C42.03,15.91,35.8,8.35,27.67,6.98z"></path>
                                </g>
                            </svg>
                        </span>
                        <span class="btn-label">revert</span>
                    </button>
                </div>
            </div>
        `;

        this._refs = {};
        const allRefs = this._shadow.querySelectorAll("[data-ref]");
        for (let i = 0; i < allRefs.length; i += 1) {
            const key = allRefs[i].getAttribute("data-ref");
            this._refs[key] = allRefs[i];
        }
    }

    connectedCallback() {
        const actionButtons = this._shadow.querySelectorAll("[data-action]");
        for (let i = 0; i < actionButtons.length; i += 1) {
            actionButtons[i].addEventListener("click", () => {
                this._runAction(actionButtons[i].getAttribute("data-action"));
            });
        }
        this._tryAutoBindValidation();
        this._syncView();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === "description") {
            const desc = this._refs.description;
            if (newValue != null && newValue !== "") {
                desc.textContent = newValue;
            } else {
                desc.innerHTML = "<slot></slot>";
            }
        }
        if (name === "for") {
            this._tryAutoBindValidation(true);
        }
        this._syncView();
    }

    hook(action, fn) {
        if (typeof fn === "function") {
            this._hooks[action] = fn;
        }
    }

    bindForm(form) {
        this._form = form;
        const history = form && form.history;
        if (history && !this._historyBound && typeof history.on === "function") {
            history.on("notEmpty", () => {
                this._refs.wrapper.classList.add("has-history");
            });
            history.on("empty", () => {
                this._refs.wrapper.classList.remove("has-history");
            });
            this._historyBound = true;
        }

        const validationSource = this._resolveValidationSource(form);
        this._bindValidationSource(validationSource);
    }

    _resolveValidationSource(source) {
        if (!source) return null;
        if (source instanceof HTMLFormElement) return source;

        if (
            source instanceof HTMLElement &&
            source.tagName.toLowerCase() === "juice-forms" &&
            source.form instanceof HTMLFormElement
        ) {
            return source.form;
        }

        if (source.form instanceof HTMLFormElement) {
            return source.form;
        }

        return null;
    }

    _tryAutoBindValidation(force = false) {
        if (this._validationTarget && !force) return;
        let target = null;
        const forId = (this.getAttribute("for") || "").trim();

        if (forId) {
            const byId = document.getElementById(forId);
            target = this._resolveValidationSource(byId) || null;
        }

        if (!target) {
            const closestHost = this.closest("juice-forms, form");
            target = this._resolveValidationSource(closestHost) || null;
        }

        this._bindValidationSource(target);
        if (!this._form && target) {
            this._form = target;
        }
    }

    _bindValidationSource(target) {
        if (this._validationTarget === target) return;

        if (this._validationTarget) {
            this._validationTarget.removeEventListener("validation:change", this._onValidationChange);
        }

        this._validationTarget = target;
        this._fieldValidation.clear();

        if (this._validationTarget) {
            this._validationTarget.addEventListener("validation:change", this._onValidationChange);
            this._primeValidationState();
        } else {
            this._syncFieldErrorList();
        }
    }

    _primeValidationState() {
        if (!this._validationTarget) return;
        const fields = this._validationTarget.querySelectorAll(
            "input-text,input-textarea,input-select,input-checkbox,input-radio,[validation],[validate]"
        );

        for (let i = 0; i < fields.length; i += 1) {
            const field = fields[i];
            const messages = Array.isArray(field._validationMessages)
                ? field._validationMessages
                : [];
            const status = field.getAttribute("validation-state") || "none";
            this._setFieldValidationState(field, {
                status,
                messages,
                message: messages[0] || ""
            });
        }

        this._syncFieldErrorList();
    }

    _normalizeState(state) {
        const normalized = String(state || "").toLowerCase();
        if (normalized === "invalid") return "invalid";
        if (normalized === "incomplete") return "incomplete";
        if (normalized === "valid") return "valid";
        return "none";
    }

    _displayNameForField(field, property) {
        const fallback = property || "Field";
        if (!field || typeof field.getAttribute !== "function") return fallback;
        return field.getAttribute("label") || field.getAttribute("name") || fallback;
    }

    _setFieldValidationState(field, detail = {}) {
        const property = String(
            detail.property ||
            (field && typeof field.getAttribute === "function" ? field.getAttribute("name") : "") ||
            ""
        ).trim();

        if (!property) return;

        const status = this._normalizeState(detail.status);
        const messages = Array.isArray(detail.messages)
            ? detail.messages.filter(Boolean)
            : [];
        const message = detail.message || messages[0] || "";

        if ((status === "invalid" || status === "incomplete") && message) {
            this._fieldValidation.set(property, {
                property,
                label: this._displayNameForField(field, property),
                message,
                status,
                color: detail.color || ""
            });
        } else {
            this._fieldValidation.delete(property);
        }
    }

    _onValidationChange(event) {
        const field = event.target;
        const detail = event.detail || {};
        this._setFieldValidationState(field, detail);
        this._syncFieldErrorList();
    }

    _syncFieldErrorList() {
        const list = this._refs["field-error-list"];
        if (!list) return;

        list.replaceChildren();
        const entries = Array.from(this._fieldValidation.values()).sort((a, b) =>
            a.label.localeCompare(b.label)
        );

        for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i];
            const item = document.createElement("li");
            item.className = `field-error-item ${entry.status === "incomplete" ? "incomplete" : "invalid"}`;

            const icon = document.createElement("input-status");
            icon.className = "field-icon";
            icon.setAttribute("size", "14");
            icon.setAttribute("icon-only", "");
            icon.setAttribute("colored", "");
            icon.setAttribute("state", entry.status === "incomplete" ? "warning" : "error");
            if (entry.color) {
                icon.setAttribute("color", entry.color);
            }

            const text = document.createElement("div");
            const name = document.createElement("span");
            name.className = "field-name";
            name.textContent = entry.label;

            const message = document.createElement("span");
            message.className = "field-message";
            message.textContent = entry.message;

            text.append(name, message);
            item.append(icon, text);
            list.appendChild(item);
        }

        const invalidCount = entries.filter((entry) => entry.status === "invalid").length;
        const incompleteCount = entries.filter((entry) => entry.status === "incomplete").length;
        const invalidPlural = invalidCount === 1 ? "field" : "fields";
        const incompletePlural = incompleteCount === 1 ? "field" : "fields";

        this._managedMessages.error = invalidCount > 0
            ? `${invalidCount} ${invalidPlural} need attention.`
            : "";
        this._managedMessages.warning = invalidCount === 0 && incompleteCount > 0
            ? `${incompleteCount} ${incompletePlural} are still incomplete.`
            : "";
        this._managedMessages.message = "";

        this._syncView();
    }

    _runAction(action) {
        if (!this._form) return;

        if (action === "undo" && typeof this._form.undo === "function") {
            this._form.undo();
        } else if (action === "revert") {
            if (typeof this._form.fill === "function" && "default" in this._form) {
                this._form.fill(this._form.default);
            }
            if (
                this._form.history &&
                typeof this._form.history.reset === "function"
            ) {
                this._form.history.reset();
            }
        }

        if (this._hooks[action]) {
            this._hooks[action]();
        }
    }

    _syncView() {
        const error = this.getAttribute("error") || this._managedMessages.error;
        const warning = this.getAttribute("warning") || this._managedMessages.warning;
        const message = this.getAttribute("message") || this._managedMessages.message;

        this._refs["error-message"].textContent = error || "";
        this._refs["warning-message"].textContent = warning || "";
        this._refs["form-message"].textContent = message || "";

        const hasFieldErrors = this._fieldValidation.size > 0;
        this._refs.wrapper.classList.toggle("has-error", !!error);
        this._refs.wrapper.classList.toggle("has-warning", !!warning);
        this._refs.wrapper.classList.toggle("has-info", !!message);
        this._refs.wrapper.classList.toggle("has-message", !!(error || warning || message));
        this._refs.wrapper.classList.toggle("has-field-errors", hasFieldErrors);

        if (error) {
            this._refs["status-icon"].setAttribute("state", "error");
        } else if (warning) {
            this._refs["status-icon"].setAttribute("state", "warning");
        } else if (message) {
            this._refs["status-icon"].setAttribute("state", "info");
        } else {
            this._refs["status-icon"].setAttribute("state", "idle");
        }
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
