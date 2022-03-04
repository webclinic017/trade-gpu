"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Model {
    constructor(name, id) {
        this.name = name;
        this.id = id;
        this.enabled = true;
        this.name = name;
        this.id = id;
    }
    log(enabled) {
        this.enabled = !!enabled;
    }
    pairs() {
        throw 'to implement';
    }
    setId(id) {
        this.id = id;
    }
    save(database) {
        return new Promise((resolve, reject) => {
            database.save(this.name, this.pairs(), this.enabled, (id) => {
                this.setId(id);
                resolve(this);
            }, this.id);
        });
    }
}
exports.default = Model;
//# sourceMappingURL=model.js.map