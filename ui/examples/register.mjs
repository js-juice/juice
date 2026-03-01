import {
    BarGauge,
    Checklist,
    ChecklistItem,
    ExpandableList,
    Key,
    KeyGroup,
    ScrollBar,
    ScrollView,
    ShapeCircle,
    ShapeSquare,
    SortableList,
    UIContent,
    UIProgress,
    UITabs
} from "../index.mjs";

if (!customElements.get("ui-key")) {
    customElements.define("ui-key", Key);
}

if (!customElements.get("ui-key-group")) {
    customElements.define("ui-key-group", KeyGroup);
}

if (!customElements.get("scroll-bar")) {
    customElements.define("scroll-bar", ScrollBar);
}

if (!customElements.get("scroll-view")) {
    customElements.define("scroll-view", ScrollView);
}

if (!customElements.get("gauge-bar")) {
    customElements.define("gauge-bar", BarGauge);
}

if (!customElements.get("shape-circle")) {
    customElements.define("shape-circle", ShapeCircle);
}

if (!customElements.get("shape-square")) {
    customElements.define("shape-square", ShapeSquare);
}

if (!customElements.get("sortable-list")) {
    customElements.define("sortable-list", SortableList);
}

if (!customElements.get("expandable-list")) {
    customElements.define("expandable-list", ExpandableList);
}

if (!customElements.get("ui-checklist-item")) {
    customElements.define("ui-checklist-item", ChecklistItem);
}

if (!customElements.get("ui-checklist")) {
    customElements.define("ui-checklist", Checklist);
}

if (!customElements.get("ui-content")) {
    customElements.define("ui-content", UIContent);
}

if (!customElements.get("ui-tabs")) {
    customElements.define("ui-tabs", UITabs);
}

if (!customElements.get("ui-progress")) {
    customElements.define("ui-progress", UIProgress);
}
