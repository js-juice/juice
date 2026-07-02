function parsePositiveInt(value) {
    const number = parseInt(String(value ?? "").trim(), 10);
    if (!Number.isFinite(number) || number < 0) return null;
    return number;
}

export function normalizeLengthBasis(value) {
    const basis = String(value || "text").trim().toLowerCase();
    return basis === "html" ? "html" : "text";
}

export function getEditorPlainText(editor) {
    if (!editor) return "";
    return String(editor.textContent || "")
        .replace(/\u200B/g, "")
        .trimEnd();
}

export function getEditorValidationContent(editor, basis = "text", htmlValue = "") {
    if (normalizeLengthBasis(basis) === "html") {
        return String(htmlValue || editor?.innerHTML || "");
    }
    return getEditorPlainText(editor);
}

export function getEditorMeasuredLength(editor, basis = "text", htmlValue = "") {
    return getEditorValidationContent(editor, basis, htmlValue).length;
}

export function getSelectedMeasuredLength(selection, editor, basis = "text") {
    if (!selection?.rangeCount || !editor) return 0;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return 0;

    if (normalizeLengthBasis(basis) === "html") {
        const fragment = range.cloneContents();
        const wrapper = document.createElement("div");
        wrapper.appendChild(fragment);
        return wrapper.innerHTML.length;
    }

    return String(selection.toString() || "").replace(/\u200B/g, "").length;
}

export function resolveLengthLimits({ minlength = null, maxlength = null, validation = "" } = {}) {
    let min = null;
    let max = null;

    const minlengthValue = parsePositiveInt(minlength);
    const maxlengthValue = parsePositiveInt(maxlength);
    if (minlengthValue != null) min = minlengthValue;
    if (maxlengthValue != null) max = maxlengthValue;

    String(validation || "")
        .split("|")
        .map((token) => token.trim())
        .filter(Boolean)
        .forEach((token) => {
            const normalized = token.toLowerCase();
            if (normalized.startsWith("min:")) {
                const value = parsePositiveInt(token.slice(4));
                if (value != null) min = min == null ? value : Math.max(min, value);
                return;
            }
            if (normalized.startsWith("max:")) {
                const value = parsePositiveInt(token.slice(4));
                if (value != null) max = max == null ? value : Math.min(max, value);
                return;
            }
            if (normalized.startsWith("length:")) {
                const [minPart, maxPart] = token.slice(7).split(",");
                const minValue = parsePositiveInt(minPart);
                const maxValue = parsePositiveInt(maxPart);
                if (minValue != null) min = min == null ? minValue : Math.max(min, minValue);
                if (maxValue != null) max = max == null ? maxValue : Math.min(max, maxValue);
            }
        });

    return { min, max };
}

export function incomingMeasuredLength(event, basis = "text") {
    const normalizedBasis = normalizeLengthBasis(basis);
    const type = String(event?.inputType || "");

    if (normalizedBasis === "html" && (type === "insertFromPaste" || type === "insertFromDrop")) {
        const html = event.dataTransfer?.getData("text/html") ?? "";
        if (html) return html.length;
    }

    return incomingTextLength(event);
}

export function incomingTextLength(event) {
    const type = String(event?.inputType || "");
    if (type === "insertText") {
        return String(event.data || "").length;
    }
    if (type === "insertFromPaste" || type === "insertFromDrop") {
        const pasted = event.dataTransfer?.getData("text/plain") ?? event.data ?? "";
        return String(pasted).length;
    }
    return 0;
}
