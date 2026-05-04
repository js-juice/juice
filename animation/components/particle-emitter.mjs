import AnimationComponent from "./animation-component.mjs";
import ParticleEmitter from "../particles/emitter.mjs";

class ParticleEmitterComponent extends AnimationComponent {
    static tag = "particle-emitter";

    constructor(container, options) {
        super(container, options);
        this.emitter = new ParticleEmitter(options);
        this.behaviors = {};
    }

    static get styles() {
        return (
            super.styles +
            `
            :host { 
                position: absolute; 
                pointer-events: none; 
                width: 0px;
                height: 0px;
            }
            #contents{
                position: absolute;
                width: var(--width);
                height: var(--height);
            }
            .particle-source {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
        `
        );
    }

    setBehaviorFrames(property, keyframes, fps = 60) {
        const behaviors = ["life", "size", "color", "opacity", "velocity", "rotation", "position"];
        if (!behaviors.includes(property)) {
            console.warn(`Invalid behavior property: ${property}`);
            return;
        }
        this.behaviors[property] = keyframes;
    }

    bodyHTML() {
        return `<div id="particle-emitter"></div>`;
    }

    onCreate() {
        const _source = document.createElement("div");
        _source.className = "particle-source";
        _source.style.position = "absolute";
        _source.style.top = 0;
        _source.style.left = 0;
        _source.style.width = "100%";
        _source.style.height = "100%";
        _source.style.background = "limegreen";
        this.ref("particle-emitter").appendChild(_source);

        const canvas = document.createElement("canvas");
        canvas.width = this.width * 8;
        canvas.height = this.height * 20;
        _source.appendChild(canvas);

        this.source = _source;
    }
}

customElements.define(ParticleEmitterComponent.tag, ParticleEmitterComponent);
