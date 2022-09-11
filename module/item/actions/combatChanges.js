import {Roll35e} from "../../roll.js";

export class ItemCombatChanges {
    /**
     * @param {ItemPF} item Item
     */
    constructor(item) {
        this.item = item;
    }

    hasCombatChange(itemType, rollData) {
        let combatChanges = getProperty(this.item.data,"data.combatChanges") || [];
        let attackType = getProperty(rollData,"item.actionType") || ""
        let combatChangesRollData = duplicate(rollData);
        combatChangesRollData.self =  mergeObject(this.item.data.data, this.item.getRollData(), {inplace: false})
        try {
            return combatChanges.some(change => {
                return (change[0] === 'all' || change[0] === itemType) && (change[1] === '' || attackType === change[1]) && (change[2] === '' || new Roll35e(change[2], combatChangesRollData).roll().total === true)
            });
        } catch {
            return false;
        }
    }

    getPossibleCombatChanges(itemType, rollData, range = {base: 0, slider1: 0, slider2: 0, slider3: 0}) {
        if (itemType.endsWith('Optional') && this.item.isCharged && !this.item.charges) return [];
        let combatChanges = getProperty(this.item.data,"data.combatChanges") || [];
        let attackType = getProperty(rollData,"item.actionType") || ""
        let combatChangesRollData = duplicate(rollData);
        combatChangesRollData.self =  mergeObject(this.item.data.data, this.item.getRollData(), {inplace: false})
        combatChangesRollData.range = range.base || 0
        combatChangesRollData.range1 = range.slider1 || 0
        combatChangesRollData.range2 = range.slider2 || 0
        combatChangesRollData.range3 = range.slider3 || 0
        return combatChanges.filter(change => {
            return (change[0] === 'all' || change[0] === itemType) && (change[1] === '' || attackType === change[1]) && (change[2] === '' || new Roll35e(change[2], combatChangesRollData).roll().total === true)
        }).map(c => {
            if (typeof c[4] === "string") {
                c[4] = c[4].replace(/@range1/g, combatChangesRollData.range1)
                c[4] = c[4].replace(/@range2/g, combatChangesRollData.range2)
                c[4] = c[4].replace(/@range3/g, combatChangesRollData.range3)
                c[4] = c[4].replace(/@range/g, combatChangesRollData.range)
                c[4] = c[4].replace(/@source.level/g, this.item.data?.data?.level || 0)
            }
            if (c[3].indexOf('$') === -1 && c[3].indexOf('&') === -1) {
                if (c[4] !== "")
                    c[4] = new Roll35e(`${c[4]}`,combatChangesRollData).roll().total
                else {
                    c[4] = 0;
                    ui.notifications.warn(game.i18n.localize("D35E.EmptyCombatChange").format(this.item.name));
                }
            }
            if (c.length === 6) {
                if (typeof c[5] === "string") {
                    c[5] = c[5].replace(/@range1/g, combatChangesRollData.range1)
                    c[5] = c[5].replace(/@range2/g, combatChangesRollData.range2)
                    c[5] = c[5].replace(/@range3/g, combatChangesRollData.range3)
                    c[5] = c[5].replace(/@range/g, combatChangesRollData.range)
                    c[5] = c[5].replace(/@source.level/g, this.item.data?.data?.level || 0)
                }
                c.push(this.item.id)
                c.push(this.item.name)
                c.push(this.item.img)
                c.push(getProperty(this.item.data,"data.combatChangesApplySpecialActionsOnce"))
            }
            return c;
        });
    }
}
