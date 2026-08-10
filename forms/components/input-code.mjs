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
        validation: `required|length:${CODE_LENGTH}`
    };

    static get observed() {
        return ["invalid"];
    }

    constructor() {
        super({ _layout: "input:>:default:<:validation" });
        this.inputType = "code";
        this._digits = [];
        this._codeRoot = null;
        this._wasInvalid = false;
    }

    static html() {
        const digits = Array.from({ length: CODE_LENGTH }, (_, index) => `
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
        `).join("");

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
            }
        };
    }

    _afterRender() {
        this._codeRoot = this._dom.default?.querySelector(".code-input") || null;
        this._digits = [...(this._dom.default?.querySelectorAll(".code-digit") || [])];

        this._digits.forEach((digit, index) => {
            digit.addEventListener("focus", () => this._clearError());
            digit.addEventListener("input", () => {
                digit.value = digit.value.replace(/\D/g, "").slice(-1);
                if (digit.value && index < CODE_LENGTH - 1) this._digits[index + 1].focus();
                this._commitDigits("input");
            });
            digit.addEventListener("change", () => this._commitDigits("change"));
            digit.addEventListener("keydown", (event) => this._handleKeydown(event, index));
            digit.addEventListener("paste", (event) => this._handlePaste(event));
        });

        this._syncVisualState();
    }

    _handleKeydown(event, index) {
        if (event.key === "Backspace" && !this._digits[index].value && index > 0) {
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
        const digits = event.clipboardData?.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH) || "";
        if (!digits) return;

        event.preventDefault();
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

        const complete = this._dom.native.value.length === CODE_LENGTH;
        this.dispatchEvent(new CustomEvent(complete ? "filled" : "unfilled", {
            bubbles: true,
            composed: true,
            detail: { value: this._dom.native.value }
        }));
    }

    _clearError() {
        if (this.hasAttribute("invalid")) this.removeAttribute("invalid");
    }

    _syncVisualState() {
        const value = String(this.value || "").replace(/\D/g, "").slice(0, CODE_LENGTH);
        this._digits.forEach((digit, index) => {
            digit.value = value[index] || "";
            digit.disabled = this.disabled;
            digit.readOnly = this.hasAttribute("readonly");
        });

        const invalid = this.hasAttribute("invalid");
        if (invalid && !this._wasInvalid && this._codeRoot?.animate) {
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
        this._wasInvalid = invalid;
    }

    focus(options) {
        const target = this._digits.find((digit) => !digit.value) || this._digits[0];
        target?.focus(options);
    }
}

customElements.define(InputCodeComponent.tag, InputCodeComponent);

export default InputCodeComponent;
