const editors = new WeakSet();

export default function enhance(host) {
    const textarea = host.nativeInput;
    if (!host.hasAttribute("markdown") || host.getAttribute("markdown") === "false" || !textarea) return;
    if (editors.has(textarea) || textarea.disabled || textarea.readOnly || textarea.closest('[data-markdown="false"]')) return;
    if (host?.closest('[data-markdown="false"]')) return;
    editors.add(textarea);

    const panel = document.createElement("div");
    panel.style.cssText = "display:block;width:100%;font:14px/1.5 system-ui;margin:6px 0;";
    const toolbar = document.createElement("div");
    toolbar.setAttribute("role", "group");
    toolbar.setAttribute("aria-label", "Markdown formatting");
    toolbar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;";
    const preview = document.createElement("div");
    preview.hidden = true;
    preview.setAttribute("aria-live", "polite");
    preview.style.cssText = "padding:12px;border:1px solid #94a3b8;border-radius:4px;overflow:auto;max-height:400px;background:white;color:#0f172a;";
    panel.append(toolbar, preview);
    // Keep the toolbar outside Juice's horizontal input/status wrapper.
    host.shadowRoot.append(panel);

    function button(label, action) {
        const control = document.createElement("button");
        control.type = "button";
        control.textContent = label;
        control.style.cssText = "padding:3px 8px;border:1px solid #94a3b8;border-radius:4px;background:white;color:#0f172a;cursor:pointer;font:inherit;";
        control.addEventListener("click", action);
        toolbar.append(control);
        return control;
    }

    let revision = 0;
    textarea.addEventListener("input", () => {
        revision++;
        preview.hidden = true;
        previewButton.setAttribute("aria-expanded", "false");
    });

    function insert(before, after, placeholder) {
        if (textarea.disabled || textarea.readOnly) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.slice(start, end) || placeholder;
        textarea.setRangeText(before + selected + after, start, end, "end");
        textarea.focus();
        textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
        textarea.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    }

    button("Bold", () => insert("**", "**", "bold text"));
    button("Italic", () => insert("*", "*", "italic text"));
    button("Link", () => insert("[", "](https://example.com)", "link text"));
    button("Code", () => insert("`", "`", "code"));
    const previewButton = button("Preview", async () => {
        if (!preview.hidden) {
            preview.hidden = true;
            previewButton.setAttribute("aria-expanded", "false");
            return;
        }
        const requestedRevision = revision;
        previewButton.disabled = true;
        preview.hidden = false;
        preview.textContent = "Loading preview…";
        previewButton.setAttribute("aria-expanded", "true");
        try {
            const html = await new Promise((resolve, reject) => {
                const event = new CustomEvent("markdown-preview", {
                    bubbles: true, composed: true, cancelable: true,
                    detail: { source: textarea.value, resolve, reject },
                });
                if (host.dispatchEvent(event)) reject(new Error("No Markdown preview renderer configured."));
            });
            if (revision === requestedRevision) {
                // HTML comes exclusively from the shared server-side Markdown compiler.
                preview.innerHTML = html;
            }
        } catch {
            if (revision === requestedRevision) preview.textContent = "Preview could not load. Please try again.";
        } finally {
            previewButton.disabled = false;
        }
    });
    previewButton.setAttribute("aria-expanded", "false");
}

