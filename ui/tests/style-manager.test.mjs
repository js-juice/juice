import test from "node:test";
import assert from "node:assert/strict";

class FakeTextNode {
    constructor(text) {
        this.textContent = text;
    }
}

class FakeStyleElement {
    constructor(id) {
        this.id = id;
        this.type = "text/css";
        this.disabled = false;
        this.styleSheet = null;
        this.sheet = null;
        this.children = [];
        this.textContent = "";
    }

    appendChild(node) {
        this.children.push(node);
        this.textContent += node.textContent || "";
    }
}

class FakeContainer {
    constructor(name = "scope") {
        this.name = name;
        this.children = [];
        this.shadowRoot = this;
    }

    appendChild(node) {
        this.children.push(node);
    }

    querySelectorAll(selector) {
        return selector === "style" ? this.children.filter((child) => child.tagName === "STYLE") : [];
    }
}

function installFakeDocument(target) {
    const head = new FakeContainer("head");

    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;

    const fakeDocument = {
        head,
        createElement(tagName) {
            if (tagName === "style") {
                return new FakeStyleElement();
            }
            if (tagName === "div") {
                return { style: {} };
            }
            return new FakeContainer(tagName);
        },
        createTextNode(text) {
            return new FakeTextNode(text);
        },
        querySelector(selector) {
            return selector === "#demo" ? target : null;
        }
    };

    globalThis.document = fakeDocument;
    globalThis.window = { document: fakeDocument, opera: false };
    globalThis.navigator = { userAgent: "node", appVersion: "node", vendor: "" };

    return () => {
        if (originalDocument === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = originalDocument;
        }

        if (originalWindow === undefined) {
            delete globalThis.window;
        } else {
            globalThis.window = originalWindow;
        }
    };
}

test("juice.styles accepts a direct scope selector and appends styles there", async () => {
    const scope = new FakeContainer("demo");
    const restoreDocument = installFakeDocument(scope);

    try {
        const { default: Juice } = await import("../../juice.js");
        const instance = new Juice();

        instance.styles("#demo").append(".demo { color: red; }");

        assert.equal(scope.children.length, 1, "style should be appended to the requested scope");
        assert.match(scope.children[0].textContent, /color:\s*red/);
    } finally {
        restoreDocument();
    }
});
