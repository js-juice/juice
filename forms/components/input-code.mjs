import InputComponent from "./input-component.mjs";

const CODE_LENGTH = 6;

class InputCodeComponent extends InputComponent {
    static tag = "input-code";

    static config = {
        native: {
            tag: "input",
            attrs: {
                type: "hidden"
            }
        },
        status: {
            tag: "input-status",
            iconOnly: false,
            cover: false,
            attrs: {
                size: 40,
                color: "currentColor",
                style: "display:block"
            }
        },
        autoSubmit: false,
        validation: false
    };

    static get observed() {
        return ["auto-submit"];
    }

    constructor() {
        super({ _layout: "input:>:default:status:<:validation" });
        this.inputType = "code";
        this._digits = [];
        this._codeRoot = null;
        this._autoSubmitting = false;
        this.addEventListener("validation:change", () => {
            if (this._autoSubmitting) this._showLoadingStatus();
        });
    }

    get autoSubmit() {
        if (this.hasAttribute("auto-submit")) {
            return this.getAttribute("auto-submit") !== "false";
        }

        return this.constructor.config.autoSubmit === true;
    }

    static html() {
        const digits = Array.from(
            { length: CODE_LENGTH },
            (_, index) => `
            <input
                class="code-digit"
                part="digit"
                type="text"
                aria-label="Digit ${index + 1} of ${CODE_LENGTH}"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="1"
                placeholder=" "
                autocomplete="${index === 0 ? "one-time-code" : "off"}"
            >
        `
        ).join("");

        return `
            <div class="code-input" part="code-input">${digits}</div>
            <native></native>
        `;
    }

    static get styles() {
        return {
            ":host": {
                display: "block",
                width: "fit-content",
                maxWidth: "100%",
                marginBottom: 0
            },
            ".input-wrapper": {
                width: "auto",
                overflow: "visible",
                border: 0,
                background: "transparent"
            },
            ".html-view": {
                width: "auto"
            },
            ".code-input": {
                display: "flex",
                flexWrap: "nowrap",
                alignItems: "center",
                gap: "clamp(0.35rem, 1.2vw, 0.9rem)"
            },
            ".code-digit": {
                flex: "0 0 clamp(2.7rem, 7vw, 3.5rem)",
                width: "clamp(2.7rem, 7vw, 3.5rem)",
                height: "3.75rem",
                padding: 0,
                border: "1px solid var(--admin-border, #c8c8c8)",
                borderRadius: "8px",
                background: "#fff",
                color: "#111827",
                font: "inherit",
                fontSize: "2rem",
                fontWeight: 800,
                lineHeight: "3.75rem",
                textAlign: "center",
                boxSizing: "border-box"
            },
            ".code-digit:focus": {
                borderColor: "#007bc7",
                outline: "3px solid rgb(0 123 199 / 25%)"
            },
            ".code-digit:not(:placeholder-shown)": {
                borderColor: "#73c322"
            },
            ":host([invalid]) .code-digit": {
                borderColor: "#d41111"
            },
            ".code-digit:disabled": {
                cursor: "not-allowed",
                opacity: 0.65
            },
            "input.native[type='hidden']": {
                display: "none !important"
            },
            ".status-wrapper": {
                display: "flex",
                marginLeft: "1rem !important",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.5rem 1rem"
            },
            "input-status": {
                position: "relative !important",
                height: "100% !important",
                width: "auto !important",
                aspectRatio: "1 !important",
                top: "auto !important",
                left: "auto !important",
                right: "auto !important",
                bottom: "auto !important",
                margin: "0 auto !important"
            }
        };
    }

    _afterRender() {
        this._codeRoot = this._dom.default?.querySelector(".code-input") || null;
        this._digits = [...(this._dom.default?.querySelectorAll(".code-digit") || [])];

        this._digits.forEach((digit, index) => {
            digit.addEventListener("focus", () => this._clearError());
            digit.addEventListener("input", () => {
                if (digit.value && !/^\d$/.test(digit.value)) {
                    digit.value = "";
                    this._shake();
                    this._commitDigits("input");
                    return;
                }
                if (digit.value && index < CODE_LENGTH - 1) this._digits[index + 1].focus();
                this._commitDigits("input");
            });
            digit.addEventListener("change", () => this._commitDigits("change"));
            digit.addEventListener("keydown", (event) => this._handleKeydown(event, index));
            digit.addEventListener("paste", (event) => this._handlePaste(event));
        });

        this._syncVisualState();
        if (this.hasAttribute("invalid")) this._shake();
    }

    _handleKeydown(event, index) {
        const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
        if (!hasModifier && event.key.length === 1 && !/^\d$/.test(event.key)) {
            event.preventDefault();
            this._shake();
        } else if (event.key === "Backspace" && !this._digits[index].value && index > 0) {
            this._digits[index - 1].focus();
        } else if (event.key === "ArrowLeft" && index > 0) {
            event.preventDefault();
            this._digits[index - 1].focus();
        } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
            event.preventDefault();
            this._digits[index + 1].focus();
        }
    }

    _handlePaste(event) {
        const digits = event.clipboardData?.getData("text").trim() || "";
        if (!digits) return;

        event.preventDefault();
        if (!new RegExp(`^\\d{1,${CODE_LENGTH}}$`).test(digits)) {
            this._shake();
            return;
        }
        this._digits.forEach((digit, index) => {
            digit.value = digits[index] || "";
        });
        this._digits[Math.min(digits.length, CODE_LENGTH) - 1].focus();
        this._commitDigits("input");
    }

    _commitDigits(eventType) {
        if (!this._dom.native) return;

        this._clearError();
        this._dom.native.value = this._digits.map((digit) => digit.value).join("");
        this._dom.native.dispatchEvent(new Event(eventType, { bubbles: true }));

        const complete = new RegExp(`^\\d{${CODE_LENGTH}}$`).test(this._dom.native.value);
        this.dispatchEvent(
            new CustomEvent(complete ? "filled" : "unfilled", {
                bubbles: true,
                composed: true,
                detail: { value: this._dom.native.value }
            })
        );

        if (eventType === "input" && complete && this.autoSubmit) {
            this._submitCompletedCode();
        }
    }

    _queueValidation() {
        const value = this._digits.length
            ? this._digits.map((digit) => digit.value).join("")
            : String(this._dom.native?.value || "");

        if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(value)) return;
        super._queueValidation();
    }

    _submitCompletedCode() {
        if (this._autoSubmitting) return;

        const form = this.closest("form");
        if (!(form instanceof HTMLFormElement)) return;

        this._autoSubmitting = true;
        this._setValidationState(true, [], []);
        this.setSubmissionState("loading");
        form.requestSubmit();
    }

    setSubmissionState(state) {
        const pending = state === "loading";
        this._autoSubmitting = pending;
        this._digits.forEach((digit) => {
            digit.disabled = pending || this.disabled;
        });
        this._dom.status?.removeAttribute("hidden");
        this._dom.status?.setAttribute("state", state);
        if (this._wireframe.status) this._wireframe.status.hidden = false;

        if (state === "error") {
            this._shake();
            this.focus();
        }
    }

    _showLoadingStatus() {
        this.setSubmissionState("loading");
    }

    _clearError() {
        if (this.hasAttribute("invalid")) this.removeAttribute("invalid");
    }

    _shake() {
        if (!this._codeRoot?.animate) return;
        this._codeRoot.animate(
            [
                { transform: "translateX(0)" },
                { transform: "translateX(-5px)" },
                { transform: "translateX(5px)" },
                { transform: "translateX(-5px)" },
                { transform: "translateX(5px)" },
                { transform: "translateX(0)" }
            ],
            { duration: 500, easing: "ease" }
        );
    }

    _syncVisualState() {
        const value = String(this.value || "")
            .replace(/\D/g, "")
            .slice(0, CODE_LENGTH);
        this._digits.forEach((digit, index) => {
            digit.value = value[index] || "";
            digit.disabled = this.disabled;
            digit.readOnly = this.hasAttribute("readonly");
        });
    }

    focus(options) {
        const target = this._digits.find((digit) => !digit.value) || this._digits[0];
        target?.focus(options);
    }
}

customElements.define(InputCodeComponent.tag, InputCodeComponent);

export default InputCodeComponent;
