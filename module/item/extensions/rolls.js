import {Roll35e} from "../../roll.js";
import {alterRoll} from "../../lib.js";
import {CACHE} from "../../cache.js";
import {Item35E} from "../entity.js";
import {createCustomChatMessage} from "../../chat.js";
import {ItemSpellHelper as ItemSpellHelper} from "../helpers/itemSpellHelper.js";

/**
 * Place an attack roll using an item (weapon, feat, spell, or equipment)
 * Rely upon the DicePF.d20Roll logic for the core implementation
 */
export class ItemRolls {
    /**
     * @param {Item35E} item Item
     */
    constructor( item) {
        this.item = item;
    }

    /**
     * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
     * @return {Promise}
     */
    async roll(altChatData = {}, tempActor = null) {
        let actor = this.item.actor;
        if (tempActor != null)
            actor = tempActor;
        if (actor && !actor.isOwner) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));

        // Basic template rendering data
        const token = actor ? actor.token : null;
        const templateData = {
            actor: actor,
            name: this.item.displayName,
            tokenId: token ? `${token.parent.id}.${token.id}` : null,
            item: this.item.data,
            data: this.item.getChatData(),
            labels: this.item.labels,
            hasAttack: this.item.hasAttack,
            hasMultiAttack: this.item.hasMultiAttack,
            hasAction: this.item.hasAction || this.item.isCharged,
            isHealing: this.item.isHealing,
            hasDamage: this.item.hasDamage,
            hasEffect: this.item.hasEffect,
            isVersatile: this.item.isVersatile,
            hasSave: this.item.hasSave,
            isSpell: this.item.data.type === "spell",
        };

        // Roll spell failure chance
        if (templateData.isSpell && this.item.actor != null && this.item.actor.spellFailure > 0) {
            const spellbook = getProperty(this.item.actor.system,`attributes.spells.spellbooks.${this.item.system.spellbook}`);
            if (spellbook && spellbook.arcaneSpellFailure) {
                templateData.spellFailure = new Roll35e("1d100").roll().total;
                templateData.spellFailureSuccess = templateData.spellFailure > this.item.actor.spellFailure;
            }
        }

        // Render the chat card template
        const templateType = ["consumable"].includes(this.item.data.type) ? this.item.data.type : "item";
        const template = `systems/D35E/templates/chat/${templateType}-card.html`;

        // Basic chat message data
        const chatData = mergeObject({
            user: game.user.id,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            speaker: ChatMessage.getSpeaker({actor: actor}),
        }, altChatData);

        // Toggle default roll mode
        let rollMode = chatData.rollMode || game.settings.get("core", "rollMode");
        if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
        if (rollMode === "blindroll") chatData["blind"] = true;

        // Create the chat message
        return createCustomChatMessage(template, templateData, chatData);
    }

    rollAttack(options = {}) {
        const itemData = this.item.system;
        let rollData;
        if (!options.data) {
            rollData = this.item.actor.getRollData();
            rollData.item = mergeObject(duplicate(itemData), this.item.getRollData(), {inplace: false});
        } else rollData = options.data;

        // Add CL

        if (this.item.isSpellLike()) {
            ItemSpellHelper.adjustSpellCL(this.item,itemData, rollData)
        }
        // Determine size bonus
        rollData.sizeBonus = CONFIG.D35E.sizeMods[rollData.traits.actualSize];
        // Add misc bonuses/penalties
        rollData.item.proficiencyPenalty = -4;

        // Determine ability score modifier
        let abl = rollData.item.ability.attack;

        // Define Roll parts
        let parts = [];
        // Add ability modifier
        if (abl != "" && rollData.abilities[abl] != null && rollData.abilities[abl].mod !== 0) parts.push(`@abilities.${abl}.mod`);
        // Add bonus parts
        if (options.parts != null) parts = parts.concat(options.parts);
        // Add size bonus
        if (rollData.sizeBonus !== 0) parts.push("@sizeBonus");
        if (rollData.featAttackBonus) {
            if (rollData.featAttackBonus !== 0) parts.push("${this.item.featAttackBonus}");
        }

        // Add attack bonus
        if (rollData.item.attackBonus !== "") {
            let attackBonus = new Roll35e(rollData.item.attackBonus, rollData).roll().total;
            rollData.item.attackBonus = attackBonus.toString();
            parts.push("@item.attackBonus");
        }

        // Add certain attack bonuses
        if (rollData.attributes.attack.general !== 0) {
            parts.push("@attributes.attack.general");
        }
        if (["mwak", "msak"].includes(itemData.actionType) && rollData.attributes.attack.melee !== 0) {
            parts.push("@attributes.attack.melee");
        } else if (["rwak", "rsak"].includes(itemData.actionType) && rollData.attributes.attack.ranged !== 0) {
            parts.push("@attributes.attack.ranged");
        }
        // Add BAB
        if (rollData.attributes.bab.total !== 0 && rollData.attributes.bab.total != null) {
            parts.push("@attributes.bab.total");
        }
        rollData.item.enh = options?.replacedEnh || 0;
        // Add item's enhancement bonus
        if (rollData.item.enh !== 0 && rollData.item.enh != null) {
            parts.push("@item.enh");
        }
        // Subtract energy drain
        if (rollData.attributes.energyDrain != null && rollData.attributes.energyDrain !== 0) {
            parts.push("- max(0, abs(@attributes.energyDrain))");
        }
        // Add proficiency penalty
        if ((this.item.data.type === "attack") && !itemData.proficient) {
            parts.push("@item.proficiencyPenalty");
        }
        // Add masterwork bonus
        if (this.item.data.type === "attack" && itemData.masterwork === true && itemData.enh < 1) {
            rollData.item.masterworkBonus = 1;
            parts.push("@item.masterworkBonus");
        }
        // Add secondary natural attack penalty

        let hasMultiattack = this.item.actor ? this.item.actor.items.filter(o => o.type === "feat" && (o.name === "Multiattack" || o.system.changeFlags.multiAttack)).length > 0 : false;
        if (options.primaryAttack === false && hasMultiattack) parts.push("-2");
        if (options.primaryAttack === false && !hasMultiattack) parts.push("-5");
        // Add bonus

        if (options.bonus) {
            rollData.bonus = options.bonus;
            parts.push("@bonus");
        }
        // Add extra parts
        if (options.extraParts != null) {
            parts = parts.concat(options.extraParts);
        }
        let roll = new Roll35e(["1d20"].concat(parts).join("+"), rollData).roll();
        return roll;
    }


    /* -------------------------------------------- */

    /**
     * Only roll the item's effect.
     */
    rollEffect({critical = false, primaryAttack = true} = {}, tempActor = null, _rollData = rollData) {
        const itemData = this.item.system;
        let actor = this.item.actor;
        if (tempActor !== null) {
            actor = tempActor;
        }

        const actorData = actor.system;
        const rollData = mergeObject(duplicate(actorData), {
            item: mergeObject(itemData, this.item.getRollData(), {inplace: false}),
            ablMult: 0
        }, {inplace: false});

        if (!this.item.hasEffect) {
            throw new Error("You may not make an Effect Roll with this Item.");
        }

        // Add spell data
        if (this.item.isSpellLike()) {
            ItemSpellHelper.adjustSpellCL(this.item,itemData, rollData)
            const sl = getProperty(this.item.system,"level") + (getProperty(this.item.system,"slOffset") || 0);
            rollData.sl = sl;
        }


        // Determine critical multiplier
        rollData.critMult = 1;
        if (critical) rollData.critMult = rollData.item.ability.critMult;
        // Determine ability multiplier
        if (rollData.item.ability.damageMult != null) rollData.ablMult = rollData.item.ability.damageMult;
        if (primaryAttack === false && rollData.ablMult > 0) rollData.ablMult = 0.5;
        let naturalAttackCount = (this.item.actor?.items || []).filter(o => o.type === "attack" && o.system.attackType === "natural")?.length;
        if (rollData.item.attackType === "natural" && primaryAttack && naturalAttackCount === 1) rollData.ablMult = 1.5;

        // Create effect string
        let notes = []
        const noteObjects = actor.getContextNotes("attacks.effect");

        for (let noteObj of noteObjects) {
            rollData.item = {};
            //if (noteObj.item != null) rollData.item = duplicate(noteObj.item.system);
            if (noteObj.item != null) rollData.item = mergeObject(duplicate(noteObj.item.system), noteObj.item.getRollData(), {inplace: false})

            for (let note of noteObj.notes) {
                notes.push(...note.split(/[\n\r]+/).map(o => TextEditor.enrichHTML(`<span class="tag">${Item35E._fillTemplate(o, rollData)}</span>`, {rollData: rollData})));
            }
        }
        notes.push(...(itemData.effectNotes || "").split(/[\n\r]+/).filter(o => o.length > 0).map(o => TextEditor.enrichHTML(`<span class="tag">${Item35E._fillTemplate(o, rollData)}</span>`, {rollData: rollData})));

        const inner = notes.join('')
        if (notes.length > 0) {
            return `<div class="flexcol property-group"><label>${game.i18n.localize("D35E.EffectNotes")}</label><div class="flexrow">${inner}</div></div>`;
        } else
            return '';
    }

    /**
     * Place a damage roll using an item (weapon, feat, spell, or equipment)
     * Rely upon the DicePF.damageRoll logic for the core implementation
     */
    rollDamage({
                   data = null,
                   critical = false,
                   extraParts = [],
                   primaryAttack = true,
                   modifiers = {},
                   replacedEnh = 0
               } = {}) {
        const itemData = this.item.system;
        let rollData = null;
        let baseModifiers = [];
        if (!data) {
            rollData = this.item.actor.getRollData();
            rollData.item = duplicate(itemData);
        } else rollData = data;
        rollData.item.enh = replacedEnh;
        if (!this.item.hasDamage) {
            throw new Error("You may not make a Damage Roll with this Item.");
        }

        // Add CL
        if (this.item.isSpellLike()) {
            ItemSpellHelper.adjustSpellCL(this.item,itemData, rollData);
        }

        // Determine critical multiplier
        rollData.critMult = 1;
        rollData.ablMult = 1;
        if (critical) rollData.critMult = getProperty(this.item.system,"ability.critMult");
        // Determine ability multiplier
        if (rollData.damageAbilityMultiplier !== undefined && rollData.damageAbilityMultiplier !== null) rollData.ablMult = rollData.damageAbilityMultiplier;
        if (primaryAttack === false && rollData.ablMult > 0) rollData.ablMult = 0.5;
        let naturalAttackCount = (this.item.actor?.items || []).filter(o => o.type === "attack" && o.system.attackType === "natural")?.length;
        if (rollData.item.attackType === "natural" && primaryAttack && naturalAttackCount === 1) rollData.ablMult = 1.5;


        // Define Roll parts
        let parts = this.#_mapDamageTypes(rollData.item.damage.parts);

        parts[0].base = alterRoll(parts[0].base, 0, rollData.critMult);

        // Determine ability score modifier
        let abl = rollData.item.ability.damage;
        if (typeof abl === "string" && abl !== "") {
            rollData.ablDamage = Math.floor(rollData.abilities[abl].mod * (rollData.ablMult || 1));
            if (rollData.abilities[abl].mod < 0) rollData.ablDamage = rollData.abilities[abl].mod;
            if (rollData.ablDamage < 0) parts.push({
                base: "@ablDamage",
                extra: [],
                damageType: "Ability",
                damageTypeUid: parts[0].damageTypeUid
            });
            else if (rollData.critMult !== 1) parts.push({
                base: "@ablDamage * @critMult",
                extra: [],
                damageType: "Ability",
                damageTypeUid: parts[0].damageTypeUid
            });
            else if (rollData.ablDamage !== 0) parts.push({
                base: "@ablDamage",
                extra: [],
                damageType: "Ability",
                damageTypeUid: parts[0].damageTypeUid
            });
        }
        // Add enhancement bonus
        if (rollData.item.enh != null && rollData.item.enh !== 0 && rollData.item.enh != null) {
            if (rollData.critMult !== 1) parts.push({
                base: "@item.enh * @critMult",
                extra: [],
                damageType: "Enhancement",
                damageTypeUid: parts[0].damageTypeUid
            });
            else parts.push({
                base: "@item.enh",
                extra: [],
                damageType: "Enhancement",
                damageTypeUid: parts[0].damageTypeUid
            });
            ;
        }

        // Add general damage
        if (rollData.attributes.damage.general !== 0) {
            if (rollData.critMult !== 1) parts.push({
                base: "@attributes.damage.general * @critMult",
                extra: [],
                damageType: "General",
                damageTypeUid: parts[0].damageTypeUid
            });
            else parts.push({
                base: "@attributes.damage.general",
                extra: [],
                damageType: "General",
                damageTypeUid: parts[0].damageTypeUid
            });
        }
        // Add melee or spell damage
        if (rollData.attributes.damage.weapon !== 0 && ["mwak", "rwak"].includes(itemData.actionType)) {
            if (rollData.critMult !== 1) parts.push({
                base: "@attributes.damage.weapon * @critMult",
                extra: [],
                damageType: "Weapon",
                damageTypeUid: parts[0].damageTypeUid
            });
            else parts.push({
                base: "@attributes.damage.weapon",
                extra: [],
                damageType: "Weapon",
                damageTypeUid: parts[0].damageTypeUid
            });
        } else if (rollData.attributes.damage.spell !== 0 && ["msak", "rsak", "spellsave"].includes(itemData.actionType)) {
            if (rollData.critMult !== 1) parts.push({
                base: "@attributes.damage.spell * @critMult",
                extra: [],
                damageType: "Spell",
                damageTypeUid: parts[0].damageTypeUid
            });
            else parts.push({
                base: "@attributes.damage.spell",
                extra: [],
                damageType: "Spell",
                damageTypeUid: parts[0].damageTypeUid
            });
        }
        let simpleExtraParts = extraParts.filter(p => !Array.isArray(p));
        parts = parts.concat(extraParts.filter(p => Array.isArray(p)).map(p => {
            if (p[2] === "base")
                return {base: p[0], extra: [], damageType: p[1], damageTypeUid: parts[0].damageTypeUid}
            if (p[2])
                p[1] = CACHE.DamageTypes.get(p[2]).data.name
            else if (p[1]) {
                for (let damageType of CACHE.DamageTypes.values()) {
                    if (damageType.system.identifiers.some(i => i[0].toLowerCase() === p[1].toLowerCase()))
                        p[2] = damageType.system.uniqueId;
                }
            }
            return {base: p[0], extra: [], damageType: p[1], damageTypeUid: p[2]}

        }));
        // Create roll
        let rolls = [];
        for (let a = 0; a < parts.length; a++) {
            const part = parts[a];
            let roll = {}
            if (a === 0) {
                let rollString = `${modifiers.multiplier ? modifiers.multiplier + '*' : ''}((${[part.base, ...part.extra, ...simpleExtraParts].join("+")}))`;
                if (modifiers.maximize) rollString = rollString.replace(/d([1-9]+)/g, "*\$1")
                roll = {
                    roll: new Roll35e(rollString, rollData).roll(),
                    damageType: part.damageType,
                    damageTypeUid: part.damageTypeUid
                };
            } else {
                let rollString = `${modifiers.multiplier ? modifiers.multiplier + '*' : ''}((${[part.base, ...part.extra].join("+")}))`;
                if (modifiers.maximize) rollString = rollString.replace(/d([1-9]+)/g, "*\$1")
                roll = {
                    roll: new Roll35e(rollString, rollData).roll(),
                    damageType: part.damageType,
                    damageTypeUid: part.damageTypeUid
                };
            }
            rolls.push(roll);
        }
        // //console.log(rolls);
        return rolls;
    }

    rollAlternativeDamage({data = null} = {}) {
        const itemData = this.item.system;
        let rollData = null;
        let baseModifiers = [];
        if (!data) {
            rollData = this.item.actor.getRollData();
            rollData.item = duplicate(itemData);
        } else rollData = data;

        // Add CL
        if (this.item.isSpellLike()) {
            ItemSpellHelper.adjustSpellCL(this.item,itemData, rollData);
        }

        // Define Roll parts
        let parts = this.#_mapDamageTypes(itemData.damage.alternativeParts);

        let rolls = [];
        for (let a = 0; a < parts.length; a++) {
            const part = parts[a];
            let roll = {}
            let rollString = `((${[part.base, ...part.extra].join("+")}))`;
            roll = {
                roll: new Roll35e(rollString, rollData).roll(),
                damageType: part.damageType,
                damageTypeUid: part.damageTypeUid
            };
            rolls.push(roll);
        }
        return rolls;
    }


    /**
     * Map damage types in damage parts
     * @private
     */
    #_mapDamageTypes(damageParts) {
        let parts = damageParts.map(p => {
            if (p[2])
                p[1] = CACHE.DamageTypes.get(p[2]).data.name
            else if (p[1]) {
                for (let damageType of CACHE.DamageTypes.values()) {
                    let identifiers = damageType.system.identifiers;
                    if (identifiers.some(i => i[0].toLowerCase() === p[1].toLowerCase()))
                        p[2] = damageType.system.uniqueId;
                }
            }

            return {base: p[0], extra: [], damageType: p[1], damageTypeUid: p[2]};
        });
        return parts;
    }
}
