/**
 * A single form-associated verification-code input rendered as isolated character cells.
 *
 * Examples:
 * <input-code name="code" length="6" characters="numeric" format="digits"></input-code>
 * <input-code name="token" length="8" characters="alphanumeric" format="upper"></input-code>
 * <input-code name="mixed" characters="\a\d\d\d\d\d" format="upper"></input-code>
 */

import InputComponent from "./input-component.mjs";

const CHARACTER_TYPES = {
    alpha: /[^a-z]/gi,
    alphanumeric: /[^a-z0-9]/gi,
    numeric: /\D/g
};

class InputCode extends InputComponent {
    static config = {
        value: { type: "string", default: "" },
        native: { tag: "input", attrs: { type: "text", autocomplete: "off" } }
    };

    static get observed() {
        return ["length", "digits", "characters", "type", "invalid"];
    }

    static get styles() {
        return {
            ":host": {
                display: "inline-block",
                width: "fit-content",
                maxWidth: "100%",
                marginBottom: "var(--input-margin-bottom, 1rem)"
            },
            ".input-root, .input-wrapper, .default": {
                width: "fit-content",
                maxWidth: "100%",
                margin: 0,
                padding: 0,
                border: 0,
                background: "transparent",
                boxShadow: "none"
            },
            ".native-wrapper": {
                display: "none"
            },
            ".code-inputs": {
                display: "grid",
                gridTemplateColumns: "repeat(var(--input-code-length), minmax(0, var(--input-code-size, 3.5rem)))",
                gap: "var(--input-code-gap, clamp(0.35rem, 1.2vw, 0.9rem))",
                width: "fit-content",
                maxWidth: "100%"
            },
            ".code-character": {
                boxSizing: "border-box",
                width: "var(--input-code-size, 3.5rem)",
                maxWidth: "100%",
                height: "var(--input-code-height, 3.75rem)",
                minWidth: 0,
                padding: 0,
                border: "var(--input-code-border, 1px solid var(--color-border, #c8c8c8))",
                borderRadius: "var(--input-code-border-radius, 8px)",
                background: "var(--input-code-bgcolor, #fff)",
                color: "var(--input-code-color, #111827)",
                font: "inherit",
                fontSize: "var(--input-code-font-size, 2rem)",
                fontWeight: 800,
                lineHeight: "var(--input-code-height, 3.75rem)",
                textAlign: "center",
                textTransform: "none"
            },
            ".code-character:focus": {
                borderColor: "var(--input-code-focus-color, var(--form-accent-color, #007bc7))",
                outline: "3px solid color-mix(in srgb, var(--input-code-focus-color, var(--form-accent-color, #007bc7)) 25%, transparent)"
            },
            ".code-character:not(:placeholder-shown)": {
                borderColor: "var(--input-code-complete-color, var(--juice-validation-color-valid, #73c322))"
            },
            ":host([invalid]) .code-inputs": {
                animation: "input-code-shake 0.5s ease both"
            },
            ":host([invalid]) .code-character": {
                borderColor: "var(--input-code-invalid-color, var(--juice-validation-color-invalid, #d41111))"
            },
            "@keyframes input-code-shake": {
                "20%, 60%": { transform: "translateX(-5px)" },
                "40%, 80%": { transform: "translateX(5px)" }
            },
            "@media (max-width: 30rem)": {
                ":host": {
                    width: "100%"
                },
                ".code-inputs": {
                    width: "100%",
                    gridTemplateColumns: "repeat(var(--input-code-length), minmax(0, 1fr))"
                },
                ".code-character": {
                    width: "100%",
                    fontSize: "clamp(1.15rem, 7vw, 2rem)"
                }
            }
        };
    }

    constructor() {
        super({ _layout: "input:>:default:native:status:<:validation", ignoreHeight: true });
        this.inputType = "code";
        this.inputs = [];
        this._lastComplete = null;
    }

    get codeLength() {
        if (this.maskTokens.length) return this.maskTokens.length;
        const requested = Number.parseInt(this.getAttribute("length") || this.getAttribute("digits") || "6", 10);
        return Number.isFinite(requested) ? Math.min(12, Math.max(1, requested)) : 6;
    }

    get maskTokens() {
        const specification = this.getAttribute("characters") || "";
        return [...specification.matchAll(/\\([da])/gi)].map((match) => match[1].toLowerCase() === "a" ? "alpha" : "numeric");
    }

    get characterType() {
        const requested = String(this.getAttribute("characters") || this.getAttribute("type") || "numeric").toLowerCase();
        if (["alpha", "letter", "letters"].includes(requested)) return "alpha";
        if (["alphanumeric", "mixed", "text"].includes(requested)) return "alphanumeric";
        return "numeric";
    }

    get characterPattern() {
        return this.maskTokens.length
            ? this.maskTokens
            : Array.from({ length: this.codeLength }, () => this.characterType);
    }

    get complete() {
        return this.inputs.length === this.codeLength && this.inputs.every((input) => input.value.length === 1);
    }

    _createNativeControl() {
        const input = document.createElement("input");
        input.type = "text";
        input.autocomplete = "off";
        input.className = "native";
        input.tabIndex = -1;
        input.setAttribute("aria-hidden", "true");
        return input;
    }

    _renderDefault() {
        this._dom.default?.remove();

        const wrapper = document.createElement("div");
        wrapper.className = "code-inputs";
        wrapper.setAttribute("role", "group");
        wrapper.setAttribute("aria-label", this.getAttribute("label") || "Verification code");
        wrapper.style.setProperty("--input-code-length", String(this.codeLength));

        this.inputs = Array.from({ length: this.codeLength }, (_, index) => {
            const input = document.createElement("input");
            input.className = "code-character";
            input.type = "text";
            input.maxLength = 1;
            input.placeholder = " ";
            input.autocomplete = index === 0 ? "one-time-code" : "off";
            input.inputMode = this.characterPattern[index] === "numeric" ? "numeric" : "text";
            input.setAttribute("aria-label", `Character ${index + 1} of ${this.codeLength}`);

            input.addEventListener("focus", () => this.removeAttribute("invalid"));
            input.addEventListener("input", () => this._handleCharacterInput(input, index));
            input.addEventListener("change", () => this._commit("change"));
            input.addEventListener("keydown", (event) => this._handleKeyDown(event, index));
            input.addEventListener("paste", (event) => this._handlePaste(event, index));

            wrapper.appendChild(input);
            return input;
        });

        this._dom.default = wrapper;
        this._syncVisualState();
    }

    _sanitize(value, startIndex = 0) {
        const pattern = this.characterPattern;
        let position = startIndex;
        let result = "";

        for (const character of String(value || "")) {
            const expected = pattern[position];
            if (!expected) break;
            if (!character.replace(CHARACTER_TYPES[expected], "")) continue;
            result += character;
            position += 1;
        }

        return result;
    }

    _rawValue() {
        let value = "";
        for (const input of this.inputs) {
            if (!input.value) break;
            value += input.value;
        }
        return value;
    }

    _handleCharacterInput(input, index) {
        const entered = this._sanitize(input.value, index);
        if (entered.length > 1) {
            this._fillFrom(entered, index);
            return;
        }

        input.value = entered.slice(-1);
        this._commit("input");
        if (input.value && index < this.inputs.length - 1) this.inputs[index + 1].focus();
    }

    _handleKeyDown(event, index) {
        if (["Backspace", "Delete"].includes(event.key)) {
            event.preventDefault();
            if (this.inputs[index].value) {
                this.inputs[index].value = "";
            } else if (index > 0) {
                this.inputs[index - 1].value = "";
                this.inputs[index - 1].focus();
            }
            this._commit("input");
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            this._commit("change");
            if (this.complete) this.form?.requestSubmit();
            return;
        }
        if (event.key === "ArrowLeft" && index > 0) {
            event.preventDefault();
            this.inputs[index - 1].focus();
        }
        if (event.key === "ArrowRight" && index < this.inputs.length - 1) {
            event.preventDefault();
            this.inputs[index + 1].focus();
        }
    }

    _handlePaste(event, index) {
        const value = this._sanitize(event.clipboardData?.getData("text") || "", index);
        if (!value) return;
        event.preventDefault();
        this._fillFrom(value, index);
    }

    _fillFrom(value, startIndex = 0) {
        const characters = this._sanitize(value, startIndex).split("");
        characters.forEach((character, offset) => {
            if (this.inputs[startIndex + offset]) this.inputs[startIndex + offset].value = character;
        });
        const focusIndex = Math.min(startIndex + characters.length, this.inputs.length) - 1;
        this.inputs[Math.max(0, focusIndex)]?.focus();
        this._commit("input");
    }

    _commit(eventName = "input") {
        if (!this._dom.native) return;
        this._dom.native.value = this._sanitize(this._rawValue());
        this._dom.native.dispatchEvent(new Event(eventName, { bubbles: true, composed: true }));
    }

    _syncVisualState() {
        if (!this._dom.native || !this.inputs.length) return;
        const characters = this._sanitize(this._dom.native.value).split("");
        this.inputs.forEach((input, index) => {
            const next = characters[index] || "";
            if (input.value !== next) input.value = next;
            input.disabled = this.disabled;
            input.setAttribute("aria-invalid", String(this.hasAttribute("invalid")));
        });

        const complete = this.complete;
        if (complete === this._lastComplete) return;
        this._lastComplete = complete;
        this.dispatchEvent(new CustomEvent(complete ? "filled" : "unfilled", {
            bubbles: true,
            composed: true,
            detail: { complete, length: this.codeLength, value: this.value }
        }));
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        if (oldValue === newValue || !this._hasCreated) return;
        if (["length", "digits", "characters", "type"].includes(name)) {
            this._renderDefault();
            this._ensureDefaultMountedInInputContainer();
        }
        if (name === "invalid") this._syncVisualState();
    }

    focus(options) {
        this.inputs[0]?.focus(options);
    }
}

customElements.define("input-code", InputCode);

export default InputCode;
