const IMAGE_EXTENSIONS = new Set([
    "avif",
    "bmp",
    "gif",
    "heic",
    "heif",
    "jpeg",
    "jpg",
    "png",
    "svg",
    "webp"
]);

const TYPE_EXTENSIONS = {
    audio: new Set(["aac", "flac", "m4a", "mp3", "ogg", "wav"]),
    archive: new Set(["7z", "bz2", "gz", "rar", "tar", "tgz", "zip"]),
    code: new Set(["css", "html", "js", "json", "jsx", "mjs", "php", "py", "rb", "scss", "ts", "tsx", "xml"]),
    document: new Set(["doc", "docx", "odt", "pdf", "rtf", "txt"]),
    spreadsheet: new Set(["csv", "ods", "xls", "xlsx"]),
    video: new Set(["avi", "m4v", "mkv", "mov", "mp4", "webm"])
};

export function fileExtension(file) {
    const name = String(file?.name || "");
    const index = name.lastIndexOf(".");
    return index > 0 && index < name.length - 1 ? name.slice(index + 1).toLowerCase() : "";
}

export function fileIdentity(file) {
    return [file?.name || "", file?.size || 0, file?.lastModified || 0, file?.type || ""].join("::");
}

export function fileMatchesAccept(file, accept = "") {
    const rules = String(accept)
        .split(",")
        .map((rule) => rule.trim().toLowerCase())
        .filter(Boolean);

    if (rules.length === 0) return true;

    const name = String(file?.name || "").toLowerCase();
    const type = String(file?.type || "").toLowerCase();
    const extension = fileExtension(file);

    return rules.some((rule) => {
        if (rule.startsWith(".")) return name.endsWith(rule);
        if (rule.endsWith("/*")) {
            const category = rule.slice(0, -1);
            if (type.startsWith(category)) return true;
            return category === "image/" && IMAGE_EXTENSIONS.has(extension);
        }
        return type === rule;
    });
}

export function mergeFiles(current, incoming, accept = "") {
    const files = Array.from(current || []);
    const identities = new Set(files.map(fileIdentity));
    const rejected = [];
    const duplicates = [];

    for (const file of Array.from(incoming || [])) {
        if (!fileMatchesAccept(file, accept)) {
            rejected.push(file);
            continue;
        }

        const identity = fileIdentity(file);
        if (identities.has(identity)) {
            duplicates.push(file);
            continue;
        }

        identities.add(identity);
        files.push(file);
    }

    return { files, rejected, duplicates };
}

export function fileKind(file) {
    const type = String(file?.type || "").toLowerCase();
    const extension = fileExtension(file);

    if (type.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) return "image";
    if (type.startsWith("audio/")) return "audio";
    if (type.startsWith("video/")) return "video";

    for (const [kind, extensions] of Object.entries(TYPE_EXTENSIONS)) {
        if (extensions.has(extension)) return kind;
    }

    return "file";
}

export function formatFileSize(bytes) {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} B`;

    const units = ["KB", "MB", "GB", "TB"];
    let value = size / 1024;
    let unit = units[0];

    for (let index = 1; index < units.length && value >= 1024; index += 1) {
        value /= 1024;
        unit = units[index];
    }

    const precision = value >= 10 ? 0 : 1;
    const formatted = value.toFixed(precision).replace(/\.0$/, "");
    return `${formatted} ${unit}`;
}
