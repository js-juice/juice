import "../../../components/viewer.mjs";
import AnimationStage from "../../../components/stage.mjs";

/**
 * Represents the DemoMovingStage animation module class.
 */
class DemoMovingStage extends AnimationStage {
    static tag = "demo-moving-stage";

    running = true;
    speed = 1;
    phase = 0;
    worldWidth = 1;
    worldHeight = 1;
    localX = 0;
    localY = 0;
    stageDriftX = 0;
    stageDriftY = 0;
    stageTiltDeg = 0;
    autoSize = true;

    /**
     * Handles firstconnect events.
     * @returns {*} Result of onFirstConnect.
     */
    onFirstConnect() {
        super.onFirstConnect?.();
        this.probe = this.querySelector(".probe");
        this._bindAnimators();
        this._fitScene();
        this._onResize = () => this._fitScene();
        window.addEventListener("resize", this._onResize);
    }

    /**
     * Handles viewerconnect events.
     * @param {*} viewer - Parameter value.
     * @returns {*} Result of onViewerConnect.
     */
    onViewerConnect(viewer) {
        super.onViewerConnect?.(viewer);
        this._fitScene();
        if (viewer?.timeline?.play) {
            viewer.timeline.play();
        }
        if (viewer?.follow && this.probe) {
            viewer.follow(this.probe);
        }
    }

    /**
     * Handles disconnect events.
     * @returns {*} Result of onDisconnect.
     */
    onDisconnect() {
        if (this._onResize) {
            window.removeEventListener("resize", this._onResize);
        }
        super.onDisconnect?.();
    }

    /**
     * Handles propertychanged events.
     * @param {*} property - Parameter value.
     * @param {*} previous - Parameter value.
     * @param {*} value - Parameter value.
     * @returns {*} Result of onPropertyChanged.
     */
    onPropertyChanged(property, previous, value) {
        super.onPropertyChanged?.(property, previous, value);

        if (property === "width" || property === "height") {
            this.worldWidth = Number(this.width) || this.worldWidth;
            this.worldHeight = Number(this.height) || this.worldHeight;
            this._syncViewerBounds();
        }

        if (property === "fps" && this.viewer?.timeline) {
            this.viewer.timeline.fps = Number(value) || this.viewer.timeline.fps;
        }
    }

    /**
     * Implements internal _fitScene behavior.
     * @returns {*} Result of _fitScene.
     */
    _fitScene() {
        const host = this.viewer || this.parentElement;
        if (!host) return;

        const bounds = host.getBoundingClientRect();
        const viewWidth = Math.max(1, Math.round(bounds.width));
        const viewHeight = Math.max(1, Math.round(bounds.height));

        if (this.autoSize) {
            this.worldWidth = Math.max(viewWidth, Math.round(viewWidth * 2));
            this.worldHeight = Math.max(viewHeight, Math.round(viewHeight * 1.6));
            this.width = this.worldWidth;
            this.height = this.worldHeight;
        } else {
            this.worldWidth = Number(this.width) || this.worldWidth;
            this.worldHeight = Number(this.height) || this.worldHeight;
        }

        this._syncViewerBounds(viewWidth, viewHeight);
    }

    /**
     * Implements internal _syncViewerBounds behavior.
     * @param {*} viewWidth - Parameter value.
     * @param {*} viewHeight - Parameter value.
     * @returns {*} Result of _syncViewerBounds.
     */
    _syncViewerBounds(viewWidth = null, viewHeight = null) {
        if (!this.viewer) return;
        const bounds = this.viewer.getBoundingClientRect();
        const vw = viewWidth || Math.max(1, Math.round(bounds.width));
        const vh = viewHeight || Math.max(1, Math.round(bounds.height));

        if (this.viewer.camera) {
            this.viewer.camera.width = vw;
            this.viewer.camera.height = vh;
        }

        this.viewer.min = { x: 0, y: 0 };
        this.viewer.max = {
            x: Math.max(0, this.worldWidth - vw),
            y: Math.max(0, this.worldHeight - vh)
        };
    }

    /**
     * Implements internal _sampleProbe behavior.
     * @returns {*} Result of _sampleProbe.
     */
    _sampleProbe() {
        const xAmplitude = Math.max(60, this.worldWidth * 0.3);
        const yAmplitude = Math.max(40, this.worldHeight * 0.2);
        this.localX = Math.sin(this.phase * 1.2) * xAmplitude;
        this.localY = Math.sin(this.phase * 1.8) * yAmplitude;
    }

    /**
     * Implements internal _sampleStageMotion behavior.
     * @returns {*} Result of _sampleStageMotion.
     */
    _sampleStageMotion() {
        this.stageDriftX = Math.sin(this.phase * 0.55) * 10;
        this.stageDriftY = Math.cos(this.phase * 0.43) * 7;
        this.stageTiltDeg = Math.sin(this.phase * 0.37) * 0.9;
    }

    /**
     * Implements internal _bindAnimators behavior.
     * @returns {*} Result of _bindAnimators.
     */
    _bindAnimators() {
        if (this._animatorsBound) return;
        this._animatorsBound = true;

        this.addAnimator({
            update: (time) => {
                if (!this.running) return;
                const dt = Math.max(0, Number(time?.delta || 1 / 60));
                this.phase += dt * this.speed;
                this._sampleProbe();
                this._sampleStageMotion();
            },
            render: () => {
                if (!this.probe) return;
                this.probe.style.transform = `translate3d(${this.localX}px, ${this.localY}px, 0)`;
                if (!this.probe.position) {
                    this.probe.position = { x: 0, y: 0, z: 0 };
                }
                this.probe.position.x = this.worldWidth / 2 + this.localX;
                this.probe.position.y = this.worldHeight / 2 + this.localY;
                this.probe.position.z = 0;

                const base = `translate3d(${this.position.x}px, ${this.position.y}px, 0)`;
                const drift = ` translate3d(${this.stageDriftX}px, ${this.stageDriftY}px, 0)`;
                const tilt = ` rotate(${this.stageTiltDeg}deg)`;
                this.style.transformOrigin = "50% 50%";
                this.style.transform = `${base}${drift}${tilt}`;
            }
        });
    }
}

customElements.define(DemoMovingStage.tag, DemoMovingStage);
