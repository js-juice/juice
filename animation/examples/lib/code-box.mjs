class ExampleCodeBox extends HTMLElement {
    static tag = "example-code-box";

    static get observedAttributes() {
        return ["title", "src", "lang", "open"];
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._code = "";
        this._render();
    }

    connectedCallback() {
        this._syncTitle();
        this._syncLanguage();
        this._syncOpen();
        this._load();
    }

    attributeChangedCallback(name) {
        if (!this.shadowRoot) return;
        if (name === "title") this._syncTitle();
        if (name === "lang") this._syncLanguage();
        if (name === "open") this._syncOpen();
        if (name === "src") this._load();
    }

    set code(value) {
        this._code = typeof value === "string" ? value : "";
        this._codeNode.textContent = this._code;
    }

    get code() {
        return this._code;
    }

    _render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-top: 0.9rem;
                }

                details {
                    border: 1px solid #d6deea;
                    border-radius: 10px;
                    background: #f7f9fd;
                }

                summary {
                    cursor: pointer;
                    padding: 0.6rem 0.8rem;
                    font-weight: 600;
                    list-style: none;
                }

                summary::-webkit-details-marker {
                    display: none;
                }

                pre {
                    margin: 0;
                    padding: 0.9rem;
                    background: #0f1726;
                    color: #d6e2ff;
                    border-radius: 0 0 10px 10px;
                    overflow: auto;
                    font-size: 12px;
                    line-height: 1.4;
                }

                code {
                    display: block;
                    white-space: pre;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
                        "Courier New", monospace;
                }
            </style>
            <details>
                <summary></summary>
                <pre><code></code></pre>
            </details>
        `;

        this._details = this.shadowRoot.querySelector("details");
        this._summary = this.shadowRoot.querySelector("summary");
        this._codeNode = this.shadowRoot.querySelector("code");
    }

    _syncTitle() {
        const title = this.getAttribute("title") || "View Code";
        this._summary.textContent = title;
    }

    _syncLanguage() {
        const lang = this.getAttribute("lang") || "js";
        this._codeNode.className = `language-${lang}`;
    }

    _syncOpen() {
        if (this.hasAttribute("open")) {
            this._details.setAttribute("open", "");
        } else {
            this._details.removeAttribute("open");
        }
    }

    async _load() {
        const src = this.getAttribute("src");
        if (!src) return;

        try {
            const response = await fetch(src);
            if (!response.ok) throw new Error(`Failed to load code from ${src}`);
            this.code = await response.text();
        } catch (error) {
            this.code = `// Failed to load code from: ${src}\n// ${error.message}`;
        }
    }
}

if (!customElements.get(ExampleCodeBox.tag)) {
    customElements.define(ExampleCodeBox.tag, ExampleCodeBox);
}

export default ExampleCodeBox;

