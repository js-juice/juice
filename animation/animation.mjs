import AnimationTree from "./tree.mjs";
import AnimationTimeline from "./timeline.mjs";

class Animation {
    controls;

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
}

export default Animation;
