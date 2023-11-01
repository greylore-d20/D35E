import {Item35E} from "./entity.js";
import {ItemEnhancements} from "./extensions/enhancement.js";
import { ItemSpellHelper } from './helpers/itemSpellHelper.js'

export class Card35E extends Item35E {
    constructor(...args) {
        super(...args);
    }


    get subType() {
    }

    async getDescription(unidentified = false) {
        return TextEditor.enrichHTML(getProperty(this.system, "shortDescription"), {async: true})
    }

    async getChatDescription() {
        const data = await ItemSpellHelper.generateSpellDescription(this, true);
        return await renderTemplate("systems/D35E/templates/internal/spell-description.html", data);
    }
}
