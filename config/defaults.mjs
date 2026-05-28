import animation from "../animation/config.mjs";
import brand from "../brand/config.mjs";
import core from "../core/config.mjs";
import data from "../data/config.mjs";
import forms from "../forms/config.mjs";
import squeeze from "../squeeze/config.mjs";
import styles from "../styles/config.mjs";
import ui from "../ui/config.mjs";

const DEFAULT_CONFIG = {
    version: "1.0.0",
    description: "",
    repository: {},
    homepage: "",
    license: "ISC",
    dependencies: {},
    paths: {},
    animation,
    brand,
    core,
    data,
    forms,
    squeeze,
    styles,
    ui,
    formatting: {},
    validation: {}
};

export default DEFAULT_CONFIG;
