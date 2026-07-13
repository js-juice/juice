const chokidar = require("chokidar");

const watchDir = process.argv[2];
const outputDir = process.argv[3];

const files = [];

const config = {
    fileTypes: ["html", "tpl", "js", "mjs", "jsx", "ts", "tsx", "css", "scss", "less"]
};

const watcher = chokidar.watch(watchDir, {
    ignoreInitial: true,
    persistent: true
});

function onFileChange(event) {}

function onFileCreate(event) {}

function onFileDelete(event) {}

watcher
    .on("add", (path) => onFileCreate(path))
    .on("change", (path) => onFileChange(path))
    .on("unlink", (path) => onFileDelete(path))
    .on("ready", () => console.log("Watching..."))
    .on("error", (err) => console.error(err));
