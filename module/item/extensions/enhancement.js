import {createTag} from "../../lib.js";
import {Roll35e} from "../../roll.js";
import {ItemEnhancementConverter} from "../converters/enchancement.js";
import {ItemPF} from "../entity.js";
import {ItemEnhancementHelper} from "../helpers/itemEnhancementHelper.js";

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
                updateData[`system.enhancements.uses.value`] = getProperty(this.item.system,"enhancements.uses.value") - chargeCost;
                updateData[`system.uses.value`] = getProperty(this.item.system,"enhancements.uses.value") - chargeCost;
                updateData[`system.uses.max`] = getProperty(this.item.system,"enhancements.uses.max");
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
            let enhancementData = ItemEnhancementHelper.getEnhancementData(i)
            enhancementData.uses.value = enhancementData.uses.value + charges;
        });
        updateData[`system.enhancements.items`] = _enhancements;
        await this.item.update(updateData);
    }

    async createEnhancementSpell(itemData, type) {
        if (this.hasEnhancement(itemData.name)) return;

        const updateData = {};
        let _enhancements = duplicate(getProperty(this.item.system,`enhancements.items`) || []);
        let enhancement = await ItemEnhancementConverter.toEnhancement(itemData, type);
        if (enhancement.id) enhancement._id = this.item._id + "-" + enhancement.id;
        _enhancements.push(enhancement);
        this.#preUpdateMagicItemName(updateData, _enhancements);
        this.#preUpdateMagicItemProperties(updateData, _enhancements);
        updateData[`system.enhancements.items`] = _enhancements;
        await this.item.update(updateData);
    }

    async createEnhancementBuff(itemData) {
        if (this.hasEnhancement(itemData.name)) return;

        const updateData = {};
        let _enhancements = duplicate(getProperty(this.item.system,`enhancements.items`) || []);
        let enhancement = await ItemEnhancementConverter.toEnhancementBuff(itemData);
        if (enhancement.id) enhancement._id = this.item._id + "-" + enhancement.id;
        _enhancements.push(enhancement);
        this.#preUpdateMagicItemName(updateData, _enhancements);
        this.#preUpdateMagicItemProperties(updateData, _enhancements);
        updateData[`system.enhancements.items`] = _enhancements;
        await this.item.update(updateData);
    }

    async getEnhancementFromData(itemData) {
        const updateData = {};
        let _enhancements = duplicate(getProperty(this.item.system,`enhancements.items`) || []);
        const enhancement = duplicate(itemData)
        if (enhancement._id) enhancement.id = this.item._id + "-" + itemData._id;
        _enhancements.push(enhancement);
        this.#preUpdateMagicItemName(updateData, _enhancements);
        this.#preUpdateMagicItemProperties(updateData, _enhancements);
        updateData[`system.enhancements.items`] = _enhancements;
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

    async updateBaseItemName() {
        const updateData = {};
        //console.log("updating name")
        let _enhancements = duplicate(getProperty(this.item.system,`enhancements.items`) || []);
        this.#preUpdateMagicItemName(updateData, _enhancements, true);
        this.#preUpdateMagicItemProperties(updateData, _enhancements, true);
        await this.item.update(updateData);
    }

    async deleteEnhancement(enhancementId) {
        const updateData = {};
        let _enhancements = duplicate(getProperty(this.item.system,`enhancements.items`) || []);
        _enhancements = _enhancements.filter(function (obj) {
            return createTag(obj.name) !== enhancementId;
        });
        this.#preUpdateMagicItemName(updateData, _enhancements);
        this.#preUpdateMagicItemProperties(updateData, _enhancements);
        updateData[`data.enhancements.items`] = _enhancements;
        await this.item.update(updateData);
    }

    /***
     * Updated embedded enhancement item
     * @param enhancementId
     * @param enhancementUpdateData
     * @returns {Promise<void>}
     */
    async updateEnhancement(enhancementId, enhancementUpdateData) {
        const updateData = {};
        let _enhancements = duplicate(getProperty(this.item.system,`enhancements.items`) || []);
        _enhancements.filter(function (obj) {
            return createTag(obj.name) === itemId
        }).forEach(i => {
            i.system = mergeObject(ItemEnhancementHelper.getEnhancementData(i),enhancementUpdateData);
            this.#setEnhancementPrice(i);
        });
        updateData[`system.enhancements.items`] = _enhancements;
        this.#preUpdateMagicItemName(updateData, _enhancements);
        this.#preUpdateMagicItemProperties(updateData, _enhancements);
        await this.item.update(updateData);
    }

    /***
     * Adds item from compendium to this instance as enhancement
     * @param packName name of compendium that enhancement is imported from
     * @param packId id of enhancement to add to item
     * @param enhValue value to set on enhancement
     * @returns {Promise<void>} awaitable item promise
     */
    async addEnhancementFromCompendium(packName, packId, enhValue) {
        let itemData = {}
        const packItem = await game.packs.find(p => p.metadata.id === packName).getDocument(packId);
        if (packItem != null) {
            itemData = packItem;
            itemData.system.enh = enhValue;
            this.#setEnhancementPrice(itemData)
            return await this.getEnhancementFromData(itemData)
        }
    }

    /***
     * Calculates enhancement price
     * @param enhancement
     */
    #setEnhancementPrice(enhancement) {
        let enhancementData = ItemEnhancementHelper.getEnhancementData(enhancement)
        let rollData = {};
        if (this.item.actor != null) rollData = this.item.actor.getRollData();

        rollData.enhancement = enhancementData.enh;
        if (enhancementData.enhIncreaseFormula !== undefined && enhancementData.enhIncreaseFormula !== null && enhancementData.enhIncreaseFormula !== "") {
            enhancement.system.enhIncrease = new Roll35e(enhancement.system.enhIncreaseFormula, rollData).roll().total;
        }
        rollData.enhIncrease = enhancementData.enhIncrease;
        if (enhancementData.priceFormula !== undefined && enhancementData.priceFormula !== null && enhancementData.priceFormula !== "") {
            enhancement.system.price = new Roll35e(enhancementData.priceFormula, rollData).roll().total;
        }

    }

    #preUpdateMagicItemName(updateData, _enhancements, force = false, useIdentifiedName = false) {
        if ((getProperty(this.system,"enhancements") !== undefined && getProperty(this.system,"enhancements.automation") !== undefined && getProperty(this.system,"enhancements.automation") !== null) || force) {
            if (getProperty(this.system,"enhancements.automation.updateName") || force) {
                let baseName = useIdentifiedName && getProperty(this.system,"identifiedName") || getProperty(this.system,"unidentified.name")
                if (getProperty(this.system,"unidentified.name") === '') {
                    updateData[`system.unidentified.name`] = this.name;
                    baseName = this.name
                }
                updateData[`system.identifiedName`] = this.buildName(baseName, _enhancements)
            }
        }
    }

    #preUpdateMagicItemProperties(updateData, _enhancements, force = false) {
        if ((getProperty(this.system,"enhancements") !== undefined && getProperty(this.system,"enhancements.automation") !== undefined && getProperty(this.system,"enhancements.automation") !== null) || force) {
            if (getProperty(this.system,"enhancements.automation.updateName") || force) {
                let basePrice = this.system.unidentified.price
                if (!getProperty(this.system,"unidentified.price")) {
                    updateData[`system.unidentified.price`] = getProperty(this.system,"price");
                    basePrice = this.system.price
                }
                updateData[`system.price`] = this.buildPrice(basePrice, _enhancements)
            }
        }
    }
}
