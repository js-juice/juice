class InputStatus extends HTMLElement {
    static get observedAttributes() {
        return ["size", "state", "icon-only", "color", "colored"];
    }

    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: "open" });
        this._size = 40;
        this._color = "transparent";
        this._styleBuckets = new Map();
        this._colorTimer = null;
        this._graphicTimer = null;

        this._shadow.innerHTML = `
            <style>
                :host {
                    width: 40px;
                    height: 40px;
                    display: inline-block;
                    color: #FFFFFF;
                }
                .wrapper {
                    position: relative;
                    width: 100%;
                    height: 100%;
                }
                .anchor {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 100%;
                    height: 100%;
                    transform: translate(-50%, -50%);
                }
                .circle {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    border-radius: 50%;
                }
                .fill {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    z-index: 10;
                    border: 0;
                    border-radius: 50%;
                    box-sizing: border-box;
                    background-color: transparent;
                }
                .fill-tmp {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    z-index: 30;
                    border: 0;
                    border-radius: 50%;
                    box-sizing: border-box;
                    transition: border-width 0.3s ease-out 0.6s;
                }
                .graphic {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    z-index: 50;
                    display: none;
                }
                .wrapper.ready .graphic {
                    display: block;
                }
                .stroke {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    z-index: 20;
                    border-radius: 50%;
                    box-sizing: border-box;
                }
                .stroke svg {
                    position: relative;
                    width: 100%;
                    height: 100%;
                }
                .stroke svg circle {
                    stroke-miterlimit: 10;
                    fill: none;
                    transition: stroke-dashoffset 0.6s cubic-bezier(0.65, 0, 0.45, 1);
                }
                .graphic svg {
                display: block;
                    position: relative;
                    width: 100%;
                    height: 100%;
                }
                .graphic svg .check,
                .graphic svg .x-1,
                .graphic svg .x-2,
                .graphic svg .warning,
                .graphic svg .info-1,
                .graphic svg .info-2 {
                    stroke-miterlimit: 10;
                    fill: none;
                    stroke: currentColor;
                }
                .graphic svg .check {
                    transition: stroke-dashoffset 0.4s cubic-bezier(0.65, 0, 0.45, 1);
                }
                .graphic svg .x-1 {
                    transition: stroke-dashoffset 0.4s cubic-bezier(0.65, 0, 0.45, 1);
                }
                .graphic svg .x-2 {
                    transition: stroke-dashoffset 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.3s;
                }
                .graphic svg .warning {
                    transition: stroke-dashoffset 0.4s cubic-bezier(0.65, 0, 0.45, 1);
                }
                .graphic svg .info-1 {
                    transition: stroke-dashoffset 0.4s cubic-bezier(0.65, 0, 0.45, 1);
                }
                .graphic svg .info-2 {
                    transition: stroke-dashoffset 0.2s cubic-bezier(0.65, 0, 0.45, 1) 0.4s;
                }

                :host([icon-only]) .fill,
                :host([icon-only]) .fill-tmp,
                :host([icon-only]) .stroke {
                    display: none;
                }

                :host([icon-only]) {
                    color: inherit;
                }
            </style>
            <style data-style="size-style"></style>
            <style data-style="color"></style>
            <style data-style="graphic"></style>
            <div class="wrapper" data-ref="wrapper">
                <div class="anchor">
                    <div class="circle" data-ref="circle">
                        <div class="graphic" data-ref="graphic">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                                <path data-ref="check" class="check" stroke-linecap="round" stroke="currentColor" fill="none" stroke-width="8" d="M28.2 54.4l14.2 14.4 33.4-33.6"/>
                                <path data-ref="x-1" class="x-1" stroke-linecap="round" stroke="currentColor" fill="none" stroke-width="8" d="M 30,30 L 70,70"/>
                                <path data-ref="x-2" class="x-2" stroke-linecap="round" stroke="currentColor" fill="none" stroke-width="8" d="M 70,30 L 30,70"/>
                                <path data-ref="warning" class="warning" stroke-linecap="round" stroke="currentColor" fill="none" stroke-width="2" d="M 50,20 L 75,70 L 25,70 Z"/>
                                <path data-ref="info-1" class="info-1" stroke-linecap="round" stroke="currentColor" fill="none" stroke-width="20" d="M 50,75 L 50,50"/>
                                <path data-ref="info-2" class="info-2" stroke-linecap="round" stroke="currentColor" fill="none" stroke-width="20" d="M 50,30 L 50,29"/>
                            </svg>
                        </div>
                        <div class="stroke" data-ref="stroke-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                                <circle data-ref="stroke" cx="50" cy="50" r="50" fill="none"></circle>
                            </svg>
                        </div>
                        <div class="fill-tmp" data-ref="fill-tmp"></div>
                        <div class="fill" data-ref="fill"></div>
                    </div>
                </div>
            </div>
        `;

        this._refs = {};
        const refEls = this._shadow.querySelectorAll("[data-ref]");
        for (let i = 0; i < refEls.length; i += 1) {
            const key = refEls[i].getAttribute("data-ref");
            this._refs[key] = refEls[i];
        }

        const styles = this._shadow.querySelectorAll("style[data-style]");
        for (let i = 0; i < styles.length; i += 1) {
            this._styleBuckets.set(styles[i].getAttribute("data-style"), styles[i]);
        }
    }

    connectedCallback() {
        if (!this.hasAttribute("size")) this.size = 40;
        this._clearStyle("color");
        this._clearStyle("size-style");
        this._clearStyle("graphic");

        this._refs["fill-tmp"].addEventListener("transitionend", () => {
            this._refs.fill.style.backgroundColor = this._color;
            this._clearStyle("color");
        });

        this._applySize();
        this._applyState(this.state);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === "size") this._applySize();
        if (name === "state" || name === "icon-only" || name === "color" || name === "colored") {
            this._applyState(this.state);
        }
    }

    _setStyle(name, cssText) {
        const styleEl = this._styleBuckets.get(name);
        if (!styleEl) return;
        styleEl.textContent = cssText || "";
    }

    _clearStyle(name) {
        this._setStyle(name, "");
    }

    _applyState(state) {
        if (this._colorTimer) clearTimeout(this._colorTimer);
        if (this._graphicTimer) clearTimeout(this._graphicTimer);

        this._clearStyle("graphic");

        let graphicStyle = "";
        switch (state) {
            case "info":
                this._color = "#007cc7";
                graphicStyle = `
                    .graphic svg .info-1,
                    .graphic svg .info-2{
                        stroke-dashoffset: 0;
                    }
                `;
                break;
            case "warning":
                this._color = "#FFAB1A";
                graphicStyle = `
                    .graphic svg .warning{
                        stroke-dashoffset: 0;
                    }
                `;
                break;
            case "error":
            case "x":
                this._color = "#D41111";
                graphicStyle = `
                    .graphic svg .x-1,
                    .graphic svg .x-2{
                        stroke-dashoffset: 0;
                    }
                `;
                break;
            case "success":
                this._color = "#73C322";
                graphicStyle = `
                    .graphic svg .check{
                        stroke-dashoffset: 0;
                    }
                `;
                break;
            default:
                this._color = "transparent";
                break;
        }

        const colorStyle = `
            .stroke svg circle{
                stroke: ${this._color};
                stroke-dashoffset: 0;
            }
            .fill-tmp{
                border: ${this.size / 2}px solid ${this._color};
            }
            .circle{
                animation: circle-scale .3s ease-in-out .4s both;
            }
        `;

        const applyIconColor = () => {
            if (this.hasAttribute("icon-only")) {
                if (this.hasAttribute("color")) this.style.color = this.getAttribute("color") || "";
                else if (this.hasAttribute("colored")) this.style.color = this._color;
                else this.style.color = "";
            } else {
                this.style.color = "#FFFFFF";
            }
        };

        // Strict sequence:
        // 1) icon animates out (graphic style cleared)
        // 2) color changes only after icon is gone
        // 3) new icon animates in
        const ICON_OUT_MS = 700; // includes delayed x-2 stroke
        const ICON_IN_DELAY_MS = 120;

        this._colorTimer = setTimeout(() => {
            applyIconColor();
            this._setStyle("color", colorStyle);

            this._graphicTimer = setTimeout(() => {
                this._setStyle("graphic", graphicStyle);
            }, ICON_IN_DELAY_MS);
        }, ICON_OUT_MS);
    }

    _applySize() {
        const safeTotalLength = (element, fallback) => {
            if (!element || typeof element.getTotalLength !== "function") return fallback;
            try {
                return element.getTotalLength();
            } catch (_error) {
                return fallback;
            }
        };

        const size = this.size;
        this._refs.wrapper.style.width = `${size}px`;
        this._refs.wrapper.style.height = `${size}px`;

        const stroke = this._refs.stroke;
        const strokeWidth = size / 4;
        const strokeRadius = 50 - strokeWidth / 2;
        stroke.setAttribute("r", `${strokeRadius}`);

        const dashSize = 2 * Math.PI * strokeRadius;
        const checkDashSize = safeTotalLength(this._refs.check, 67.61);
        const xDashSize = safeTotalLength(this._refs["x-1"], 56.57);
        const warningDashSize = safeTotalLength(this._refs.warning, 161.8);
        const infoDashSize = safeTotalLength(this._refs["info-1"], 25);
        const info2DashSize = safeTotalLength(this._refs["info-2"], 1);

        const sizeStyle = `
            :host{
                width:${size}px;
                height:${size}px;
            }
            .graphic svg .info-1{
                stroke-width: 10;
                stroke-dasharray: ${infoDashSize};
                stroke-dashoffset: ${infoDashSize};
            }
            .graphic svg .info-2{
                stroke-width: 10;
                stroke-dasharray: ${info2DashSize};
                stroke-dashoffset: ${info2DashSize};
            }
            .graphic svg .x-1{
                stroke-width: 10;
                stroke-dasharray: ${xDashSize};
                stroke-dashoffset: ${xDashSize};
            }
            .graphic svg .x-2{
                stroke-width: 10;
                stroke-dasharray: ${xDashSize};
                stroke-dashoffset: -${xDashSize};
            }
            .graphic svg .check{
                stroke-width: 10;
                stroke-dasharray: ${checkDashSize};
                stroke-dashoffset: ${checkDashSize};
            }
            .graphic svg .warning{
                stroke-width: 10;
                stroke-dasharray: ${warningDashSize};
                stroke-dashoffset: ${warningDashSize};
            }
            .stroke svg circle{
                stroke-width: ${strokeWidth};
                stroke-dasharray: ${dashSize};
                stroke-dashoffset: ${dashSize};
            }
            @keyframes circle-scale {
                0%, 100% {
                    transform: none;
                }
                50% {
                    transform: scale3d(1.2, 1.2, 1);
                }
            }
        `;

        this._setStyle("size-style", sizeStyle);
        this._refs.wrapper.classList.add("ready");
    }

    get size() {
        const raw = parseInt(this.getAttribute("size") || "40", 10);
        return Number.isFinite(raw) && raw > 0 ? raw : 40;
    }

    set size(value) {
        const n = parseInt(value, 10);
        if (!Number.isFinite(n) || n <= 0) return;
        this.setAttribute("size", `${n}`);
    }

    get state() {
        return (this.getAttribute("state") || "").toLowerCase();
    }

    set state(value) {
        if (!value) {
            this.removeAttribute("state");
            return;
        }
        this.setAttribute("state", String(value).toLowerCase());
    }
}

customElements.define("input-status", InputStatus);

export default InputStatus;
