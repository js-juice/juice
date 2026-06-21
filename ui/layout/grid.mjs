import render from "../render.mjs";

export default function grid(content, options = {}) {
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
