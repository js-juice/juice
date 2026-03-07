/**
 * WebGL plane geometry generator.
 * Creates subdivided plane geometry for WebGL rendering.
 * @module Graphics/WebGL/Lib/Plane
 */

/**
 * Plane geometry with configurable subdivisions.
 * @class Plane
 */
class Plane {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} width - Parameter value.
     * @param {*} height - Parameter value.
     * @param {*} subdivisionsX - Parameter value.
     * @param {*} subdivisionsY - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(width, height, subdivisionsX, subdivisionsY) {
        this.width = width;
        this.height = height;
        this.subdivisionsX = subdivisionsX;
        this.subdivisionsY = subdivisionsY;

        this.vertices = [];
        this.uvs = [];
        this.triangles = [];
        this.normals = [];
        this.colors = [];
        this.uvs = [];

        this.generate();
    }

    /**
     * Executes generateVertices.
     * @returns {*} Result of generateVertices.
     */
    generateVertices() {
        const xStep = this.width / this.subdivisionsX;
        const yStep = this.height / this.subdivisionsY;

        for (let y = 0; y <= this.subdivisionsY; y++) {
            for (let x = 0; x <= this.subdivisionsX; x++) {
                this.vertices.push(x * xStep - this.width / 2, y * yStep - this.height / 2, 0);
            }
        }
    }

    /**
     * Executes generateUvs.
     * @returns {*} Result of generateUvs.
     */
    generateUvs() {
        for (let y = 0; y <= this.subdivisionsY; y++) {
            for (let x = 0; x <= this.subdivisionsX; x++) {
                this.uvs.push(x / this.subdivisionsX, y / this.subdivisionsY);
            }
        }
    }

    /**
     * Executes generateTriangles.
     * @returns {*} Result of generateTriangles.
     */
    generateTriangles() {
        for (let y = 0; y < this.subdivisionsY; y++) {
            for (let x = 0; x < this.subdivisionsX; x++) {
                this.triangles.push(
                    x + y * (this.subdivisionsX + 1),
                    x + 1 + y * (this.subdivisionsX + 1),
                    x + 1 + (y + 1) * (this.subdivisionsX + 1)
                );
                this.triangles.push(
                    x + 1 + y * (this.subdivisionsX + 1),
                    x + 1 + (y + 1) * (this.subdivisionsX + 1),
                    x + (y + 1) * (this.subdivisionsX + 1)
                );
            }
        }
    }

    /**
     * Executes generateNormals.
     * @returns {*} Result of generateNormals.
     */
    generateNormals() {
        for (let y = 0; y <= this.subdivisionsY; y++) {
            for (let x = 0; x <= this.subdivisionsX; x++) {
                this.normals.push(0, 0, 1);
            }
        }
    }

    /**
     * Executes generateColors.
     * @returns {*} Result of generateColors.
     */
    generateColors() {
        for (let y = 0; y <= this.subdivisionsY; y++) {
            for (let x = 0; x <= this.subdivisionsX; x++) {
                this.colors.push(1, 1, 1, 1);
            }
        }
    }

    /**
     * Executes compile.
     * @returns {*} Result of compile.
     */
    compile() {
        return {
            vertices: this.vertices,
            uvs: this.uvs,
            triangles: this.triangles,
            normals: this.normals,
            colors: this.colors,
        };
    }

    /**
     * Executes generate.
     * @returns {*} Result of generate.
     */
    generate() {
        this.generateVertices();
        this.generateUvs();
        this.generateTriangles();
        this.generateNormals();
        this.generateColors();
    }
}

export default Plane;
