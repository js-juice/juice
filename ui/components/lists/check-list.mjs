class UICheckItemComponent extends CustomDom.HTMLElement {
    static get observedAttributes() {
        return ["checked"];
    }

    static get style() {
        return {
            ":host": {
                display: "block",
                background: "inherit"
            },
            ".wrapper": {
                display: "block",
                width: "100%"
            },
            ".content": {
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                margin: "0 auto",
                width: "100%"
            },
            ".icon": {
                width: "25px",
                height: "25px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                transition: "border 0.4s ease"
            },
            ".label": {
                lineHeight: "25px",
                padding: "0 10px"
            },
            ":host([checked]) .icon": {
                boxSizing: "border-box"
            }
        };
    }

    static html() {
        return `
        <div class="wrapper">
        <div class="content">
            <div class="icon">
            <field-status ref="field-status" size="25" state="error"></field-status>
            </div>
            <div class="label"><slot></slot></div>
        </div>
        </div>
        `;
    }

    get checked() {
        return this.hasAttribute("checked");
    }

    set checked(value) {
        if (value) {
            this.setAttribute("checked", "");
            this.ref("field-status").state = "success";
        } else {
            this.removeAttribute("checked");
            this.ref("field-status").state = "error";
        }
    }

    onReady() {
        //const bgColor = window.getComputedStyle( this ,null);
        //app.log(bgColor);
        //new Color();
    }

    onAttributeChanged(prop, old, value) {
        switch (prop) {
            case "checked":
                app.log("checked", value);
                break;
        }
    }
}

customElements.define("ui-checkitem", UICheckItemComponent);

class UIChecklistComponent extends CustomDom.HTMLElement {
    static get style() {
        return {
            ":host": {
                display: "block",
                background: "inherit",
                width: "100%"
            },
            ":host([inline]) .wrapper": {
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                margin: "0 auto",
                width: "100%"
            },
            "::slotted(ui-checkitem)": {
                flex: "1 0 auto"
            },
            ".wrapper": {
                display: "block",
                width: "100%"
            }
        };
    }

    static html() {
        return `<div class="wrapper"><slot></slot></div>`;
    }

    onReady() {
        for (let i = 0; i < this.children.length; i++) {}
    }

    onPropertyChanged(prop, old, value) {
        switch (prop) {
            case "type":
                break;
        }
    }
}

customElements.define("ui-checklist", UIChecklistComponent);
