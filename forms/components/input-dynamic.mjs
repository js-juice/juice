class InputDynamicComponent extends HTMLElement {
    static get formAssociated() {
        return true;
    }
    static style() {
        return [
            {
                ":host": {
                    display: "block"
                },
                slot: {
                    display: "block"
                },
                "slot[name]": {
                    display: "none"
                },
                "slot[name].show": {
                    display: "block"
                }
            }
        ];
    }

    static html() {
        return `<slot></slot>`;
    }

    constructor() {
        super();
        this.state = [];
        this.stateNodes = [];
        this._shadow = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = this.constructor.style();
        this._shadow.appendChild(style);
        this._shadow.innerHTML = this.constructor.html();
    }

    setState(state, index) {
        this.state[index] = state;
    }

    activateSlot(name) {
        const index = this.state.length;
        const slot = this._shadow.querySelector(name ? "slot[name='" + name + "']" : "slot:not([name])");
        slot.setAttribute("index", index);
        const assignedNodes = slot.assignedNodes();
        const input = assignedNodes[0];
        this.stateNodes[index] = input;
        input.onchange = () => {
            this.setState(input.value, index);
        };
    }

    deactivateSlot(index) {
        const slot = this._shadow.querySelector("slot[index='" + index + "']");
        slot.removeAttribute("index");
        const assignedNodes = slot.assignedNodes();
        const input = assignedNodes[0];
        this.stateNodes[index] = null;
        input.onchange = null;
    }

    connectedCallback() {
        const slots = this._shadow.querySelectorAll("slot");
        for (let i = 0; i < slots.length; i++) {
            this.deactivateSlot(i);
        }

        this.root = this.activateSlot();
    }
}
