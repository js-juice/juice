import InputSelect from "./input-select.mjs";

class InputFont extends InputSelect {
    static tag = "input-font";

    static get observed() {
        return ["endpoint"];
    }

    connectedCallback() {
        super.connectedCallback();
        if (!this._fontPreviewBound) {
            this._fontPreviewBound = true;
            this.addEventListener("change", () => this.loadSelectedFont());
        }
        this.loadFonts();
    }

    async loadFonts() {
        const endpoint = this.getAttribute("endpoint");
        if (!endpoint || this._fontsLoading) return;

        this._fontsLoading = true;
        const selectedValue = this.value;

        try {
            const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
            if (!response.ok) throw new Error(`Google Fonts request failed with ${response.status}`);

            const payload = await response.json();
            const options = (Array.isArray(payload.fonts) ? payload.fonts : []).map((font) => ({
                value: `"${String(font.family).replaceAll('"', '\\"')}", ${font.category || "sans-serif"}`,
                label: font.family,
                description: font.category || ""
            }));

            this.setAttribute("options", JSON.stringify(options));
            if (selectedValue) {
                this.value = selectedValue;
                this.loadSelectedFont();
            }
        } catch (error) {
            console.error(error);
        } finally {
            this._fontsLoading = false;
        }
    }

    loadSelectedFont() {
        const match = String(this.value || "").match(/^\s*["']([^"']+)["']/);
        const family = match?.[1];
        if (!family) return;

        const id = `google-font-${family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        if (document.getElementById(id)) return;

        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replaceAll("%20", "+")}:wght@400;500;600;700&display=swap`;
        document.head.append(link);
    }
}

customElements.define(InputFont.tag, InputFont);

export default InputFont;
