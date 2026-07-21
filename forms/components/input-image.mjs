import InputComponent from "./input-component.mjs";

function positiveInteger(value) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function parseAspect(value) {
    const text = String(value || "").trim();
    if (!text) return null;

    const separator = text.includes(":") ? ":" : text.includes("/") ? "/" : "";
    if (separator) {
        const [width, height] = text.split(separator).map((part) => Number.parseFloat(part));
        return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 ? width / height : null;
    }

    const aspect = Number.parseFloat(text);
    return Number.isFinite(aspect) && aspect > 0 ? aspect : null;
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();

        const cleanup = () => URL.revokeObjectURL(url);
        image.onload = () => {
            cleanup();
            resolve(image);
        };
        image.onerror = () => {
            cleanup();
            reject(new Error(`Unable to load image file: ${file.name}`));
        };
        image.src = url;
    });
}

function colorToHex(r, g, b) {
    return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

class InputImageComponent extends InputComponent {
    static tag = "input-image";

    static config = {
        native: {
            tag: "input",
            attrs: {
                type: "file",
                accept: "image/*"
            }
        },
        validation: false
    };

    static get observed() {
        return ["accept", "width", "height", "aspect", "button-label"];
    }

    constructor() {
        super({ _layout: "label:input:>:default:status:<:validation" });
        this.inputType = "image";
        this._selectedFile = null;
        this._loadedImage = null;
        this._canvas = null;
        this._context = null;
        this._fileName = null;
        this._button = null;
        this._loadToken = 0;
        this._openPicker = () => this._dom.native?.click();
    }

    static html() {
        return `
            <div class="image-input">
                <canvas class="image-canvas" part="canvas"></canvas>
                <div class="image-actions">
                    <button class="image-button" type="button" part="button">Choose image</button>
                    <span class="image-file" part="file-name"></span>
                </div>
                <native></native>
            </div>
        `;
    }

    static get styles() {
        return {
            ".image-input": {
                display: "grid",
                gap: "0.55rem",
                width: "100%"
            },
            ".image-canvas": {
                display: "block",
                width: "100%",
                maxWidth: "100%",
                aspectRatio: "var(--input-image-aspect, 1 / 1)",
                border: "var(--input-border, 1px solid #c8c8c8)",
                borderRadius: "var(--input-border-radius, 5px)",
                background: "var(--input-image-bg, #ffffff)",
                boxSizing: "border-box",
                cursor: "pointer"
            },
            ".image-actions": {
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                minWidth: 0
            },
            ".image-button": {
                flex: "0 0 auto",
                border: "1px solid transparent",
                borderRadius: "var(--input-border-radius, 5px)",
                padding: "0.45rem 0.8rem",
                font: "inherit",
                lineHeight: 1,
                cursor: "pointer",
                color: "var(--input-button-color, #ffffff)",
                background: "var(--input-button-bgcolor, #2f5ea6)"
            },
            ".image-button:disabled": {
                cursor: "not-allowed",
                opacity: 0.55
            },
            ".image-file": {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
                color: "var(--form-description-color, #48484A)"
            },
            "input.native[type='file']": {
                display: "none !important",
                width: "0 !important",
                height: "0 !important",
                padding: "0 !important",
                border: "0 !important",
                opacity: 0,
                pointerEvents: "none",
                position: "absolute"
            }
        };
    }

    _afterRender() {
        this._canvas = this._dom.default?.querySelector(".image-canvas") || null;
        this._context = this._canvas?.getContext("2d", { willReadFrequently: true }) || null;
        this._button = this._dom.default?.querySelector(".image-button") || null;
        this._fileName = this._dom.default?.querySelector(".image-file") || null;

        this._button?.addEventListener("click", this._openPicker);
        this._canvas?.addEventListener("click", this._openPicker);
        this._syncImageControls();

        if (this._loadedImage) this._drawImage(this._loadedImage);
        else this._clearCanvas();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        if (oldValue === newValue) return;

        if (name === "accept" && this._dom.native) {
            this._dom.native.accept = this.getAttribute("accept") || "image/*";
        }

        if (name === "width" || name === "height" || name === "aspect") {
            this._syncCanvasAspect();
            if (this._loadedImage) this._drawImage(this._loadedImage);
            else this._clearCanvas();
        }

        if (name === "button-label") {
            this._syncImageControls();
        }
    }

    _afterSync() {
        if (this._dom.native) {
            this._dom.native.accept = this.getAttribute("accept") || "image/*";
            this._dom.native.tabIndex = -1;
            this._dom.native.hidden = true;
            this._dom.native.style.display = "none";
        }
        this._syncCanvasAspect();
        this._syncImageControls();
    }

    _syncSingleAttribute(name) {
        if (name === "value") return;
        super._syncSingleAttribute(name);
    }

    _syncHostFromNative() {
        this._isSyncing = true;
        try {
            const fileName = this._selectedFile?.name || "";
            if (fileName) this.setAttribute("value", fileName);
            else this.removeAttribute("value");
        } finally {
            this._isSyncing = false;
        }
        this._syncVisualState();
    }

    _syncVisualState() {
        this._syncImageControls();
    }

    async _onNativeChangeEvent() {
        const file = this._dom.native?.files?.[0] || null;
        this._selectedFile = file;

        if (!file) {
            this._loadedImage = null;
            this._clearCanvas();
            this._syncImageControls();
            return;
        }

        const token = (this._loadToken += 1);
        try {
            const image = await loadImageFromFile(file);
            if (token !== this._loadToken) return;
            this._loadedImage = image;
            this._drawImage(image);
            this._syncImageControls();
            this.dispatchEvent(
                new CustomEvent("image-load", {
                    bubbles: true,
                    composed: true,
                    detail: {
                        file,
                        canvas: this.canvas,
                        imageData: this.getImageData()
                    }
                })
            );
        } catch (error) {
            if (token !== this._loadToken) return;
            this._loadedImage = null;
            this._clearCanvas();
            this._syncImageControls();
            this.dispatchEvent(
                new CustomEvent("image-error", { bubbles: true, composed: true, detail: { file, error } })
            );
        }
    }

    _resolveCanvasSize(image = this._loadedImage) {
        const naturalWidth = positiveInteger(image?.naturalWidth) || positiveInteger(image?.width) || 1;
        const naturalHeight = positiveInteger(image?.naturalHeight) || positiveInteger(image?.height) || 1;
        const naturalAspect = naturalWidth / naturalHeight || 1;
        const configuredAspect = parseAspect(this.getAttribute("aspect"));
        const aspect = configuredAspect || naturalAspect;
        let width = positiveInteger(this.getAttribute("width"));
        let height = positiveInteger(this.getAttribute("height"));

        if (width && !height) height = Math.max(1, Math.round(width / aspect));
        if (height && !width) width = Math.max(1, Math.round(height * aspect));
        if (!width && !height) {
            width = naturalWidth;
            height = configuredAspect ? Math.max(1, Math.round(width / configuredAspect)) : naturalHeight;
        }

        return { width, height, aspect: width / height || aspect };
    }

    _drawImage(image) {
        if (!this._canvas || !this._context || !image) return;

        const { width, height, aspect } = this._resolveCanvasSize(image);
        this._canvas.width = width;
        this._canvas.height = height;
        this.style.setProperty("--input-image-aspect", `${width} / ${height}`);

        this._context.clearRect(0, 0, width, height);

        const sourceWidth = image.naturalWidth || image.width;
        const sourceHeight = image.naturalHeight || image.height;
        const scale = Math.min(width / sourceWidth, height / sourceHeight);
        const drawWidth = sourceWidth * scale;
        const drawHeight = sourceHeight * scale;
        const drawX = (width - drawWidth) / 2;
        const drawY = (height - drawHeight) / 2;

        this._context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        this.style.setProperty("--input-image-aspect", `${aspect}`);
    }

    _clearCanvas() {
        if (!this._canvas || !this._context) return;
        const { width, height } = this._resolveCanvasSize();
        this._canvas.width = width;
        this._canvas.height = height;
        this._context.clearRect(0, 0, width, height);
        this._syncCanvasAspect();
    }

    _syncCanvasAspect() {
        const width = positiveInteger(this.getAttribute("width"));
        const height = positiveInteger(this.getAttribute("height"));
        const aspect = parseAspect(this.getAttribute("aspect")) || (width && height ? width / height : 1);
        this.style.setProperty("--input-image-aspect", `${aspect}`);
    }

    _syncImageControls() {
        if (this._button) {
            this._button.disabled = this.disabled;
            this._button.textContent = this.getAttribute("button-label") || this.getAttribute("label") || "Choose image";
        }
        if (this._fileName) {
            this._fileName.textContent = this._selectedFile?.name || "";
        }
    }

    _getFormValue() {
        return this._selectedFile;
    }

    get file() {
        return this._selectedFile;
    }

    get files() {
        return this._dom.native?.files || null;
    }

    get canvas() {
        return this._canvas;
    }

    get context() {
        return this._context;
    }

    get imageData() {
        return this.getImageData();
    }

    get pixels() {
        return this.getImageData()?.data || null;
    }

    getImageData() {
        if (!this._canvas || !this._context || !this._canvas.width || !this._canvas.height) return null;
        return this._context.getImageData(0, 0, this._canvas.width, this._canvas.height);
    }

    getPixel(x, y) {
        const imageData = this.getImageData();
        if (!imageData) return null;

        const pixelX = Math.floor(Number(x));
        const pixelY = Math.floor(Number(y));
        if (pixelX < 0 || pixelY < 0 || pixelX >= imageData.width || pixelY >= imageData.height) return null;

        const index = (pixelY * imageData.width + pixelX) * 4;
        const r = imageData.data[index];
        const g = imageData.data[index + 1];
        const b = imageData.data[index + 2];
        const a = imageData.data[index + 3];

        return {
            x: pixelX,
            y: pixelY,
            r,
            g,
            b,
            a,
            alpha: a / 255,
            rgb: `rgb(${r}, ${g}, ${b})`,
            rgba: `rgba(${r}, ${g}, ${b}, ${a / 255})`,
            hex: colorToHex(r, g, b)
        };
    }

    getPixelColors({ step = 1, includeTransparent = false } = {}) {
        const imageData = this.getImageData();
        if (!imageData) return [];

        const stride = Math.max(1, Math.floor(Number(step) || 1));
        const colors = [];

        for (let y = 0; y < imageData.height; y += stride) {
            for (let x = 0; x < imageData.width; x += stride) {
                const color = this.getPixel(x, y);
                if (!color || (!includeTransparent && color.a === 0)) continue;
                colors.push(color);
            }
        }

        return colors;
    }

    toDataURL(type = "image/png", quality) {
        return this._canvas ? this._canvas.toDataURL(type, quality) : "";
    }

    toBlob(type = "image/png", quality) {
        if (!this._canvas) return Promise.resolve(null);
        return new Promise((resolve) => this._canvas.toBlob(resolve, type, quality));
    }

    clear() {
        this._selectedFile = null;
        this._loadedImage = null;
        this._loadToken += 1;
        if (this._dom.native) this._dom.native.value = "";
        this.removeAttribute("value");
        this._clearCanvas();
        this._syncImageControls();
        this._updateFormValue();
        this._queueValidation();
    }

    resetInput() {
        this.clear();
    }

    get value() {
        return this._selectedFile?.name || "";
    }

    set value(value) {
        if (value == null || value === "") {
            this.clear();
        }
    }
}

customElements.define(InputImageComponent.tag, InputImageComponent);

export default InputImageComponent;
