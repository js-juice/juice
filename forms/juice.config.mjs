import { configureJuice } from "./config/JuiceConfig.mjs";

const juiceConfig = {
    forms: {
        styles: {
            ":host": {
                "--form-accent-color": "#0059ff",
                "--input-border": "1px solid #c8c8c8",
                "--input-focus-border-color": "#0059ff",
                "--input-focus-shadow": "0 0 0 3px rgba(0, 89, 255, 0.2)",
                "--input-disabled-bg": "#f5f5f5",
                "--input-disabled-border": "1px solid #dddddd",
                "--input-disabled-color": "#999999",
                "--input-label-color": "#333333",
                "--input-label-fontsize": "0.5em",
                "--input-label-fontweight": "400"
            }
        },
        checkbox: {
            _layout: "label:>:input:<:validation",
            styles: {
                ":host": {
                    "--check-color": "#0059ff",
                    "--checked-border-color": "#0059ff"
                }
            }
        },
        radio: {
            styles: {
                ":host": {
                    "--dot-color": "#0059ff",
                    "--checked-border-color": "#0059ff"
                }
            }
        }
    },
    ui: {},
    validation: {
        colors: {
            // valid: "#73C322",
            // incomplete: "#FFAB1A",
            // invalid: "#D41111",
            // none: "transparent"
        },
        presets: {
            // async usernameAvailable(value, context) {
            //     if (!value) return true;
            //     const response = await context.fetch(`/api/users/check?username=${encodeURIComponent(value)}`);
            //     const data = await response.json();
            //     return data.available === true;
            // }
        },
        errorTypes: {
            // username: Error
        }
    }
};

configureJuice(juiceConfig);

export default juiceConfig;
