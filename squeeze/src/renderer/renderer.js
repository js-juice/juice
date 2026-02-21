const state = {
    selected: new Set(),
    tree: null,
    analyzeTimer: null,
    ready: false,
    clonePercent: 0,
    searchQuery: ""
};
const HELPER_SELECT_FILES = "please choose one or more files to package";

function $(id) {
    return document.getElementById(id);
}

function isCodeFileName(name) {
    return /\.(mjs|js|cjs|ts|mts|cts)$/i.test(name);
}

function openInBrowser(url) {
    if (window.juiceExtractor && window.juiceExtractor.openExternal) {
        window.juiceExtractor.openExternal(url);
    } else {
        window.open(url, "_blank");
    }
}

function setStatus(data) {
    const statusEl = $("statusText");
    statusEl.classList.remove("hidden");
    statusEl.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "?";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
        value /= 1024;
        idx += 1;
    }
    const rounded = idx === 0 ? Math.round(value) : value.toFixed(2);
    return `${rounded} ${units[idx]}`;
}

function buildExportSizeLines(metadata) {
    const lines = [];
    const files = Array.isArray(metadata?.outputFiles) ? metadata.outputFiles : [];
    if (files.length > 0) {
        lines.push("Export files:");
        for (const file of files) {
            lines.push(`- ${file.path}: ${formatBytes(file.bytes)}`);
        }
        lines.push("");
    }
    lines.push(`Expected total size: ${formatBytes(metadata?.expectedExportBytes)}`);
    if (Number.isFinite(metadata?.outputZipBytes)) {
        lines.push(`Actual zip size: ${formatBytes(metadata.outputZipBytes)}`);
    }
    return lines;
}

function appendSetupOutput(line) {
    const outputEl = $("setupOutput");
    if (!outputEl) return;
    const now = new Date().toLocaleTimeString();
    const nextLine = `[${now}] ${line}`;
    const current = outputEl.textContent || "";
    const lines = current.split("\n").filter(Boolean);
    lines.push(nextLine);
    outputEl.textContent = lines.slice(-220).join("\n");
    outputEl.scrollTop = outputEl.scrollHeight;
}

function clearSetupOutput(initialMessage = "Awaiting action...") {
    const outputEl = $("setupOutput");
    if (!outputEl) return;
    outputEl.textContent = initialMessage;
}

function setCloneProgress(percent, message) {
    const clamped = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : state.clonePercent;
    state.clonePercent = clamped;
    $("cloneProgressWrap").classList.remove("hidden");
    $("cloneProgressBar").value = clamped;
    $("cloneProgressPercent").textContent = `${clamped}%`;
    if (message) appendSetupOutput(message);
}

function setSetupBusy(busy) {
    $("cloneRepoBtn").disabled = busy;
    $("chooseRepoBtn").disabled = busy;
    $("remoteUrlInput").disabled = busy;
}

function setHeaderMeta(status) {
    $("repoRoot").textContent = status.repoPath || "(not configured)";
    $("version").textContent = status.version || "?";
    $("head-hash").textContent = status.head ? status.head.slice(0, 12) : "?";
}

function resetExportOptions() {
    const includeDependencies = $("includeDependencies");
    const bundleDependencies = $("bundleDependencies");
    const minimizeMode = $("minimizeMode");
    if (includeDependencies) includeDependencies.checked = true;
    if (bundleDependencies) bundleDependencies.checked = true;
    if (minimizeMode) minimizeMode.value = "none";
}

function updateActionButtons() {
    const hasSelection = state.selected.size > 0;
    const canExport = state.ready && hasSelection;
    const analyzeBtn = $("analyzeBtn");
    if (analyzeBtn) analyzeBtn.disabled = !canExport;
    $("exportBtn").disabled = !canExport;
    const importManifestBtn = $("importManifestBtn");
    if (importManifestBtn) importManifestBtn.disabled = !state.ready;
}

function normalizeSearchQuery(value) {
    return (value || "").trim().toLowerCase();
}

function applyFileFilter() {
    const treeEl = $("fileTree");
    if (!treeEl) return;

    const searchInput = $("fileSearchInput");
    const query = normalizeSearchQuery(searchInput ? searchInput.value : "");
    state.searchQuery = query;

    const files = treeEl.querySelectorAll("li.file");
    for (const file of files) {
        const haystack = file.dataset.searchText || "";
        const matches = !query || haystack.includes(query);
        file.classList.toggle("filtered-out", !matches);
    }

    const directories = [...treeEl.querySelectorAll("li.directory")];
    for (let index = directories.length - 1; index >= 0; index -= 1) {
        const dir = directories[index];
        const isRoot = dir.dataset.root === "1";
        const haystack = dir.dataset.searchText || "";
        const dirMatch = Boolean(query) && haystack.includes(query);
        const hasVisibleFile = Boolean(dir.querySelector("li.file:not(.filtered-out)"));
        const hasVisibleDir = Boolean(dir.querySelector("li.directory:not(.filtered-out)"));
        const show = isRoot || !query || dirMatch || hasVisibleFile || hasVisibleDir;

        dir.classList.toggle("filtered-out", !show);
        dir.classList.toggle("filter-open", Boolean(query) && show && (hasVisibleFile || hasVisibleDir));
    }
}

function clearFileSearch() {
    const searchInput = $("fileSearchInput");
    if (searchInput) searchInput.value = "";
    state.searchQuery = "";
    applyFileFilter();
}

function setReadyUi(ready) {
    state.ready = ready;
    $("setupPanel").classList.toggle("hidden", ready);
    $("statusText").classList.toggle("hidden", !ready);
    updateActionButtons();
}

function renderLiveAnalysis(analysis) {
    const lines = [];
    lines.push("Live Build Preview");
    lines.push("==================");
    lines.push(`Selected files: ${analysis.selectedCount}`);
    lines.push(`Dependency files: ${analysis.dependencyCount}`);
    lines.push(`Total included files: ${analysis.totalIncludedCount}`);
    lines.push("");
    lines.push("Dependencies:");
    if (!analysis.dependencyFiles || analysis.dependencyFiles.length === 0) {
        lines.push("  (none)");
    } else {
        for (const file of analysis.dependencyFiles) {
            lines.push(`  - ${file}`);
        }
    }
    setStatus(lines.join("\n"));
}

function collectLeafSelections(container) {
    const boxes = container.querySelectorAll("input[type='checkbox'][data-path]");
    return [...boxes].filter((b) => b.checked).map((b) => b.dataset.path);
}

function updateSelectedFromDom() {
    const paths = collectLeafSelections($("fileTree"));
    state.selected = new Set(paths);
    updateActionButtons();

    if (state.ready && state.selected.size === 0) {
        setStatus(HELPER_SELECT_FILES);
    }
}

function clearFileSelections() {
    const treeEl = $("fileTree");
    if (!treeEl) return;
    const boxes = treeEl.querySelectorAll("input[type='checkbox'][data-path]");
    for (const box of boxes) {
        box.checked = false;
        const item = box.closest("li.file");
        if (item) item.classList.remove("selected");
    }
    state.selected = new Set();
    updateActionButtons();
}

let fileIdx = 0;
function createFileNode(fileNode) {
    const item = document.createElement("li");
    item.className = "file";
    item.dataset.searchText = `${fileNode.name} ${fileNode.relativePath}`.toLowerCase();

    const icon = document.createElement("div");
    icon.className = "icon";
    icon.innerHTML = `<img class="file" height="25" src="./imgs/file.svg" />`;

    const label = document.createElement("label");
    label.className = "label";
    label.setAttribute("for", `file-${fileIdx}`);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `file-${fileIdx}`;
    checkbox.dataset.path = fileNode.relativePath;
    checkbox.disabled = !isCodeFileName(fileNode.name);
    checkbox.addEventListener("change", () => {
        item.classList.toggle("selected", checkbox.checked);
        updateSelectedFromDom();
        scheduleLiveAnalyze();
    });

    icon.appendChild(checkbox);

    label.appendChild(icon);

    const data = document.createElement("div");
    data.className = "data";

    const filename = document.createElement("p");
    filename.className = "filename";

    filename.textContent = fileNode.name;
    if (checkbox.disabled) filename.classList.add("muted");

    data.appendChild(filename);
    label.appendChild(data);

    item.appendChild(label);

    fileIdx++;
    return item;
}
let dirIdx = 0;
function createDirectoryNode(dirNode) {
    const item = document.createElement("li");
    item.className = "directory";
    item.id = `dir-${dirIdx++}`;
    item.dataset.searchText = `${dirNode.name} ${dirNode.relativePath}`.toLowerCase();
    item.dataset.root = dirNode.relativePath === "." ? "1" : "0";

    const row = document.createElement("div");
    row.className = "row";

    item.appendChild(row);

    const icon = document.createElement("div");
    icon.className = "icon";
    icon.innerHTML = `<img class="folder" width="25" src="./imgs/folder.svg" />`;

    row.appendChild(icon);

    const data = document.createElement("div");
    data.className = "data";

    const dirname = document.createElement("div");
    dirname.className = "dirname";

    const stats = document.createElement("div");
    stats.className = "stats";

    row.appendChild(data);

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "dir-trigger";
    trigger.setAttribute("aria-expanded", "false");
    trigger.textContent = dirNode.relativePath === "." ? dirNode.name : dirNode.name;

    dirname.appendChild(trigger);
    data.appendChild(dirname);
    data.appendChild(stats);

    const children = document.createElement("div");
    children.className = "children";

    const nested = document.createElement("div");
    nested.className = "nested";

    const childrenList = document.createElement("ul");
    childrenList.className = "child-list";

    nested.appendChild(childrenList);
    children.appendChild(nested);

    const childGutter = document.createElement("div");
    childGutter.className = "gutter";

    item.appendChild(children);

    children.appendChild(childGutter);

    children.appendChild(nested);

    if (dirNode.relativePath === ".") {
        item.classList.add("expanded");
        trigger.setAttribute("aria-expanded", "true");
    }

    trigger.addEventListener("click", () => {
        const isOpen = item.classList.contains("expanded");
        item.classList.toggle("expanded", !isOpen);
        trigger.setAttribute("aria-expanded", !isOpen ? "true" : "false");
    });

    const counts = {};

    const sortedChildren = [...dirNode.children].sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    for (const child of sortedChildren) {
        if (child.type === "directory") {
            counts.directories = (counts.directories || 0) + 1;
            const { node, counts: childCounts } = createDirectoryNode(child);
            childrenList.appendChild(node);
            counts.directories = (counts.directories || 0) + (childCounts.directories || 0);
            counts.files = (counts.files || 0) + (childCounts.files || 0);
            continue;
        } else {
            counts.files = (counts.files || 0) + 1;
        }

        childrenList.appendChild(createFileNode(child));
    }

    const dirStr = counts.directories ? `${counts.directories} dir${counts.directories !== 1 ? "s" : ""}` : "";
    const fileStr = counts.files ? `${counts.files} file${counts.files !== 1 ? "s" : ""}` : "";

    stats.textContent = `${[dirStr, fileStr].filter(Boolean).join(", ")}`;

    return { node: item, counts }; //return the item;
}

function renderTree(tree) {
    const treeEl = $("fileTree");
    treeEl.innerHTML = "";
    const rootList = document.createElement("ul");
    rootList.className = "tree-root";
    rootList.appendChild(createDirectoryNode(tree).node);
    treeEl.appendChild(rootList);
    applyFileFilter();
    scheduleLiveAnalyze();
}

async function runAnalyze() {
    if (!state.ready) return;
    updateSelectedFromDom();
    if (state.selected.size === 0) {
        setStatus(HELPER_SELECT_FILES);
        return;
    }
    const summary = await window.juiceExtractor.analyze([...state.selected]);
    renderLiveAnalysis(summary);
}

function scheduleLiveAnalyze() {
    if (!state.ready) return;
    if (state.analyzeTimer) {
        clearTimeout(state.analyzeTimer);
    }
    state.analyzeTimer = setTimeout(() => {
        runAnalyze().catch((error) => {
            setStatus({
                error: error.message,
                stack: error.stack
            });
        });
    }, 180);
}

async function runExport() {
    if (!state.ready) return;
    updateSelectedFromDom();
    if (state.selected.size === 0) {
        setStatus(HELPER_SELECT_FILES);
        return;
    }
    setStatus("Packaging selected files...");

    const includeDependencies = $("includeDependencies").checked;
    const bundleDependencies = $("bundleDependencies").checked;
    const minimizeModeEl = $("minimizeMode");
    const minimizeMode = minimizeModeEl ? minimizeModeEl.value : "none";
    let result;
    try {
        result = await window.juiceExtractor.exportZip({
            selectedRelativePaths: [...state.selected],
            includeDependencies,
            bundleDependencies,
            minimizeMode
        });
    } catch (error) {
        setStatus({ error: error.message || String(error) });
        return;
    }

    if (result.canceled) {
        setStatus("Export canceled.");
        return;
    }

    if (result.ok === false) {
        setStatus({ error: result.error || "Export failed" });
        return;
    }

    const lines = [
        "Export complete",
        "===============",
        `Output: ${result.outputZipPath}`,
        ""
    ];
    lines.push(...buildExportSizeLines(result.metadata));
    setStatus(lines.join("\n"));
}

async function runImportManifest() {
    if (!state.ready) return;
    setStatus("Importing manifest and rebuilding...");
    let result;
    try {
        result = await window.juiceExtractor.importManifest();
    } catch (error) {
        setStatus({ error: error.message || String(error) });
        return;
    }

    if (result.canceled) {
        setStatus("Manifest import canceled.");
        return;
    }

    if (result.ok === false) {
        setStatus({ error: result.error || "Manifest import failed" });
        return;
    }

    const lines = [
        "Manifest rebuild complete",
        "=========================",
        `Manifest: ${result.manifestPath}`,
        `Output: ${result.outputZipPath}`,
        ""
    ];
    lines.push(...buildExportSizeLines(result.metadata));
    setStatus(lines.join("\n"));
}

async function handleChooseRepo() {
    setStatus("Selecting local repository...");
    const result = await window.juiceExtractor.chooseRepo();
    if (result.canceled) return;
    if (!result.ok) {
        setStatus(result.error || "Unable to set repository path.");
        return;
    }
    await initializeRepo();
}

async function handleCloneRepo() {
    const remoteUrl = $("remoteUrlInput").value.trim();
    clearSetupOutput("Starting clone...");
    state.clonePercent = 0;
    setSetupBusy(true);
    setCloneProgress(0, "Clone requested.");
    setStatus("Cloning repository. This can take a minute...");
    try {
        const result = await window.juiceExtractor.cloneRepo(remoteUrl);
        if (!result.ok) {
            setCloneProgress(state.clonePercent, `Clone failed: ${result.error || "Unknown error"}`);
            setStatus(result.error || "Unable to clone repository.");
            return;
        }
        setCloneProgress(100, "Clone complete.");
        await initializeRepo();
    } finally {
        setSetupBusy(false);
    }
}

function resetToInitialState() {
    if (state.analyzeTimer) {
        clearTimeout(state.analyzeTimer);
        state.analyzeTimer = null;
    }
    state.clonePercent = 0;
    const progressWrap = $("cloneProgressWrap");
    if (progressWrap) progressWrap.classList.add("hidden");
    const progressBar = $("cloneProgressBar");
    if (progressBar) progressBar.value = 0;
    const progressPercent = $("cloneProgressPercent");
    if (progressPercent) progressPercent.textContent = "0%";

    clearSetupOutput();
    setSetupBusy(false);
    resetExportOptions();
    clearFileSelections();
    clearFileSearch();

    if (state.ready) {
        setStatus(HELPER_SELECT_FILES);
    } else {
        setStatus("Juice repo is not yet configured.");
    }
}

function bindSetupActions() {
    $("chooseRepoBtn").addEventListener("click", () => {
        handleChooseRepo().catch((error) => setStatus(error.message));
    });
    $("cloneRepoBtn").addEventListener("click", () => {
        handleCloneRepo().catch((error) => setStatus(error.message));
    });
}

function bindCloneProgress() {
    if (!window.juiceExtractor.onCloneProgress) return;
    window.juiceExtractor.onCloneProgress((payload) => {
        if (!payload) return;
        const label = payload.stream ? `${payload.stream}: ${payload.message}` : payload.message;
        if (payload.phase === "error") {
            setCloneProgress(state.clonePercent, label || "Clone failed.");
            return;
        }
        if (payload.phase === "done" || payload.phase === "clone-complete") {
            setCloneProgress(100, label || "Clone complete.");
            return;
        }
        if (Number.isFinite(payload.percent)) {
            setCloneProgress(payload.percent, label);
            return;
        }
        if (label) appendSetupOutput(label);
    });
}

function bindFileSearch() {
    const searchInput = $("fileSearchInput");
    if (!searchInput) return;
    searchInput.addEventListener("input", applyFileFilter);
    searchInput.addEventListener("search", applyFileFilter);
}

async function initializeRepo() {
    const status = await window.juiceExtractor.getStatus();
    setHeaderMeta(status);

    if (!status.ready) {
        setReadyUi(false);
        setSetupBusy(false);
        const treeEl = $("fileTree");
        treeEl.innerHTML = "<div class='muted'>Repository unavailable until setup is complete.</div>";
        $("remoteUrlInput").value = status.remoteUrl || "";
        setStatus(
            status.reason === "missing_repo"
                ? `No Juice repo configured.\nSuggested clone path:\n${status.suggestedClonePath || "N/A"}`
                : `Repository sync failed: ${status.error || "Unknown error"}`
        );
        return;
    }

    setReadyUi(true);
    const tree = await window.juiceExtractor.getTree();
    state.tree = tree;
    renderTree(tree);
    setStatus(HELPER_SELECT_FILES);
    if (status.pullError) {
        setStatus(`${HELPER_SELECT_FILES}\n\nsync warning: ${status.pullError}`);
    }
}

async function bootstrap() {
    bindCloneProgress();
    bindSetupActions();
    bindFileSearch();
    if ($("analyzeBtn")) $("analyzeBtn").addEventListener("click", runAnalyze);
    $("exportBtn").addEventListener("click", runExport);
    $("importManifestBtn").addEventListener("click", runImportManifest);
    $("cancelBtn").addEventListener("click", resetToInitialState);
    clearSetupOutput();
    resetExportOptions();
    await initializeRepo();
}

bootstrap().catch((error) => {
    setStatus({
        error: error.message,
        stack: error.stack
    });
});
