/**
 * GLSL shader code builder.
 * Programmatically constructs shader source code with proper structure.
 * @module Graphics/WebGL/Lib/ShaderBuilder
 */

/**
 * Builder for constructing GLSL shader code.
 * @class ShaderBuilder
 */
class ShaderBuilder {
    head = [];
    definitions = [];
    main = [];
    functions = [];
    structs = [];
    precision = null;

    /**
     * Initializes class state and runtime dependencies.
     * @param {*} version - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(version = 2) {
        this.version = version;
    }

    /**
     * Sets precision values.
     * @param {*} precision - Parameter value.
     * @param {*} dataType - Parameter value.
     * @returns {*} Result of setPrecision.
     */
    setPrecision(precision, dataType) {
        this.precision = `precision ${precision.toLowerCase()}p ${dataType};`;
    }

    /**
     * Executes addHeader.
     * @param {*} header - Parameter value.
     * @returns {*} Result of addHeader.
     */
    addHeader(header) {
        this.head.push(header);
    }

    /**
     * Executes define.
     * @param {*} qualifier - Parameter value.
     * @param {*} name - Parameter value.
     * @param {*} type - Parameter value.
     * @returns {*} Result of define.
     */
    define(qualifier, name, type) {
        this.definitions.push(`${qualifier} ${type} ${name};`);
    }

    /**
     * Executes addMain.
     * @param {*} code - Parameter value.
     * @returns {*} Result of addMain.
     */
    addMain(code) {
        this.main.push(code);
    }

    /**
     * Executes addFunction.
     * @param {*} returnType - Parameter value.
     * @param {*} name - Parameter value.
     * @param {*} args - Parameter value.
     * @param {*} code - Parameter value.
     * @returns {*} Result of addFunction.
     */
    addFunction(returnType, name, args, code) {
        this.functions.push(`//Function: ${name} \n${returnType} ${name}(${args.join(", ")}) {\n ${code} \n}`);
    }

    /**
     * Executes addStruct.
     * @param {*} name - Parameter value.
     * @param {*} fields - Parameter value.
     * @returns {*} Result of addStruct.
     */
    addStruct(name, fields) {
        this.definitions.push(`struct ${name} { 
             ${fields.join(";\n ")};
         };`);
    }

    /**
     * Executes build.
     * @returns {*} Result of build.
     */
    build() {
        const code =
            (this.version === 1 ? "#version 100" : "#version 300 es") +
            `
            ${this.precision ? this.precision : ""}
            ${this.structs.join("\n")}
        \n${this.functions.join("\n\n")}
        \n${this.head.length ? this.head.join("\n") : ""}   

        \n${this.definitions.join("\n")}

        \nvoid main() {\n${this.main.join("\n")} \n}
    `;
        // debug logs removed for performance
        return code;
    }
}

export default ShaderBuilder;