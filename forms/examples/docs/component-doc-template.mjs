const body = document.body;
const defaultComponent = (body.dataset.defaultComponent || "form-info").trim();
const componentsRoot = (body.dataset.componentsRoot || "../../components").replace(/\/+$/, "");
const defaultManifest = (body.dataset.defaultManifest || `${componentsRoot}/component-manifest.json`).trim();

const refs = {
    title: document.getElementById("page-title"),
    subtitle: document.getElementById("page-subtitle"),
    componentInput: document.getElementById("component-input"),
    componentList: document.getElementById("component-list"),
    loadButton: document.getElementById("load-doc-button"),
    copyLinkButton: document.getElementById("copy-link-button"),
    sourceLine: document.getElementById("doc-source"),
    overview: document.getElementById("doc-overview"),
    features: document.getElementById("doc-features"),
    exampleCode: document.getElementById("doc-example-code"),
    examplePreview: document.getElementById("doc-example-preview"),
    attributes: document.getElementById("doc-attributes"),
    properties: document.getElementById("doc-properties"),
    cssVariables: document.getElementById("doc-css-variables"),
    parts: document.getElementById("doc-parts"),
    publicMethods: document.getElementById("doc-public-methods"),
    privateMethods: document.getElementById("doc-private-methods"),
};

let cachedManifest = null;

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function resolveComponentFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const component = (params.get("component") || "").trim();
    return (component || defaultComponent).toLowerCase();
}

function resolveSourceFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const src = (params.get("src") || "").trim();
    return src || null;
}

function resolveManifestFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const manifest = (params.get("manifest") || "").trim();
    return manifest || defaultManifest;
}

function setStatus(text) {
    refs.sourceLine.textContent = text;
}

function toFeatureEntry(rawLine) {
    const text = rawLine.replace(/^- /, "").trim();
    const colon = text.indexOf(":");
    if (colon === -1) return { name: text, description: "" };
    return {
        name: text.slice(0, colon).trim(),
        description: text.slice(colon + 1).trim(),
    };
}

function toKeyedEntries(rawLine) {
    const text = rawLine.replace(/^- /, "").trim();
    const multiTokenWithDescription = text.match(/^((?:`[^`]+`\s*,\s*)*`[^`]+`)\s*:\s*(.+)$/);
    if (multiTokenWithDescription) {
        const tokenList = Array.from(multiTokenWithDescription[1].matchAll(/`([^`]+)`/g))
            .map((token) => token[1].trim())
            .filter(Boolean);
        const description = (multiTokenWithDescription[2] || "").trim();
        return tokenList.map((name) => ({
            name,
            type: "",
            description: description || "Documented in component notes.",
        }));
    }

    const match = text.match(/^`([^`]+)`(?:\s+\(([^)]+)\))?:\s*(.+)$/);
    if (match) {
        return [{
            name: match[1].trim(),
            type: match[2] ? match[2].trim() : "",
            description: (match[3] || "").trim(),
        }];
    }

    const plainMatch = text.match(/^`([^`]+)`:\s*(.+)$/);
    if (plainMatch) {
        return [{
            name: plainMatch[1].trim(),
            type: "",
            description: (plainMatch[2] || "").trim(),
        }];
    }

    const tokenMatches = Array.from(text.matchAll(/`([^`]+)`/g))
        .map((token) => token[1].trim())
        .filter(Boolean);

    if (tokenMatches.length) {
        let description = "";
        if (text.startsWith("`") && tokenMatches.length === 1) {
            const firstTokenLiteral = `\`${tokenMatches[0]}\``;
            description = text
                .slice(firstTokenLiteral.length)
                .replace(/^\s*[:,-]?\s*/, "")
                .trim();
        } else if (/such as/i.test(text)) {
            description = text
                .split(/such as/i)[0]
                .trim()
                .replace(/[:,-]\s*$/, "");
        } else if (text.includes(":")) {
            description = text.slice(0, text.indexOf(":")).trim();
        } else {
            description = text
                .replace(/`[^`]+`/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .replace(/[:.,;]\s*$/, "");
        }

        if (!description) description = "Documented in component notes.";
        return tokenMatches.map((name) => ({
            name,
            type: "",
            description,
        }));
    }

    return [{
        name: "",
        type: "",
        description: text,
    }];
}

function pushUniqueEntries(target, entries) {
    for (const entry of entries) {
        const normalizedName = (entry.name || "").trim();
        if (!normalizedName) {
            target.push(entry);
            continue;
        }
        const existing = target.find((item) => (item.name || "").trim() === normalizedName);
        if (existing) {
            if (!existing.description && entry.description) existing.description = entry.description;
            if (!existing.type && entry.type) existing.type = entry.type;
            continue;
        }
        target.push(entry);
    }
}

function parseAutodoc(source) {
    const blockMatch =
        source.match(/\/\*\*[\s\S]*?AUTODOC:START([\s\S]*?)AUTODOC:END[\s\S]*?\*\//m) || null;
    if (!blockMatch) return null;

    const lines = blockMatch[1]
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*\*\s?/, "").trim())
        .filter((line) => line.length > 0);

    const data = {
        tag: "",
        className: "",
        overview: "",
        features: [],
        attributes: [],
        properties: [],
        cssVariables: [],
        parts: [],
        example: "",
    };

    let section = "";
    const exampleLines = [];

    for (const line of lines) {
        if (line.startsWith("Component:")) {
            const tagMatch = line.match(/<([^>]+)>/);
            data.tag = tagMatch ? tagMatch[1].trim() : "";
            section = "";
            continue;
        }
        if (line.startsWith("Class:")) {
            data.className = line.slice("Class:".length).trim();
            section = "";
            continue;
        }
        if (line.startsWith("Overview:")) {
            data.overview = line.slice("Overview:".length).trim();
            section = "";
            continue;
        }
        if (line === "Features:") {
            section = "features";
            continue;
        }
        if (line === "Example:") {
            section = "example";
            continue;
        }
        if (line === "Attribute Reference:") {
            section = "attributes";
            continue;
        }
        if (line === "Property Reference:") {
            section = "properties";
            continue;
        }
        if (line === "CSS Variables:") {
            section = "cssVariables";
            continue;
        }
        if (line === "Part Names:") {
            section = "parts";
            continue;
        }

        if (section === "features" && line.startsWith("- ")) {
            data.features.push(toFeatureEntry(line));
            continue;
        }
        if (section === "attributes" && line.startsWith("- ")) {
            pushUniqueEntries(data.attributes, toKeyedEntries(line));
            continue;
        }
        if (section === "properties" && line.startsWith("- ")) {
            pushUniqueEntries(data.properties, toKeyedEntries(line));
            continue;
        }
        if (section === "cssVariables" && line.startsWith("- ")) {
            pushUniqueEntries(data.cssVariables, toKeyedEntries(line));
            continue;
        }
        if (section === "parts" && line.startsWith("- ")) {
            pushUniqueEntries(data.parts, toKeyedEntries(line));
            continue;
        }
        if (section === "example") {
            exampleLines.push(line.replace(/^- /, "").trim());
        }
    }

    const rawExample = exampleLines.join("\n").trim();
    if (rawExample.startsWith("`") && rawExample.endsWith("`")) {
        data.example = rawExample.slice(1, -1).trim();
    } else {
        data.example = rawExample;
    }

    return data;
}

function parseComponentDefinition(source) {
    const match =
        source.match(/customElements\.define\(\s*["'`]([^"'`]+)["'`]\s*,\s*([A-Za-z_$][\w$]*)\s*[\),]/) || null;
    if (!match) return null;
    return { tag: match[1], className: match[2] };
}

function extractObservedAttributes(source) {
    const observed = [];
    const match = source.match(/static\s+get\s+observedAttributes\s*\(\)\s*\{([\s\S]*?)\}/m);
    if (!match) return observed;
    const bodyText = match[1];
    const re = /["'`]([^"'`]+)["'`]/g;
    let token = re.exec(bodyText);
    while (token) {
        const value = token[1].trim();
        if (value && !observed.includes(value)) observed.push(value);
        token = re.exec(bodyText);
    }
    return observed;
}

function parseMethodDocs(source) {
    const methods = [];
    const re =
        /\/\*\*([\s\S]*?)\*\/\s*\n\s*(static\s+)?(async\s+)?(?:(get|set)\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;

    let match = re.exec(source);
    while (match) {
        const rawDoc = match[1] || "";
        const isStatic = Boolean(match[2]);
        const isAsync = Boolean(match[3]);
        const accessor = match[4] || "";
        const name = match[5] || "";
        const rawParams = (match[6] || "").trim();

        const lines = rawDoc
            .split(/\r?\n/)
            .map((line) => line.replace(/^\s*\*\s?/, "").trim())
            .filter(Boolean);

        const description = lines.find((line) => !line.startsWith("@")) || "";
        if (description.includes("AUTODOC:START") || description.includes("AUTODOC:END")) {
            match = re.exec(source);
            continue;
        }

        const params = [];
        for (const line of lines) {
            const paramMatch = line.match(/@param\s+\{([^}]+)\}\s+([A-Za-z_$][\w$]*)\s*-\s*(.+)$/);
            if (!paramMatch) continue;
            params.push({
                name: paramMatch[2].trim(),
                type: paramMatch[1].trim(),
                description: paramMatch[3].trim(),
            });
        }

        let returns = null;
        const returnLine = lines.find((line) => line.startsWith("@returns") || line.startsWith("@return"));
        if (returnLine) {
            const returnMatch = returnLine.match(/@returns?\s+\{([^}]+)\}\s*(.+)?$/);
            if (returnMatch) {
                returns = {
                    type: returnMatch[1].trim(),
                    description: (returnMatch[2] || "").trim(),
                };
            }
        }

        const kind = accessor ? accessor : "method";
        const visibility = name.startsWith("_") ? "private" : "public";
        let displayName = name;
        if (accessor === "get" || accessor === "set") displayName = `${accessor} ${name}`;
        if (isStatic) displayName = `static ${displayName}`;
        if (isAsync) displayName = `async ${displayName}`;

        methods.push({
            name,
            displayName,
            kind,
            visibility,
            signatureParams: rawParams
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean),
            description,
            params,
            returns,
        });

        match = re.exec(source);
    }

    return methods;
}

function normalizeManifestEntry(entry) {
    const methods = Array.isArray(entry.methods) ? entry.methods : [];
    return {
        tag: entry.tag || "",
        className: entry.className || "",
        file: entry.file || "",
        overview: entry.overview || "",
        features: Array.isArray(entry.features) ? entry.features : [],
        attributes: Array.isArray(entry.attributes) ? entry.attributes : [],
        properties: Array.isArray(entry.properties) ? entry.properties : [],
        cssVariables: Array.isArray(entry.cssVariables) ? entry.cssVariables : [],
        parts: Array.isArray(entry.parts) ? entry.parts : [],
        example: entry.example || "",
        methods: methods.map((method) => {
            const originalName = method.name || "";
            const firstToken = originalName.split(/\s+/)[0];
            const coreName = originalName.split(/\s+/).slice(-1)[0] || "";
            const visibility = coreName.startsWith("_") ? "private" : "public";
            let kind = "method";
            if (firstToken === "get" || firstToken === "set") kind = firstToken;
            return {
                name: coreName,
                displayName: originalName,
                kind,
                visibility,
                signatureParams: Array.isArray(method.signatureParams) ? method.signatureParams : [],
                description: method.description || "",
                params: Array.isArray(method.params) ? method.params : [],
                returns: method.returns || null,
            };
        }),
    };
}

async function fetchText(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return response.text();
}

async function loadFromSource(componentTag, explicitSrc = null) {
    const candidates = [];
    if (explicitSrc) {
        candidates.push(explicitSrc);
    } else {
        candidates.push(`${componentsRoot}/${componentTag}.js`, `${componentsRoot}/${componentTag}.mjs`);
    }

    for (const path of candidates) {
        const source = await fetchText(path);
        if (!source) continue;

        const autodoc = parseAutodoc(source) || {};
        const definition = parseComponentDefinition(source) || {};
        const observed = extractObservedAttributes(source);
        const methods = parseMethodDocs(source);

        return {
            source: "source",
            sourcePath: path,
            tag: autodoc.tag || definition.tag || componentTag,
            className: autodoc.className || definition.className || "",
            file: path,
            overview: autodoc.overview || "",
            features: Array.isArray(autodoc.features) ? autodoc.features : [],
            attributes: (() => {
                const fromAutodoc = Array.isArray(autodoc.attributes) ? [...autodoc.attributes] : [];
                for (const attrName of observed) {
                    const exists = fromAutodoc.some((item) => (item.name || "").trim() === attrName);
                    if (!exists) {
                        fromAutodoc.push({ name: attrName, type: "", description: "Observed attribute." });
                    }
                }
                return fromAutodoc;
            })(),
            properties: Array.isArray(autodoc.properties) ? autodoc.properties : [],
            cssVariables: Array.isArray(autodoc.cssVariables) ? autodoc.cssVariables : [],
            parts: Array.isArray(autodoc.parts) ? autodoc.parts : [],
            example: autodoc.example || `<${autodoc.tag || definition.tag || componentTag}></${autodoc.tag || definition.tag || componentTag}>`,
            methods,
        };
    }

    return null;
}

async function loadManifest(manifestPath) {
    if (cachedManifest && cachedManifest.path === manifestPath) return cachedManifest.data;
    const response = await fetch(manifestPath, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    cachedManifest = { path: manifestPath, data };
    return data;
}

async function loadFromManifest(componentTag, manifestPath) {
    const manifest = await loadManifest(manifestPath);
    if (!manifest || !Array.isArray(manifest.components)) return null;
    const entry = manifest.components.find((item) => item.tag === componentTag);
    if (!entry) return null;
    return {
        source: "manifest",
        sourcePath: manifestPath,
        ...normalizeManifestEntry(entry),
    };
}

function renderEmpty(element, text) {
    element.innerHTML = `<p class="muted">${escapeHtml(text)}</p>`;
}

function renderTable(rows, columns) {
    if (!rows.length) return `<p class="muted">None documented.</p>`;
    const head = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
    const body = rows
        .map((row) => {
            const cells = columns
                .map((column) => `<td>${column.render(row)}</td>`)
                .join("");
            return `<tr>${cells}</tr>`;
        })
        .join("");
    return `<table class="doc-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderMethodTable(methods) {
    return renderTable(methods, [
        {
            label: "Method",
            render: (method) => `<code>${escapeHtml(method.displayName || method.name)}</code>`,
        },
        {
            label: "Description",
            render: (method) => escapeHtml(method.description || ""),
        },
        {
            label: "Parameters",
            render: (method) => {
                if (!method.params || !method.params.length) return `<span class="muted">None</span>`;
                return method.params
                    .map((param) => `<div><code>${escapeHtml(param.name)}</code> <span class="muted">(${escapeHtml(param.type || "*")})</span> ${escapeHtml(param.description || "")}</div>`)
                    .join("");
            },
        },
        {
            label: "Returns",
            render: (method) => {
                if (!method.returns) return `<span class="muted">void</span>`;
                const type = escapeHtml(method.returns.type || "*");
                const description = escapeHtml(method.returns.description || "");
                return `<code>${type}</code>${description ? ` ${description}` : ""}`;
            },
        },
    ]);
}

function sanitizeExampleMarkup(markup) {
    return String(markup || "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
}

function renderDoc(doc) {
    const heading = doc.tag ? `<${doc.tag}>` : doc.className || "Component";
    refs.title.textContent = `${heading} Documentation`;
    refs.subtitle.textContent = doc.className
        ? `${doc.className}${doc.file ? ` • ${doc.file}` : ""}`
        : doc.file || "Component documentation";

    setStatus(`Loaded from ${doc.source} (${doc.sourcePath || "inline"}).`);
    refs.componentInput.value = doc.tag || "";

    if (doc.overview) {
        refs.overview.innerHTML = `<p>${escapeHtml(doc.overview)}</p>`;
    } else {
        renderEmpty(refs.overview, "No overview found.");
    }

    refs.features.innerHTML = "";
    if (doc.features && doc.features.length) {
        for (const feature of doc.features) {
            if (typeof feature === "string") {
                const li = document.createElement("li");
                li.textContent = feature;
                refs.features.appendChild(li);
                continue;
            }
            const li = document.createElement("li");
            li.innerHTML = `<strong>${escapeHtml(feature.name || "")}</strong>${feature.description ? `: ${escapeHtml(feature.description)}` : ""}`;
            refs.features.appendChild(li);
        }
    } else {
        refs.features.innerHTML = `<li class="muted">No features listed.</li>`;
    }

    const example = doc.example || (doc.tag ? `<${doc.tag}></${doc.tag}>` : "");
    refs.exampleCode.textContent = example;
    refs.examplePreview.innerHTML = sanitizeExampleMarkup(example) || `<span class="muted">No example available.</span>`;

    refs.attributes.innerHTML = renderTable(doc.attributes || [], [
        {
            label: "Name",
            render: (item) => item.name
                ? `<code>${escapeHtml(item.name || "")}</code>`
                : `<span class="muted">Note</span>`,
        },
        { label: "Type", render: (item) => escapeHtml(item.type || "") || `<span class="muted">-</span>` },
        { label: "Description", render: (item) => escapeHtml(item.description || "") },
    ]);

    refs.properties.innerHTML = renderTable(doc.properties || [], [
        {
            label: "Name",
            render: (item) => item.name
                ? `<code>${escapeHtml(item.name || "")}</code>`
                : `<span class="muted">Note</span>`,
        },
        { label: "Description", render: (item) => escapeHtml(item.description || "") },
    ]);

    refs.cssVariables.innerHTML = renderTable(doc.cssVariables || [], [
        {
            label: "Variable",
            render: (item) => item.name
                ? `<code>${escapeHtml(item.name || "")}</code>`
                : `<span class="muted">Note</span>`,
        },
        { label: "Description", render: (item) => escapeHtml(item.description || "") },
    ]);

    refs.parts.innerHTML = renderTable(doc.parts || [], [
        {
            label: "Part",
            render: (item) => item.name
                ? `<code>${escapeHtml(item.name || "")}</code>`
                : `<span class="muted">Note</span>`,
        },
        { label: "Description", render: (item) => escapeHtml(item.description || "") || `<span class="muted">-</span>` },
    ]);

    const methods = Array.isArray(doc.methods) ? doc.methods : [];
    const publicMethods = methods.filter((method) => method.visibility !== "private");
    const privateMethods = methods.filter((method) => method.visibility === "private");

    refs.publicMethods.innerHTML = renderMethodTable(publicMethods);
    refs.privateMethods.innerHTML = renderMethodTable(privateMethods);
}

function setQuery(component, src = null, manifest = null) {
    const url = new URL(window.location.href);
    if (component) url.searchParams.set("component", component);
    else url.searchParams.delete("component");
    if (src) url.searchParams.set("src", src);
    else url.searchParams.delete("src");
    if (manifest && manifest !== defaultManifest) url.searchParams.set("manifest", manifest);
    else url.searchParams.delete("manifest");
    history.replaceState({}, "", url);
}

async function loadAndRender(component, explicitSrc = null) {
    if (!component && !explicitSrc) {
        renderEmpty(refs.overview, "No component selected.");
        return;
    }

    setStatus("Loading documentation...");
    const manifestPath = resolveManifestFromQuery();

    const sourceDoc = await loadFromSource(component, explicitSrc);
    if (sourceDoc) {
        renderDoc(sourceDoc);
        return;
    }

    const manifestDoc = await loadFromManifest(component, manifestPath);
    if (manifestDoc) {
        renderDoc(manifestDoc);
        return;
    }

    refs.title.textContent = "Component Documentation";
    refs.subtitle.textContent = "";
    setStatus(`Unable to load docs for "${component}". Checked source and manifest.`);
    renderEmpty(refs.overview, "No documentation found.");
    refs.features.innerHTML = `<li class="muted">No documentation found.</li>`;
    refs.exampleCode.textContent = "";
    refs.examplePreview.innerHTML = `<span class="muted">No preview available.</span>`;
    renderEmpty(refs.attributes, "No data.");
    renderEmpty(refs.properties, "No data.");
    renderEmpty(refs.cssVariables, "No data.");
    renderEmpty(refs.parts, "No data.");
    renderEmpty(refs.publicMethods, "No data.");
    renderEmpty(refs.privateMethods, "No data.");
}

async function populateComponentPicker() {
    const manifest = await loadManifest(resolveManifestFromQuery());
    refs.componentList.innerHTML = "";
    if (!manifest || !Array.isArray(manifest.components)) return;
    for (const component of manifest.components) {
        if (!component || !component.tag) continue;
        const option = document.createElement("option");
        option.value = component.tag;
        refs.componentList.appendChild(option);
    }
}

function wireEvents() {
    refs.loadButton.addEventListener("click", async () => {
        const component = (refs.componentInput.value || "").trim().toLowerCase();
        setQuery(component, null, resolveManifestFromQuery());
        await loadAndRender(component);
    });

    refs.componentInput.addEventListener("keydown", async (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        refs.loadButton.click();
    });

    refs.copyLinkButton.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setStatus("Share link copied to clipboard.");
        } catch (_error) {
            setStatus("Unable to copy link from this browser context.");
        }
    });
}

async function init() {
    wireEvents();
    await populateComponentPicker();

    const component = resolveComponentFromQuery();
    const src = resolveSourceFromQuery();
    refs.componentInput.value = component;
    await loadAndRender(component, src);
}

init();
