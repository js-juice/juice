function buildVirtualElement(vElement) {
    let el;
    const tagName = vElement.tag || vElement.tagName || "div";
    const attributes = vElement.attributes || vElement.attrs || vElement.props || {};
    if (vElement.ns) {
        el = document.createElementNS(vElement.ns, tagName);
    } else {
        el = document.createElement(tagName);
    }
    for (let attr in attributes) {
        if (attr === "id") {
            el.id = attributes[attr];
        } else if (attr === "class") {
            el.className = attributes[attr];
        } else if (attr === "style") {
            Object.assign(el.style, attributes[attr]);
        } else {
            el.setAttribute(attr, attributes[attr]);
        }
    }
    if (vElement.children && Array.isArray(vElement.children)) {
        vElement.children.forEach((child) => {
            if (child instanceof HTMLElement) {
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

export function render(props) {
    let element;
    if (!(props instanceof HTMLElement)) {
        if (typeof props === "object" && props.element) {
            element = render(props.element);
            delete props.element;
            if (props.style) {
                Object.assign(element.style, props.style);
            }
        } else if (typeof props === "string") {
            const createElementFromToken = (token) => {
                const parsed = String(token || "")
                    .trim()
                    .match(/^([a-z0-9-]+)(#[a-zA-Z0-9_-]+)?((\.[a-zA-Z0-9_-]+)*)$/i);
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

    return element;
}

export function row(content, options = {}) {
    const row = document.createElement("div");
    row.classList.add("row");
    if (options.class) row.classList.add(options.class);

    const style = options.style || {};
    style.display = "flex";
    style.flexDirection = "row";
    if (options.wrap !== undefined) style.flexWrap = options.wrap ? "wrap" : "nowrap";
    if (options.gap !== undefined) style.gap = options.gap;
    // justifyContent controls horizontal alignment in a row layout and vertical alignment in a column layout
    // values can be 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', etc.
    if (options.justify) style.justifyContent = options.justify;
    // alignItems controls vertical alignment in a row layout and horizontal alignment in a column layout
    // values can be 'flex-start', 'center', 'flex-end', 'stretch', etc.
    if (options.align) style.alignItems = options.align;
    Object.assign(row.style, style);

    content.forEach((item, index) => {
        const element = render(item);
        element.classList.add("row-item");
        element.classList.add(`row-item-${index}`);
        row.appendChild(element);
    });

    return row;
}

export function column(content, options = {}) {
    const col = document.createElement("div");
    col.classList.add("column");
    if (options.class) col.classList.add(options.class);

    const style = options.style || {};
    style.display = "flex";
    style.flexDirection = "column";
    if (options.wrap !== undefined) style.flexWrap = options.wrap ? "wrap" : "nowrap";
    if (options.gap !== undefined) style.gap = options.gap;
    // justifyContent controls horizontal alignment in a row layout and vertical alignment in a column layout
    // values can be 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', etc.
    if (options.justify) style.justifyContent = options.justify;
    // alignItems controls vertical alignment in a row layout and horizontal alignment in a column layout
    // values can be 'flex-start', 'center', 'flex-end', 'stretch', etc.
    if (options.align) style.alignItems = options.align;
    Object.assign(col.style, style);

    content.forEach((item, index) => {
        const element = render(item);
        element.classList.add("col-item");
        element.classList.add(`col-item-${index}`);
        col.appendChild(element);
    });

    return col;
}

export function grid(content, options = {}) {
    const grid = document.createElement("div");
    grid.classList.add("grid");
    if (options.class) grid.classList.add(options.class);

    const style = options.style || {};
    style.display = "grid";

    if (options.columns !== undefined) {
        let columns = options.columns;
        if (typeof options.columns === "number") {
            columns = `repeat(${options.columns}, 1fr)`;
        } else if (Array.isArray(options.columns)) {
            columns = options.columns.map((col) => (typeof col === "number" ? `${col}fr` : col)).join(" ");
        }
        style.gridTemplateColumns = columns;
    }

    if (options.rows !== undefined) {
        let rows = options.rows;
        if (typeof options.rows === "number") {
            rows = `repeat(${options.rows}, auto)`;
        } else if (Array.isArray(options.rows)) {
            rows = options.rows.map((row) => (typeof row === "number" ? `${row}fr` : row)).join(" ");
        }
        style.gridTemplateRows = rows;
    }

    if (options.gap !== undefined) style.gap = options.gap;
    if (options.rowGap !== undefined) style.rowGap = options.rowGap;
    if (options.columnGap !== undefined) style.columnGap = options.columnGap;
    if (options.justify) style.justifyItems = options.justify;
    if (options.align) style.alignItems = options.align;

    Object.assign(grid.style, style);

    content.forEach((item, index) => {
        const element = render(item);
        element.classList.add("grid-item");
        element.classList.add(`grid-item-${index}`);
        grid.appendChild(element);
    });

    return grid;
}
