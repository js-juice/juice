import Component from "../component.mjs";
import Template from "../../core/Template/Template.mjs";
class CardComponent extends Component.HTMLElement {
    static tag = "ui-card";
    static config = {
        properties: {
            width: { type: "int", default: 250, linked: true },
            height: { type: "int", default: "auto", linked: true },
            draggable: { type: "exists", default: false, linked: true },
            container: { type: "string" },
            bounds: { type: "array[number]", default: [0, 0, 0, 0], linked: true },
            title: { type: "string", default: null, linked: true },
            description: { type: "string", default: null, linked: true },
            color: { type: "string", default: "#000" }
        }
    };

    static get observed() {
        return { all: ["width", "height", "draggable", "title", "color", "bounds"] };
    }

    static get style() {
        return [
            {
                ":host": {
                    position: "relative",
                    display: "block",
                    width: "100%"
                },
                ":host([draggable])": {
                    position: "fixed",
                    width: "auto",
                    zIndex: 1000,
                    left: "1rem",
                    top: "1rem"
                },
                ":host([collapsed]) main": {
                    display: "none"
                },
                ":host([draggable]) header": {
                    cursor: "move"
                },
                "#html": {
                    borderTopRightRadius: "0.5rem",
                    backgroundColor: "var(--color, #FFF)",
                    width: "var(--card-width, 100%)",
                    height: "var(--card-height, auto)",
                    maxHeight: "calc(100vh - 2rem)",
                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid #d2d2d2"
                },
                ".card-body": {
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    maxHeight: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    minHeight: "100px",
                    padding: "0.5rem"
                },
                ".card-body main": {
                    padding: "1rem 0",
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden"
                },
                header: {
                    flex: "0 0 auto",
                    borderBottom: "1px solid #d2d2d2"
                },
                'header h1, header slot[name="title"]': {
                    fontSize: "1.15rem",
                    fontWeight: "700",
                    margin: "0",
                    padding: "0.5rem",
                    color: "#000"
                },
                "header h1:empty": {
                    display: "none"
                },
                "header slot:empty": {
                    display: "none"
                },
                'header p, header slot[name="description"]': {
                    fontSize: "1rem",
                    fontWeight: "normal",
                    margin: "0",
                    padding: "0.5rem",
                    color: "#000"
                },
                "header p:empty": {
                    display: "none"
                },
                "#drag-icon": {
                    position: "relative",
                    float: "right",
                    width: "24px",
                    height: "24px",
                    marginTop: "1px",
                    marginLeft: "1px"
                },
                "#drag-icon .vert": {
                    position: "absolute",
                    left: "50%",
                    top: "5px",
                    width: "3px",
                    height: "calc(100% - 10px)",
                    backgroundColor: "#d2d2d2",
                    transform: "translateX(-50%)"
                },
                "#drag-icon .horz": {
                    position: "absolute",
                    top: "50%",
                    left: "5px",
                    width: "calc(100% - 10px)",
                    height: "3px",
                    backgroundColor: "#d2d2d2",
                    transform: "translateY(-50%)"
                },
                ":host(.dragging)": {
                    cursor: "move"
                },
                ":host(.dragging) #drag-icon .vert": {
                    backgroundColor: "#2356ad"
                },
                ":host(.dragging) #drag-icon .horz": {
                    backgroundColor: "#2356ad"
                },
                "#drag-icon .vert:before": {
                    content: '""',
                    position: "absolute",
                    left: "50%",
                    top: "-5px",
                    display: "block",
                    width: "8px",
                    height: "5px",
                    clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
                    background: "inherit",
                    transform: "translateX(-50%)"
                },
                "#drag-icon .vert:after": {
                    content: '""',
                    position: "absolute",
                    left: "50%",
                    bottom: "-5px",
                    display: "block",
                    width: "8px",
                    height: "5px",
                    clipPath: "polygon( 0 0, 100% 0, 50% 100%)",
                    background: "inherit",
                    transform: "translateX(-50%)"
                },
                "#drag-icon .horz:before": {
                    content: '""',
                    position: "absolute",
                    left: "-5px",
                    top: "50%",
                    display: "block",
                    width: "5px",
                    height: "8px",
                    clipPath: "polygon(100% 0, 100% 100%, 0 50%)",
                    background: "inherit",
                    transform: "translateY(-50%)"
                },
                "#drag-icon .horz:after": {
                    content: '""',
                    position: "absolute",
                    right: "-5px",
                    top: "50%",
                    display: "block",
                    width: "5px",
                    height: "8px",
                    clipPath: "polygon(0 0, 0 100%, 100% 50%)",
                    background: "inherit",
                    transform: "translateY(-50%)"
                },
                ".visibility-icon": {
                    position: "relative",
                    width: "24px",
                    height: "24px",
                    display: "block",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "pointer",
                    border: "2px solid #333",
                    borderRadius: "3px"
                },
                ".visibility-icon .box": {
                    width: "20px",
                    height: "calc(100% - 6px)",
                    left: 0,
                    position: "absolute",
                    borderTop: "1px solid #d2d2d2",
                    borderBottom: "1px solid #d2d2d2",
                    top: "3px",
                    bottom: "3px"
                },
                ".visibility-icon .box .arrow": {
                    position: "absolute",
                    height: "5px",
                    width: "10px",
                    left: "50%",

                    background: "#333",
                    transform: "translateX(-50%)"
                },
                ":host([collapsed]) .visibility-icon .box": {
                    borderBottomRightRadius: "0",
                    borderBottomLeftRadius: "0",
                    outline: "0",
                    borderBottom: "0",
                    top: "50%",
                    bottom: "0px"
                },

                ".arrow.up": {
                    clipPath: "polygon(0 100%, 25% 100%, 50% 50%, 75% 100%, 100% 100%, 50% 0, 0 100%)"
                },

                ".arrow.down": {
                    clipPath: "polygon(0 0, 25% 0, 50% 50%, 75% 0%, 100% 0, 50% 100%, 0 0)"
                },
                ":host(:not([collapsed])) .arrow.up": {
                    bottom: "0px"
                },
                ":host(:not([collapsed])) .arrow.down": {
                    top: "0px"
                },
                ":host([collapsed])  .arrow.up": {
                    bottom: "calc(100% + 2px)"
                },
                ":host([collapsed])  .arrow.down": {
                    top: "2px"
                },
                ".card-controls": {
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    margin: "5px"
                },
                ".card-controls > *": {
                    flex: "0 0 auto"
                },
                main: {
                    flex: "0 1 auto"
                },
                footer: {
                    flex: "0 0 auto"
                },
                ".hambuger": {
                    float: "right",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "center",
                    position: "relative",
                    width: "25px",
                    height: "25px",
                    top: "5px",
                    right: "5px"
                },
                ".hambuger:before": {
                    content: '""',
                    display: "block",
                    width: "100%",
                    height: "5px",
                    background: "#d2d2d2",
                    borderRadius: "2.5px"
                },
                ".hambuger:after": {
                    content: '""',
                    display: "block",
                    width: "100%",
                    height: "5px",
                    background: "#d2d2d2",
                    borderRadius: "2.5px"
                },
                ".hambuger > div": {
                    display: "block",
                    width: "100%",
                    height: "5px",
                    background: "#d2d2d2",
                    borderRadius: "2.5px"
                }
            }
        ];
    }

    static html() {
        return `<div class="card-body collapsed">
            <header id="header">
                <div class="hambuger">
                <div></div>
                </div>
                <h1>${this.title ? `${this.title}` : ""}</h1>
                <slot name="title"></slot>
                <p>${this.description ? this.description : ""}</p>
                <slot name="description"></slot>
            </header>
            <main id="contents">
                <slot></slot>
            </main>
            <footer>
              <div class="card-controls">

                <div id="toggle-visibility" event="click::toggleVisibility" class="visibility-icon show">
                    <div class="box">
                        <div class="arrow up"></div>
                        <div class="arrow down"></div>
                    </div>
                </div>
                <div id="drag-icon"><div class="vert"></div><div class="horz"></div></div>

            </div>
                <slot name="footer"></slot>
            </footer>
        </div>`;
    }

    loadTemplate(tpl, context, options = {}) {
        const template = new Template(options);
        return template.mount(this.ref("html"), tpl, context);
    }

    getBounds() {
        const card = this;
        const bounds = { left: this.bounds[0], top: this.bounds[1], right: this.bounds[2], bottom: this.bounds[3] };

        function resolveContainer() {
            if (!card.hasAttribute("container")) return null;

            const id = card.getAttribute("container")?.trim();
            if (!id) return card.parentElement;
            if (id.toLowerCase() === "window") return window;

            const byId = document.getElementById(id);
            if (byId) return byId;

            try {
                return document.querySelector(id);
            } catch {
                return null;
            }
        }

        function getContainerBounds(container) {
            if (container === window) {
                return {
                    left: 0 + bounds.left,
                    top: 0 + bounds.top,
                    right: window.innerWidth - bounds.right,
                    bottom: window.innerHeight - bounds.bottom
                };
            }

            return container.getBoundingClientRect();
        }

        const container = resolveContainer();

        if (container) {
            const startBounds = getContainerBounds(container);

            return {
                left: startBounds.left + bounds.left,
                top: startBounds.top + bounds.top,
                right: startBounds.right - bounds.right,
                bottom: startBounds.bottom - bounds.bottom,
                width: startBounds.right - startBounds.left,
                height: startBounds.bottom - startBounds.top
            };
        }

        return bounds;
    }

    toggleVisibility(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.hasAttribute("collapsed")) {
            this.removeAttribute("collapsed");
        } else {
            this.setAttribute("collapsed", "");
        }
    }

    constructor() {
        super();
    }

    _setupDraggable() {
        if (this._cardDrag) return;

        const card = this;
        const header = this.ref("header");
        let drag = false;

        function dispatchDragEvent(name, event, extra = {}) {
            card.dispatchEvent(
                new CustomEvent(name, {
                    detail: {
                        event,
                        pointerId: event.pointerId,
                        x: event.clientX,
                        y: event.clientY,
                        ...extra
                    }
                })
            );
        }

        function resolveContainer() {
            if (!card.hasAttribute("container")) return null;

            const id = card.getAttribute("container")?.trim();
            if (!id) return card.parentElement;
            if (id.toLowerCase() === "window") return window;

            const byId = document.getElementById(id);
            if (byId) return byId;

            try {
                return document.querySelector(id);
            } catch {
                return null;
            }
        }

        const bounds = { left: this.bounds[0], top: this.bounds[1], right: this.bounds[2], bottom: this.bounds[3] };

        function getContainerBounds(container) {
            if (container === window) {
                return {
                    left: 0 + bounds.left,
                    top: 0 + bounds.top,
                    right: window.innerWidth - bounds.right,
                    bottom: window.innerHeight - bounds.bottom
                };
            }

            return container.getBoundingClientRect();
        }

        function clamp(value, min, max) {
            return Math.min(Math.max(value, min), Math.max(min, max));
        }

        function onDragMove(e) {
            if (!drag) {
                return;
            }

            e.preventDefault();

            let left = e.clientX - drag.offset.x;
            let top = e.clientY - drag.offset.y;

            if (drag.bounds) {
                left = clamp(left, drag.bounds.left, drag.bounds.right - drag.width);
                top = clamp(top, drag.bounds.top, drag.bounds.bottom - drag.height);
            }

            card.style.left = `${left}px`;
            card.style.top = `${top}px`;

            dispatchDragEvent("drag", e, {
                start: drag.start,
                left,
                top
            });
        }

        function onDragStop(e) {
            if (!drag) return;

            if (header.hasPointerCapture?.(drag.pointerId)) {
                header.releasePointerCapture(drag.pointerId);
            }

            const start = drag.start;
            drag = false;
            header.removeEventListener("pointermove", onDragMove);
            header.removeEventListener("pointerup", onDragStop);
            header.removeEventListener("pointercancel", onDragStop);

            card.classList.remove("dragging");
            dispatchDragEvent("dragstop", e, { start });
        }

        function onDragStart(e) {
            if (e.button !== 0) return;

            e.preventDefault();

            const rect = card.getBoundingClientRect();

            drag = {
                pointerId: e.pointerId,
                start: { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top },
                offset: { x: e.clientX - rect.left, y: e.clientY - rect.top },
                width: rect.width,
                height: rect.height
            };

            const container = resolveContainer();
            if (container) {
                drag.bounds = getContainerBounds(container);
            }

            header.setPointerCapture(e.pointerId);
            header.addEventListener("pointermove", onDragMove);
            header.addEventListener("pointerup", onDragStop);
            header.addEventListener("pointercancel", onDragStop);

            card.classList.add("dragging");
            dispatchDragEvent("dragstart", e, { start: drag.start });
        }

        function onNativeDragStart(e) {
            e.preventDefault();
        }

        header.addEventListener("pointerdown", onDragStart);
        header.addEventListener("dragstart", onNativeDragStart);
        card.addEventListener("dragstart", onNativeDragStart);

        this._cardDrag = {
            onDragStart,
            onNativeDragStart
        };

        // const container = resolveContainer();

        const startBounds = this.getBounds();
        const rect = card.getBoundingClientRect();
        const maxHeight = startBounds.height - rect.height;
        const maxWidth = startBounds.width - rect.width;
        let left = clamp(rect.left, startBounds.left, startBounds.right - rect.width);
        let top = clamp(rect.top, startBounds.top, startBounds.bottom - rect.height);
        card.style.left = `${left}px`;
        card.style.top = `${top}px`;

        this.ref("contents").style.maxHeight = `${maxHeight}px`;
        this.ref("contents").style.maxWidth = `${maxWidth}px`;
    }

    onFirstConnect() {
        this.ref("html").style.setProperty(
            "--card-width",
            Number.isFinite(Number(this.width)) ? this.width + "px" : "auto"
        );
        this.ref("html").style.setProperty(
            "--card-height",
            Number.isFinite(Number(this.height)) ? this.height + "px" : "auto"
        );

        if (this.draggable) {
            this._setupDraggable();
        }
    }
}

customElements.define("ui-card", CardComponent);

export default CardComponent;
