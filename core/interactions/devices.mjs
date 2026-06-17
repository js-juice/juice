/**
 * Control input aggregator providing keyboard and mouse controllers.
 * Central access point for input control systems.
 * @module interactions/devices
 */

import Keyboard from "./device/keyboard.mjs";
import Mouse from "./device/mouse.mjs";

const keyboard = new Keyboard();
const mouse = new Mouse();

export default {
    keyboard,
    mouse
};
