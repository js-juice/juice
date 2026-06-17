class AnimationDescriptor {
    constructor(asset) {
        this.type = AnimationTree.getType(asset);
        this.asset = asset;
        this.children = [];
    }
}

class AnimationTree {
    static getType(asset) {
        const tag = asset?.tagName?.toLowerCase?.();

        if (asset?.animationViewer || tag === "animation-viewer") {
            return "viewer";
        } else if (tag === "animation-stage") {
            return "stage";
        } else if (asset?.animationBody || tag === "animation-component") {
            return "body";
        } else if (asset?.animationComponent && tag?.startsWith("animation-")) {
            return tag.slice("animation-".length);
        }
        return null;
    }
    constructor(root = null, animation = null) {
        this.animation = animation;
        this.rootIsViewer = false;

        this.assets = new Map();

        if (root) this.root = root;
    }

    set root(element) {
        if (AnimationTree.getType(element) === "viewer") {
            this.rootIsViewer = true;
        }
        const asset = this.addAsset(element);
        asset.isRoot = true;
        this._root = element;
    }

    get root() {
        return this._root;
    }

    addAsset(element, parent = null) {
        element.animation = this.animation;
        const descriptor = {};
        descriptor.type = AnimationTree.getType(element);
        descriptor.element = element;
        descriptor.slot = element.assignedSlot || null;
        descriptor.children = [];
        descriptor.parent = parent;
        if (parent) {
            this.assets.get(parent)?.children.push(descriptor);
        }
        this.assets.set(element, descriptor);
        element._asset = descriptor;
        this.animation.timeline.addAnimator(element);
        console.log("Added asset to animation tree", { element, descriptor });
        return descriptor;
    }

    findAssetByElement(element) {
        return this.assets.get(element) || null;
    }

    ensureAsset(asset) {
        if (!asset) return null;
        if (asset instanceof HTMLElement) {
            asset = this.assets.get(asset);
        }
        return asset;
    }

    getParents(asset) {
        asset = this.ensureAsset(asset);
        if (!asset) return [];
        const parents = [];
        let current = asset;
        while (current && current.parent) {
            parents.unshift(current.parent);
            current = current.parent;
        }
        return parents;
    }

    eachParent(asset, callback) {
        asset = this.ensureAsset(asset);
        if (!asset) return;
        let current = asset;
        while (current && current.parent) {
            callback(current.parent);
            current = current.parent;
        }
    }

    eachChild(asset, callback) {
        asset = this.ensureAsset(asset);
        if (!asset) return;
        for (const child of asset.children) {
            callback(child);
            this.eachChild(child, callback);
        }
    }

    eachSibling(asset, callback) {
        asset = this.ensureAsset(asset);
        if (!asset || !asset.parent) return;
        for (const sibling of asset.parent.children) {
            if (sibling !== asset) {
                callback(sibling);
            }
        }
    }
}

export default AnimationTree;
