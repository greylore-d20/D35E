import {Item35E} from "./entity.js";
import {ItemEnhancements} from "./extensions/enhancement.js";
import { ItemSpellHelper } from './helpers/itemSpellHelper.js'

export class Spell35E extends Item35E {
    constructor(...args) {
        super(...args);
    }


    get subType() {
    }


    async getDescription() {
        const data = await ItemSpellHelper.generateSpellDescription(this);
        return await renderTemplate("systems/D35E/templates/internal/spell-description.html", data);
    }
}
