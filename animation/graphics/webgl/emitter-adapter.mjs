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
        this.configure(config);
    }

    configure(config = {}) {
        this.rate = Number(config.particlesPerSecond) || 10;
        this.direction = Number(config.direction) || 0;
        this.speed = Number(config.speed) || 0.2; // world units per second (tunable)
        this.spread = Number(config.spread) || Math.PI / 8;
        this.size = Number(config.size) || 1;
        this.life = Number(config.lifespan) || 2;
        this.position = { x: Number(config.x) || 0, y: Number(config.y) || 0, z: Number(config.z) || 0 };
        // Mask configuration: either a maskIndex (into particles.masks) or an explicit mask object
        this.maskIndex = Number.isFinite(config.maskIndex) ? Math.floor(config.maskIndex) : null;
        this.mask = config.mask || null;
        this.directionVec = config.directionVec || null; // {x,y,z}
        return this;
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

    _spawnN(toSpawn) {
        if (!this.particles || toSpawn <= 0) return 0;
        // Resolve layout and stride from target buffer.
        const layoutMeta = this.particles._resolveLayout();
        const keys = layoutMeta.map((e) => e.key);
        const stride = layoutMeta.reduce((s, e) => s + e.components, 0);

        const data = new Float32Array(toSpawn * stride);
        let cursor = 0;

        for (let i = 0; i < toSpawn; i++) {
            let px = this.position.x + (Math.random() * 2 - 1) * 0.01;
            let py = this.position.y + (Math.random() * 2 - 1) * 0.01;
            let pz = this.position.z || 0;
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
            const sp = this.speed;
            if (this.directionVec && typeof this.directionVec === "object") {
                const dirSample = this._randomDirectionInCone(this.directionVec, this.spread || 0);
                vx = dirSample.x * sp;
                vy = dirSample.y * sp;
                vz = dirSample.z * sp;
            } else {
                const dir = this.direction + (Math.random() * this.spread - this.spread / 2);
                vx = Math.cos(dir) * sp;
                vy = Math.sin(dir) * sp;
                vz = 0;
            }

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
                            data[cursor++] = spawnColor[0] || 1;
                            data[cursor++] = spawnColor[1] || 1;
                            data[cursor++] = spawnColor[2] || 1;
                            data[cursor++] = spawnColor[3] || 1;
                        } else {
                            data[cursor++] = 1;
                            data[cursor++] = 1;
                            data[cursor++] = 1;
                            data[cursor++] = 1;
                        }
                        break;
                    case "states":
                        data[cursor++] = pz;
                        data[cursor++] = 0;
                        data[cursor++] = px;
                        data[cursor++] = py;
                        break;
                    case "sizes":
                        data[cursor++] = this.size;
                        break;
                    case "lifes":
                        data[cursor++] = this.life;
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

        const startIndex = Math.max(0, Math.floor(Number(this.particles.count) || 0));
        // Write data into the particles buffer; `fromInterleaved` updates count.
        this.particles.fromInterleaved({ data }, { layout: keys, stride, count: toSpawn, startIndex });
        return toSpawn;
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
        this._accum += Number(delta) || 0;
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
