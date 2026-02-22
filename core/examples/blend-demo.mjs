import { blendClasses } from "../Util/Class.mjs";

class CitrusMixin {
    constructor() {
        this.color = "orange";
    }

    zest() {
        return "zesty";
    }
}

class BerryMixin {
    constructor() {
        this.sweet = true;
    }

    flavor() {
        return "berry";
    }
}

const FlavorJuice = blendClasses(CitrusMixin, BerryMixin);
const glass = new FlavorJuice();

console.log({
    color: glass.color,
    sweet: glass.sweet,
    zest: glass.zest(),
    flavor: glass.flavor()
});
