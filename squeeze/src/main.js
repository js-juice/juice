const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { execFile, spawn } = require("node:child_process");
const { promisify } = require("node:util");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { buildFileTree, collectTransitiveDependencies, buildExtraction } = require("./dependency-service");
const execFileAsync = promisify(execFile);

const LEGACY_LOCAL_CLONE = path.resolve(__dirname, "../juice");
const DEFAULT_REMOTE_URL = (process.env.JUICE_REPO_URL || "https://github.com/chriskirby-dev/juice.git").trim() || null;
const STATE_FILE = "juice-repo-state.json";

function resolveRemoteUrl(requestedRemoteUrl, state = {}) {
    const requested = (requestedRemoteUrl || "").trim();
    return requested || state.remoteUrl || DEFAULT_REMOTE_URL || null;
}

function getManagedClonePath() {
    const configuredPath = (process.env.JUICE_LOCAL_CLONE || "").trim();
    if (configuredPath) return path.resolve(configuredPath);
    return path.join(app.getPath("userData"), ".juice-repo");
}

async function hideManagedFolder(targetPath) {
    if (process.platform !== "win32") return;
    try {
        await execFileAsync("attrib", ["+h", targetPath]);
    } catch {
        // best-effort; clone works even if hide flag cannot be applied
    }
}

function getStatePath() {
    return path.join(app.getPath("userData"), STATE_FILE);
}

async function pathExists(targetPath) {
    try {
        await fsp.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function runGit(repoPath, args) {
    const { stdout } = await execFileAsync("git", ["-C", repoPath, ...args]);
    return stdout.trim();
}

function parseClonePercent(line) {
    const match = line.match(/(\d{1,3})%/);
    if (!match) return null;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, value));
}

function runGitCloneWithProgress(remoteUrl, targetPath, emitProgress) {
    return new Promise((resolve, reject) => {
        const child = spawn("git", ["clone", "--progress", remoteUrl, targetPath], {
            windowsHide: true
        });

        const onChunk = (chunk, stream) => {
            const text = chunk.toString();
            const lines = text
                .split(/[\r\n]+/)
                .map((line) => line.trim())
                .filter(Boolean);
            for (const line of lines) {
                const percent = parseClonePercent(line);
                emitProgress({
                    phase: "clone-output",
                    stream,
                    message: line,
                    percent
                });
            }
        };

        child.stdout.on("data", (chunk) => onChunk(chunk, "stdout"));
        child.stderr.on("data", (chunk) => onChunk(chunk, "stderr"));
        child.on("error", (error) => reject(error));
        child.on("close", (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`git clone exited with code ${code}`));
        });
    });
}

async function readPackageVersion(repoPath) {
    const pkgPath = path.join(repoPath, "package.json");
    if (!(await pathExists(pkgPath))) return null;
    try {
        const parsed = JSON.parse(await fsp.readFile(pkgPath, "utf8"));
        return parsed.version || null;
    } catch {
        return null;
    }
}

async function readState() {
    const statePath = getStatePath();
    if (!(await pathExists(statePath))) return {};
    try {
        return JSON.parse(await fsp.readFile(statePath, "utf8"));
    } catch {
        return {};
    }
}

async function writeState(state) {
    const statePath = getStatePath();
    await fsp.mkdir(path.dirname(statePath), { recursive: true });
    await fsp.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}

async function isGitRepo(repoPath) {
    if (!repoPath) return false;
    const gitPath = path.join(repoPath, ".git");
    return pathExists(gitPath);
}

async function getRemoteTrackingState(repoPath, branch) {
    try {
        await runGit(repoPath, ["fetch", "--prune", "origin"]);
    } catch {
        // Continue with local tracking refs if fetch fails
    }

    let trackedBranch = branch && branch !== "HEAD" ? branch : null;
    if (!trackedBranch) {
        try {
            const originHead = await runGit(repoPath, ["symbolic-ref", "refs/remotes/origin/HEAD"]);
            const match = originHead.match(/^refs\/remotes\/origin\/(.+)$/);
            if (match && match[1]) trackedBranch = match[1];
        } catch {
            trackedBranch = null;
        }
    }
    if (!trackedBranch) trackedBranch = "master";

    const remoteRef = `origin/${trackedBranch}`;
    let remoteHead = null;
    try {
        remoteHead = await runGit(repoPath, ["rev-parse", remoteRef]);
    } catch {
        remoteHead = null;
    }

    return {
        remoteRef,
        trackedBranch,
        remoteHead
    };
}

async function inferRemoteUrl(repoPath) {
    try {
        return await runGit(repoPath, ["config", "--get", "remote.origin.url"]);
    } catch {
        return null;
    }
}

function normalizeMinimizeMode(value) {
    if (value === "dependencies" || value === "everything") return value;
    return "none";
}

function uniqueStrings(values) {
    return [...new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0))];
}

function extractSelectedPathsFromManifest(manifest) {
    if (!manifest || typeof manifest !== "object") return [];

    const fromEntries = Array.isArray(manifest.entries)
        ? manifest.entries
              .filter((entry) => entry && entry.kind === "bundle" && Array.isArray(entry.sources))
              .flatMap((entry) => entry.sources)
        : [];
    if (fromEntries.length > 0) return uniqueStrings(fromEntries);

    const direct = Array.isArray(manifest.selectedRelativePaths) ? manifest.selectedRelativePaths : [];
    if (direct.length > 0) return uniqueStrings(direct);

    return [];
}

async function syncRepoStatus(state, options = {}) {
    const repoPath = state.repoPath;
    const managedClonePath = getManagedClonePath();
    if (!(await isGitRepo(repoPath))) {
        return {
            ready: false,
            reason: "missing_repo",
            suggestedClonePath: managedClonePath,
            remoteUrl: state.remoteUrl || DEFAULT_REMOTE_URL
        };
    }

    const remoteUrl = state.remoteUrl || (await inferRemoteUrl(repoPath));
    let localHead = null;
    let branch = null;
    let localVersion = null;
    let remoteHead = null;
    let remoteRef = null;
    let trackedBranch = null;
    let behind = false;
    let pulled = false;
    let pullError = null;

    try {
        localHead = await runGit(repoPath, ["rev-parse", "HEAD"]);
        branch = await runGit(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
        localVersion = await readPackageVersion(repoPath);
        const remoteTracking = await getRemoteTrackingState(repoPath, branch);
        remoteHead = remoteTracking.remoteHead;
        remoteRef = remoteTracking.remoteRef;
        trackedBranch = remoteTracking.trackedBranch;
        behind = Boolean(localHead && remoteHead && localHead !== remoteHead);

        if (behind && options.autoPull !== false) {
            try {
                await runGit(repoPath, ["pull", "--ff-only", "origin", trackedBranch || branch || "master"]);
                pulled = true;
            } catch (error) {
                pullError = error.message;
            }
        }

        if (pulled) {
            localHead = await runGit(repoPath, ["rev-parse", "HEAD"]);
            localVersion = await readPackageVersion(repoPath);
            const refreshedRemoteTracking = await getRemoteTrackingState(repoPath, branch);
            remoteHead = refreshedRemoteTracking.remoteHead;
            remoteRef = refreshedRemoteTracking.remoteRef;
            trackedBranch = refreshedRemoteTracking.trackedBranch;
            behind = Boolean(localHead && remoteHead && localHead !== remoteHead);
        }
    } catch (error) {
        return {
            ready: false,
            reason: "sync_error",
            error: error.message,
            suggestedClonePath: managedClonePath,
            remoteUrl
        };
    }

    const nextState = {
        repoPath,
        remoteUrl,
        version: localVersion,
        head: localHead,
        masterHead: remoteHead,
        remoteHead,
        remoteRef,
        trackedBranch,
        branch,
        lastSyncedAt: new Date().toISOString()
    };
    await writeState(nextState);

    return {
        ready: true,
        repoPath,
        remoteUrl,
        version: localVersion,
        head: localHead,
        masterHead: remoteHead,
        remoteHead,
        remoteRef,
        trackedBranch,
        branch,
        behind,
        pulled,
        pullError,
        lastSyncedAt: nextState.lastSyncedAt
    };
}

async function ensureInitialState() {
    const state = await readState();
    const managedClonePath = getManagedClonePath();
    if (state.repoPath && (await isGitRepo(state.repoPath))) {
        return state;
    }
    if (await isGitRepo(managedClonePath)) {
        const remoteUrl = await inferRemoteUrl(managedClonePath);
        const seeded = {
            repoPath: managedClonePath,
            remoteUrl
        };
        await writeState(seeded);
        return seeded;
    }
    if (await isGitRepo(LEGACY_LOCAL_CLONE)) {
        const remoteUrl = await inferRemoteUrl(LEGACY_LOCAL_CLONE);
        const seeded = {
            repoPath: LEGACY_LOCAL_CLONE,
            remoteUrl
        };
        await writeState(seeded);
        return seeded;
    }
    return state;
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 820,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

ipcMain.handle("juice:get-root", async () => {
    const state = await ensureInitialState();
    return state.repoPath || null;
});

ipcMain.handle("juice:get-status", async () => {
    const state = await ensureInitialState();
    return syncRepoStatus(state, { autoPull: true });
});

ipcMain.handle("juice:choose-repo", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"],
        title: "Select local Juice repository"
    });
    if (result.canceled || !result.filePaths[0]) {
        return { canceled: true };
    }

    const repoPath = result.filePaths[0];
    if (!(await isGitRepo(repoPath))) {
        return { canceled: false, ok: false, error: "Selected folder is not a git repository." };
    }

    const remoteUrl = await inferRemoteUrl(repoPath);
    const next = { repoPath, remoteUrl };
    await writeState(next);
    const status = await syncRepoStatus(next, { autoPull: true });
    return { canceled: false, ok: true, status };
});

ipcMain.handle("juice:clone-repo", async (_event, requestedRemoteUrl) => {
    const emitProgress = (payload) => {
        _event.sender.send("juice:clone-progress", {
            at: new Date().toISOString(),
            ...payload
        });
    };

    const state = await readState();
    const remoteUrl = resolveRemoteUrl(requestedRemoteUrl, state);
    if (!remoteUrl) {
        emitProgress({ phase: "error", message: "No remote URL configured." });
        return {
            ok: false,
            error: "No repository URL is configured. Set JUICE_REPO_URL once or use an existing local clone."
        };
    }

    const targetPath = getManagedClonePath();
    emitProgress({ phase: "start", message: `Preparing clone to ${targetPath}` });
    if (await pathExists(targetPath)) {
        const existing = await fsp.readdir(targetPath).catch(() => []);
        if (existing.length > 0) {
            emitProgress({
                phase: "error",
                message: `Target folder is not empty: ${targetPath}`
            });
            return {
                ok: false,
                error: `Target clone folder is not empty: ${targetPath}. Select existing repo instead.`
            };
        }
    }

    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    try {
        emitProgress({ phase: "clone-start", message: `Cloning ${remoteUrl}` });
        await runGitCloneWithProgress(remoteUrl, targetPath, emitProgress);
        emitProgress({ phase: "clone-complete", percent: 100, message: "Clone complete." });
        await hideManagedFolder(targetPath);
    } catch (error) {
        emitProgress({ phase: "error", message: error.message });
        return { ok: false, error: error.message };
    }

    const next = { repoPath: targetPath, remoteUrl };
    await writeState(next);
    const status = await syncRepoStatus(next, { autoPull: true });
    emitProgress({ phase: "done", percent: 100, message: "Repository ready." });
    return { ok: true, status };
});

ipcMain.handle("juice:get-tree", async () => {
    const state = await ensureInitialState();
    if (!state.repoPath) {
        throw new Error("Juice repository is not configured.");
    }
    const rootDir = state.repoPath;
    return buildFileTree(rootDir);
});

ipcMain.handle("juice:analyze", async (_event, selectedRelativePaths) => {
    const state = await ensureInitialState();
    if (!state.repoPath) {
        throw new Error("Juice repository is not configured.");
    }
    const rootDir = state.repoPath;
    const absoluteFiles = selectedRelativePaths.map((rel) => path.resolve(rootDir, rel));
    const all = await collectTransitiveDependencies(absoluteFiles, rootDir);
    const selectedSet = new Set(absoluteFiles);
    const dependencies = [...all].filter((filePath) => !selectedSet.has(filePath));
    const toRelative = (absPath) => path.relative(rootDir, absPath).split(path.sep).join("/");

    return {
        selectedCount: selectedRelativePaths.length,
        totalIncludedCount: all.size,
        dependencyCount: dependencies.length,
        selectedFiles: selectedRelativePaths,
        dependencyFiles: dependencies.map(toRelative).sort((a, b) => a.localeCompare(b)),
        includedFiles: [...all].map(toRelative).sort((a, b) => a.localeCompare(b))
    };
});

ipcMain.handle("juice:export", async (_event, options) => {
    const state = await ensureInitialState();
    if (!state.repoPath) {
        throw new Error("Juice repository is not configured.");
    }
    const rootDir = state.repoPath;
    const defaultZipName = `juice-extract-${Date.now()}.zip`;
    const saveResult = await dialog.showSaveDialog({
        title: "Save Extracted Zip",
        defaultPath: path.join(app.getPath("downloads"), defaultZipName),
        filters: [{ name: "Zip Files", extensions: ["zip"] }]
    });

    if (saveResult.canceled || !saveResult.filePath) {
        return { canceled: true };
    }

    try {
        const metadata = await buildExtraction({
            rootDir,
            selectedRelativePaths: options.selectedRelativePaths,
            includeDependencies: options.includeDependencies,
            bundleDependencies: options.bundleDependencies,
            minimizeMode: options.minimizeMode || "none",
            outputZipPath: saveResult.filePath
        });

        return {
            canceled: false,
            ok: true,
            outputZipPath: saveResult.filePath,
            metadata
        };
    } catch (error) {
        return {
            canceled: false,
            ok: false,
            error: error.message || String(error)
        };
    }
});

ipcMain.handle("juice:import-manifest", async () => {
    const state = await ensureInitialState();
    if (!state.repoPath) {
        throw new Error("Juice repository is not configured.");
    }

    const syncStatus = await syncRepoStatus(state, { autoPull: true });
    if (!syncStatus.ready) {
        return {
            canceled: false,
            ok: false,
            error: syncStatus.error || "Repository sync failed."
        };
    }

    const openResult = await dialog.showOpenDialog({
        title: "Select Extract Manifest",
        properties: ["openFile"],
        filters: [{ name: "JSON Files", extensions: ["json"] }]
    });
    if (openResult.canceled || !openResult.filePaths[0]) {
        return { canceled: true };
    }

    const manifestPath = openResult.filePaths[0];
    let manifest;
    try {
        manifest = JSON.parse(await fsp.readFile(manifestPath, "utf8"));
    } catch (error) {
        return {
            canceled: false,
            ok: false,
            error: `Unable to parse manifest JSON: ${error.message || String(error)}`
        };
    }

    const selectedRelativePaths = extractSelectedPathsFromManifest(manifest);
    if (selectedRelativePaths.length === 0) {
        return {
            canceled: false,
            ok: false,
            error: "Manifest does not include bundle source files."
        };
    }

    const includeDependencies = manifest.includeDependencies !== false;
    const bundleDependencies = Boolean(manifest.bundleDependencies);
    const minimizeMode = normalizeMinimizeMode(manifest.minimizeMode);

    const defaultZipName = `juice-rebuild-${Date.now()}.zip`;
    const saveResult = await dialog.showSaveDialog({
        title: "Save Rebuilt Zip",
        defaultPath: path.join(app.getPath("downloads"), defaultZipName),
        filters: [{ name: "Zip Files", extensions: ["zip"] }]
    });
    if (saveResult.canceled || !saveResult.filePath) {
        return { canceled: true };
    }

    try {
        const metadata = await buildExtraction({
            rootDir: state.repoPath,
            selectedRelativePaths,
            includeDependencies,
            bundleDependencies,
            minimizeMode,
            outputZipPath: saveResult.filePath
        });
        return {
            canceled: false,
            ok: true,
            outputZipPath: saveResult.filePath,
            manifestPath,
            metadata,
            sync: {
                branch: syncStatus.branch,
                pulled: syncStatus.pulled,
                head: syncStatus.head,
                remoteHead: syncStatus.remoteHead
            }
        };
    } catch (error) {
        return {
            canceled: false,
            ok: false,
            error: error.message || String(error)
        };
    }
});

app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
