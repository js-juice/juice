/**
 * Tiny HTML include loader for docs/example pages.
 * Usage:
 *   <div data-include="path/to/partial.html" data-nav-base="../../"></div>
 */

const INCLUDE_ATTR = "data-include";
const NAV_BASE_ATTR = "data-nav-base";
const NAV_HREF_ATTR = "data-nav-href";
const NAV_SRC_ATTR = "data-nav-src";
const ACTIVE_CLASS = "is-active";

/**
 * Resolve nav link hrefs from data attributes and mark the current page.
 * @param {HTMLElement} container
 */
function resolveNavLinks(container) {
    const base = container.getAttribute(NAV_BASE_ATTR) || "";
    const links = container.querySelectorAll(`[${NAV_HREF_ATTR}]`);
    const images = container.querySelectorAll(`[${NAV_SRC_ATTR}]`);
    const currentPath = window.location.pathname.replace(/\/+$/, "");

    links.forEach((linkEl) => {
        const rel = linkEl.getAttribute(NAV_HREF_ATTR) || "";
        const href = `${base}${rel}`.replace(/\\/g, "/");
        linkEl.setAttribute("href", href);

        const resolved = new URL(href, window.location.href);
        const linkPath = resolved.pathname.replace(/\/+$/, "");
        if (linkPath === currentPath) {
            linkEl.classList.add(ACTIVE_CLASS);
            const parentDetails = linkEl.closest("details");
            if (parentDetails) parentDetails.open = true;
        }
    });

    images.forEach((imageEl) => {
        const rel = imageEl.getAttribute(NAV_SRC_ATTR) || "";
        const src = `${base}${rel}`.replace(/\\/g, "/");
        imageEl.setAttribute("src", src);
    });
}

/**
 * Render one include container.
 * @param {HTMLElement} host
 * @returns {Promise<void>}
 */
async function renderInclude(host) {
    const src = host.getAttribute(INCLUDE_ATTR);
    if (!src) return;

    try {
        const url = new URL(src, window.location.href);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load include: ${response.status}`);
        host.innerHTML = await response.text();
        resolveNavLinks(host);
        host.setAttribute("data-include-ready", "true");
    } catch (error) {
        console.warn("[include.mjs]", error);
        host.setAttribute("data-include-error", "true");
    }
}

const includeHosts = Array.from(document.querySelectorAll(`[${INCLUDE_ATTR}]`));
await Promise.all(includeHosts.map((host) => renderInclude(host)));
