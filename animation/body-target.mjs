/**
 * Lightweight animation body wrapper for plain DOM elements.
 * Provides position/velocity/anchor rendering without requiring custom elements.
 * @module Animation/BodyTarget
 */

import { Position } from "./properties/Position.mjs";
import { parseAnchor } from "./anchor.mjs";

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

class AnimationBody {
    animate = true;
    animationBody = true;

    constructor(element, options = {}) {
        this.element = null;
        this.stage = options.stage || null;
        this.manageStyles = options.manageStyles !== false;
        this.worldSpace = options.worldSpace !== false;
        this.clampToStage = options.clampToStage !== false;
        this.anchor = options.anchor || "center center";
        this.onUpdate = typeof options.update === "function" ? options.update : null;
        this.onRender = typeof options.render === "function" ? options.render : null;

        this.position = new Position(
            Number(options.x) || 0,
            Number(options.y) || 0,
            { history: 3, trackDirty: true }
        );
        this.velocity = new Position(0, 0, { trackDirty: true });
        this.origin = new Position(0, 0, { trackDirty: true });

        this.size = { width: 0, height: 0 };
        this.anchorPoint = { x: 0, y: 0 };
        this._anchorSpec = { x: 0.5, y: 0.5 };

        if (element) {
            this.attach(element);
        }
        this.setAnchor(this.anchor);
        this.syncOrigin();
    }

    attach(element) {
        this.element = element || null;
        if (!this.element) return this;

        if (this.manageStyles) {
            const style = this.element.style;
            if (!style.position) style.position = "absolute";
            style.left = "0px";
            style.top = "0px";
        }

        this.syncSize();
        return this;
    }

    setStage(stage) {
        this.stage = stage || null;
        this.syncOrigin();
        return this;
    }

    syncSize() {
        if (!this.element) return this;
        const rect = this.element.getBoundingClientRect();
        this.size.width = Math.max(0, rect.width || this.element.offsetWidth || 0);
        this.size.height = Math.max(0, rect.height || this.element.offsetHeight || 0);
        this._syncAnchorPoint();
        return this;
    }

    setAnchor(anchor) {
        const parsed = parseAnchor(anchor || "center center");
        this._anchorSpec = parsed;
        this._syncAnchorPoint();
        return this;
    }

    moveTo(x, y) {
        this.position.set(Number(x) || 0, Number(y) || 0);
        return this;
    }

    setPosition(x, y) {
        return this.moveTo(x, y);
    }

    move(dx, dy) {
        this.position.add(Number(dx) || 0, Number(dy) || 0);
        return this;
    }

    setVelocity(x = 0, y = 0) {
        this.velocity.set(Number(x) || 0, Number(y) || 0);
        return this;
    }

    setUpdate(fn) {
        this.onUpdate = typeof fn === "function" ? fn : null;
        return this;
    }

    setRender(fn) {
        this.onRender = typeof fn === "function" ? fn : null;
        return this;
    }

    syncOrigin() {
        // Stage already applies anchor offset at the host/html level.
        // Keep DOM body coordinates in stage world space without a second anchor subtraction.
        this.origin.set(0, 0);
        return this;
    }

    update(time) {
        this._resolveStage();
        if (this.onUpdate) {
            this.onUpdate(time, this);
        }

        const dt = Math.max(0, Number(time?.delta || 0));
        if (dt > 0 && (this.velocity.x !== 0 || this.velocity.y !== 0)) {
            this.position.add(this.velocity.x * dt, this.velocity.y * dt);
        }

        if (this.clampToStage && this.stage) {
            const stageWidth = Number(this.stage.width) || 0;
            const stageHeight = Number(this.stage.height) || 0;
            const minX = this.anchorPoint.x;
            const minY = this.anchorPoint.y;
            const maxX = Math.max(minX, stageWidth - (this.size.width - this.anchorPoint.x));
            const maxY = Math.max(minY, stageHeight - (this.size.height - this.anchorPoint.y));
            this.position.x = clamp(this.position.x, minX, maxX);
            this.position.y = clamp(this.position.y, minY, maxY);
        }
    }

    render() {
        if (!this.element || !this.manageStyles) return;

        this.syncOrigin();
        const localX = this.worldSpace ? this.position.x - this.origin.x : this.position.x;
        const localY = this.worldSpace ? this.position.y - this.origin.y : this.position.y;
        const tx = localX - this.anchorPoint.x;
        const ty = localY - this.anchorPoint.y;
        this.element.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;

        if (this.onRender) {
            this.onRender(this);
        }
    }

    _syncAnchorPoint() {
        const width = this.size.width || 0;
        const height = this.size.height || 0;
        this.anchorPoint.x = this._anchorValueToPixels(this._anchorSpec.x, width);
        this.anchorPoint.y = this._anchorValueToPixels(this._anchorSpec.y, height);
    }

    _anchorValueToPixels(value, axisSize) {
        if (typeof value === "number") return value * axisSize;
        if (typeof value !== "string") return 0;

        const trimmed = value.trim();
        if (trimmed.endsWith("%")) {
            const pct = Number.parseFloat(trimmed);
            return Number.isFinite(pct) ? (pct / 100) * axisSize : 0;
        }
        if (trimmed.endsWith("px")) {
            const px = Number.parseFloat(trimmed);
            return Number.isFinite(px) ? px : 0;
        }
        const num = Number(trimmed);
        return Number.isFinite(num) ? num : 0;
    }

    _resolveStage() {
        if (this.stage) return this.stage;
        if (this.viewer?.stage) {
            this.stage = this.viewer.stage;
            return this.stage;
        }
        const closestStage = this.element?.closest?.("animation-stage");
        if (closestStage) {
            this.stage = closestStage;
            return this.stage;
        }
        return null;
    }
}

export default AnimationBody;
export { AnimationBody, AnimationBody as AnimationBodyTarget };
