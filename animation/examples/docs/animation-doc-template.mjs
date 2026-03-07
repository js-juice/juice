const body = document.body;
const sourceRoot = normRoot(body.dataset.sourceRoot || "../../");
const defaultFile = normFile(body.dataset.defaultFile || "components/stage.mjs") || "components/stage.mjs";
const entryFile = normFile(body.dataset.entryFile || "index.mjs") || "index.mjs";

const refs = {
    title: document.getElementById("page-title"),
    subtitle: document.getElementById("page-subtitle"),
    fileInput: document.getElementById("file-input"),
    fileList: document.getElementById("file-list"),
    loadButton: document.getElementById("load-doc-button"),
    copyLinkButton: document.getElementById("copy-link-button"),
    sourceLine: document.getElementById("doc-source"),
    moduleCount: document.getElementById("doc-module-count"),
    moduleList: document.getElementById("doc-module-list"),
    overview: document.getElementById("doc-overview"),
    features: document.getElementById("doc-features"),
    exports: document.getElementById("doc-exports"),
    elements: document.getElementById("doc-elements"),
    attributes: document.getElementById("doc-attributes"),
    properties: document.getElementById("doc-properties"),
    cssVariables: document.getElementById("doc-css-variables"),
    parts: document.getElementById("doc-parts"),
    publicMethods: document.getElementById("doc-public-methods"),
    privateMethods: document.getElementById("doc-private-methods"),
    sourceSnippet: document.getElementById("doc-source-snippet"),
};

const state = { discovered: [], cache: new Map() };

function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normFile(value) {
    return String(value || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\.\//, "")
        .replace(/^\/+/, "");
}

function normRoot(value) {
    const v = String(value || "").trim().replace(/\\/g, "/").replace(/\/+$/, "");
    return (v || "../../") + "/";
}

function query(name) {
    const params = new URLSearchParams(window.location.search);
    return (params.get(name) || "").trim();
}

function setQuery(file) {
    const url = new URL(window.location.href);
    const normalized = normFile(file);
    if (normalized) url.searchParams.set("file", normalized);
    else url.searchParams.delete("file");
    history.replaceState({}, "", url);
}

function status(text) {
    refs.sourceLine.textContent = text;
}

function balanced(source, openIndex, openChar = "{", closeChar = "}") {
    if (openIndex < 0 || source[openIndex] !== openChar) return null;
    let depth = 0;
    for (let i = openIndex; i < source.length; i += 1) {
        const ch = source[i];
        if (ch === openChar) depth += 1;
        if (ch === closeChar) depth -= 1;
        if (depth === 0) return { start: openIndex, end: i, body: source.slice(openIndex + 1, i) };
    }
    return null;
}

function parseTag(line) {
    const m = line.match(/^@(\w+)\s*(.*)$/);
    if (!m) return null;
    const tag = m[1].toLowerCase();
    let rest = (m[2] || "").trim();
    let type = "";
    if (rest.startsWith("{")) {
        const close = rest.indexOf("}");
        if (close > 0) {
            type = rest.slice(1, close).trim();
            rest = rest.slice(close + 1).trim();
        }
    }
    let name = "";
    if (rest.length) {
        const nm = rest.match(/^(\[[^\]]+\]|[^\s]+)\s*(.*)$/);
        if (nm) {
            name = (nm[1] || "").replace(/^\[|\]$/g, "").trim();
            rest = (nm[2] || "").trim();
        }
    }
    if (rest.startsWith("-")) rest = rest.slice(1).trim();
    if ((tag === "return" || tag === "returns") && !rest && name) {
        rest = name;
        name = "";
    }
    return { tag, type, name, description: rest };
}

function parseJsdoc(source) {
    const blocks = [];
    const re = /\/\*\*([\s\S]*?)\*\//g;
    let m = re.exec(source);
    while (m) {
        const lines = (m[1] || "").split(/\r?\n/).map((line) => line.replace(/^\s*\*\s?/, ""));
        const tags = [];
        const desc = [];
        let active = null;
        for (const raw of lines) {
            const line = raw.trim();
            if (!line) {
                active = null;
                continue;
            }
            if (line.startsWith("@")) {
                active = parseTag(line);
                if (active) tags.push(active);
                continue;
            }
            if (active) active.description = [active.description, line].filter(Boolean).join(" ");
            else desc.push(line);
        }
        blocks.push({
            start: m.index,
            end: m.index + m[0].length,
            description: desc.join(" ").replace(/\s+/g, " ").trim(),
            tags,
        });
        m = re.exec(source);
    }
    return blocks;
}

function jsdocAbove(source, blocks, index) {
    let picked = null;
    for (const block of blocks) {
        if (block.end <= index) picked = block;
        else break;
    }
    if (!picked) return null;
    if (/[^\s]/.test(source.slice(picked.end, index))) return null;
    return picked;
}

function topDoc(file, blocks) {
    const first = blocks[0];
    if (!first) return { module: "", overview: `Module at ${file}.` };
    const mod = (first.tags || []).find((t) => t.tag === "module" || t.tag === "file");
    const descriptionTag = (first.tags || []).find((t) => t.tag === "description");
    return {
        module: mod?.name || mod?.description || "",
        overview: first.description || descriptionTag?.description || `Module at ${file}.`,
    };
}

function parseExports(source) {
    const rows = [];
    const add = (kind, name) => {
        if (!name) return;
        if (rows.some((r) => r.kind === kind && r.name === name)) return;
        rows.push({ kind, name });
    };
    for (const m of source.matchAll(/export\s+default\s+class\s+([A-Za-z_$][\w$]*)/g)) add("default-class", m[1]);
    for (const m of source.matchAll(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)/g)) add("default-function", m[1]);
    if (/export\s+default\s+/.test(source)) add("default", "default");
    for (const m of source.matchAll(/export\s+class\s+([A-Za-z_$][\w$]*)/g)) add("class", m[1]);
    for (const m of source.matchAll(/export\s+function\s+([A-Za-z_$][\w$]*)/g)) add("function", m[1]);
    for (const m of source.matchAll(/export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) add("variable", m[1]);
    for (const m of source.matchAll(/export\s*\{([^}]+)\}/g)) {
        for (const entry of (m[1] || "").split(",")) {
            const raw = entry.trim();
            if (!raw) continue;
            const alias = raw.split(/\s+as\s+/i).map((x) => x.trim());
            add("named", alias[1] || alias[0]);
        }
    }
    return rows;
}

function parseCustomElements(source) {
    const tags = [];
    const add = (name) => {
        const v = String(name || "").trim();
        if (!v) return;
        if (!tags.includes(v)) tags.push(v);
    };
    for (const m of source.matchAll(/customElements\.define\(\s*["'`]([^"'`]+)["'`]/g)) add(m[1]);
    for (const m of source.matchAll(/static\s+tag\s*=\s*["'`]([^"'`]+)["'`]/g)) add(m[1]);
    return tags.sort((a, b) => a.localeCompare(b));
}

function parseCssVariables(source) {
    const rows = [];
    for (const m of source.matchAll(/--[a-z0-9-]+/gi)) {
        const name = m[0];
        if (!rows.some((r) => r.name === name)) rows.push({ name, description: "CSS custom property." });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function parseParts(source) {
    const rows = [];
    for (const m of source.matchAll(/\bpart\s*=\s*["'`]([^"'`]+)["'`]/g)) {
        for (const token of (m[1] || "").split(/\s+/)) {
            const name = token.trim();
            if (!name) continue;
            if (!rows.some((r) => r.name === name)) rows.push({ name, description: "Template part name." });
        }
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function observedFromClassBody(classBody) {
    const names = [];
    const add = (name) => {
        const v = String(name || "").trim();
        if (!v) return;
        if (!names.includes(v)) names.push(v);
    };
    for (const getterName of ["observedAttributes", "observed"]) {
        const re = new RegExp(`static\\s+get\\s+${getterName}\\s*\\(\\)\\s*\\{`, "g");
        const m = re.exec(classBody);
        if (!m) continue;
        const open = classBody.indexOf("{", m.index);
        const block = balanced(classBody, open);
        if (!block) continue;
        for (const token of block.body.matchAll(/["'`]([a-z0-9-]+)["'`]/gi)) add(token[1]);
    }
    return names;
}

function configPropsFromClassBody(classBody) {
    const props = new Map();
    const add = (entry) => {
        if (!entry?.name) return;
        const existing = props.get(entry.name);
        if (!existing) props.set(entry.name, entry);
        else if ((!existing.description || existing.description === "Config property.") && entry.description) {
            existing.description = entry.description;
        }
    };

    const parsePropBody = (body) => {
        const marker = /properties\s*:\s*\{/g.exec(body);
        if (!marker) return;
        const open = body.indexOf("{", marker.index);
        const block = balanced(body, open);
        if (!block) return;
        let i = 0;
        while (i < block.body.length) {
            while (i < block.body.length && /[\s,\r\n]/.test(block.body[i])) i += 1;
            const keyMatch = block.body.slice(i).match(/^([A-Za-z_$][\w$-]*)\s*:\s*\{/);
            if (!keyMatch) {
                i += 1;
                continue;
            }
            const key = keyMatch[1];
            const openIndex = i + keyMatch[0].lastIndexOf("{");
            const propBlock = balanced(block.body, openIndex);
            if (!propBlock) break;
            const type = ((propBlock.body.match(/\btype\s*:\s*([^\n,}]+)/) || [])[1] || "").trim().replace(/["'`]/g, "");
            const def = ((propBlock.body.match(/\bdefault\s*:\s*([^\n,}]+)/) || [])[1] || "").trim();
            const unit = ((propBlock.body.match(/\bunit\s*:\s*([^\n,}]+)/) || [])[1] || "").trim().replace(/["'`]/g, "");
            const descParts = [];
            if (type) descParts.push(`type: ${type}`);
            if (def) descParts.push(`default: ${def}`);
            if (unit) descParts.push(`unit: ${unit}`);
            add({ name: key, type: type || "-", description: descParts.join("; ") || "Config property." });
            i = propBlock.end + 1;
        }
    };

    for (const m of classBody.matchAll(/static\s+config\s*=\s*\{/g)) {
        const open = classBody.indexOf("{", m.index);
        const block = balanced(classBody, open);
        if (block) parsePropBody(block.body);
    }
    const getter = /static\s+get\s+config\s*\(\)\s*\{/g.exec(classBody);
    if (getter) {
        const open = classBody.indexOf("{", getter.index);
        const block = balanced(classBody, open);
        if (block) parsePropBody(block.body);
    }
    return Array.from(props.values());
}

function methodParams(doc, signature) {
    const rows = [];
    for (const tag of doc?.tags || []) {
        if (tag.tag !== "param") continue;
        rows.push({ name: tag.name || "", type: tag.type || "-", description: tag.description || "" });
    }
    if (rows.length) return rows;
    return String(signature || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((name) => ({ name, type: "-", description: "" }));
}

function methodReturns(doc) {
    const tag = (doc?.tags || []).find((t) => t.tag === "return" || t.tag === "returns");
    if (!tag) return "";
    const type = tag.type ? `{${tag.type}} ` : "";
    return `${type}${tag.description || ""}`.trim();
}

function parseClasses(source, docs) {
    const classes = [];
    const re = /(?:export\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([^{\n]+))?\s*\{/g;
    let m = re.exec(source);
    while (m) {
        const className = m[1];
        const open = m.index + m[0].lastIndexOf("{");
        const block = balanced(source, open);
        if (!block) {
            m = re.exec(source);
            continue;
        }
        const classBody = block.body;
        const methods = [];
        const properties = new Map();
        const methodRe = /(?:^|\n)\s*(static\s+)?(async\s+)?(?:(get|set)\s+)?([A-Za-z_$#][\w$#]*)\s*\(([^)]*)\)\s*\{/g;
        let mm = methodRe.exec(classBody);
        while (mm) {
            const accessor = mm[3] || "method";
            const name = mm[4];
            if (!["if", "for", "while", "switch", "catch", "else"].includes(name)) {
                const abs = block.start + 1 + mm.index;
                const doc = jsdocAbove(source, docs, abs);
                const visibility = name.startsWith("_") || name.startsWith("#") ? "private" : "public";
                const signature = (mm[5] || "").trim();
                methods.push({
                    className,
                    name,
                    displayName: accessor === "method" ? name : `${accessor} ${name}`,
                    visibility: name === "constructor" ? "public" : visibility,
                    signature,
                    description: doc?.description || "",
                    params: methodParams(doc, signature),
                    returns: methodReturns(doc),
                });
                if ((accessor === "get" || accessor === "set") && !name.startsWith("_") && !name.startsWith("#")) {
                    const p = properties.get(name) || { name, type: "-", description: "" };
                    if (!p.description && doc?.description) p.description = doc.description;
                    properties.set(name, p);
                }
            }
            mm = methodRe.exec(classBody);
        }

        for (const prop of configPropsFromClassBody(classBody)) {
            const p = properties.get(prop.name) || { name: prop.name, type: "-", description: "" };
            if (p.type === "-" && prop.type && prop.type !== "-") p.type = prop.type;
            if (!p.description && prop.description) p.description = prop.description;
            properties.set(prop.name, p);
        }

        classes.push({
            name: className,
            extends: (m[2] || "").trim(),
            observed: observedFromClassBody(classBody),
            configProps: configPropsFromClassBody(classBody),
            properties: Array.from(properties.values()),
            methods,
        });
        re.lastIndex = block.end + 1;
        m = re.exec(source);
    }
    return classes;
}

function parseModuleFunctions(source, docs) {
    const rows = [];
    const add = (name, signature, index) => {
        if (!name || rows.some((r) => r.className === "(module)" && r.name === name)) return;
        const doc = jsdocAbove(source, docs, index);
        rows.push({
            className: "(module)",
            name,
            displayName: name,
            visibility: name.startsWith("_") ? "private" : "public",
            signature,
            description: doc?.description || "",
            params: methodParams(doc, signature),
            returns: methodReturns(doc),
        });
    };
    for (const m of source.matchAll(/(?:^|\n)\s*(?:export\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g)) {
        add(m[1], (m[2] || "").trim(), m.index);
    }
    for (const m of source.matchAll(/(?:^|\n)\s*export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g)) {
        add(m[1], (m[2] || "").trim(), m.index);
    }
    return rows;
}

function parseModuleDoc(source, file) {
    const docs = parseJsdoc(source);
    const header = topDoc(file, docs);
    const classes = parseClasses(source, docs);
    const methods = [...classes.flatMap((c) => c.methods), ...parseModuleFunctions(source, docs)];
    const attributes = new Map();
    const properties = new Map();

    for (const cls of classes) {
        for (const attr of cls.observed) {
            attributes.set(attr, { name: attr, type: "-", description: `Observed attribute on ${cls.name}.` });
        }
        for (const p of cls.configProps) {
            attributes.set(p.name, { name: p.name, type: p.type || "-", description: p.description || "Config property." });
        }
        for (const p of cls.properties) {
            properties.set(p.name, { name: p.name, type: p.type || "-", description: p.description || "" });
        }
    }

    const features = [];
    if (/customElements\.define\(/.test(source)) features.push("custom-element");
    if (/requestAnimationFrame|cancelAnimationFrame/.test(source)) features.push("raf-loop");
    if (/webgl|WebGL|gl\./.test(source)) features.push("webgl");
    if (/canvas|CanvasRenderingContext2D|2d/.test(source)) features.push("canvas");
    if (/addEventListener\(/.test(source)) features.push("events");
    if (/MutationObserver|ResizeObserver/.test(source)) features.push("observers");
    if (/setInterval|setTimeout/.test(source)) features.push("timers");

    return {
        file,
        module: header.module,
        overview: header.overview,
        features: [...new Set(features)].sort((a, b) => a.localeCompare(b)),
        exports: parseExports(source),
        customElements: parseCustomElements(source),
        attributes: Array.from(attributes.values()).sort((a, b) => a.name.localeCompare(b.name)),
        properties: Array.from(properties.values()).sort((a, b) => a.name.localeCompare(b.name)),
        cssVariables: parseCssVariables(source),
        parts: parseParts(source),
        methods,
        snippet: source.split(/\r?\n/).slice(0, 80).join("\n"),
    };
}

function renderEmpty(el, text) {
    el.innerHTML = `<p class="muted">${esc(text)}</p>`;
}

function table(rows, columns, emptyText = "None documented.") {
    if (!rows.length) return `<p class="muted">${esc(emptyText)}</p>`;
    const head = columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
    const body = rows
        .map((row) => `<tr>${columns.map((c) => `<td>${c.render(row)}</td>`).join("")}</tr>`)
        .join("");
    return `<table class="doc-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function chips(values, emptyText) {
    if (!values.length) return `<p class="muted">${esc(emptyText)}</p>`;
    return `<div class="chip-list">${values.map((v) => `<span class="chip">${esc(v)}</span>`).join("")}</div>`;
}

function renderParams(method) {
    if (!method.params?.length) return `<span class="muted">-</span>`;
    return method.params
        .map((p) => {
            const type = p.type && p.type !== "-" ? `{${esc(p.type)}} ` : "";
            const desc = p.description ? ` - ${esc(p.description)}` : "";
            return `<div><code>${type}${esc(p.name)}</code>${desc}</div>`;
        })
        .join("");
}

function renderDoc(doc) {
    const moduleSuffix = doc.module ? ` (${doc.module})` : "";
    refs.title.textContent = `${doc.file} Documentation`;
    refs.subtitle.textContent = `Animation module reference from source${moduleSuffix}.`;
    refs.fileInput.value = doc.file;
    status(`Loaded from source: ${doc.file}`);

    refs.overview.innerHTML = `<p>${esc(doc.overview || "")}</p>`;
    refs.features.innerHTML = chips(doc.features || [], "No runtime features detected.");
    refs.exports.innerHTML = table(doc.exports || [], [
        { label: "Kind", render: (r) => esc(r.kind || "") },
        { label: "Name", render: (r) => `<code>${esc(r.name || "")}</code>` },
    ]);
    refs.elements.innerHTML = chips(doc.customElements || [], "No custom elements exported.");
    refs.attributes.innerHTML = table(doc.attributes || [], [
        { label: "Name", render: (r) => `<code>${esc(r.name || "")}</code>` },
        { label: "Type", render: (r) => `<code>${esc(r.type || "-")}</code>` },
        { label: "Description", render: (r) => esc(r.description || "") || `<span class="muted">-</span>` },
    ]);
    refs.properties.innerHTML = table(doc.properties || [], [
        { label: "Name", render: (r) => `<code>${esc(r.name || "")}</code>` },
        { label: "Type", render: (r) => `<code>${esc(r.type || "-")}</code>` },
        { label: "Description", render: (r) => esc(r.description || "") || `<span class="muted">-</span>` },
    ]);
    refs.cssVariables.innerHTML = table(doc.cssVariables || [], [
        { label: "Variable", render: (r) => `<code>${esc(r.name || "")}</code>` },
        { label: "Description", render: (r) => esc(r.description || "") },
    ]);
    refs.parts.innerHTML = table(doc.parts || [], [
        { label: "Part", render: (r) => `<code>${esc(r.name || "")}</code>` },
        { label: "Description", render: (r) => esc(r.description || "") },
    ]);

    const cols = [
        { label: "Owner", render: (r) => `<code>${esc(r.className || "")}</code>` },
        {
            label: "Method",
            render: (r) => `<code>${esc(r.displayName || r.name || "")}(${esc(r.signature || "")})</code>`,
        },
        { label: "Description", render: (r) => esc(r.description || "") || `<span class="muted">-</span>` },
        { label: "Params", render: (r) => renderParams(r) },
        { label: "Returns", render: (r) => (r.returns ? `<code>${esc(r.returns)}</code>` : `<span class="muted">-</span>`) },
    ];
    refs.publicMethods.innerHTML = table((doc.methods || []).filter((m) => m.visibility !== "private"), cols);
    refs.privateMethods.innerHTML = table((doc.methods || []).filter((m) => m.visibility === "private"), cols);
    refs.sourceSnippet.textContent = doc.snippet || "";
}

function renderNotFound(file) {
    refs.title.textContent = "Animation Module Documentation";
    refs.subtitle.textContent = "";
    status(`Unable to load docs for "${file}".`);
    renderEmpty(refs.overview, "No module documentation found.");
    renderEmpty(refs.features, "No data.");
    renderEmpty(refs.exports, "No data.");
    renderEmpty(refs.elements, "No data.");
    renderEmpty(refs.attributes, "No data.");
    renderEmpty(refs.properties, "No data.");
    renderEmpty(refs.cssVariables, "No data.");
    renderEmpty(refs.parts, "No data.");
    renderEmpty(refs.publicMethods, "No data.");
    renderEmpty(refs.privateMethods, "No data.");
    refs.sourceSnippet.textContent = "";
}

async function fetchSource(file) {
    const normalized = normFile(file);
    if (!normalized) return null;
    if (state.cache.has(normalized)) return state.cache.get(normalized);
    try {
        const res = await fetch(`${sourceRoot}${normalized}`, { cache: "no-store" });
        if (!res.ok) {
            state.cache.set(normalized, null);
            return null;
        }
        const text = await res.text();
        state.cache.set(normalized, text);
        return text;
    } catch (_err) {
        state.cache.set(normalized, null);
        return null;
    }
}

function resolveRelative(baseFile, relPath) {
    const parts = normFile(baseFile).split("/").filter(Boolean);
    parts.pop();
    for (const part of String(relPath || "").split("/")) {
        if (!part || part === ".") continue;
        if (part === "..") {
            if (!parts.length) return null;
            parts.pop();
        } else {
            parts.push(part);
        }
    }
    return normFile(parts.join("/"));
}

function parseSpecifiers(source) {
    const set = new Set();
    const add = (v) => {
        const value = String(v || "").trim();
        if (value.startsWith(".")) set.add(value);
    };
    for (const m of source.matchAll(/\bfrom\s*["'`]([^"'`]+)["'`]/g)) add(m[1]);
    for (const m of source.matchAll(/\bimport\s*["'`]([^"'`]+)["'`]/g)) add(m[1]);
    return Array.from(set);
}

async function discoverModules() {
    const found = new Set();
    const queue = [entryFile];
    const walked = new Set();
    while (queue.length) {
        const current = normFile(queue.shift());
        if (!current || walked.has(current)) continue;
        walked.add(current);
        const source = await fetchSource(current);
        if (!source) continue;
        found.add(current);
        for (const spec of parseSpecifiers(source)) {
            const resolved = resolveRelative(current, spec);
            if (!resolved) continue;
            const file = /\.(mjs|js)$/i.test(resolved) ? resolved : `${resolved}.mjs`;
            found.add(file);
            if (/(^|\/)index\.(mjs|js)$/i.test(file) && !walked.has(file)) queue.push(file);
        }
    }
    return Array.from(found).sort((a, b) => a.localeCompare(b));
}

function ensureDiscovered(file) {
    const normalized = normFile(file);
    if (!normalized) return;
    if (!state.discovered.includes(normalized)) {
        state.discovered.push(normalized);
        state.discovered.sort((a, b) => a.localeCompare(b));
    }
}

function renderModuleList(activeFile = "") {
    refs.fileList.innerHTML = "";
    for (const file of state.discovered) {
        const option = document.createElement("option");
        option.value = file;
        refs.fileList.appendChild(option);
    }
    refs.moduleCount.textContent = String(state.discovered.length);
    if (!state.discovered.length) {
        refs.moduleList.innerHTML = `<p class="muted">No modules discovered from <code>${esc(entryFile)}</code>.</p>`;
        return;
    }
    refs.moduleList.innerHTML = state.discovered
        .map((file) => {
            const cls = file === activeFile ? "module-button is-active" : "module-button";
            return `<button type="button" class="${cls}" data-file="${esc(file)}">${esc(file)}</button>`;
        })
        .join("");
    for (const button of refs.moduleList.querySelectorAll("button[data-file]")) {
        button.addEventListener("click", async () => {
            const file = normFile(button.dataset.file || "");
            if (!file) return;
            refs.fileInput.value = file;
            setQuery(file);
            await loadAndRender(file);
        });
    }
}

async function loadAndRender(file) {
    const normalized = normFile(file);
    if (!normalized) {
        renderEmpty(refs.overview, "No module selected.");
        return;
    }
    status("Loading documentation...");
    const source = await fetchSource(normalized);
    if (!source) {
        renderNotFound(normalized);
        renderModuleList(normalized);
        return;
    }
    ensureDiscovered(normalized);
    renderDoc(parseModuleDoc(source, normalized));
    renderModuleList(normalized);
}

function wireEvents() {
    refs.loadButton.addEventListener("click", async () => {
        const file = normFile(refs.fileInput.value);
        setQuery(file);
        await loadAndRender(file);
    });
    refs.fileInput.addEventListener("keydown", async (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        refs.loadButton.click();
    });
    refs.copyLinkButton.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            status("Share link copied to clipboard.");
        } catch (_err) {
            status("Unable to copy link from this browser context.");
        }
    });
}

async function init() {
    wireEvents();
    state.discovered = await discoverModules();
    const initialFile = normFile(query("file")) || defaultFile;
    refs.fileInput.value = initialFile;
    await loadAndRender(initialFile);
}

init();
