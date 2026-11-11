import Component from "../../component.mjs";

const directory_svg = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="256" height="256" viewBox="0 0 256 256" xml:space="preserve">
<g style="stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: none; fill-rule: nonzero; opacity: 1;" transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
	<path d="M 3.649 80.444 h 82.703 c 2.015 0 3.649 -1.634 3.649 -3.649 v -56.12 c 0 -2.015 -1.634 -3.649 -3.649 -3.649 H 35.525 c -1.909 0 -3.706 -0.903 -4.846 -2.435 l -2.457 -3.301 c -0.812 -1.092 -2.093 -1.735 -3.454 -1.735 H 3.649 C 1.634 9.556 0 11.19 0 13.205 v 63.591 C 0 78.81 1.634 80.444 3.649 80.444 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(146,220,255); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
	<path d="M 86.351 80.444 H 3.649 C 1.634 80.444 0 78.81 0 76.795 V 29.11 c 0 -2.015 1.634 -3.649 3.649 -3.649 h 82.703 c 2.015 0 3.649 1.634 3.649 3.649 v 47.685 C 90 78.81 88.366 80.444 86.351 80.444 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(101,202,248); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
	<path d="M 85.106 76.854 H 4.894 c -0.276 0 -0.5 -0.224 -0.5 -0.5 s 0.224 -0.5 0.5 -0.5 h 80.213 c 0.276 0 0.5 0.224 0.5 0.5 S 85.383 76.854 85.106 76.854 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(146,220,255); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
	<path d="M 85.106 72.762 H 4.894 c -0.276 0 -0.5 -0.224 -0.5 -0.5 s 0.224 -0.5 0.5 -0.5 h 80.213 c 0.276 0 0.5 0.224 0.5 0.5 S 85.383 72.762 85.106 72.762 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(146,220,255); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
</g>
</svg>
`;

export class MediaThumbnail extends Component.HTMLElement {
    static tag = "media-browser-thumbnail";

    static config = {
        properties: {
            type: { type: "string", default: "file" },
            height: { type: "int", default: 120 },
            width: { type: "int", default: 120 }
        }
    };

    static get observed() {
        return { all: ["type", "height", "width"] };
    }

    asset = null;

    static get style() {
        return [
            {
                ".wrapper": {
                    width: "120px",
                    height: "120px"
                },
                ":host([type='image'])": {},
                ":host([type='video'])": {},
                ":host([type='document'])": {},
                ".wrapper img": {
                    width: "100%",
                    height: "100%",
                    objectFit: "contain"
                },
                ".wrapper svg": {
                    width: "100%",
                    height: "100%"
                },
                ".media": {
                    "--mediaicon-padding": "var( --icon-padding, 8px )",
                    aspectRatio: 2,
                    width: "100%",
                    backgroundColor: "#FFF",
                    border: "1px solid var(--border-color, #666)"
                },
                ".media .preview": {
                    height: "calc(100% - var(--mediaicon-padding))"
                }
            }
        ];
    }

    fileGraphic(color) {
        if (["file", "document"].includes(this.type)) {
            return `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 200 200" style="enable-background:new 0 0 200 200;" xml:space="preserve">
	<path class="file" style="fill:#FFFFFF;stroke:#000;" d="M43.39,196.46c-3.24,0-5.87-2.63-5.87-5.87V22.94c0-3.24,2.63-5.87,5.87-5.87h92.54 c1.57,0,3.04,0.61,4.15,1.72l33.6,33.59c1.11,1.11,1.72,2.58,1.72,4.15v134.07c0,3.24-2.63,5.87-5.87,5.87H43.39z"/>
	<g>
		<path style="opacity:0.21;" d="M138.66,170.3H37.28v-5.34l99.26,0c0.93,0,1.19-3.81,1.21-4.74l0.22-30.53l2.29,5.17
			c0.06,0.18,0.09,0.36,0.09,0.55v33.2C140.35,169.55,139.59,170.3,138.66,170.3z"/>
		<path style="fill:#97A9C9;" d="M37.04,171.68l-0.02-6.61h99.29c0.79,0,1.44-0.64,1.44-1.44v-32.89c0-0.79-0.64-1.44-1.44-1.44
			H30.97c-0.79,0-1.44,0.64-1.44,1.44v33.46c0,0.56,2.54,2.31,2.54,2.31"/>
		<path style="fill:none;stroke:#000000;stroke-miterlimit:10;" d="M136.14,164.97H31.14c-0.89,0-1.61-0.72-1.61-1.61V130.8
			c0-0.89,0.72-1.61,1.61-1.61h105.01c0.89,0,1.61,0.72,1.61,1.61v32.56C137.75,164.25,137.03,164.97,136.14,164.97z"/>
		<line style="fill:#E53825;stroke:#000000;stroke-linecap:round;stroke-miterlimit:10;" x1="30.16" y1="164.64" x2="37.28" y2="171.55"/>
		<linearGradient id="SVG_CORNER_SHADOW" gradientUnits="userSpaceOnUse" x1="30.6286" y1="168.1042" x2="36.8362" y2="168.1397">
			<stop  offset="0.4317" style="stop-color:#000000;stop-opacity:0"/>
			<stop  offset="1" style="stop-color:#000000;stop-opacity:0.6"/>
		</linearGradient>
		<polygon style="fill:url(#SVG_CORNER_SHADOW);" points="37.04,171.32 37.14,164.97 30.69,164.97"/>
	</g>
	<g class="tab">
		<path style="fill:#FFFFFF;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;" d="M135.94,20.76
				c0,0-0.08,35.83,0,35.91s35.78,0,35.78,0"/>
		<linearGradient id="SVG_TAB_SHADOW" gradientUnits="userSpaceOnUse" x1="155.6835" y1="60.5283" x2="155.0932" y2="87.5138">
			<stop offset="0" style="stop-color:#000000"/>
			<stop offset="0.8412" style="stop-color:#D1D2D4"/>
		</linearGradient>
		<polygon style="opacity:0.17;fill:url(#SVG_TAB_SHADOW);" points="137.75,58.98 171.76,58.98 173.13,60.76 172.92,94.04"/>
	</g>
</svg>`;
        }

        return;
    }

    mediaGraphic() {
        return this.asset?.render() || null;
    }

    static html() {
        return `<div id="preview" class="wrapper"></div>`;
    }

    constructor(mediaAsset = null) {
        super();
        this.asset = mediaAsset;
    }

    onFirstConnect() {
        this.refresh();
    }

    refresh() {
        const preview = this.ref("preview");
        if (!preview) return;
        preview.style.width = `${this.width}px`;
        preview.style.height = `${this.height}px`;
        preview.replaceChildren();
        if (this.asset && ["image", "video", "audio"].includes(this.asset.type)) {
            const media = this.mediaGraphic();
            if ("controls" in media) media.controls = false;
            media.style.pointerEvents = "none";
            media.style.width = "100%";
            media.style.height = "100%";
            media.style.objectFit = "contain";
            preview.append(media);
        } else {
            // This SVG contains only static markup.
            preview.innerHTML = this.fileGraphic() || "";
        }
    }

    onPropertyChanged() {
        this.refresh();
    }
}

/** A media descriptor. Sources and sizes are paired responsive image entries. */
export class MediaAsset {
    static allowed = ["image", "video", "audio", "document", "file"];

    static fromSource(source) {
        if (source instanceof MediaAsset) return source;
        if (source && source.nodeType === 1) {
            const tag = source.tagName.toLowerCase();
            if (!["img", "video", "audio", "picture", "source", "a"].includes(tag)) {
                throw new TypeError(`Unsupported media element: ${tag}`);
            }
            const image = tag === "picture" ? source.querySelector("img") : source;
            const sources = Array.from(source.querySelectorAll("source"));
            return new MediaAsset({
                type: tag === "img" || tag === "picture" ? "image" : ["audio", "video"].includes(tag) ? tag : "file",
                src: image?.currentSrc || image?.src || source.href || "",
                sources: sources.map((item) => item.srcset || item.src),
                sizes: sources.map((item) => item.media || ""),
                name: source.getAttribute("alt") || source.getAttribute("title") || source.textContent.trim(),
                poster: source.poster || ""
            });
        }
        return new MediaAsset(source);
    }

    type = "file";
    sources = [];
    index = 0;
    sizes = [];
    thumbIndex = 0;

    constructor(params = {}) {
        if (typeof params === "string") params = { src: params };
        if (!params || typeof params !== "object" || Array.isArray(params)) {
            throw new TypeError("A media source must be a URL, descriptor, or media element.");
        }
        if (params.type && !MediaAsset.allowed.includes(params.type) && params.type !== "dir") {
            throw new TypeError(`Unsupported media type: ${params.type}`);
        }
        const { src, ...metadata } = params;
        Object.assign(this, metadata);
        const mediaType = params.mime_type?.split("/")[0];
        this.type = params.type || (["image", "video", "audio"].includes(mediaType) ? mediaType : "file");
        this.sources = Array.isArray(params.sources) ? params.sources.slice() : [];
        this.sizes = Array.isArray(params.sizes) ? params.sizes.slice() : [];
        this.index = params.index ?? 0;
        this.fallback = params.src || params.url || this.sources[this.index] || "";
        this.name = params.name || this.fallback.split("/").pop() || params.path || this.type;
        this.path = params.path || "";
        this.poster = params.poster || "";
        this.alt = params.alt ?? this.name;
        this.id = params.id ?? null;
    }

    getThumbnail(type = this.type) {
        const thumbnail = document.createElement(MediaThumbnail.tag);
        thumbnail.asset = this;
        thumbnail.type = type;
        thumbnail.index = ++this.thumbIndex;
        thumbnail.refresh();
        return thumbnail;
    }

    render() {
        if (this.type === "image") {
            const picture = document.createElement("picture");
            for (let i = 0; i < this.sources.length; i++) {
                const source = document.createElement("source");
                const size = this.sizes[i];
                source.media =
                    typeof size === "string" ? size : size ? `(${size.property} ${size.operator} ${size.value})` : "";
                source.srcset = this.sources[i];
                picture.appendChild(source);
            }
            const img = document.createElement("img");
            img.src = this.fallback || this.src;
            img.alt = this.alt;
            img.loading = "lazy";
            picture.appendChild(img);
            return picture;
        }
        if (["video", "audio"].includes(this.type)) {
            const media = document.createElement(this.type);
            media.src = this.src;
            media.controls = true;
            media.preload = "metadata";
            if (this.type === "video" && this.poster) media.poster = this.poster;
            return media;
        }
        const link = document.createElement("a");
        link.href = this.src;
        link.textContent = this.name;
        return link;
    }

    get src() {
        return this.sources[this.index] || this.fallback || "";
    }

    /** Return a canvas without mutating the original source. */
    async resize(w, h) {
        if (this.type !== "image") throw new TypeError("Only images can be resized.");
        if (![w, h].every((value) => Number.isInteger(value) && value > 0)) {
            throw new RangeError("Image dimensions must be positive integers.");
        }
        const image = new Image();
        image.src = this.src;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(image, 0, 0, w, h);
        return canvas;
    }
}

/** In-memory directory browser; callers supply media rather than an implicit API. */
export class MediaBrowser extends Component.HTMLElement {
    static tag = "media-browser";
    dir = "/";
    selected = null;

    static config = { properties: {} };

    static html() {
        return `
            <header></header>
            <main>
                
                <slot id="assets" role="group" aria-label="Media assets"></slot>
                <div class="sticky-bar">
                    <button type="button" event="click::addDirectory">Add Directory</button>
                    <input id="dirname" type="text" aria-label="Directory name" placeholder="Directory name" />
                    <button type="button" event="click::addFile">Add File</button>
                    <input id="file-button" type="file" hidden />
                </div>
            </main>
            <footer></footer>
        <nav id="navigation" aria-label="Media directory"><button id="up" type="button">Up</button>
            <span id="path"></span></nav>
            <p id="empty" role="status">No media in this directory.</p>`;
    }

    static get style() {
        return [
            {
                ":host": { font: "inherit", color: "inherit" },
                "#navigation[hidden]": { display: "none" },
                "#navigation": { display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" },
                "#assets": {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(150px, 100%), 1fr))",
                    gap: "12px",
                    padding: "2px 2px 16px"
                },
                // Shadow-important declarations keep page button rules from overriding slotted cards.
                "::slotted(.asset)": {
                    boxSizing: "border-box !important",
                    appearance: "none !important",
                    display: "flex !important",
                    flexDirection: "column !important",
                    alignItems: "center !important",
                    justifyContent: "flex-start !important",
                    gap: "8px !important",
                    padding: "12px !important",
                    margin: "0 !important",
                    width: "100% !important",
                    minWidth: "0 !important",
                    maxWidth: "100% !important",
                    height: "auto !important",
                    border: "1px solid var(--color-border, #d4d4d4) !important",
                    borderRadius: "8px !important",
                    background: "#fff !important",
                    color: "var(--color-text, #222) !important",
                    font: "inherit !important",
                    fontWeight: "400 !important",
                    textAlign: "center !important",
                    textTransform: "none !important",
                    whiteSpace: "normal !important",
                    overflowWrap: "anywhere !important",
                    boxShadow: "none !important",
                    cursor: "pointer !important"
                },
                "::slotted(.asset:hover)": { borderColor: "var(--color-primary, #2563eb) !important" },
                "::slotted(.asset:focus-visible)": {
                    outline: "2px solid var(--color-primary, #2563eb) !important",
                    outlineOffset: "2px !important"
                },
                "::slotted(.asset[hidden])": { display: "none !important" },
                "::slotted(.asset[aria-pressed='true'])": {
                    outline: "2px solid var(--color-primary, #2563eb) !important"
                },
                main: {
                    position: "relative"
                },
                "button, #dirname": {
                    boxSizing: "border-box",
                    minHeight: "40px",
                    padding: "8px 12px",
                    border: "1px solid var(--color-border, #d4d4d4)",
                    borderRadius: "6px",
                    background: "#fff",
                    color: "var(--color-text, #222)",
                    font: "inherit"
                },
                button: { cursor: "pointer", flexShrink: "0" },
                "button:hover": { borderColor: "var(--color-primary, #2563eb)" },
                "button:focus-visible, #dirname:focus-visible": {
                    outline: "2px solid var(--color-primary, #2563eb)",
                    outlineOffset: "2px"
                },
                "#dirname": {
                    flex: "1 1 180px",
                    minWidth: "0",
                    maxWidth: "280px"
                },
                ".sticky-bar": {
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                    bottom: 0,
                    position: "sticky",
                    background: "#fff",
                    borderTop: "1px solid var(--color-border, #d4d4d4)",
                    zIndex: 1,
                    padding: "12px"
                },
                "::slotted(.directory)": {
                    display: "flex",
                    flexDirection: "column",
                    width: "120px"
                },
                "::slotted(.directory label)": {
                    display: "block",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    color: "#FFF",
                    textAlign: "center"
                }
            }
        ];
    }

    // Asset elements are the source of truth; there is no separate directory store.
    get assetElements() {
        return Array.from(this.children).filter((child) => child.mediaAsset);
    }

    get assets() {
        const directories = Object.create(null);
        directories["/"] = [];
        for (const element of this.assetElements) {
            const dir = element.dataset.dir || "/";
            (directories[dir] ||= []).push(element.mediaAsset);
            if (element.mediaAsset.type === "dir") directories[element.mediaAsset.path] ||= [];
        }
        return directories;
    }

    get media() {
        return this.assets[this.dir] || [];
    }

    addDirectory(event, name = this.ref("dirname").value) {
        const input = this.ref("dirname");
        name = name.trim();
        const path = `${this.dir === "/" ? "" : this.dir}/${name}`;
        const invalid = !name || [".", ".."].includes(name) || /[\\/]/.test(name);
        const duplicate = this.media.some((asset) => asset.type === "dir" && asset.path === path);
        input.setCustomValidity(
            invalid ? "Enter a directory name without slashes." : duplicate ? "This directory already exists." : ""
        );
        if (!input.reportValidity()) return null;
        const asset = this.insertAsset({ type: "dir", name, path });
        input.value = "";
        this.dispatchEvent(
            new CustomEvent("media-directory-added", {
                detail: { asset, dir: this.dir },
                bubbles: true,
                composed: true
            })
        );
        return asset;
    }

    addFile() {
        const input = this.ref("file-button");
        input.accept = this.getAttribute("accept") || "";
        input.click();
    }

    addFiles(files) {
        for (const file of files) {
            const event = new CustomEvent("media-file-add", {
                detail: { file, dir: this.dir },
                bubbles: true,
                composed: true,
                cancelable: true
            });
            if (!this.dispatchEvent(event)) continue;
            const url = URL.createObjectURL(file);
            const asset = this.insertAsset({ name: file.name, url, mime_type: file.type, file });
            this.assetElements.find((element) => element.mediaAsset === asset).objectUrl = url;
        }
    }

    hydrateChildren() {
        for (const child of Array.from(this.children)) {
            if (child.mediaAsset) continue;
            if (child.hasAttribute("data-media-asset")) {
                this.insertAsset(JSON.parse(child.getAttribute("data-media-asset")), child.dataset.dir || "/", child);
            } else if (["IMG", "VIDEO", "AUDIO", "PICTURE", "A"].includes(child.tagName)) {
                this.insertAsset(MediaAsset.fromSource(child), child.dataset.dir || "/", child);
            } else if (child.classList.contains("directory") || child.dataset.type === "dir") {
                this.insertAsset(
                    { type: "dir", name: child.dataset.name || child.textContent.trim(), path: child.dataset.path },
                    child.dataset.dir || "/",
                    child
                );
            } else if (child.tagName === "SCRIPT" && child.type === "application/json" && !child.dataset.loaded) {
                child.dataset.loaded = "true";
                this.loadMediaList(JSON.parse(child.textContent));
            }
        }
    }

    onFirstConnect() {
        this.ref("up").addEventListener("click", () => {
            this.loadDir(this.dir.slice(0, this.dir.lastIndexOf("/")) || "/");
        });
        this.ref("dirname").addEventListener("input", () => this.ref("dirname").setCustomValidity(""));
        this.ref("dirname").addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                this.addDirectory(event);
            }
        });
        this.ref("file-button").addEventListener("change", (event) => {
            this.addFiles(Array.from(event.target.files || []));
            event.target.value = "";
        });
        this.ref("assets").addEventListener("slotchange", () => {
            this.hydrateChildren();
            this.loadDir(this.dir);
        });
        this.hydrateChildren();
        this.loadDir(this.dir);
    }

    sorter(a, b) {
        return Number(b.type === "dir") - Number(a.type === "dir") || a.name.localeCompare(b.name);
    }

    addMediaItem(item, options = {}) {
        return this.insertAsset(MediaAsset.fromSource(item), options.dir ?? this.dir);
    }

    loadAsset(asset, dir = this.dir, source = null) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "asset";
        button.mediaAsset = asset;
        button.dataset.dir = dir;
        button.hidden = dir !== this.dir;
        // This descriptor also allows saved markup to be hydrated on the next load.
        const { file, ...descriptor } = asset;
        button.setAttribute("data-media-asset", JSON.stringify({ ...descriptor, src: asset.src }));
        if (asset.type === "dir") {
            button.dataset.path = asset.path;
            const icon = document.createElement("span");
            icon.innerHTML = directory_svg;
            icon.style.width = "120px";
            icon.style.height = "120px";
            icon.setAttribute("aria-hidden", "true");
            icon.querySelector("svg").style.cssText = "width:100%;height:100%";
            button.append(icon);
            button.addEventListener("click", () => this.loadDir(asset.path));
        } else {
            button.setAttribute("aria-pressed", String(this.selected === asset));
            button.append(asset.getThumbnail());
            button.addEventListener("click", () => {
                this.selected = asset;
                for (const item of this.assetElements) {
                    if (item.mediaAsset.type !== "dir") item.setAttribute("aria-pressed", String(item === button));
                }
                this.dispatchEvent(
                    new CustomEvent("media-selected", {
                        detail: asset,
                        bubbles: true,
                        composed: true
                    })
                );
            });
        }
        const name = document.createElement("span");
        name.textContent = asset.name;
        name.style.cssText = "display:block;max-width:100%;white-space:normal;overflow-wrap:anywhere";
        button.append(name);
        if (source) source.replaceWith(button);
        else this.append(button);
        return button;
    }

    loadDir(dir = "/") {
        if (typeof dir !== "string") throw new TypeError("A directory path must be a string.");
        this.dir = "/" + dir.split("/").filter(Boolean).join("/");
        const assets = this.media;
        const sorted = assets.slice().sort(this.sorter);
        for (const element of this.assetElements) {
            element.hidden = element.dataset.dir !== this.dir;
            element.style.order = String(sorted.indexOf(element.mediaAsset));
        }
        if (this.ref("path")) {
            this.ref("path").textContent = this.dir;
            this.ref("up").disabled = this.dir === "/";
            this.ref("navigation").hidden = this.dir === "/" && !assets.some((asset) => asset.type === "dir");
            this.ref("empty").hidden = assets.length > 0;
        }
        return assets;
    }

    insertAsset(asset, dir = this.dir, source = null) {
        asset = MediaAsset.fromSource(asset);
        if (typeof dir !== "string") throw new TypeError("A directory path must be a string.");
        dir = "/" + dir.split("/").filter(Boolean).join("/");
        if (asset.type === "dir") {
            if (!asset.path) throw new TypeError("Directory assets require a path.");
            asset.path = "/" + asset.path.split("/").filter(Boolean).join("/");
        }
        this.loadAsset(asset, dir, source);
        if (dir === this.dir) this.loadDir(dir);
        return asset;
    }

    loadSource(mediaSource) {
        if (Array.isArray(mediaSource)) return this.loadMediaList(mediaSource);
        return this.addMediaItem(mediaSource);
    }

    loadMediaSource(mediaSource) {
        return this.loadSource(mediaSource);
    }

    replaceMediaList(media) {
        if (!Array.isArray(media)) throw new TypeError("A media list must be an array.");
        const assets = media.map((source) => MediaAsset.fromSource(source));
        for (const element of this.assetElements) {
            if (element.objectUrl) URL.revokeObjectURL(element.objectUrl);
            element.remove();
        }
        for (const asset of assets) this.loadAsset(asset, "/");
        this.selected = assets.find((asset) => asset.id != null && asset.id === this.selected?.id) || null;
        this.loadDir("/");
        return assets;
    }

    loadMediaList(media) {
        if (!Array.isArray(media)) throw new TypeError("A media list must be an array.");
        return media.map((source) => this.loadSource(source));
    }
}

if (typeof customElements !== "undefined") {
    for (const component of [MediaThumbnail, MediaBrowser]) {
        if (!customElements.get(component.tag)) customElements.define(component.tag, component);
    }
}

export default MediaBrowser;
