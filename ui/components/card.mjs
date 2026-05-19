import Component from "../component.mjs";

class CardComponent extends Component.HTMLElement {
    static tag = "ui-card";
    static config = {
        properties: {
            width: { type: "int", default: 250, linked: true },
            height: { type: "int", default: "auto", linked: true },
            draggable: { type: "exists", default: false, linked: true },
            title: { type: "string", default: "Card Title", linked: true },
            color: { type: "string", default: "#000" }
        }
    };

    static get observed() {
        return { all: ["width", "height", "draggable", "title", "color"] };
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
                ":host([draggable]) header": {
                    cursor: "move"
                },
                "#html": {
                    borderTopRightRadius: "0.5rem",
                    backgroundColor: "var(--color, #FFF)",
                    width: "var(--card-width, 100%)",
                    height: "var(--card-height, auto)",
                    maxHeight: "calc(100vh - 2rem)",
                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)"
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
                    borderBottom: "1px solid #d2d2d2"
                },
                "header h1": {
                    fontSize: "1.15rem",
                    fontWeight: "700",
                    margin: "0",
                    padding: "0.5rem",
                    color: "#000"
                },
                "#drag-icon": {
                    position: "relative",
                    float: "right",
                    width: "20px",
                    height: "20px",
                    marginTop: "0.5rem",
                    marginRight: "0.5rem"
                },
                "#drag-icon .vert": {
                    position: "absolute",
                    left: "50%",
                    top: "0",
                    width: "3px",
                    height: "100%",
                    backgroundColor: "#d2d2d2",
                    transform: "translateX(-50%)"
                },
                "#drag-icon .horz": {
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    width: "100%",
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
                    width: "10px",
                    height: "8px",
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
                    width: "10px",
                    height: "8px",
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
                    width: "8px",
                    height: "10px",
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
                    width: "8px",
                    height: "10px",
                    clipPath: "polygon(0 0, 0 100%, 100% 50%)",
                    background: "inherit",
                    transform: "translateY(-50%)"
                }
            }
        ];
    }

    static html() {
        return `<div class="card-body">
            <header id="header">
            <div id="drag-icon"><div class="vert"></div><div class="horz"></div></div>
            ${this.title ? `<h1>${this.title}</h1>` : ""}
                <slot name="title"></slot>
            </header>
            <main>
                <slot></slot>
            </main>
            <footer>
                <slot name="footer"></slot>
            </footer>
        </div>`;
    }

    constructor() {
        super();
    }

    onDragMove(e) {
        if (this.drag) {
            const diffX = e.clientX - this.drag.x;
            const diffY = e.clientY - this.drag.y;
            this.style.left = `${this.drag.x + diffX - this.drag.offset.x}px`;
            this.style.top = `${this.drag.y + diffY - this.drag.offset.y}px`;
        }
        console.log("Drag Move");
    }

    onDragStop(e) {
        this.drag.target.releasePointerCapture(this.drag.pointerId);
        this.drag = false;
        window.removeEventListener("pointermove", this.onDragMove);
        window.removeEventListener("pointerup", this.onDragStop);
        this.classList.remove("dragging");
        console.log("onDragStop");
    }

    _setupDraggable() {
        this.ref("header").addEventListener("pointerdown", (e) => {
            e.preventDefault();
            console.log("Drag Start");
            this.setPointerCapture(e.pointerId);
            this.drag = {
                target: this,
                pointerId: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                offset: { x: e.offsetX, y: e.offsetY }
            };
            this.classList.add("dragging");
            window.addEventListener("pointermove", this.onDragMove.bind(this));
            window.addEventListener("pointerup", this.onDragStop.bind(this));
        });
    }

    onFirstConnect() {
        if (this.draggable) {
            this._setupDraggable();
        }
        this.ref("html").style.setProperty("--card-width", Number.isFinite(Number(this.width)) ? this.width + "px" : "auto");
        this.ref("html").style.setProperty("--card-height", Number.isFinite(Number(this.height)) ? this.height + "px" : "auto");

        if (this.title) {
        }
    }
}

customElements.define("ui-card", CardComponent);

export default CardComponent;
