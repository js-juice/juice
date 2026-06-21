function buildVirtualElement(vElement) {
    let el;
    const tagName = vElement.tag || vElement.tagName || "div";
    const attributes = vElement.attributes || vElement.attrs || vElement.props || {};
    if (vElement.ns) {
        el = document.createElementNS(vElement.ns, tagName);
    } else {
        el = document.createElement(tagName);
    }

    renderAttrs(el, attributes);

    if (vElement.children && Array.isArray(vElement.children)) {
        vElement.children.forEach((child) => {
            if (child instanceof Node) {
                el.appendChild(child);
            } else if (typeof child === "string") {
                const textNode = document.createTextNode(child);
                const span = document.createElement("span");
                span.appendChild(textNode);
                el.appendChild(span);
            } else {
                el.appendChild(buildVirtualElement(child));
            }
        });
    }
    if (vElement.events) {
        for (let event in vElement.events) {
            el.addEventListener(event, vElement.events[event]);
        }
    }
    return el;
}

export function renderAttrs(element, attributes = {}) {
    for (const attr in attributes) {
        if (attr === "id") {
            element.id = attributes[attr];
        } else if (attr === "class") {
            element.className = attributes[attr];
        } else if (attr === "style") {
            if (typeof attributes[attr] === "string") {
                element.style.cssText = attributes[attr];
            } else {
                Object.assign(element.style, attributes[attr]);
            }
        } else {
            element.setAttribute(attr, attributes[attr]);
        }
    }

    return element;
}

export default function render(props) {
    let element;
    if (!(props instanceof Node)) {
        if (typeof props === "object" && props.element) {
            element = render(props.element);
            delete props.element;
            if (props.style) {
                Object.assign(element.style, props.style);
            }
        } else if (typeof props === "string") {
            const createElementFromToken = (token) => {
                let str = String(token || "").trim();
                let styleString = null;
                let bracketAttrs = null;

                // Extract brace shorthand: div{color:red}
                const braceMatch = str.match(/\{([\s\S]*?)\}$/);
                if (braceMatch) {
                    styleString = braceMatch[1].trim();
                    str = str.slice(0, braceMatch.index).trim();
                }

                // Extract bracketed attrs: div[style=color:red id=foo]
                const brMatch = str.match(/\[([\s\S]*?)\]$/);
                if (brMatch) {
                    bracketAttrs = brMatch[1].trim();
                    str = str.slice(0, brMatch.index).trim();
                }

                const parsed = str.match(/^([a-z0-9-]+)(#[a-zA-Z0-9_-]+)?((\.[a-zA-Z0-9_-]+)*)$/i);
                const tag = (parsed && parsed[1]) || "div";
                const node = document.createElement(tag);
                if (parsed && parsed[2]) {
                    node.id = parsed[2].slice(1);
                }
                if (parsed && parsed[3]) {
                    parsed[3]
                        .split(".")
                        .filter(Boolean)
                        .forEach((className) => node.classList.add(className));
                }

                if (styleString) {
                    node.style.cssText = styleString;
                }

                if (bracketAttrs) {
                    bracketAttrs.split(/\s+/).forEach((pair) => {
                        if (!pair) return;
                        const eq = pair.indexOf("=");
                        if (eq > 0) {
                            const key = pair.slice(0, eq);
                            let val = pair.slice(eq + 1);
                            if (
                                (val.startsWith('"') && val.endsWith('"')) ||
                                (val.startsWith("'") && val.endsWith("'"))
                            ) {
                                val = val.slice(1, -1);
                            }
                            if (key === "style") {
                                node.style.cssText = val;
                            } else if (key === "id") {
                                node.id = val;
                            } else if (key === "class") {
                                val.split(".")
                                    .filter(Boolean)
                                    .forEach((c) => node.classList.add(c));
                            } else {
                                node.setAttribute(key, val);
                            }
                        } else {
                            // treat bare token as a class
                            node.classList.add(pair);
                        }
                    });
                }

                return node;
            };

            const tokens = String(props).trim().split(/\s+/).filter(Boolean);

            // Extended shorthand:
            // "div.root span.label > em < input.field"
            // - space separates tokens
            // - ">" steps into the last created element
            // - "<" steps out to the parent scope
            if (tokens.length > 1 || tokens.includes(">") || tokens.includes("<")) {
                let root = null;
                let currentParent = null;
                let lastCreated = null;
                const scopeStack = [];

                for (let i = 0; i < tokens.length; i += 1) {
                    const token = tokens[i];

                    if (token === ">") {
                        if (lastCreated) {
                            scopeStack.push(lastCreated);
                            currentParent = lastCreated;
                        }
                        continue;
                    }

                    if (token === "<") {
                        if (scopeStack.length > 1) {
                            scopeStack.pop();
                            currentParent = scopeStack[scopeStack.length - 1];
                        } else if (scopeStack.length === 1) {
                            currentParent = scopeStack[0];
                        }
                        continue;
                    }

                    const node = createElementFromToken(token);
                    if (!root) {
                        root = node;
                        currentParent = node;
                        scopeStack.push(node);
                    } else {
                        (currentParent || root).appendChild(node);
                    }
                    lastCreated = node;
                }

                element = root || document.createElement("div");
            } else {
                element = createElementFromToken(tokens[0]);
            }
        } else if (typeof props === "object" && (props.tagName || props.tag)) {
            element = buildVirtualElement(props);
        }
    } else {
        element = props;
        props = {};
    }

    // If props provides attributes, events, or children, apply them to the created element
    if (props && typeof props === "object") {
        const attributes = props.attributes || props.attrs || props.props || {};
        renderAttrs(element, attributes);

        if (props.events) {
            for (let ev in props.events) {
                element.addEventListener(ev, props.events[ev]);
            }
        }

        if (props.children && Array.isArray(props.children)) {
            props.children.forEach((child) => {
                element.appendChild(render(child));
            });
        } else if (props.child) {
            element.appendChild(render(props.child));
        }
    }

    return element;
}

export function mount(component, element, position = "append", reference) {
    if (!element) {
        throw new Error("mount() target element not found.");
    }

    if (typeof element === "string") {
        element = document.querySelector(element);
    }

    if (Array.isArray(component)) {
        return component.forEach((c) => mount(c, element, position, reference));
    }

    if (typeof component === "string") {
        component = render(component);
    }

    switch (position) {
        case "before":
            element.insertBefore(component, reference);
            break;
        case "after":
            reference.parentNode.insertBefore(component, reference.nextSibling);
            break;
        case "prepend":
            element.prepend(component);
            break;
        case "replace":
            element.replaceChildren(component);
            break;
        case "append":
        default:
            element.appendChild(component);
            break;
    }

    return component;
}

export function unmount(component) {
    if (typeof component === "string") {
        component = document.querySelector(component);
    }

    if (Array.isArray(component)) {
        return component.forEach(unmount);
    }

    if (component?.parentNode) {
        component.parentNode.removeChild(component);
    }

    return component;
}
