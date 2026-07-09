/**
 * @file vendor/juice/JSDOC_EXAMPLE_FILE.js
 * @module jsdoc-example-file
 * @description
 * End-state example of a source file documented with JSDoc.
 * This demonstrates file docs, typedefs, constants, standalone functions,
 * a class, methods, thrown errors, and usage examples.
 * @since 1.0.0
 */

/**
 * @typedef {Object} ScorePoint
 * @description A single score sample for a named player.
 * @property {string} player Player name.
 * @property {number} score Numeric score value.
 * @property {number} timestamp Unix epoch milliseconds.
 */

/**
 * @typedef {Object} LeaderboardEntry
 * @description Aggregated leaderboard output.
 * @property {string} player Player name.
 * @property {number} totalScore Sum of all recorded scores for the player.
 * @property {number} games Number of score points counted for the player.
 * @property {number} averageScore Average score per game.
 */

/**
 * Default point multiplier used when none is provided.
 * @type {number}
 */
const DEFAULT_MULTIPLIER = 1;

/**
 * Normalizes any value to a finite number.
 * @function toFiniteNumber
 * @param {*} value Input value.
 * @param {number} [fallback=0] Fallback when value is not finite.
 * @returns {number} Finite numeric output.
 * @example
 * toFiniteNumber("42", 0); // 42
 * @example
 * toFiniteNumber("NaN", 0); // 0
 */
function toFiniteNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Validates and creates a score point.
 * @function createScorePoint
 * @param {string} player Player name.
 * @param {number} score Numeric score.
 * @param {number} [timestamp=Date.now()] Unix epoch milliseconds.
 * @returns {ScorePoint} New score point object.
 * @throws {TypeError} Thrown when player is empty or score is invalid.
 * @example
 * const point = createScorePoint("Chris", 12.5);
 */
function createScorePoint(player, score, timestamp = Date.now()) {
    const name = typeof player === "string" ? player.trim() : "";
    if (!name) {
        throw new TypeError("createScorePoint: player must be a non-empty string");
    }

    const normalizedScore = toFiniteNumber(score, Number.NaN);
    if (!Number.isFinite(normalizedScore)) {
        throw new TypeError("createScorePoint: score must be a finite number");
    }

    return {
        player: name,
        score: normalizedScore,
        timestamp: toFiniteNumber(timestamp, Date.now())
    };
}

/**
 * Builds leaderboard entries from a list of score points.
 * @function buildLeaderboard
 * @param {ScorePoint[]} points Source points.
 * @param {number} [multiplier=1] Score multiplier.
 * @returns {LeaderboardEntry[]} Sorted leaderboard entries (highest score first).
 * @example
 * const rows = buildLeaderboard([
 *   { player: "A", score: 10, timestamp: 1700000000000 },
 *   { player: "A", score: 20, timestamp: 1700000000001 },
 *   { player: "B", score: 15, timestamp: 1700000000002 }
 * ]);
 */
function buildLeaderboard(points, multiplier = DEFAULT_MULTIPLIER) {
    const rows = Array.isArray(points) ? points : [];
    const factor = toFiniteNumber(multiplier, DEFAULT_MULTIPLIER);
    const buckets = new Map();

    for (const point of rows) {
        if (!point || typeof point !== "object") {
            continue;
        }

        const player = typeof point.player === "string" ? point.player.trim() : "";
        const score = toFiniteNumber(point.score, Number.NaN);
        if (!player || !Number.isFinite(score)) {
            continue;
        }

        if (!buckets.has(player)) {
            buckets.set(player, { totalScore: 0, games: 0 });
        }

        const bucket = buckets.get(player);
        bucket.totalScore += score * factor;
        bucket.games += 1;
    }

    const result = [];
    for (const [player, bucket] of buckets.entries()) {
        const averageScore = bucket.games > 0 ? bucket.totalScore / bucket.games : 0;
        result.push({
            player,
            totalScore: bucket.totalScore,
            games: bucket.games,
            averageScore
        });
    }

    result.sort((a, b) => b.totalScore - a.totalScore);
    return result;
}

/**
 * Stores score points and generates leaderboard summaries.
 * @class ScoreTracker
 */
class ScoreTracker {
    /**
     * @param {ScorePoint[]} [seed=[]] Optional initial points.
     */
    constructor(seed = []) {
        /**
         * Internal score points collection.
         * @type {ScorePoint[]}
         */
        this.points = Array.isArray(seed) ? seed.slice() : [];
    }

    /**
     * Adds a score point by value.
     * @param {string} player Player name.
     * @param {number} score Numeric score.
     * @param {number} [timestamp=Date.now()] Unix epoch milliseconds.
     * @returns {ScorePoint} The created score point.
     */
    add(player, score, timestamp = Date.now()) {
        const point = createScorePoint(player, score, timestamp);
        this.points.push(point);
        return point;
    }

    /**
     * Returns leaderboard output for current points.
     * @param {number} [multiplier=1] Score multiplier.
     * @returns {LeaderboardEntry[]} Sorted leaderboard entries.
     */
    leaderboard(multiplier = DEFAULT_MULTIPLIER) {
        return buildLeaderboard(this.points, multiplier);
    }

    /**
     * Removes all tracked points.
     * @returns {void}
     */
    reset() {
        this.points.length = 0;
    }
}

module.exports = {
    DEFAULT_MULTIPLIER,
    toFiniteNumber,
    createScorePoint,
    buildLeaderboard,
    ScoreTracker
};
