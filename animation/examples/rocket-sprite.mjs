import { AnimationSprite } from "../components/sprite.mjs";
import SpriteSheet from "../graphics/webgl/sprite-sheet.mjs";

const urls = {
    rocketSprite: new URL("./assets/rocket-yaw-sheet-med.png", import.meta.url).href
};

class RocketSprite extends AnimationSprite {
    static tag = "rocket-sprite";

    degrees = 0;
    spriteSrc = urls.rocketSprite;
    _sheetLoaded = false;

    beforeCreate() {
        this.width = 265;
        this.height = 600;
        this.src = "";

        const portholeContainer = document.createElement("div");
        portholeContainer.classList.add("porthole-container");

        const portholeAnchor = document.createElement("div");
        portholeAnchor.classList.add("porthole-anchor");

        const porthole = document.createElement("div");
        porthole.classList.add("porthole");

        portholeAnchor.appendChild(porthole);
        portholeContainer.appendChild(portholeAnchor);

        this.portholeContainer = portholeContainer;
        this.porthole = porthole;
    }

    onFirstConnect() {
        this.width = 265;
        this.height = 600;
        this.src = "";

        this.sheet = new SpriteSheet(this.width, this.height, this.ref("spritesheet"));
        this.frames = 30;
        this.out = 30;
        this.frame = 0;

        this.styles.update(":host", {
            width: `${this.width}px`,
            height: `${this.height}px`
        });
        this.ref("html").style.setProperty("--width", `${this.width}px`);

        this.styles.add({
            ".porthole-container": {
                position: "absolute",
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                perspective: "500px",
                transformStyle: "preserve-3d",
                perspectiveOrigin: "center center"
            },
            ".porthole-anchor": {
                position: "absolute",
                top: "45.8%",
                left: "50%",
                backfaceVisibility: "hidden",
                transform: "rotateY(calc(var(--yaw) * 1deg)) rotateX(4deg) translateZ(65px)"
            },
            ".porthole": {
                position: "absolute",
                width: "calc(var(--width) * 0.24)",
                height: "calc(var(--width) * 0.24)",
                top: "39.5%",
                left: "50%",
                zIndex: "100",
                borderRadius: "50%",
                backgroundColor: "#6d81a1",
                transform: "translate(-50%, -50%)",
                transformOrigin: "50% 50%",
                boxSizing: "border-box"
            },
            ".porthole:before": {
                content: "' '",
                display: "block",
                position: "absolute",
                border: "6px solid #999",
                borderRadius: "50%",
                boxSizing: "border-box",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1
            },
            ".porthole:after": {
                content: "' '",
                display: "block",
                position: "absolute",
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                zIndex: 0,
                border: "8px solid #666",
                borderRadius: "50%",
                left: "calc(var(--yaw) * -0.15px)"
            }
        });
        this.ref("html").appendChild(this.portholeContainer);

        if (!this._sheetLoaded) {
            this._sheetLoaded = true;
            this.sheet
                .addSheet(this.spriteSrc, this.width, this.height)
                .then(() => {
                    this.sheet.frame = 0;
                    this.sheet.render(true);
                    this.dispatchEvent(new CustomEvent("sheet-ready"));
                })
                .catch((error) => {
                    console.error("RocketSprite sheet load failed", error);
                });
        }
    }

    /**
     * Sets the frame based on the given degree.
     * @param {number} degree
     */
    setFrameByDegree(degree) {
        const remainder = degree % 360;
        const third = remainder < 0 ? 120 + remainder : remainder % 120;
        const frame = Math.floor((third / 120) * 29) % 29;
        this.ref("html").style.setProperty("--yaw", remainder);
        this.degrees = remainder;
        this.frame = frame;
    }

    /**
     * Adds the given degrees to the current yaw of the rocket.
     * @param {number} degrees
     */
    addDegrees(degrees) {
        this.setFrameByDegree(this.degrees + degrees);
    }
}

if (!customElements.get(RocketSprite.tag)) {
    customElements.define(RocketSprite.tag, RocketSprite);
}

export default RocketSprite;
