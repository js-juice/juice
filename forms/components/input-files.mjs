/**
 * AUTODOC:START
 * Component: <input-files>
 * Class: InputFilesComponent
 * Overview: Multi-file picker with click and drag/drop selection, image thumbnails, file icons, and removal.
 *
 * Example:
 * `<input-files name="attachments[]" label="Attachments" accept="image/*,.pdf" required></input-files>`
 *
 * Events:
 * - `input`, `change`: Fired whenever the selected file list changes.
 * - `files-change`: Includes `files`, `rejected`, and `duplicates` in `event.detail`.
 *
 * CSS Parts:
 * - `drop-area`, `file-list`, `file`, `preview`, `remove`, `status`.
 * AUTODOC:END
 */

import { getJuiceConfig } from "../../config/juice-config.mjs";
import {
    fileExtension,
    fileIdentity,
    fileKind,
    fileMatchesAccept,
    formatFileSize,
    mergeFiles
} from "./input-files-utils.mjs";

const FILE_ICON_PATH = "M7 2.75h6.75L19 8v13.25H7z M13.75 2.75V8H19";

class InputFilesComponent extends HTMLElement {
    static tag = "input-files";
    static formAssociated = true;

    static get observedAttributes() {
        return [
            "accept",
            "accent-color",
            "aria-label",
            "disabled",
            "instruction",
            "label",
            "name",
            "required",
            "required-message"
        ];
    }

    constructor() {
        super();
        this._internals = this.attachInternals?.() || null;
        this._shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
        this._files = [];
        this._objectUrls = new Map();
        this._dragDepth = 0;
        this._rejectedFiles = [];

        this._onBrowse = () => this._openPicker();
        this._onNativeChange = () => this.addFiles(this._native.files);
        this._onDragEnter = (event) => this._handleDragEnter(event);
        this._onDragOver = (event) => this._handleDragOver(event);
        this._onDragLeave = (event) => this._handleDragLeave(event);
        this._onDrop = (event) => this._handleDrop(event);
        this._onListClick = (event) => this._handleListClick(event);

        this._shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    box-sizing: border-box;
                    width: 100%;
                    color: var(--input-files-color, inherit);
                    font: inherit;
                }

                *, *::before, *::after {
                    box-sizing: border-box;
                }

                .drop-area {
                    display: grid;
                    place-items: center;
                    width: 100%;
                    min-height: var(--input-files-drop-height, 10rem);
                    padding: var(--input-files-drop-padding, 1.5rem);
                    border: var(--input-files-border, 2px dashed #a8b3c5);
                    border-radius: var(--input-files-border-radius, var(--input-border-radius, 0.75rem));
                    background: var(--input-files-background, #f7f9fc);
                    color: inherit;
                    font: inherit;
                    text-align: center;
                    cursor: pointer;
                    transition: border-color 140ms ease, background-color 140ms ease, transform 140ms ease;
                }

                .drop-area:hover,
                .drop-area:focus-visible,
                :host([drag-active]) .drop-area {
                    border-color: var(--input-files-accent, #2f5ea6);
                    background: var(--input-files-active-background, #edf3ff);
                }

                .drop-area:focus-visible {
                    outline: 3px solid color-mix(in srgb, var(--input-files-accent, #2f5ea6) 28%, transparent);
                    outline-offset: 2px;
                }

                :host([drag-active]) .drop-area {
                    transform: scale(1.005);
                }

                :host([disabled]) .drop-area {
                    cursor: not-allowed;
                    opacity: 0.58;
                }

                .drop-content {
                    display: grid;
                    justify-items: center;
                    gap: 0.4rem;
                    pointer-events: none;
                }

                .upload-icon {
                    width: 2rem;
                    height: 2rem;
                    color: var(--input-files-accent, #2f5ea6);
                }

                .label {
                    font-weight: 700;
                }

                .instruction {
                    color: var(--input-files-muted-color, #667085);
                    font-size: 0.9em;
                }

                .native {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    overflow: hidden;
                    clip: rect(0 0 0 0);
                    clip-path: inset(50%);
                    white-space: nowrap;
                }

                .file-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(min(100%, 10rem), 1fr));
                    gap: var(--input-files-gap, 0.75rem);
                    margin-top: var(--input-files-gap, 0.75rem);
                }

                .file-list:empty {
                    display: none;
                }

                .file {
                    position: relative;
                    display: grid;
                    grid-template-rows: 7rem auto;
                    min-width: 0;
                    overflow: hidden;
                    border: var(--input-files-item-border, 1px solid #d8dee8);
                    border-radius: var(--input-files-item-radius, 0.65rem);
                    background: var(--input-files-item-background, #ffffff);
                }

                .preview {
                    display: grid;
                    place-items: center;
                    min-width: 0;
                    min-height: 0;
                    overflow: hidden;
                    background: var(--input-files-preview-background, #eef1f5);
                }

                .thumbnail {
                    display: block;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .file-icon {
                    position: relative;
                    display: grid;
                    place-items: center;
                    width: 3.5rem;
                    height: 4rem;
                    color: var(--input-files-accent, #2f5ea6);
                }

                .file-icon svg {
                    width: 100%;
                    height: 100%;
                    fill: color-mix(in srgb, currentColor 10%, white);
                    stroke: currentColor;
                    stroke-width: 1.4;
                    stroke-linejoin: round;
                }

                .extension {
                    position: absolute;
                    inset: auto 0 0.7rem;
                    overflow: hidden;
                    padding: 0 0.2rem;
                    font-size: 0.62rem;
                    font-weight: 800;
                    line-height: 1;
                    text-align: center;
                    text-overflow: ellipsis;
                    text-transform: uppercase;
                    white-space: nowrap;
                }

                .file-details {
                    display: grid;
                    gap: 0.15rem;
                    min-width: 0;
                    padding: 0.65rem 2.5rem 0.65rem 0.7rem;
                }

                .file-name {
                    overflow: hidden;
                    font-size: 0.9rem;
                    font-weight: 650;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .file-meta {
                    color: var(--input-files-muted-color, #667085);
                    font-size: 0.76rem;
                    text-transform: capitalize;
                }

                .remove {
                    position: absolute;
                    right: 0.45rem;
                    bottom: 0.55rem;
                    display: grid;
                    place-items: center;
                    width: 1.75rem;
                    height: 1.75rem;
                    padding: 0;
                    border: 0;
                    border-radius: 50%;
                    background: var(--input-files-remove-background, #edf0f4);
                    color: var(--input-files-remove-color, #344054);
                    font: inherit;
                    font-size: 1.15rem;
                    line-height: 1;
                    cursor: pointer;
                }

                .remove:hover,
                .remove:focus-visible {
                    background: var(--input-files-remove-active-background, #dfe5ec);
                }

                .status {
                    min-height: 1.25em;
                    margin: 0.45rem 0 0;
                    color: var(--input-files-muted-color, #667085);
                    font-size: 0.82rem;
                }

                .status[data-error="true"] {
                    color: var(--input-invalid-color, #b42318);
                }
            </style>
            <input class="native" type="file" multiple tabindex="-1" aria-hidden="true">
            <button class="drop-area" type="button" part="drop-area">
                <span class="drop-content">
                    <svg class="upload-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="label"></span>
                    <span class="instruction"></span>
                </span>
            </button>
            <div class="file-list" part="file-list"></div>
            <p class="status" part="status" role="status" aria-live="polite"></p>
        `;

        this._native = this._shadow.querySelector(".native");
        this._dropArea = this._shadow.querySelector(".drop-area");
        this._label = this._shadow.querySelector(".label");
        this._instruction = this._shadow.querySelector(".instruction");
        this._list = this._shadow.querySelector(".file-list");
        this._status = this._shadow.querySelector(".status");
    }

    connectedCallback() {
        this._dropArea.addEventListener("click", this._onBrowse);
        this._dropArea.addEventListener("dragenter", this._onDragEnter);
        this._dropArea.addEventListener("dragover", this._onDragOver);
        this._dropArea.addEventListener("dragleave", this._onDragLeave);
        this._dropArea.addEventListener("drop", this._onDrop);
        this._native.addEventListener("change", this._onNativeChange);
        this._list.addEventListener("click", this._onListClick);
        this._syncAttributes();
        this._renderFiles();
        this._syncFormValue();
    }

    disconnectedCallback() {
        this._dropArea.removeEventListener("click", this._onBrowse);
        this._dropArea.removeEventListener("dragenter", this._onDragEnter);
        this._dropArea.removeEventListener("dragover", this._onDragOver);
        this._dropArea.removeEventListener("dragleave", this._onDragLeave);
        this._dropArea.removeEventListener("drop", this._onDrop);
        this._native.removeEventListener("change", this._onNativeChange);
        this._list.removeEventListener("click", this._onListClick);
        this._clearObjectUrls();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        this._syncAttributes();
        this._syncFormValue();
    }

    addFiles(incoming) {
        if (this.disabled) return;

        const previousCount = this._files.length;
        const result = mergeFiles(this._files, incoming, this.accept);
        this._files = result.files;
        this._rejectedFiles = result.rejected;
        this._renderFiles();
        this._syncNativeFiles();
        this._syncFormValue();
        this._announceSelection(result);

        this._dispatchFilesChange(result, result.files.length !== previousCount);
    }

    removeFile(fileOrIdentity) {
        const identity = typeof fileOrIdentity === "string" ? fileOrIdentity : fileIdentity(fileOrIdentity);
        const next = this._files.filter((file) => fileIdentity(file) !== identity);
        if (next.length === this._files.length) return false;

        this._files = next;
        this._rejectedFiles = [];
        this._renderFiles();
        this._syncNativeFiles();
        this._syncFormValue();
        this._announceSelection({ files: next, rejected: [], duplicates: [] });
        this._dispatchFilesChange({ files: next, rejected: [], duplicates: [] });
        return true;
    }

    clear() {
        if (this._files.length === 0) return;
        this._files = [];
        this._rejectedFiles = [];
        this._native.value = "";
        this._renderFiles();
        this._syncFormValue();
        this._announceSelection({ files: [], rejected: [], duplicates: [] });
        this._dispatchFilesChange({ files: [], rejected: [], duplicates: [] });
    }

    _syncAttributes() {
        if (!this._native || !this._dropArea) return;

        const config = getJuiceConfig("forms") || {};
        const theme = config.theme || {};
        this.style.setProperty(
            "--input-files-accent",
            this.getAttribute("accent-color") || theme.inputButtonBgColor || "#2f5ea6"
        );

        this._label.textContent = this.getAttribute("label") || "Upload files";
        this._instruction.textContent = this.getAttribute("instruction") || "Drop files here or click to browse";
        this._native.accept = this.accept;
        this._native.disabled = this.disabled;
        this._dropArea.disabled = this.disabled;

        const ariaLabel = this.getAttribute("aria-label");
        this._dropArea.setAttribute("aria-label", ariaLabel || `${this._label.textContent}. ${this._instruction.textContent}`);
    }

    _openPicker() {
        if (this.disabled) return;
        this._native.click();
    }

    _handleDragEnter(event) {
        if (this.disabled || !this._hasFiles(event.dataTransfer)) return;
        event.preventDefault();
        this._dragDepth += 1;
        this.setAttribute("drag-active", "");
    }

    _handleDragOver(event) {
        if (this.disabled || !this._hasFiles(event.dataTransfer)) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        this.setAttribute("drag-active", "");
    }

    _handleDragLeave(event) {
        if (this.disabled) return;
        event.preventDefault();
        this._dragDepth = Math.max(0, this._dragDepth - 1);
        if (this._dragDepth === 0) this.removeAttribute("drag-active");
    }

    _handleDrop(event) {
        if (this.disabled) return;
        event.preventDefault();
        this._dragDepth = 0;
        this.removeAttribute("drag-active");
        this.addFiles(event.dataTransfer?.files || []);
    }

    _hasFiles(dataTransfer) {
        if (!dataTransfer) return false;
        if (Array.from(dataTransfer.types || []).includes("Files")) return true;
        return Array.from(dataTransfer.files || []).length > 0;
    }

    _handleListClick(event) {
        const button = event.target instanceof Element ? event.target.closest("button[data-file]") : null;
        if (!button || this.disabled) return;
        this.removeFile(button.dataset.file);
    }

    _renderFiles() {
        this._clearObjectUrls();
        this._list.replaceChildren(...this._files.map((file) => this._createFileCard(file)));
    }

    _createFileCard(file) {
        const card = document.createElement("article");
        card.className = "file";
        card.setAttribute("part", "file");

        const preview = document.createElement("div");
        preview.className = "preview";
        preview.setAttribute("part", "preview");
        const kind = fileKind(file);

        if (kind === "image" && typeof URL.createObjectURL === "function") {
            const url = URL.createObjectURL(file);
            this._objectUrls.set(fileIdentity(file), url);
            const image = document.createElement("img");
            image.className = "thumbnail";
            image.src = url;
            image.alt = "";
            preview.append(image);
        } else {
            preview.append(this._createFileIcon(file));
        }

        const details = document.createElement("div");
        details.className = "file-details";

        const name = document.createElement("span");
        name.className = "file-name";
        name.textContent = file.name;
        name.title = file.name;

        const meta = document.createElement("span");
        meta.className = "file-meta";
        meta.textContent = `${kind} - ${formatFileSize(file.size)}`;
        details.append(name, meta);

        const remove = document.createElement("button");
        remove.className = "remove";
        remove.type = "button";
        remove.dataset.file = fileIdentity(file);
        remove.setAttribute("part", "remove");
        remove.setAttribute("aria-label", `Remove ${file.name}`);
        remove.textContent = "x";

        card.append(preview, details, remove);
        return card;
    }

    _createFileIcon(file) {
        const icon = document.createElement("span");
        icon.className = "file-icon";
        icon.setAttribute("aria-hidden", "true");

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", FILE_ICON_PATH);
        svg.append(path);

        const extension = document.createElement("span");
        extension.className = "extension";
        extension.textContent = fileExtension(file) || "FILE";
        icon.append(svg, extension);
        return icon;
    }

    _clearObjectUrls() {
        for (const url of this._objectUrls.values()) URL.revokeObjectURL(url);
        this._objectUrls.clear();
    }

    _syncNativeFiles() {
        if (typeof DataTransfer !== "function") return;
        const transfer = new DataTransfer();
        this._files.forEach((file) => transfer.items.add(file));
        this._native.files = transfer.files;
    }

    _syncFormValue() {
        if (!this._internals) return;

        if (this.required && this._files.length === 0 && !this.disabled) {
            this._internals.setValidity(
                { valueMissing: true },
                this.getAttribute("required-message") || "Select at least one file.",
                this._dropArea
            );
        } else {
            this._internals.setValidity({});
        }

        const name = this.name;
        if (!name || this.disabled || this._files.length === 0) {
            this._internals.setFormValue(null);
            return;
        }

        const formData = new FormData();
        this._files.forEach((file) => formData.append(name, file, file.name));
        this._internals.setFormValue(formData);
    }

    _announceSelection({ files, rejected, duplicates }) {
        const messages = [];
        if (files.length) messages.push(`${files.length} file${files.length === 1 ? "" : "s"} selected.`);
        else messages.push("No files selected.");
        if (rejected.length) messages.push(`${rejected.length} file${rejected.length === 1 ? " was" : "s were"} not accepted.`);
        if (duplicates.length) messages.push(`${duplicates.length} duplicate${duplicates.length === 1 ? " was" : "s were"} skipped.`);

        this._status.textContent = messages.join(" ");
        this._status.dataset.error = rejected.length ? "true" : "false";
    }

    _dispatchFilesChange(result, selectionChanged = true) {
        if (selectionChanged) {
            this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        }
        this.dispatchEvent(
            new CustomEvent("files-change", {
                bubbles: true,
                composed: true,
                detail: {
                    files: [...result.files],
                    rejected: [...result.rejected],
                    duplicates: [...result.duplicates]
                }
            })
        );
    }

    get files() {
        return [...this._files];
    }

    set files(value) {
        const result = mergeFiles([], value, this.accept);
        this._files = result.files;
        this._rejectedFiles = result.rejected;
        this._renderFiles();
        this._syncNativeFiles();
        this._syncFormValue();
        this._announceSelection(result);
    }

    get rejectedFiles() {
        return [...this._rejectedFiles];
    }

    get nativeInput() {
        return this._native;
    }

    get value() {
        return this._files.map((file) => file.name).join(",");
    }

    get name() {
        return this.getAttribute("name") || "";
    }

    get accept() {
        return this.getAttribute("accept") || "";
    }

    get disabled() {
        return this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    }

    set disabled(value) {
        if (value) this.setAttribute("disabled", "");
        else this.removeAttribute("disabled");
    }

    get required() {
        return this.hasAttribute("required") && this.getAttribute("required") !== "false";
    }

    set required(value) {
        if (value) this.setAttribute("required", "");
        else this.removeAttribute("required");
    }

    get form() {
        return this._internals?.form || null;
    }

    get validity() {
        return this._internals?.validity || null;
    }

    get validationMessage() {
        return this._internals?.validationMessage || "";
    }

    checkValidity() {
        return this._internals?.checkValidity() ?? true;
    }

    reportValidity() {
        return this._internals?.reportValidity() ?? true;
    }

    click() {
        this._dropArea?.click();
    }

    formDisabledCallback(disabled) {
        this.disabled = disabled;
    }

    formResetCallback() {
        this._files = [];
        this._rejectedFiles = [];
        this._native.value = "";
        this._renderFiles();
        this._syncFormValue();
        this._announceSelection({ files: [], rejected: [], duplicates: [] });
    }
}

if (!customElements.get(InputFilesComponent.tag)) {
    customElements.define(InputFilesComponent.tag, InputFilesComponent);
}

export { fileMatchesAccept };
export default InputFilesComponent;
