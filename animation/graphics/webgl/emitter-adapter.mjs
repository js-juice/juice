/**
 * Emitter adapter that writes CPU-emitted particles directly into a
 * `ParticleStateBuffer` so the existing WebGL pipeline can render them.
 *
 * This is a lightweight, prototype implementation intended for quick
 * integration: it spawns particles, packs interleaved arrays that match
 * the buffer layout, and calls `fromInterleaved` on the target buffer.
 */

export default class EmitterAdapter {
    constructor(particles, config = {}) {
        this.particles = particles;
        this._accum = 0;
        this._writeIndex = 0;
        this._lastDelta = 0;
        this.configure(config);
    }

    configure(config = {}) {
        const rate = Number(config.particlesPerSecond);
        this.rate = Number.isFinite(rate) ? Math.max(0, rate) : 10;
        this.direction = Number(config.direction) || 0;
        const speed = Number(config.speed);
        this.speed = Number.isFinite(speed) ? Math.max(0, speed) : 0.2; // world units per second (tunable)
        this.spread = Number(config.spread) || Math.PI / 8;
        this.size = Number(config.size) || 1;
        this.life = Number(config.lifespan) || 2;
        this.speedRandomness = this._resolveRandomness(config.speedRandomness, 0);
        this.sizeRandomness = this._resolveRandomness(config.sizeRandomness, 0);
        this.lifespanRandomness = this._resolveRandomness(
            config.lifespanRandomness ?? config.lifeRandomness,
            0
        );
        this.spawnRadius = Number.isFinite(Number(config.spawnRadius)) ? Math.max(0, Number(config.spawnRadius)) : 0.01;
        this.spawnShape = ["line", "ellipse-arc"].includes(config.spawnShape) ? config.spawnShape : "disc";
        this.spawnDirectionVec = config.spawnDirectionVec || null;
        this.spawnSurface = config.spawnSurface || null;
        this.impactOnSpawn = config.impactOnSpawn === true;
        this.position = { x: Number(config.x) || 0, y: Number(config.y) || 0, z: Number(config.z) || 0 };
        this.interpolateSpawnPosition = config.interpolateSpawnPosition !== false;
        // Mask configuration: either a maskIndex (into particles.masks) or an explicit mask object
        this.maskIndex = Number.isFinite(config.maskIndex) ? Math.floor(config.maskIndex) : null;
        this.mask = config.mask || null;
        this.directionVec = config.directionVec || null; // {x,y,z}
        this.color = this._resolveColor(config.color ?? config.particleColor);
        return this;
    }

    _resolveColor(input) {
        if (Array.isArray(input) || input instanceof Float32Array) {
            const r = Number(input[0]);
            const g = Number(input[1]);
            const b = Number(input[2]);
            const a = Number(input[3]);
            if ([r, g, b].every(Number.isFinite)) {
                return [
                    Math.max(0, Math.min(1, r)),
                    Math.max(0, Math.min(1, g)),
                    Math.max(0, Math.min(1, b)),
                    Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 1
                ];
            }
            return null;
        }

        if (typeof input !== "string") return null;
        const text = input.trim().toLowerCase();
        const full = text.match(/^#([0-9a-f]{6})$/);
        const short = text.match(/^#([0-9a-f]{3})$/);
        const hex = full
            ? full[1]
            : short
              ? `${short[1][0]}${short[1][0]}${short[1][1]}${short[1][1]}${short[1][2]}${short[1][2]}`
              : null;
        if (!hex) return null;

        return [
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255,
            1
        ];
    }

    _defaultColor() {
        const color = this.color || this.particles?.stateDefaults?.color;
        if (Array.isArray(color) || color instanceof Float32Array) {
            return [
                Number.isFinite(Number(color[0])) ? Number(color[0]) : 1,
                Number.isFinite(Number(color[1])) ? Number(color[1]) : 1,
                Number.isFinite(Number(color[2])) ? Number(color[2]) : 1,
                Number.isFinite(Number(color[3])) ? Number(color[3]) : 1
            ];
        }
        return [1, 1, 1, 1];
    }

    _colorChannel(value, fallback = 1) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    _resolveRandomness(value, fallback = 0) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(0, number);
    }

    _randomizedValue(base, amount) {
        const numericBase = Number(base) || 0;
        const randomAmount = Number(amount) || 0;
        if (randomAmount <= 0) return numericBase;
        const multiplier = 1 + (Math.random() * 2 - 1) * randomAmount;
        return Math.max(0, numericBase * multiplier);
    }

    _normalize(v) {
        const l = Math.hypot(v.x || 0, v.y || 0, v.z || 0) || 1;
        return { x: (v.x || 0) / l, y: (v.y || 0) / l, z: (v.z || 0) / l };
    }

    _cross(a, b) {
        return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
    }

    _randomDirectionInCone(dirVec, cone) {
        // dirVec must be normalized
        const dir = this._normalize(dirVec);
        const cosOuter = Math.cos(cone || 0);
        const cosTheta = Math.random() * (1 - cosOuter) + cosOuter;
        const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
        const phi = Math.random() * Math.PI * 2;

        // Build orthonormal basis (u,v,dir)
        const up = Math.abs(dir.z) < 0.99 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
        let u = this._cross(up, dir);
        u = this._normalize(u);
        const v = this._cross(dir, u);

        return {
            x: dir.x * cosTheta + u.x * Math.cos(phi) * sinTheta + v.x * Math.sin(phi) * sinTheta,
            y: dir.y * cosTheta + u.y * Math.cos(phi) * sinTheta + v.y * Math.sin(phi) * sinTheta,
            z: dir.z * cosTheta + u.z * Math.cos(phi) * sinTheta + v.z * Math.sin(phi) * sinTheta
        };
    }

    _spawnBatch(toSpawn, startIndex) {
        // Resolve layout and stride from target buffer.
        const layoutMeta = this.particles._resolveLayout();
        const keys = layoutMeta.map((e) => e.key);
        const stride = layoutMeta.reduce((s, e) => s + e.components, 0);

        const data = new Float32Array(toSpawn * stride);
        let cursor = 0;
        const defaultColor = this._defaultColor();

        for (let i = 0; i < toSpawn; i++) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDistance = Math.sqrt(Math.random()) * this.spawnRadius;
            const lineDirection = this._normalize(this.spawnDirectionVec || { x: 1, y: 0, z: 0 });
            const lineOffset = (Math.random() * 2 - 1) * this.spawnRadius;
            let px = this.position.x;
            let py = this.position.y;
            let pz = this.position.z || 0;
            let surfaceDirection = null;

            if (this.spawnShape === "ellipse-arc" && this.spawnSurface) {
                const radiusX = Math.max(0, Number(this.spawnSurface.radiusX) || 0);
                const radiusY = Math.max(0, Number(this.spawnSurface.radiusY) || 0);
                const centerAngle = Number(this.spawnSurface.angle) || 0;
                const arc = Math.max(0, Number(this.spawnSurface.arc) || 0);
                const angle = centerAngle + (Math.random() - 0.5) * arc;
                px = (Number(this.spawnSurface.x) || 0) + Math.cos(angle) * radiusX;
                py = (Number(this.spawnSurface.y) || 0) + Math.sin(angle) * radiusY;
                pz = Number.isFinite(Number(this.spawnSurface.z)) ? Number(this.spawnSurface.z) : pz;
                surfaceDirection = this._normalize({
                    x: Math.cos(angle) / Math.max(0.0001, radiusX),
                    y: Math.sin(angle) / Math.max(0.0001, radiusY),
                    z: 0
                });
            } else if (this.spawnShape === "line") {
                px += lineDirection.x * lineOffset;
                py += lineDirection.y * lineOffset;
                pz += lineDirection.z * lineOffset;
            } else {
                px += Math.cos(spawnAngle) * spawnDistance;
                py += Math.sin(spawnAngle) * spawnDistance;
            }
            let spawnColor = null;

            // If a mask is configured, spawn from the mask points.
            const maskEntry =
                this.mask || (Number.isFinite(this.maskIndex) && this.particles.masks?.[this.maskIndex]) || null;
            if (maskEntry && maskEntry.points instanceof Float32Array && maskEntry.points.length >= 2) {
                const maskCount = Math.floor(maskEntry.points.length / 2);
                const pi = Math.floor(Math.random() * maskCount);
                const mx = maskEntry.points[pi * 2];
                const my = maskEntry.points[pi * 2 + 1];
                const depth =
                    maskEntry.options && Number.isFinite(maskEntry.options.position?.z)
                        ? Number(maskEntry.options.position.z)
                        : this.position.z || -2;
                const mapped = this.particles._maskPointToWorld(mx, my, depth);
                px = mapped.x;
                py = mapped.y;
                pz = mapped.z;
                if (maskEntry.colors instanceof Float32Array && maskEntry.colors.length >= (pi + 1) * 4) {
                    const m4 = pi * 4;
                    spawnColor = [
                        maskEntry.colors[m4],
                        maskEntry.colors[m4 + 1],
                        maskEntry.colors[m4 + 2],
                        maskEntry.colors[m4 + 3]
                    ];
                }
            }

            // Determine velocity: support 3D directionVec with cone spread, otherwise legacy 2D angle.
            let vx = 0,
                vy = 0,
                vz = 0;
            const sp = Math.max(0, this._randomizedValue(this.speed, this.speedRandomness));
            const particleSize = Math.max(0.01, this._randomizedValue(this.size, this.sizeRandomness) || 0.01);
            const particleLife = Math.max(0.01, this._randomizedValue(this.life, this.lifespanRandomness) || 0.01);
            const hasDirectionVec = this.directionVec && typeof this.directionVec === "object";
            const normalizedDirectionVec = surfaceDirection || (hasDirectionVec ? this._normalize(this.directionVec) : null);
            const validDirectionVec =
                normalizedDirectionVec &&
                (Math.abs(normalizedDirectionVec.x) > 1e-6 ||
                    Math.abs(normalizedDirectionVec.y) > 1e-6 ||
                    Math.abs(normalizedDirectionVec.z) > 1e-6);

            if (validDirectionVec) {
                const dirSample = this._randomDirectionInCone(normalizedDirectionVec, this.spread || 0);
                vx = dirSample.x * sp;
                vy = dirSample.y * sp;
                vz = dirSample.z * sp;
            } else {
                const dir = (Number(this.direction) || 0) + (Math.random() * this.spread - this.spread / 2);
                vx = Math.cos(dir) * sp;
                vy = Math.sin(dir) * sp;
                vz = 0;
            }

            const frameAge = this.interpolateSpawnPosition ? Math.random() * Math.max(0, Number(this._lastDelta) || 0) : 0;
            px += vx * frameAge;
            py += vy * frameAge;
            pz += vz * frameAge;

            for (const entry of layoutMeta) {
                const k = entry.key;
                switch (k) {
                    case "positions":
                        data[cursor++] = px;
                        data[cursor++] = py;
                        data[cursor++] = pz;
                        break;
                    case "velocities":
                        data[cursor++] = vx;
                        data[cursor++] = vy;
                        data[cursor++] = vz;
                        break;
                    case "destinations":
                        data[cursor++] = px;
                        data[cursor++] = py;
                        data[cursor++] = pz;
                        break;
                    case "colors":
                        if (spawnColor) {
                            data[cursor++] = this._colorChannel(spawnColor[0]);
                            data[cursor++] = this._colorChannel(spawnColor[1]);
                            data[cursor++] = this._colorChannel(spawnColor[2]);
                            data[cursor++] = this._colorChannel(spawnColor[3]);
                        } else {
                            data[cursor++] = defaultColor[0];
                            data[cursor++] = defaultColor[1];
                            data[cursor++] = defaultColor[2];
                            data[cursor++] = defaultColor[3];
                        }
                        break;
                    case "states":
                        data[cursor++] = this.impactOnSpawn ? 0 : pz;
                        data[cursor++] = -(frameAge + 0.000001 + (this.impactOnSpawn ? 10000 : 0));
                        data[cursor++] = px;
                        data[cursor++] = py;
                        break;
                    case "sizes":
                        data[cursor++] = particleSize;
                        break;
                    case "lifes":
                        data[cursor++] = particleLife;
                        break;
                    case "transitions":
                        data[cursor++] = 0;
                        data[cursor++] = 0;
                        data[cursor++] = 0;
                        data[cursor++] = 0;
                        break;
                    default:
                        for (let j = 0; j < entry.components; j++) data[cursor++] = 0;
                        break;
                }
            }
        }

        // Write data into the particles buffer; `fromInterleaved` updates count.
        this.particles.fromInterleaved({ data }, { layout: keys, stride, count: toSpawn, startIndex });
        return toSpawn;
    }

    _spawnN(toSpawn) {
        if (!this.particles || toSpawn <= 0) return 0;
        const maxCount = Math.max(1, Math.floor(Number(this.particles.maxCount) || 1));
        let remaining = Math.max(0, Math.floor(Number(toSpawn) || 0));
        let spawned = 0;
        const ranges = [];

        while (remaining > 0) {
            const startIndex = this._writeIndex % maxCount;
            const batchCount = Math.min(remaining, maxCount - startIndex);
            spawned += this._spawnBatch(batchCount, startIndex);
            ranges.push({ start: startIndex, count: batchCount });
            this._writeIndex = (this._writeIndex + batchCount) % maxCount;
            remaining -= batchCount;
        }

        this.lastSpawnRanges = ranges;
        return spawned;
    }

    /**
     * Emit immediately a burst of particles.
     */
    burst(count) {
        const n = Math.max(0, Math.floor(Number(count) || 0));
        return this._spawnN(n);
    }

    update(delta) {
        if (!this.particles || this.rate <= 0) return 0;
        this._lastDelta = Math.max(0, Number(delta) || 0);
        this._accum += this._lastDelta;
        const interval = 1 / Math.max(1e-6, this.rate);
        let toSpawn = 0;
        while (this._accum >= interval) {
            this._accum -= interval;
            toSpawn += 1;
        }
        if (toSpawn <= 0) return 0;
        return this._spawnN(toSpawn);
    }
}
