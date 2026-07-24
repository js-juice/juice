import { getJuiceConfig } from "../config/juice-config.mjs";

const ROOT_STYLE_ATTRIBUTE = "data-juice-forms-root-styles";

function applyRootStyles() {
    if (typeof document === "undefined") return;

    let style = document.head.querySelector(`style[${ROOT_STYLE_ATTRIBUTE}]`);
    if (!style) {
        style = document.createElement("style");
        style.setAttribute(ROOT_STYLE_ATTRIBUTE, "");
        document.head.appendChild(style);
    }

    const configuredStyles = getJuiceConfig("forms.styles") || {};
    const declarations = Object.entries(configuredStyles)
        .filter(([property, value]) => property.startsWith("--") && value != null)
        .map(([property, value]) => `    ${property}: ${String(value)};`)
        .join("\n");

    style.textContent = declarations ? `:root {\n${declarations}\n}` : "";
}

applyRootStyles();

if (typeof document !== "undefined") {
    document.addEventListener("juice:configchange", applyRootStyles);
}

import "./components/juice-form.mjs";
import "./components/input-checkbox.mjs";
import "./components/input-radio.mjs";
import "./components/input-range.mjs";
import "./components/input-select.mjs";
import "./components/input-button.mjs";
import "./components/input-file.mjs";
import "./components/input-image.mjs";
import "./components/input-text.mjs";
import "./components/input-number.mjs";
import "./components/input-textarea.mjs";
import "./components/input-wysiwyg.mjs";
import "./components/input-status.mjs";
import "./components/option-group.mjs";
import "./components/juice-forms.mjs";
import "./components/input-direction.mjs";
import "./components/input-rotation.mjs";
import "./components/input-angle.mjs";
import "./components/input-dial.mjs";
import "./components/input-vector.mjs";
import "./components/form-info.mjs";
import "./components/input-fieldset.mjs";
import "./components/input-buttonbar.mjs";
import "./components/input-color.mjs";
import "./components/input-palette.mjs";
import "./components/input-colorstops.mjs";
import "./components/input-position.mjs";
import "./components/input-json.mjs";
import "./components/input-color-palette.mjs";
import "./components/input-font.mjs";
import "./components/input-style.mjs";
