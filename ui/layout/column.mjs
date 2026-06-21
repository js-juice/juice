import render from "../render.mjs";

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
