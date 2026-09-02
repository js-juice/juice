import Component from "../../component.mjs";

class ScrollingCarousel extends Component.HTMLElement {
    static tag = "scrolling-carousel";

    static config = {
        properties: {
            direction: { type: "string", default: "ltr" },
            speed: { type: "number", default: 1 }
        }
    };

    items = [];
    speed = 1;
    direction = 1;

    static get style() {
        return [
            {
                ":host": {
                    display: "flex",
                    overflow: "hidden"
                },
                ul: {
                    height: "100%",
                    width: "100%",
                    position: "relative",
                    display: "flex",
                    flexDirection: "row",
                    overflowX: "scroll",
                    overflowY: "hidden",
                    scrollBehavior: "smooth",
                    scrollSnapType: "x mandatory",
                    margin: 0,
                    padding: 0
                },
                ":host(direction='ttb'), :host(direction='btt')": {},
                ":host(direction='ttb') ul, :host(direction='btt') ul": {
                    flexDirection: "column",
                    overflowY: "scroll",
                    overflowX: "hidden",
                    scrollSnapType: "y mandatory"
                },
                "ul::-webkit-scrollbar": {
                    display: "none"
                },
                "ul > div > li": {
                    flex: "0 0 auto",
                    scrollSnapAlign: "start",
                    position: "relative",
                    listStyle: "none",
                    flex: "0 0 auto"
                },
                ".group": {
                    position: "relative",
                    display: "flex",
                    flexDirection: "row",
                    animation: "scroll-carousel-scroll linear infinite",
                    animationDuration: "var(--scroll-speed, 10s)",
                    animationDirection: "normal"
                },
                ":host(:hover) .group": {
                    animationPlayState: "paused"
                },
                "#second": {
                    position: "relative",
                    display: "flex",
                    flexDirection: "row"
                }
            },
            `
            @keyframes scroll-carousel-scroll { 
                from {
                    transform: translateX(0);
                }
                to {
                    transform: translateX(-100%);
                }
            }
            `
        ];
    }

    static html() {
        return `
            <slot></slot>
            <ul id="carousel" part="carousel">
                <div id="first" class="group"></div>
                <div id="second" class="group" aria-hidden ></div>
            </ul>
        `;
    }

    constructor() {
        super();
    }

    buildItems() {
        this.source.forEach((item, index) => {
            const li = document.createElement("li");
            li.setAttribute("part", "item");
            li.setAttribute("data-index", index);
            li.appendChild(item);
            item.setAttribute("part", "item-content");
            this.ref("first").appendChild(li);
        });
        this.ref("second").innerHTML = this.ref("first").innerHTML;
    }

    onFirstConnect() {
        if (this.hasAttribute("direction")) {
            const dir = this.getAttribute("direction");
            if (dir === "ltr") this.direction = 1;
            else if (dir === "rtl") this.direction = -1;
            else if (dir === "ttb") this.direction = 1;
            else if (dir === "btt") this.direction = -1;
        }
        if (this.hasAttribute("speed")) {
            const speed = this.getAttribute("speed");
            this.speed = speed;
            this.setStyleVar("--scroll-speed", `${this.speed}`);
        }
        this.source = Array.from(this.children);
        this.buildItems();
    }

    onPropertyChanged(name, oldValue, newValue) {
        if (name === "direction") {
            if (newValue === "ltr") this.direction = 1;
            else if (newValue === "rtl") this.direction = -1;
            else if (newValue === "ttb") this.direction = 1;
            else if (newValue === "btt") this.direction = -1;
        } else if (name === "speed") {
            this.speed = newValue;
            this.setStyleVar("--scroll-speed", `${this.speed}`);
        }
    }
}

export default ScrollingCarousel;

customElements.define(ScrollingCarousel.tag, ScrollingCarousel);
