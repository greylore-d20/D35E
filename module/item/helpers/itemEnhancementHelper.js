import {Item35E} from "../entity.js";

export class ItemEnhancementHelper {
    static getEnhancementData(enhancement) {
        return mergeObject(enhancement.data || {}, enhancement.system || {});
    }

    static getEnhancementItemFromData(itemData, actor, owner) {
        let data = duplicate(itemData);
        data._id = foundry.utils.randomID();
        data.actor = actor;
        return new Item35E(data, {owner: owner});
    }
}
