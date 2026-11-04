import assert from "node:assert/strict";
import test from "node:test";

import { fileKind, fileMatchesAccept, formatFileSize, mergeFiles } from "./input-files-utils.mjs";

function file(name, type, size = 100, lastModified = 1) {
    return { name, type, size, lastModified };
}

test("accept rules support extensions, exact MIME types, and MIME wildcards", () => {
    assert.equal(fileMatchesAccept(file("photo.PNG", ""), "image/*"), true);
    assert.equal(fileMatchesAccept(file("brief.pdf", "application/pdf"), ".docx, application/pdf"), true);
    assert.equal(fileMatchesAccept(file("song.mp3", "audio/mpeg"), "image/*,.pdf"), false);
});

test("file merging keeps accepted unique files and reports rejected or duplicate files", () => {
    const image = file("photo.png", "image/png");
    const document = file("brief.pdf", "application/pdf");
    const result = mergeFiles([image], [image, document], "image/*");

    assert.deepEqual(result.files, [image]);
    assert.deepEqual(result.duplicates, [image]);
    assert.deepEqual(result.rejected, [document]);
});

test("file presentation derives useful kinds and readable sizes", () => {
    assert.equal(fileKind(file("photo.svg", "")), "image");
    assert.equal(fileKind(file("archive.zip", "application/octet-stream")), "archive");
    assert.equal(fileKind(file("notes.txt", "text/plain")), "document");
    assert.equal(formatFileSize(512), "512 B");
    assert.equal(formatFileSize(1536), "1.5 KB");
    assert.equal(formatFileSize(5 * 1024 * 1024), "5 MB");
});
