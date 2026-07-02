import manifest from "./manifest.js";

manifest.build().then((manifest) => {
    const hash = manifest.hash;
    console.log("Manifest built successfully!", hash);
    console.log(manifest);
});
