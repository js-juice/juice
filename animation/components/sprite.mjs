/**
 * Sprite animation component for displaying and animating sprite sheets.
 * @module Components/Animation/Sprite
 */
import SpriteSheet from "../graphics/webgl/sprite-sheet.mjs";
import AnimationBlock from "./animation-block.mjs";
/**
 * Generates a tile map for a sprite sheet.
 * @param {Object} tileSize - Size of each tile
 * @param {number} sheetSize - Size of the sprite sheet
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @returns {Array<Object>} Array of tile positions
 */
export function sheetMap(tileSize, sheetSize, startX, startY) {
    const map = [];
    for (let y = startY; y < sheetSize; y += tileSize) {
        for (let x = startX; x < sheetSize; x += tileSize) {
            map.push({ x, y });
        }
        startX = 0;
        startY += tileSize.y;
    }
    return map;
}

/**
 * Sprite component for displaying and animating sprite sheet frames.
 * @class AnimationSprite
 * @extends Component.HTMLElement
 */
export class AnimationSprite extends AnimationBlock {
    static tag = "animation-sprite";

    animationComponent = false;

    static config = {
        name: "animation-sprite",
        tag: "animation-sprite",
        properties: {
            src: { type: "string", default: "", linked: true },
            width: { type: "int", default: 0, linked: true },
            height: { type: "int", default: 0, linked: true },
            scale: { type: "float", default: 1, linked: true },
            frames: { type: "int", default: 1, linked: true },
            frame: { type: "int", default: null, linked: true },
            tempo: { type: "float", default: 0.1, linked: true },
            loop: { type: "exists", default: false, linked: true },
            auto: { type: "exists", default: false, linked: true },
            noanimation: { type: "exists", default: false, linked: true },
            in: { type: "int", default: 0, linked: true },
            out: { type: "int", default: 0, linked: true },
            "filter-color": { type: "string", default: "#000000", linked: true },
            "filter-amount": { type: "float", default: 0, linked: true }
        }
    };

    /**
     * Returns the current observed value.
     * @returns {*} Current observed value.
     */
    static get observed() {
        return {
            all: [
                "width",
                "height",
                "scale",
                "src",
                "frame",
                "frames",
                "tempo",
                "loop",
                "in",
                "out",
                "auto",
                "filter-color",
                "filter-amount"
            ],
            attributes: [],
            properties: []
        };
    }

    /**
     * Executes html.
     * @returns {*} Result of html.
     */
    bodyHTML() {
        return `
            <div id="spritesheet"></div>
        `;
    }

    /**
     * Returns the current style value.
     * @returns {*} Current style value.
     */
    static get style() {
        return [
            {
                "#body": {
                    position: "relative",
                    display: "block",
                    width: "var(--width, 100%)", // "100%",
                    height: "var(--height, 100%)", // "100%",
                    overflow: "hidden"
                },
                "::slotted(img)": {
                    position: "absolute",
                    display: "block",
                    top: "0",
                    left: "0",
                    width: "auto",
                    height: "100% !important",
                    maxWidth: "none !important"
                },
                "#spritesheet": {
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%"
                },
                "#spritesheet > *": {
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%"
                }
            }
        ];
    }

    views = {};
    sheet = null;
    /**
     * Executes hasExplicitAttribute.
     * @param {*} name - Parameter value.
     * @returns {*} Result of hasExplicitAttribute.
     */
    hasExplicitAttribute(name) {
        return this.hasAttribute(name);
    }

    /**
     * Updates internal state from incoming values.
     * @returns {*} Result of updateDisplaySize.
     */
    updateDisplaySize() {
        const scale = this.scale > 0 ? this.scale : 1;
        const scaledWidth = this.width > 0 ? this.width * scale : 0;
        const scaledHeight = this.height > 0 ? this.height * scale : 0;
        this.styles.update(":host", {
            width: scaledWidth ? `${scaledWidth}px` : "auto",
            height: scaledHeight ? `${scaledHeight}px` : "auto"
        });
    }

    /**
     * Executes syncFromSheet.
     * @param {*} sheet - Parameter value.
     * @returns {*} Result of syncFromSheet.
     */
    syncFromSheet(sheet) {
        if (!sheet) return;

        if (!this.hasExplicitAttribute("width") || this.width <= 0) {
            this.width = sheet.viewWidth;
        }
        if (!this.hasExplicitAttribute("height") || this.height <= 0) {
            this.height = sheet.viewHeight;
        }
        if (!this.hasExplicitAttribute("frames") || this.frames <= 1) {
            this.frames = sheet.frameCount;
        }
        if (!this.hasExplicitAttribute("out") || this.out < 0 || this.out >= sheet.frameCount) {
            this.out = Math.max(0, sheet.frameCount - 1);
        }
        if (this.frame == null || this.frame < this.in || this.frame > this.out) {
            this.frame = this.in || 0;
        }
    }

    /**
     * Handles firstconnect events.
     * @returns {*} Result of onFirstConnect.
     */
    onFirstConnect() {
        if (!this.width) this.width = this.ref("body")?.getBoundingClientRect?.().width || 0;
        if (!this.height) this.height = this.ref("body")?.getBoundingClientRect?.().height || 0;
        this.writeStyleVars(
            {
                "--width": typeof this.width === "number" ? `${this.width}px` : this.width,
                "--height": typeof this.height === "number" ? `${this.height}px` : this.height,
                "--scale": this.scale
            },
            this.ref("html")
        );

        this.sheet = new SpriteSheet(this.width, this.height, this.ref("spritesheet"));
        this.applyColorFilter();

        this.frame = this.in || 0;
        if (this.noanimation) {
        }

        if (this.auto) {
            this.paused = false;
        }

        if (!this.hasExplicitAttribute("out")) this.out = Math.max(0, this.frames - 1);
        this.updateDisplaySize();

        if (this.src) {
            this.sheet.addSheet(this.src, this.width, this.height).then((sheet) => {
                this.syncFromSheet(sheet);
                this.sheet.render(true);
            });
        }
    }

    queued = null;
    time = 0;
    last = {};
    dirty = false;
    paused = true;

    /**
     * Updates internal state from incoming values.
     * @param {*} data - Parameter value.
     * @returns {*} Result of update.
     */
    update(data) {
        if (this.paused) return;
        this.time += data.delta;

        if (this.auto) {
            //Loop Aniumation
            if (this.time - this.last.time > this.tempo) {
                //Step Forward
                this.next();
            }
        }
    }
    /**
     * Renders output from current module state.
     * @param {*} force - Parameter value.
     * @returns {*} Result of render.
     */
    render(force = false) {
        if (!force && (this.paused || !this.dirty)) return;
        this.sheet.render();

        this.dirty = false;
    }

    applyColorFilter() {
        if (!this.sheet?.setColorFilter) return;
        this.sheet.setColorFilter(this["filter-color"], this["filter-amount"]);
    }

    setColorFilter(color = "#000000", amount = 1) {
        this["filter-color"] = color;
        this["filter-amount"] = amount;
        this.applyColorFilter();
    }

    setFilterOpacity(amount = 1) {
        this["filter-amount"] = amount;
        this.applyColorFilter();
    }

    clearColorFilter() {
        this["filter-amount"] = 0;
        this.applyColorFilter();
    }

    /**
     * Executes next.
     * @returns {*} Result of next.
     */
    next() {
        let next = this.frame + 1;
        if (next > this.out) {
            next = this.loop ? this.in : this.out;
            if (!this.loop) this.paused = true;
        }
        this.frame = next;
    }

    /**
     * Executes prev.
     * @returns {*} Result of prev.
     */
    prev() {
        let prev = this.frame - 1;
        if (prev < this.in) {
            prev = this.out;
        }
        this.frame = prev;
    }

    activeLayers = [];
    layers = {};

    /**
     * Executes addSheet.
     * @param {*} src - Parameter value.
     * @param {*} width - Parameter value.
     * @param {*} height - Parameter value.
     * @param {*} options - Parameter value.
     * @returns {*} Result of addSheet.
     */
    addSheet(src, width, height, options = null) {
        if (width && typeof width === "object") {
            options = width;
            width = options.frameWidth ?? options.width;
            height = options.frameHeight ?? options.height;
        }
        return this.sheet.addSheet(src, width, height, options).then((sheet) => {
            this.syncFromSheet(sheet);
            return sheet;
        });
    }

    /**
     * Handles propertychanged events.
     * @param {*} property - Parameter value.
     * @param {*} old - Parameter value.
     * @param {*} value - Parameter value.
     * @returns {*} Result of onPropertyChanged.
     */
    onPropertyChanged(property, old, value) {
        switch (property) {
            case "frame":
                this.last.frame = old || 0;
                //console.log("Sprite Frame", value);
                this.ref("html").style.setProperty("--frame", value);
                this.dirty = false;
                this.last.time = this.time;
                if (this.sheet) {
                    this.sheet.frame = value;
                    this.sheet.render();
                }
                break;
            case "width":
                this.updateDisplaySize();
                break;
            case "height":
                this.updateDisplaySize();
                break;
            case "scale":
                this.updateDisplaySize();
                break;
            case "filter-color":
            case "filter-amount":
                this.applyColorFilter();
                break;
        }
    }
}

customElements.define(AnimationSprite.tag, AnimationSprite);

export default AnimationSprite;
