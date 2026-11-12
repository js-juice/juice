import { getJuiceConfig } from "../config/juice-config.mjs";

function applyFormStyles() {
    if (typeof document === "undefined") return;

    let link = document.head.querySelector("link[data-juice-forms-stylesheet]");
    const href = getJuiceConfig("forms.stylesheet");
    if (href) {
        if (!link) {
            link = document.createElement("link");
            link.rel = "stylesheet";
            link.setAttribute("data-juice-forms-stylesheet", "");
            document.head.appendChild(link);
        }
        const resolved = new URL(href, document.baseURI).href;
        if (link.href !== resolved) link.href = resolved;
    } else {
        link?.remove();
    }

    let style = document.head.querySelector("style[data-juice-forms-root-styles]");
    if (!style) {
        style = document.createElement("style");
        style.setAttribute("data-juice-forms-root-styles", "");
        document.head.appendChild(style);
    }
    // Keep config overrides after the stylesheet, including when it is re-enabled.
    if (link?.isConnected) link.after(style);
    const declarations = Object.entries(getJuiceConfig("forms.styles") || {})
        .filter(([property, value]) => property.startsWith("--") && value != null)
        .map(([property, value]) => `    ${property}: ${String(value)};`)
        .join("\n");
    style.textContent = declarations ? `:where(:root, body) {\n${declarations}\n}` : "";
}

applyFormStyles();
if (typeof document !== "undefined") {
    document.addEventListener("juice:configchange", applyFormStyles);
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
import "./components/input-code.mjs";
import "./components/input-palette.mjs";
import "./components/input-colorstops.mjs";
import "./components/input-position.mjs";
import "./components/input-json.mjs";
import "./components/input-color-palette.mjs";
import "./components/input-font.mjs";
import "./components/input-style.mjs";
