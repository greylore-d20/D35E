import {createTag} from "../../lib.js";
import {Roll35e} from "../../roll.js";
import {ItemEnhancementConverter} from "../converters/enchancement.js";
import {ItemPF} from "../entity.js";

export class ItemEnhancements {
    /**
     * @param {ItemPF} item Item
     */
    constructor(item) {
        this.item = item;
    }

    async getEnhancementItem(tag) {
        const enhancements = getProperty(this.item.system, `enhancements.items`) || [];
        let itemData = (enhancements).find(i => createTag(i.name) === tag)
        if (itemData != null) {
            let data = duplicate(itemData);
            data._id = foundry.utils.randomID();
            data.actor = this.item.actor;
            return new ItemPF(data, {owner: this.item.isOwner});
        }
        else
            return itemData;
    }

    async useEnhancementItem(item) {
        let chargeCost = item.system?.uses?.chargesPerUse !== undefined ? item.system.uses.chargesPerUse : item.chargeCost;
        let chargesLeft = item.system?.uses?.value || 0;
        if (getProperty(this.item.system,"enhancements.uses.commonPool")) {
            if (getProperty(this.item.system,"enhancements.uses.value") < chargeCost) {
                return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoCharges").format(this.item.name));
            }
        } else {

            if (chargesLeft < chargeCost) {
                return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoCharges").format(this.item.name));
            }
        }
        if (getProperty(this.item.system,"enhancements.clFormula")) {
            item.system.baseCl = new Roll35e(getProperty(this.item.system,"enhancements.clFormula"), this.item.actor.getRollData()).roll().total;
        }
        if (item.system.save) {
            let ablMod = 0
            if (getProperty(this.item.system,"enhancements.spellcastingAbility") !== "") ablMod = getProperty(this.item.actor.system,`abilities.${this.item.system.enhancements.spellcastingAbility}.mod`);
            item.system.save.dc = parseInt(item.system.save.dc) + ablMod;
        }

        let roll = await item.use({ev: event, skipDialog: event.shiftKey, temporaryItem: true},this.item.actor,true);
        if (roll.wasRolled) {
            if (getProperty(this.item.system,"enhancements.uses.commonPool")) {
                let updateData = {}
                updateData[`data.enhancements.uses.value`] = getProperty(this.item.system,"enhancements.uses.value") - chargeCost;
                updateData[`data.uses.value`] = getProperty(this.item.system,"enhancements.uses.value") - chargeCost;
                updateData[`data.uses.max`] = getProperty(this.item.system,"enhancements.uses.max");
                await this.item.update(updateData);
            } else {
                await this.item.addEnhancementCharges(item, -1*chargeCost)
            }
        }
    }


    async addEnhancementCharges(item, charges) {
        let updateData = {}
        let _enhancements = duplicate(getProperty(this.item.system,`enhancements.items`) || []);
        _enhancements.filter(function( obj ) {
            return createTag(obj.name) === createTag(item.name)
        }).forEach(i => {
            i.data.uses.value = i.data.uses.value + charges;
        });
        updateData[`data.enhancements.items`] = _enhancements;
        await this.item.update(updateData);
    }

    async createEnhancementSpell(itemData, type) {
        if (this.hasEnhancement(itemData.name)) return;

        const updateData = {};
        let _enhancements = duplicate(getProperty(this.item.system,`enhancements.items`) || []);
        let enhancement = await ItemEnhancementConverter.toEnhancement(itemData, type);
        if (enhancement.id) enhancement._id = this.item._id + "-" + enhancement.id;
        _enhancements.push(enhancement);
        this.item.updateMagicItemName(updateData, _enhancements);
        this.item.updateMagicItemProperties(updateData, _enhancements);
        updateData[`data.enhancements.items`] = _enhancements;
        await this.item.update(updateData);
    }

    async createEnhancementBuff(itemData) {
        if (this.hasEnhancement(itemData.name)) return;

        const updateData = {};
        let _enhancements = duplicate(getProperty(this.item.system,`enhancements.items`) || []);
        let enhancement = await ItemEnhancementConverter.toEnhancementBuff(itemData);
        if (enhancement.id) enhancement._id = this.item._id + "-" + enhancement.id;
        _enhancements.push(enhancement);
        this.item.updateMagicItemName(updateData, _enhancements);
        this.item.updateMagicItemProperties(updateData, _enhancements);
        updateData[`data.enhancements.items`] = _enhancements;
        await this.item.update(updateData);
    }

    async getEnhancementFromData(itemData) {
        const updateData = {};
        let _enhancements = duplicate(getProperty(this.item.system,`enhancements.items`) || []);
        const enhancement = duplicate(itemData)
        if (enhancement._id) enhancement.id = this.item._id + "-" + itemData._id;
        _enhancements.push(enhancement);
        this.item.updateMagicItemName(updateData, _enhancements);
        this.item.updateMagicItemProperties(updateData, _enhancements);
        updateData[`data.enhancements.items`] = _enhancements;
        return updateData
    }

    async addEnhancementFromData(itemData) {
        if (this.hasEnhancement(itemData.name)) return;
        return this.item.update(await this.getEnhancementFromData(itemData))
    }

    hasEnhancement(name) {
        const tag = createTag(name)
        return (getProperty(this.system,`enhancements.items`) || []).some(i => createTag(i.name) === tag);
    }
}
