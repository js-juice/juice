import render from "../render.mjs";

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
