import fs from "fs";

const type = process.argv[2];
const value = process.argv[3] || "";

//type must be lower case dashed format
if (type !== type.toLowerCase() || type.includes(" ")) {
    console.error("Usage: type must be lower case dashed format");
    process.exit(1);
}

if (!type) {
    console.error("Usage: node .make/input.js <type> <value>");
    process.exit(1);
}
//Replace - with PascalCase
const className =
    "Input" +
    type
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("") +
    "Component";

const out = `import InputComponent from "./input-component.mjs";

class ${className} extends InputComponent {

    static tag = "input-${type}";

    static get observed() {
        return ["example-option"];
    }

    static get config() {
        return {
            value: { type: "string", default: "${value}" },
            native: { tag: "input", attrs: { type: "${type}" } },
            format: undefined,
            validation: undefined
        };
    }

    static get styles() {
        return {
            ":host": {
                display: "block"
            }
        };
    }

    static html( instance ){
        return \`
            <native></native>
        \`;
    }

    _onCreate() {

    }

    _afterRender() {

    }

    attributeChangedCallback(name, oldValue, newValue) {

    }
}

export default ${className};

customElements.define(${className}.tag, ${className});
`;

fs.writeFileSync(`../components/input-${type}.mjs`, out);
