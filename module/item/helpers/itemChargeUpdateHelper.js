import {Roll35e} from "../../roll.js";
import {linkData} from "../../lib.js";

export class ItemChargeUpdateHelper {
    /**
     *
     * @param data
     * @param rollData
     */
    static setMaxUses(data, rollData) {
        if (hasProperty(system, "uses.maxFormula")) {
            if (getProperty(system, "uses.maxFormula") !== "") {
                let roll = new Roll35e(getProperty(system, "uses.maxFormula"), rollData).roll();
                system.uses.max = roll.total;
            }
        }

        if (hasProperty(system, "uses.maxPerUseFormula")) {
            if (getProperty(system, "uses.maxPerUseFormula") !== "") {
                let roll = new Roll35e(getProperty(system, "uses.maxPerUseFormula"), rollData).roll();
                system.uses.maxPerUse = roll.total;
            }
        }

        if (hasProperty(system, "enhancements.uses.maxFormula")) {
            if (getProperty(system, "enhancements.uses.maxFormula") !== "") {
                let roll = new Roll35e(getProperty(system, "enhancements.uses.maxFormula"), rollData).roll();
                system.enhancements.uses.max = roll.total;
            }
        }
    }

    /**
     *
     * @param data
     * @param srcData
     * @param actorData
     * @param actorRollData
     */
    static updateMaxUses(item, data, {srcData = null, actorData = null, actorRollData = null} = {}) {
        if (data['data.uses.max'] !== undefined) return;
        let doLinkData = true;
        if (srcData == null) {
            srcData = item.data;
            doLinkData = false;
        }
        let rollData = {};
        if (actorRollData == null) {
            if (item.actor != null) rollData = item.actor.getRollData();
            if (actorData !== null) {
                rollData = mergeObject(rollData, actorsystem, {inplace: false});
            }
        } else {
            rollData = actorRollData;
        }
        rollData.item = item.getRollData();

        if (hasProperty(srcData, "data.uses.maxFormula")) {
            if (getProperty(srcData, "data.uses.maxFormula") !== "") {
                let roll = new Roll35e(getProperty(srcData, "data.uses.maxFormula"), rollData).roll();
                if (doLinkData) linkData(srcData, data, "data.uses.max", roll.total);
                else data["data.uses.max"] = roll.total;
            }
        }


        if (hasProperty(srcData, "data.uses.maxPerUseFormula")) {
            if (getProperty(srcData, "data.uses.maxPerUseFormula") !== "") {
                let roll = new Roll35e(getProperty(srcData, "data.uses.maxPerUseFormula"), rollData).roll();
                if (doLinkData) linkData(srcData, data, "data.uses.maxPerUse", roll.total);
                else data["data.uses.maxPerUse"] = roll.total;
            }
        }

        if (hasProperty(srcData, "data.enhancements.uses.maxFormula")) {
            if (getProperty(srcData, "data.enhancements.uses.maxFormula") !== "") {
                let roll = new Roll35e(getProperty(srcData, "data.enhancements.uses.maxFormula"), rollData).roll();
                if (doLinkData) linkData(srcData, data, "data.enhancements.uses.max", roll.total);
                else data["data.enhancements.uses.max"] = roll.total;
            }
        }

        if (hasProperty(srcData, "data.combatChangesRange.maxFormula")) {
            if (getProperty(srcData, "data.combatChangesRange.maxFormula") !== "") {
                let roll = new Roll35e(getProperty(srcData, "data.combatChangesRange.maxFormula"), rollData).roll();
                if (doLinkData) linkData(srcData, data, "data.combatChangesRange.max", roll.total);
                else data["data.combatChangesRange.max"] = roll.total;
            }
        }
        for (let i = 1; i <= 3; i++)
            if (hasProperty(srcData, `data.combatChangesAdditionalRanges.slider${i}.maxFormula`)) {
                if (getProperty(srcData, `data.combatChangesAdditionalRanges.slider${i}.maxFormula`) !== "") {
                    let roll = new Roll35e(getProperty(srcData, `data.combatChangesAdditionalRanges.slider${i}.maxFormula`), rollData).roll();
                    if (doLinkData) linkData(srcData, data, `data.combatChangesAdditionalRanges.slider${i}.max`, roll.total);
                    else data[`data.combatChangesAdditionalRanges.slider${i}.max`] = roll.total;
                }
            }
    }
}
