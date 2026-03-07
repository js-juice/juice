/**
 * Canvas shape rendering utilities.
 * Provides shape drawing classes and utilities for canvas.
 * @module Components/Animation/Canvas/Shapes
 */

import { type } from "../../../core/Util/Core.mjs";
import Asset from "./asset.mjs";

/**
 * Stroke style for canvas shapes.
 * @class Stroke
 */
class Stroke {
    color = null;
    width = 0;

    /**
     * Initializes class state and runtime dependencies.
     * @param {*} color - Parameter value.
     * @param {*} width - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(color, width) {
        this.color = color;
        this.width = width;
    }

    /**
     * Executes apply.
     * @param {*} ctx - Parameter value.
     * @returns {*} Result of apply.
     */
    apply(ctx) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.stroke();
    }
}

/**
 * Represents the Shape animation module class.
 */
export class Shape extends Asset {
    type = "shape";
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
        this.points = [];
        this.width = 0;
        this.height = 0;
        this.fill = null;
        this.stroke = new Stroke();
        this.lineWidth = 0;
        this.rotation = 0;
    }

    /**
     * Executes prepareDraw.
     * @param {*} ctx - Parameter value.
     * @returns {*} Result of prepareDraw.
     */
    prepareDraw(ctx) {
        if (this.rotation) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
        }
    }

    /**
     * Executes finalizeDraw.
     * @param {*} ctx - Parameter value.
     * @returns {*} Result of finalizeDraw.
     */
    finalizeDraw(ctx) {
        if (this.fill) {
            ctx.fillStyle = this.fill;
            ctx.fill();
        }

        if (this.stroke) {
            this.stroke.apply(ctx);
        }

        if (this.rotation) {
            ctx.restore();
        }
    }

    /**
     * Executes draw.
     * @param {*} ctx - Parameter value.
     * @returns {*} Result of draw.
     */
    draw(ctx) {
        this.prepareDraw(ctx);

        ctx.beginPath();
        this.finalizeDraw(ctx);
    }
}

/**
 * Represents the Circle animation module class.
 */
export class Circle extends Asset {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @param {*} radius - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(x, y, radius) {
        super();
        this._x = x;
        this._y = y;
        this._radius = radius;
        this.fill = null;
    }

    /**
     * Executes draw.
     * @param {*} ctx - Parameter value.
     * @returns {*} Result of draw.
     */
    draw(ctx) {
        ctx.arc(this._x, this._y, this._radius, 0, Math.PI * 2, false);
    }
}

/**
 * Represents the Rectangle animation module class.
 */
export class Rectangle extends Asset {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @param {*} width - Parameter value.
     * @param {*} height - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(x, y, width, height) {
        super();
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
    }
}

/**
 * Represents the Square animation module class.
 */
export class Square extends Rectangle {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @param {*} size - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(x, y, size) {
        super(x, y, size, size);
    }
}

/**
 * Represents the Ellipse animation module class.
 */
export class Ellipse extends Asset {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @param {*} width - Parameter value.
     * @param {*} height - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(x, y, width, height) {
        super();
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
    }
}

/**
 * Represents the Line animation module class.
 */
export class Line extends Asset {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @param {*} x2 - Parameter value.
     * @param {*} y2 - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(x, y, x2, y2) {
        super();
        this._x = x;
        this._y = y;
        this._x2 = x2;
        this._y2 = y2;
    }
}

/**
 * Represents the Triangle animation module class.
 */
export class Triangle extends Asset {
    /**
     * Initializes class state and runtime dependencies.
     * @param {*} x - Parameter value.
     * @param {*} y - Parameter value.
     * @param {*} x2 - Parameter value.
     * @param {*} y2 - Parameter value.
     * @param {*} x3 - Parameter value.
     * @param {*} y3 - Parameter value.
     * @returns {*} Result of constructor.
     */
    constructor(x, y, x2, y2, x3, y3) {
        super();
        this._x = x;
        this._y = y;
        this._x2 = x2;
        this._y2 = y2;
        this._x3 = x3;
        this._y3 = y3;
    }
}
