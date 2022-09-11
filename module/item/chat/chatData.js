import {Roll35e} from "../../roll.js";
import {ItemCombatChangesHelper} from "../helpers/itemCombatChangesHelper.js";

export class ItemChatData {
    /**
     * @param {ItemPF} item Item
     */
    constructor(item) {
        this.item = item;
    }

    getChatData(htmlOptions, rollData) {
        const data = duplicate(this.item.system);
        const labels = this.item.labels;
        if (!rollData) {
            rollData = this.item.actor ? this.item.actor.getRollData(null, true) : {};
            rollData.item = data;
            if (this.item.actor) {
                let allCombatChanges = []
                let attackType = this.item.type;
                this.item.actor.items.filter(o => ItemCombatChangesHelper.canHaveCombatChanges(o,rollData,attackType)).forEach(i => {
                    allCombatChanges = allCombatChanges.concat(i.combatChanges.getPossibleCombatChanges(attackType, rollData))
                })

                this.item._addCombatChangesToRollData(allCombatChanges, rollData);
            }
        }

        // Get the spell specific info
        let spellbookIndex, spellAbility, ablMod = 0;
        let spellbook = null;
        let cl = 0;
        let sl = 0;
        if (this.item.type === "spell") {
            spellbookIndex = data.spellbook;
            spellbook = getProperty(this.item.actor.system,`attributes.spells.spellbooks.${spellbookIndex}`) || {};
            spellAbility = spellbook.ability;
            if (spellAbility !== "") ablMod = getProperty(this.item.actor.system,`abilities.${spellAbility}.mod`);

            cl += getProperty(spellbook, "cl.total") || 0;
            cl += data.clOffset || 0;
            cl += rollData.featClBonus || 0;
            cl -= this.item.actor.system.attributes.energyDrain || 0

            sl += data.level;
            sl += data.slOffset || 0;

            rollData.cl = cl;
            rollData.sl = sl;
            rollData.ablMod = ablMod;
        } else if (this.item.type === "card") {
            let deckIndex = data.deck;
            let deck = getProperty(this.item.actor.system,`attributes.cards.decks.${deckIndex}`) || {};
            spellAbility = deck.ability;
            if (spellAbility !== "") ablMod = getProperty(this.item.actor.system,`abilities.${spellAbility}.mod`);

            cl += getProperty(deck, "cl.total") || 0;
            cl += data.clOffset || 0;
            cl += rollData.featClBonus || 0;
            cl -= this.item.actor.system.attributes.energyDrain || 0

            sl += data.level;
            sl += data.slOffset || 0;

            rollData.cl = cl;
            rollData.sl = sl;
            rollData.ablMod = ablMod;
        }


        // Rich text description
        if (this.item.showUnidentifiedData) {
            data.description.value = TextEditor.enrichHTML(data.description.unidentified, htmlOptions);
        } else {
            data.description.value = TextEditor.enrichHTML(data.description.value, htmlOptions);
        }

        // General equipment properties
        const props = [];
        if (data.hasOwnProperty("equipped") && ["weapon", "equipment"].includes(this.item.data.type)) {
            props.push(
                data.equipped ? game.i18n.localize("D35E.Equipped") : game.i18n.localize("D35E.NotEquipped"),
            );
        }
        if (this.item.broken) {
            props.push(
                game.i18n.localize("D35E.Broken")
            );
        }

        if (!this.item.showUnidentifiedData) {
            // Gather dynamic labels
            const dynamicLabels = {};
            dynamicLabels.range = labels.range || "";
            dynamicLabels.level = labels.sl || "";
            let rangeModifier = rollData.spellEnlarged ? 2 : 1
            // Range
            if (data.range != null) {
                if (data.range.units === "close") dynamicLabels.range = game.i18n.localize("D35E.RangeNote").format(rangeModifier * 25 + rangeModifier * Math.floor(cl / 2) * 5);
                else if (data.range.units === "medium") dynamicLabels.range = game.i18n.localize("D35E.RangeNote").format(rangeModifier * 100 + rangeModifier * cl * 10);
                else if (data.range.units === "long") dynamicLabels.range = game.i18n.localize("D35E.RangeNote").format(rangeModifier * 400 + rangeModifier * cl * 40);
                else if (["ft", "mi", "spec"].includes(data.range.units) && typeof data.range.value === "string") {
                    let range = new Roll35e(data.range.value.length > 0 ? data.range.value : "0", rollData).roll().total;
                    dynamicLabels.range = [range > 0 ? "Range:" : null, range, CONFIG.D35E.distanceUnits[data.range.units]].filterJoin(" ");
                }
            }
            // Duration
            if (data.duration != null) {
                if (!["inst", "perm"].includes(data.duration.units) && typeof data.duration.value === "string") {
                    let duration = new Roll35e(data.duration.value.length > 0 ? data.duration.value : "0", rollData).roll().total;
                    dynamicLabels.duration = [duration, CONFIG.D35E.timePeriods[data.duration.units]].filterJoin(" ");
                }
            }

            // Duration
            if (data.spellDurationData != null) {
                let isPerLevel = (["hourPerLevel", "minutePerLevel", "roundPerLevel"].includes(data.spellDurationData.units))
                if (!["inst", "perm"].includes(data.spellDurationData.units) && typeof data.spellDurationData.value === "string") {
                    let rollString = data.spellDurationData.value.length > 0 ? data.spellDurationData.value : "0";
                    let duration = data.spellDurationData.value
                    if (rollString.indexOf("@cl") !== -1) {
                        duration = new Roll35e(rollString, rollData).roll().total;
                        let multiplier = 0
                        if (data.spellDurationData.units === "hourPerLevel") {
                            multiplier = 600
                        } else if (data.spellDurationData.units === "minutePerLevel") {
                            multiplier = 10
                        } else if (data.spellDurationData.units === "roundPerLevel") {
                            multiplier = 1
                        }
                        rollData.spellDuration = duration * multiplier;
                    }
                    if (data.spellDurationData.units === "spec") {
                        dynamicLabels.duration = duration
                    } else {
                        dynamicLabels.duration = [duration, CONFIG.D35E.timePeriodsSpells[data.spellDurationData.units.replace("PerRound", "")]].filterJoin(" ");
                    }
                }
            }

            // Item type specific properties
            const fn = this[`_${this.item.data.type}ChatData`];
            if (fn) fn.bind(this)(data, labels, props);

            // Ability activation properties
            if (data.hasOwnProperty("activation")) {
                props.push(
                    labels.target,
                    labels.activation,
                    dynamicLabels.range,
                    dynamicLabels.duration
                );
            }


            rollData.powerAbl = 0;
            if (data.school === "bol") rollData.powerAbl = getProperty(this.item.actor.system,`abilities.str.mod`)
            if (data.school === "kin") rollData.powerAbl = getProperty(this.item.actor.system,`abilities.con.mod`)
            if (data.school === "por") rollData.powerAbl = getProperty(this.item.actor.system,`abilities.dex.mod`)
            if (data.school === "met") rollData.powerAbl = getProperty(this.item.actor.system,`abilities.int.mod`)
            if (data.school === "cla") rollData.powerAbl = getProperty(this.item.actor.system,`abilities.wis.mod`)
            if (data.school === "tel") rollData.powerAbl = getProperty(this.item.actor.system,`abilities.cha.mod`)

            // Add save DC
            if (data.hasOwnProperty("actionType") && (getProperty(data, "save.description") || getProperty(data, "save.type")) && getProperty(data, "save.description") !== "None") {
                let saveDC = new Roll35e(data.save.dc.length > 0 ? data.save.dc : "0", rollData).roll().total;
                let saveType = data.save.type ? CONFIG.D35E.savingThrowTypes[data.save.type] : data.save.description;
                if (this.item.type === "spell") {
                    saveDC += new Roll35e(spellbook.baseDCFormula || "", rollData).roll().total;
                }
                saveDC += (rollData.featSpellDCBonus || 0)
                if (saveDC > 0 && saveType) {
                    props.push(`DC ${saveDC}`);
                    props.push(saveType);
                }

                //
                // //console.log('D35E | Calculated spell DC for props', saveDC)
            }
        }

        // Add SR reminder
        if (this.item.type === "spell") {
            if (data.sr) {
                props.push(game.i18n.localize("D35E.SpellResistance"));
            }
            if (data.pr) {
                props.push(game.i18n.localize("D35E.PowerResistance"));
            }
        }

        // Filter properties and return
        data.properties = props.filter(p => !!p);
        return data;
    }
}
