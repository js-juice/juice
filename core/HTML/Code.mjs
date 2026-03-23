// Lightweight code formatter + syntax highlighter for documentation pages
// - Formats code by trimming and dedenting
// - Applies simple syntax highlighting for JavaScript, HTML and CSS
// - Auto-injects minimal styles and can be run against <pre><code> blocks

const DEFAULT_CSS = `
:root{
    --juice-code-bg: #48484A;
    --juice-code-fg: #e6edf3;
    --juice-code-kw: #ffcf6b;
    --juice-code-num: #9ad0ff;
    --juice-code-str: #9be58b;
    --juice-code-cm: #6b7280;
    --juice-code-op: #ffffff;
    --juice-code-tag: #7dd3fc;
    --juice-code-attr: #fca5a5;
    --juice-code-val: #fbcfe8;
    --juice-code-pun: #c7d2fe;
}
.juice-code { background: var(--juice-code-bg); font-size: 0.9rem; color: var(--juice-code-fg); padding: 1rem; border-radius: 6px; overflow:auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace; font-size: 0.9rem; }
.juice-code .kw { color: var(--juice-code-kw); }
.juice-code .num { color: var(--juice-code-num); }
.juice-code .str { color: var(--juice-code-str); }
.juice-code .cm { color: var(--juice-code-cm); font-style: italic; }
.juice-code .op { color: var(--juice-code-op); }
.juice-code .tag { color: var(--juice-code-tag); }
.juice-code .attr { color: var(--juice-code-attr); }
.juice-code .val { color: var(--juice-code-val); }
.juice-code .pun { color: var(--juice-code-pun); }
`;

function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function dedent(text) {
    const lines = text.replace(/^\n+|\n+$/g, "").split(/\r?\n/);
    let minIndent = Infinity;
    for (const line of lines) {
        if (!line.trim()) continue;
        const m = line.match(/^\s*/);
        if (m) minIndent = Math.min(minIndent, m[0].length);
    }
    if (!isFinite(minIndent)) minIndent = 0;
    return lines.map((l) => l.slice(minIndent)).join("\n");
}

class CodeHighlighter {
    static install({ selector = "pre > code" } = {}) {
        if (!document.getElementById("juice-code-styles")) {
            const style = document.createElement("style");
            style.id = "juice-code-styles";
            style.textContent = DEFAULT_CSS;
            document.head.appendChild(style);
        }

        const nodes = Array.from(document.querySelectorAll(selector));
        for (const node of nodes) {
            try {
                const lang = CodeHighlighter._detectLang(node);
                CodeHighlighter.highlightElement(node, lang);
            } catch (e) {
                // ignore failures for individual nodes
            }
        }
    }

    static _detectLang(node) {
        if (!node) return "text";
        const cls = (node.className || "").split(/\s+/).find((c) => c.startsWith("language-"));
        if (cls) return cls.replace("language-", "");
        const attr = node.getAttribute && node.getAttribute("data-lang");
        if (attr) return attr;

        // fallback heuristics
        const txt = (node.textContent || "").trim();
        if (!txt) return "text";
        if (txt.indexOf("<") !== -1 || txt.indexOf("&lt;") !== -1) return "html";
        if (/\{[^}]*:[^}]*\}/.test(txt) || /\.[A-Za-z0-9_-]+\s*\{/.test(txt)) return "css";
        if (/\b(function|const|let|var|=>|console\.|return|import|export)\b/.test(txt) || /;\s*$/.test(txt))
            return "js";
        return "text";
    }

    static highlightElement(node, lang) {
        const raw = node.textContent || "";
        const formatted = dedent(raw);
        const pre = node.parentElement;

        let finalPre;

        if (lang === "html" || lang === "xml" || lang === "xhtml") {
            const codeEl = document.createElement("code");
            // split into tags and text (preserve text exactly)
            const parts = formatted.split(/(<[^>]*>)/g);
            for (const part of parts) {
                if (!part) continue;
                if (!part.startsWith("<")) {
                    codeEl.appendChild(document.createTextNode(part));
                    continue;
                }
                // comment
                if (part.startsWith("<!--")) {
                    const span = document.createElement("span");
                    span.className = "cm";
                    span.textContent = part;
                    codeEl.appendChild(span);
                    continue;
                }

                const isClose = part.startsWith("</");
                const isSelfClose = part.endsWith("/>");
                const tagMatch = part.match(/^<\/?\s*([A-Za-z0-9\-:]+)/);
                const tagName = tagMatch ? tagMatch[1] : "";

                codeEl.appendChild(document.createTextNode(isClose ? "</" : "<"));
                const tagSpan = document.createElement("span");
                tagSpan.className = "tag";
                tagSpan.textContent = tagName;
                codeEl.appendChild(tagSpan);

                const afterNameIndex = part.indexOf(tagName) + tagName.length;
                const attrStr = part.slice(afterNameIndex, part.length - (isSelfClose ? 2 : 1));

                const attrRe = /([^\s=\/]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'>]+)/g;
                let last = 0;
                let m;
                while ((m = attrRe.exec(attrStr)) !== null) {
                    const between = attrStr.slice(last, m.index);
                    if (between) codeEl.appendChild(document.createTextNode(between));
                    codeEl.appendChild(document.createTextNode(" "));
                    const an = document.createElement("span");
                    an.className = "attr";
                    an.textContent = m[1];
                    codeEl.appendChild(an);
                    codeEl.appendChild(document.createTextNode(m[2]));
                    const av = document.createElement("span");
                    av.className = "val";
                    av.textContent = m[3];
                    codeEl.appendChild(av);
                    last = attrRe.lastIndex;
                }
                const rem = attrStr.slice(last);
                if (rem) codeEl.appendChild(document.createTextNode(rem));

                codeEl.appendChild(document.createTextNode(isSelfClose ? "/>" : ">"));
            }

            finalPre = document.createElement("pre");
            finalPre.className = "juice-code";
            finalPre.appendChild(codeEl);
        } else {
            const html = CodeHighlighter.highlight(formatted, lang);
            const tmp = document.createElement("div");
            tmp.innerHTML = html;
            const innerPre = tmp.querySelector("pre");
            if (innerPre) {
                finalPre = innerPre;
                finalPre.classList.add("juice-code");
            } else {
                finalPre = document.createElement("pre");
                finalPre.className = "juice-code";
                const codeEl = document.createElement("code");
                codeEl.innerHTML = html;
                finalPre.appendChild(codeEl);
            }
        }

        if (pre && pre.tagName && pre.tagName.toLowerCase() === "pre") {
            pre.parentNode && pre.parentNode.replaceChild(finalPre, pre);
        } else {
            node.parentNode && node.parentNode.replaceChild(finalPre, node);
        }
    }

    static highlight(code, lang = "text") {
        const esc = escapeHtml(code);
        if (lang === "html" || lang === "xml" || lang === "xhtml") return CodeHighlighter._highlightHTML(esc);
        if (lang === "css") return CodeHighlighter._highlightCSS(esc);
        if (lang === "js" || lang === "javascript" || lang === "mjs" || lang === "cjs")
            return CodeHighlighter._highlightJS(esc);
        return `<pre><code>${esc}</code></pre>`;
    }

    static _highlightJS(src) {
        const s = src;
        const tokenRe =
            /(\/\*[\s\S]*?\*\/)|(\/\/.*?$)|(`(?:\\.|[^`])*`)|("(?:\\.|[^\"])*")|('(?:\\.|[^'])*')|(\b0x[0-9a-fA-F]+|\b\d+\.?\d*|\b\d*\.\d+\b)|(\b(?:true|false|null|undefined)\b)|(\b(?:break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|await|async)\b)|([A-Za-z_$][A-Za-z0-9_$]*)|([{}\[\]();,:.+\-/*=%!&|^~?]+)/gm;
        let out = "";
        let lastIndex = 0;
        let m;
        while ((m = tokenRe.exec(s)) !== null) {
            if (m.index > lastIndex) out += escapeHtml(s.slice(lastIndex, m.index));
            const [match, multiC, singleC, templateStr, dblStr, sglStr, num, bool, kw, ident, punct] = m;
            if (multiC) out += `<span class="cm">${escapeHtml(multiC)}</span>`;
            else if (singleC) out += `<span class="cm">${escapeHtml(singleC)}</span>`;
            else if (templateStr) out += `<span class="str">${escapeHtml(templateStr)}</span>`;
            else if (dblStr) out += `<span class="str">${escapeHtml(dblStr)}</span>`;
            else if (sglStr) out += `<span class="str">${escapeHtml(sglStr)}</span>`;
            else if (num) out += `<span class="num">${escapeHtml(num)}</span>`;
            else if (bool) out += `<span class="kw">${escapeHtml(bool)}</span>`;
            else if (kw) out += `<span class="kw">${escapeHtml(kw)}</span>`;
            else if (ident) out += escapeHtml(ident);
            else if (punct) out += `<span class="pun">${escapeHtml(punct)}</span>`;
            else out += escapeHtml(match);
            lastIndex = tokenRe.lastIndex;
        }
        if (lastIndex < s.length) out += escapeHtml(s.slice(lastIndex));
        return `<pre><code>${out}</code></pre>`;
    }

    static _highlightHTML(src) {
        const parts = src.split(/(&lt;[^&]*&gt;)/g);
        const out = parts
            .map((part) => {
                if (!part) return "";
                if (!part.startsWith("&lt;")) return escapeHtml(part);
                if (part.startsWith("&lt;!--")) return `<span class="cm">${part}</span>`;
                return part
                    .replace(/^(&lt;\/?)([a-zA-Z0-9\-:]+)/, (m, p1, p2) => `${p1}<span class="tag">${p2}</span>`)
                    .replace(
                        /([a-zA-Z0-9\-:]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/g,
                        (m, name, eq, val) =>
                            ` <span class="attr">${name}</span>${eq}<span class="val">${escapeHtml(val)}</span>`
                    );
            })
            .join("");
        return `<pre><code>${out}</code></pre>`;
    }

    static _highlightCSS(src) {
        const s = src;
        let out = "";
        const commentRe = /(\/\*[\s\S]*?\*\/)/g;
        let last = 0;
        let m;
        while ((m = commentRe.exec(s)) !== null) {
            if (m.index > last) out += escapeHtml(s.slice(last, m.index));
            out += `<span class="cm">${escapeHtml(m[0])}</span>`;
            last = commentRe.lastIndex;
        }
        if (last < s.length) out += escapeHtml(s.slice(last));
        out = out.replace(/([^{}]+)(\{)([^}]*)(\})/g, (m, sel, ob, body, cb) => {
            const selHtml = `<span class="tag">${escapeHtml(sel.trim())}</span>`;
            const bodyHtml = body.replace(
                /([a-zA-Z-]+)(\s*:\s*)([^;]+)(;?)/g,
                (mm, prop, colon, val, semi) =>
                    `<span class="attr">${escapeHtml(prop)}</span>${colon}<span class="val">${escapeHtml(val.trim())}</span>${semi}`
            );
            return `${selHtml}${ob}${bodyHtml}${cb}`;
        });
        return `<pre><code>${out}</code></pre>`;
    }
}

window.CodeHighlighter = CodeHighlighter;

export default CodeHighlighter;
