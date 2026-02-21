import StringFormat from "../../data/format/String.mjs";
import { applyDigitTemplate } from "../../data/format/Presets.mjs";

function toStringValue(value) {
    if (value == null) return "";
    return String(value);
}

export const presets = {
    title(value) {
        return StringFormat.ucwords(toStringValue(value));
    },
    slug(value) {
        return StringFormat.computize(toStringValue(value));
    },
    phone(value) {
        return applyDigitTemplate(value, "+d (ddd) ddd-dddd");
    }
};

export default {
    presets
};
