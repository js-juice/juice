import InputComponent from "./input-component.mjs";

class InputPasswordComponent extends InputComponent {
    static tag = "input-password";

    complexityScale = [
        {
            value: 0,
            label: "Weak",
            validation: ["min:6", "max:12", "contains:uppercase", "contains:lowercase", "contains:number"]
        },
        {
            value: 1,
            label: "Medium",
            validation: [
                "min:8",
                "max:16",
                "contains:uppercase",
                "contains:lowercase",
                "contains:number",
                "contains:symbol"
            ]
        },
        {
            value: 2,
            label: "Strong",
            validation: [
                "min:12",
                "max:24",
                "contains:uppercase",
                "contains:lowercase",
                "contains:number",
                "contains:symbol"
            ]
        }
    ];

    static get observed() {
        return ["minchars", "maxchars", "complexity"];
    }

    static get config() {
        return {
            value: { type: "string", default: "" },
            native: { tag: "input", attrs: { type: "password" } },
            format: undefined,
            validation: undefined
        };
    }

    static get styles() {
        return {
            ":host": {
                display: "block"
            },
            ".password-guage": {
                display: "block",
                position: "absolute",
                width: "100%"
            },
            ".chars": {
                display: "flex"
            },
            ".chars b": {
                flex: 1,
                display: "block",
                height: "5px",
                width: "5px",
                borderRadius: "50%"
            }
        };
    }

    static html(instance) {
        return `
            <native></native>
            <div class="password-guage">
            <div class="chars">${"<b></b>".repeat(16)}</div>
            </div>
        `;
    }

    ensurePasswordGuage() {
        if (this.guage) return;
        const guage = document.createElement("div");
        guage.className = "password-guage";
        this.shadowRoot.appendChild(guage);
        this.guage = guage;
    }

    updatePasswordGuage() {}

    validateCurrentValue(){
        const currentValue = this.value;
        const len = currentValue.length;
        const chars = this.shadowRoot.querySelector(".chars");
        const b = chars.querySelectorAll("b");
        if(len > this._complexityProperties.validation.minchars && len < this._complexityProperties.validation.maxchars){
            this._dom.
        }else{
            return false;
        }
    }

    _onNativeChangeEvent() {
        const currentValue = this.value;
        const len = currentValue.length;
        const chars = this.shadowRoot.querySelector(".chars");
        const b = chars.querySelectorAll("b");
        if(len > this._complexityProperties.validation.minchars && len < this._complexityProperties.validation.maxchars){

        }
        //for (let i = 0; i < b.length; i += 1) b[i].style.backgroundColor = i < len ? "black" : "lightgray";
    }

    _onCreate(){

        if(this.hasAttribute("complexity")){
            this._complexity = Number(this.getAttribute("complexity"));
            this._complexityProperties = this.constructor.complexityScale[this._complexity];
            this.validation = this.constructor.complexityScale[this._complexity].validation;
        }

        this.addEventListener("validation:change", ({ detail }) => {
            // Runs after every validation pass.
            console.log(detail.status, detail.messages);
            this.updatePasswordGuage();
        });
    }

    _afterRender() {}

    attributeChangedCallback(name, oldValue, newValue) {
        if (name == "complexity") {
            this._complexity = Number(newValue);
            this._complexityProperties = this.constructor.complexityScale[this._complexity];
            this.validation = this.constructor.complexityScale[this._complexity].validation;
        }
    }
}

export default InputPasswordComponent;

customElements.define(InputPasswordComponent.tag, InputPasswordComponent);
