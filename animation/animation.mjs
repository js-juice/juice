import AnimationTree from "./tree.mjs";
import AnimationTimeline from "./timeline.mjs";

class Animation {
    controls;

    _methods = {};
    _methodListeners = new Set();
    viewer;
    stage;
    state = {};

    constructor(options = {}) {
        this.options = options;
        if (options.viewer) {
            this.viewer = options.viewer;
            options.root = options.root || options.viewer;
        }
        this.timeline = new AnimationTimeline(this, { defer: true, fps: options.fps || 60 });
        this.tree = new AnimationTree(options.root, this);
    }

    update(time) {
        return false;
    }

    render() {
        return false;
    }

    getViewPosition(asset) {
        return asset.position || { x: 0, y: 0, z: 0 };
    }

    getWorldPosition(asset) {
        const stack = this.tree.getParents(asset);
        const position = { x: 0, y: 0, z: 0 };
        for (const parent of stack) {
            if (parent.position) {
                position.x += parent.position.x || 0;
                position.y += parent.position.y || 0;
                position.z += parent.position.z || 0;
            }
        }
        return position;
    }

    setRootElement(element) {
        this.tree.root = element;
    }

    findAssetByElement(element) {
        return this.tree.lookupAssetByElement(element);
    }

    defineMethod(name, method) {
        const methodName = String(name || "").trim();
        if (!methodName || typeof method !== "function") return null;

        this._methods[methodName] = method;
        this._notifyMethodDefined(methodName, method);
        return method;
    }

    getMethod(name) {
        return this._methods?.[name] || null;
    }

    onMethodDefined(listener) {
        if (typeof listener !== "function") return () => {};
        this._methodListeners.add(listener);
        return () => this._methodListeners.delete(listener);
    }

    _notifyMethodDefined(name, method) {
        const detail = { name, method, animation: this };
        this._methodListeners.forEach((listener) => {
            try {
                listener(detail);
            } catch (_error) {
                // Method listeners should not break animation setup.
            }
        });
    }
}

export default Animation;
