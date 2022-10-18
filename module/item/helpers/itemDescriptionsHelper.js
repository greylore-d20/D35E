import {Roll35e} from "../../roll.js";

export class ItemDescriptionsHelper {
    static attackDescription(item, rollData) {
        // //console.log('D35E | AB ', item.hasAttack)
        if (!rollData) {
            if (!item.actor) return []; //There are no requirements when item has no actor!
            rollData = item.actor.getRollData();
        }
        rollData.item = item.getRollData();

        if (item.hasAttack) {
            let bab = 0;
            let attackBonus = ((getProperty(item.system,"enh") || 0) ? getProperty(item.system,"enh") : (getProperty(item.system,"masterwork") ? "1" : "0")) + "+" + (getProperty(item.system,"attackBonus") || "0");
            let abilityBonus = "0";
            let sizeBonus = CONFIG.D35E.sizeMods[item.actor.system.traits.actualSize] || 0;
            let autoScaleWithBab = (game.settings.get("D35E", "autoScaleAttacksBab") && item.actor.data.type !== "npc" && getProperty(item.system,"attackType") === "weapon" && getProperty(item.system,"autoScaleOption") !== "never") || getProperty(item.system,"autoScaleOption") === "always";
            if (item.actor) {
                bab = item.actor.system.attributes.bab.total;
                if (getProperty(item.system,"ability.attack"))
                    abilityBonus = item.actor.system.abilities[item.system.ability.attack].mod
            }
            let attacks = [];
            let totalBonus = new Roll35e(`${bab} + ${attackBonus} + ${abilityBonus} + ${sizeBonus}`, rollData).roll().total;
            if (autoScaleWithBab) {
                while (bab > 0) {
                    attacks.push(`${totalBonus >= 0 ? '+'+totalBonus : totalBonus}`)
                    totalBonus -= 5;
                    bab -= 5
                }
            } else {
                attacks.push(`${totalBonus >= 0 ? '+'+totalBonus : totalBonus}`)
                for (let part of getProperty(item.system,"attackParts")) {
                    let partBonus = totalBonus + part[0];
                    attacks.push(`${partBonus >= 0 ? '+'+partBonus : partBonus}`)
                }
            }
            return attacks.join('/')

        }
        return "";
    }

    static damageDescription(item, rollData) {
        // //console.log('D35E | DD ', item.hasDamage)
        if (!rollData) {
            if (!item.actor) return []; //There are no requirements when item has no actor!
            rollData = item.actor.getRollData();
        }
        rollData.critMult = 1;
        rollData.item = item.getRollData()
        let abilityBonus = 0;
        let results = []
        if (item.hasDamage) {
            item.system.damage.parts.forEach(d => {
                if (d) {
                    try {
                        let roll = new Roll35e(d[0].replace('@useAmount', 1), rollData).roll();
                        results.push(roll.formula)
                    } catch (e) {

                    }
                }
            })
        }
        if (getProperty(item.system,"ability.damage"))
            abilityBonus = parseInt(item.actor.system.abilities[item.system.ability.damage].mod)*item.system.ability.damageMult
        if (abilityBonus) results.push(abilityBonus)
        if (getProperty(item.system,"enh")) results.push(getProperty(item.system,"enh"))
        return results.join(" + ");
    }

    static rangeDescription(item) {

        let rng = getProperty(item.system,"range") || {};
        if (!["ft", "mi", "spec"].includes(rng.units)) {
            rng.value = null;
            rng.long = null;
        }
        if (rng.units === 'ft')
            if (getProperty(item.system,"thrown")) {
                rng.long = rng.value*5;
            } else {
                if (getProperty(item.system,"actionType") === "rwak")
                    rng.long = rng.value*10;
            }
        let range = [rng.value, rng.long ? `/ ${rng.long}` : null, CONFIG.D35E.distanceUnitsShort[rng.units]].filterJoin(" ");
        if (range.length > 0) return [range].join(" ");
        return "";
    }
}
