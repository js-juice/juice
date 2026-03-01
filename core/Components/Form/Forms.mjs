/**
 * Form collection and management utilities.
 * Lightweight registry for form instances.
 * @module Components/Form/Forms
 */

class Forms {
    #registry = new Map();

    add(id, form) {
        if (!id) throw new Error("Forms.add requires an id");
        this.#registry.set(id, form);
        return form;
    }

    get(id) {
        return this.#registry.get(id) || null;
    }

    has(id) {
        return this.#registry.has(id);
    }

    remove(id) {
        return this.#registry.delete(id);
    }

    clear() {
        this.#registry.clear();
    }

    all() {
        return Array.from(this.#registry.values());
    }

    entries() {
        return Array.from(this.#registry.entries());
    }
}

export default Forms;
