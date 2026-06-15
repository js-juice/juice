import Component from "../../component.mjs";

class JoyStickComponent extends Component.HTMLElement {
    static tag = "ui-joystick";

    static config = {
        properties: {
            value: { type: "json", default: { x: 0.5, y: 0.5 } }
        }
    };

    static get observed() {
        return {
            all: ["value"]
        };
    }

    static get style() {
        return [
            {
                "#base": {
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    aspectRatio: "1",
                    background: "linear-gradient(0deg, #8f8f8f 0%, #d5d4d4 100%) no-repeat",
                    borderRadius: "50%",
                    userSelect: "none"
                },
                "#base:before": {
                    position: "absolute",
                    content: "''",
                    width: "90%",
                    height: "90%",
                    left: "5%",
                    top: "5%",
                    aspectRatio: "1",
                    background: "#FFFFFF",
                    borderRadius: "50%",
                    zIndex: 1
                },
                "#joystick": {
                    width: "40%",
                    left: "50%",
                    top: "50%",
                    aspectRatio: "1",
                    borderRadius: "50%",
                    outline: "1px solid #333",
                    position: "absolute",
                    transform: "translate(-50%, -50%)",
                    zIndex: 2,
                    cursor: "grab",
                    background: "linear-gradient(0deg, #777 0%, #838383 100%)",
                    transition: "none",
                    pointerEvents: "auto"
                },
                "#joystick:active": {
                    cursor: "grabbing"
                },
                "#joystick:before": {
                    position: "absolute",
                    content: "''",
                    width: "80%",
                    height: "80%",
                    borderRadius: "50%",
                    top: "10%",
                    left: "10%",
                    background: "radial-gradient(circle at 38% 47%, #666 0%, #333 66%)"
                },
                ".direction": {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "0px",
                    height: "0px",
                    zIndex: 1,
                    transform: "translate(-50%, -50%) rotate(calc( var(--index, 0) * 45deg ))",
                    pointerEvents: "none"
                },
                ".direction div": {
                    position: "absolute",
                    top: "-50px",
                    left: "0px",
                    background: "#D2D2D2",
                    width: "15px",
                    aspectRatio: "1/0.5",
                    zIndex: 1,
                    clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
                    transform: "translate(-50%, -50%)",
                    transition: "background 0.15s ease"
                },
                ".direction.up.left div, .direction.up.right div, .direction.down.left div, .direction.down.right div":
                    {
                        width: "10px"
                    },
                ".direction.active div": {
                    background: "linear-gradient(0deg, #2563eb 0%, #1e40af 100%)"
                }
            }
        ];
    }

    static html() {
        return `<div id="base">
            <div id="directions">
                <div class="direction up" style="--index: 0"><div></div></div>
                <div class="direction right up" style="--index: 1"><div></div></div>
                <div class="direction right" style="--index: 2"><div></div></div>
                <div class="direction right down" style="--index: 3"><div></div></div>
                <div class="direction down" style="--index: 4"><div></div></div>
                <div class="direction left down" style="--index: 5"><div></div></div>
                <div class="direction left" style="--index: 6"><div></div></div>
                <div class="direction up left" style="--index: 7"><div></div></div>
            </div>
            <div id="joystick"></div>
        </div>`;
    }

    onFirstConnect() {
        // Get refs from the DOM
        const root = this.root || this.shadowRoot || this;
        this.base = root.querySelector("#base");
        this.joystick = root.querySelector("#joystick");
        this.directions = root.querySelector("#directions");

        if (!this.base || !this.joystick) {
            console.error("Joystick: Could not find base or joystick elements");
            return;
        }

        // Initialize to center
        this.value = { x: 0.5, y: 0.5 };
        this.joystick.style.transform = "translate(-50%, -50%)";

        // Direct pointer event handlers (arrow functions preserve 'this')
        this.joystick.addEventListener("pointerdown", this.handlePointerDown.bind(this));
        this.joystick.addEventListener("pointermove", this.handlePointerMove.bind(this));
        this.joystick.addEventListener("pointerup", this.handlePointerUp.bind(this));
        this.joystick.addEventListener("pointercancel", this.handlePointerUp.bind(this));
        this.joystick.addEventListener("pointerleave", this.handlePointerUp.bind(this));
    }

    handlePointerDown(e) {
        e.preventDefault();
        this.isDragging = true;
        if (this.joystick.setPointerCapture) {
            try {
                this.joystick.setPointerCapture(e.pointerId);
            } catch (err) {
                // Capture failed, continue anyway
            }
        }
    }

    handlePointerMove(e) {
        if (!this.isDragging) return;

        const rect = this.base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Get joystick dimensions
        const joystickSize = this.joystick.offsetWidth;
        const maxRadius = Math.min(rect.width, rect.height) / 2 - joystickSize / 2 - 2;

        // Calculate offset from center
        let dx = e.clientX - centerX;
        let dy = e.clientY - centerY;

        // Clamp to circular boundary
        const dist = Math.hypot(dx, dy);
        if (dist > maxRadius && dist > 0) {
            const scale = maxRadius / dist;
            dx *= scale;
            dy *= scale;
        }

        // Apply visual transform
        this.joystick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // Convert to normalized value [0..1]
        const normX = (dx / maxRadius) * 0.5 + 0.5;
        const normY = (dy / maxRadius) * 0.5 + 0.5;

        this.value = {
            x: Math.max(0, Math.min(1, normX)),
            y: Math.max(0, Math.min(1, normY))
        };

        // Update direction highlights
        this.updateDirections(this.value.x, this.value.y);
    }

    handlePointerUp(e) {
        if (!this.isDragging) return;

        this.isDragging = false;

        if (this.joystick.releasePointerCapture) {
            try {
                this.joystick.releasePointerCapture(e.pointerId);
            } catch (err) {
                // Release failed, continue anyway
            }
        }

        // Return to center
        this.joystick.style.transform = "translate(-50%, -50%)";
        this.value = { x: 0.5, y: 0.5 };
        this.clearDirectionHighlights();
    }

    updateDirections(x, y) {
        if (!this.directions) return;

        const dx = x - 0.5;
        const dy = y - 0.5;
        const mag = Math.hypot(dx, dy);
        const threshold = 0.08;

        const directionNodes = this.directions.querySelectorAll(".direction");
        directionNodes.forEach((n) => n.classList.remove("active"));

        if (mag <= threshold) {
            return;
        }

        // Invert y for logical game directions: up should be positive
        const angle = Math.atan2(-dy, dx) * (180 / Math.PI);
        const normalizedAngle = angle < -180 ? angle + 360 : angle > 180 ? angle - 360 : angle;

        const closest = Math.round(normalizedAngle / 45) * 45;
        const primary = this.directionNameForAngle(closest);
        const primaryNode = this.directions.querySelector(`.direction.${primary}`);
        if (primaryNode) primaryNode.classList.add("active");

        // If the primary direction is diagonal, allow exactly one adjacent cardinal arrow
        if ([45, 135, -135, -45].includes(closest)) {
            const error = Math.abs(normalizedAngle - closest);
            if (error < 18) {
                const adjacent = this.adjacentCardinalForDiagonal(closest, normalizedAngle);
                if (adjacent) {
                    const adjacentNode = this.directions.querySelector(`.direction.${adjacent}`);
                    if (adjacentNode) adjacentNode.classList.add("active");
                }
            }
        }
    }

    directionNameForAngle(angle) {
        switch (angle) {
            case 0:
                return "right";
            case 45:
                return "right.up";
            case 90:
                return "up";
            case 135:
                return "left.up";
            case 180:
            case -180:
                return "left";
            case -135:
                return "left.down";
            case -90:
                return "down";
            case -45:
                return "right.down";
            default:
                return "right";
        }
    }

    adjacentCardinalForDiagonal(diagonalAngle, actualAngle) {
        if (diagonalAngle === 45) {
            return actualAngle > 45 ? "up" : "right";
        }
        if (diagonalAngle === 135) {
            return actualAngle > 135 ? "left" : "up";
        }
        if (diagonalAngle === -135) {
            return actualAngle > -135 ? "left" : "down";
        }
        if (diagonalAngle === -45) {
            return actualAngle > -45 ? "right" : "down";
        }
        return null;
    }

    clearDirectionHighlights() {
        if (!this.directions) return;
        const directionNodes = this.directions.querySelectorAll(".direction");
        directionNodes.forEach((n) => n.classList.remove("active"));
    }
}

export default JoyStickComponent;

customElements.define(JoyStickComponent.tag, JoyStickComponent);
