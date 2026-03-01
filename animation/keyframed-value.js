import * as Easing from "./easing.mjs";

class KeyFramedValue {
    constructor(keyframes) {
        this.keyframes = keyframes;
    }

    keyFrame(percentage, value, easing = "linear") {
        if (Easing[easing] === undefined && typeof easing !== "function") {
            console.warn(`Easing function "${easing}" not found. Defaulting to linear.`);
            easing = "linear";
        }
        this.keyframes.push({ percentage, value, easing });
        // Sort keyframes by percentage
        this.keyframes.sort((a, b) => a.percentage - b.percentage);
    }

    compile(opts) {
        const duration = opts.duration || null;
        const frames = opts.frames || null;
        const fps = opts.fps || 60;

        if (duration !== null && frames !== null) {
            console.warn("Both duration and frames specified. Defaulting to duration.");
        }
        if (duration) frames = duration * fps;
        if (frames) duration = frames / fps;
        // Ensure keyframes are sorted
        this.keyframes.sort((a, b) => a.percentage - b.percentage);
        // Precompute easing functions for each keyframe
        this.keyframes.forEach((kf) => {
            kf.easingFunction = typeof kf.easing == "function" ? kf.easing : Easing[kf.easing] || Easing.linear;
        });
        let index = 0;
        let frame = 0;
        // Build optimized segment list for fast evaluation
        const kf = this.keyframes;
        const frameStep = duration / (frames || 60);
        const frameArr = new Float32Array(frames);
        while (index < this.keyframes.length - 1) {
            const percent = [],
                value = [],
                frames = [];

            percent = [kf[index].percentage / 100, kf[index + 1].percentage / 100];
            value = [kf[index].value, kf[index + 1].value];
            frames = [Math.round(percent[0] * frames), Math.round(percent[1] * frames)];
            const easingFunction = kf[index].easingFunction;
            while (frame <= frames[1]) {
                const t = (frame - frames[0]) / (frames[1] - frames[0]);
                const easedT = easingFunction(t);
                const interpolatedValue = value[0] + (value[1] - value[0]) * easedT;
                frame++;
                frameArr[frame] = interpolatedValue;
            }
            index++;
        }

        return frameArr;
    }
}

export { KeyFramedValue };
