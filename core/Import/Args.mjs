export function parseImportArgs(args, sections, importSections = {}) {
    const pathArgs = [...args];

    if (pathArgs.length === 0) {
        throw new Error("No Import args specified.");
    }

    let options = {};
    const lastArgument = pathArgs[pathArgs.length - 1];

    if (Array.isArray(lastArgument)) {
        options = { modules: pathArgs.pop() };
    } else if (lastArgument && typeof lastArgument === "object") {
        options = { ...pathArgs.pop() };
    }

    if (options.modules !== undefined && !Array.isArray(options.modules)) {
        throw new TypeError("Import modules must be an array of module names.");
    }

    const parts = pathArgs.flatMap((part) => {
        if (typeof part !== "string" || part.trim() === "") {
            throw new TypeError("Import path parts must be non-empty strings.");
        }

        return part.split("/").filter(Boolean);
    });
    const section = parts.shift();

    if (!sections.includes(section)) {
        throw new Error(`Import section "${section}" is not defined.`);
    }

    const isSectionImport = parts.length === 0;
    let path = isSectionImport ? importSections[section]?.import || "index.mjs" : parts.join("/");

    if (!isSectionImport && (!path.endsWith(".js") || !path.endsWith(".mjs"))) {
        path = `${path}.mjs`;
    }

    return {
        section,
        path,
        modulePath: `${section}/${path}`,
        modules: options.modules || [],
        isSectionImport,
        options
    };
}

export function selectImportedModules(module, modules = []) {
    if (modules.length === 0) return module;

    return modules.reduce((selected, name) => {
        if (name in module) selected[name] = module[name];
        return selected;
    }, {});
}
