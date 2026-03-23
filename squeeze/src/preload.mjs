const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("juiceExtractor", {
    getRoot: () => ipcRenderer.invoke("juice:get-root"),
    getStatus: () => ipcRenderer.invoke("juice:get-status"),
    chooseRepo: () => ipcRenderer.invoke("juice:choose-repo"),
    cloneRepo: (remoteUrl) => ipcRenderer.invoke("juice:clone-repo", remoteUrl),
    onCloneProgress: (listener) => {
        const wrapped = (_event, payload) => listener(payload);
        ipcRenderer.on("juice:clone-progress", wrapped);
        return () => ipcRenderer.removeListener("juice:clone-progress", wrapped);
    },
    getTree: () => ipcRenderer.invoke("juice:get-tree"),
    analyze: (selectedRelativePaths) => ipcRenderer.invoke("juice:analyze", selectedRelativePaths),
    exportZip: (options) => ipcRenderer.invoke("juice:export", options),
    importManifest: () => ipcRenderer.invoke("juice:import-manifest"),
    openExternal: (url) => {
        console.log(`Opening external URL: ${url}`);
        shell.openExternal(url);
    }
});
