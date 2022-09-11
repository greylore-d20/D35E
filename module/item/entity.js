import {DicePF} from "../dice.js";
import {createCustomChatMessage} from "../chat.js";
import {alterRoll, createTag, getOriginalNameIfExists, linkData} from "../lib.js";
import {ActorPF} from "../actor/entity.js";
import AbilityTemplate from "../pixi/ability-template.js";
import {ChatAttack} from "./chat/chatAttack.js";
import {D35E} from "../config.js";
import {CACHE} from "../cache.js";
import {Roll35e} from "../roll.js"
import {ItemCharges} from "./actions/charges.js";
import {ItemRolls} from "./actions/rolls.js";
import {ItemChatData} from "./chat/chatData.js";
import {ItemChatAction} from "./chat/chatAction.js";
import {ItemSpellHelper} from "./helpers/itemSpellHelper.js";
import {ItemEnhancements} from "./actions/enhancement.js";
import {ItemChargeUpdateHelper} from "./helpers/itemChargeUpdateHelper.js";
import {ItemEnhancementConverter} from "./converters/enchancement.js";
import {ItemCombatChangesHelper} from "./helpers/itemCombatChangesHelper.js";
import {ItemCombatChanges} from "./actions/combatChanges.js";
import {ItemUse} from "./actions/use.js";

/**
 * Override and extend the basic :class:`Item` implementation
 */
export class ItemPF extends Item {
    static LOG_V10_COMPATIBILITY_WARNINGS = false;
    /* -------------------------------------------- */
    /*  Item Properties                             */

    /* -------------------------------------------- */

    constructor(...args) {
        super(...args);
        this.enhancements = new ItemEnhancements(this);
        this.rolls = new ItemRolls(this);
        this.charge = new ItemCharges(this);
        this.uses = new ItemUse(this);
        this.combatChanges = new ItemCombatChanges(this);
    }


    /**
     * Does the Item implement an attack roll as part of its usage
     * @type {boolean}
     */
    get hasAttack() {
        return ["mwak", "rwak", "msak", "rsak"].includes(getProperty(this.data,"data.actionType"));
    }

    get tag() {
        return createTag(this.name)
    }


    get hasRolltableDraw() {
        return this.data.data?.rollTableDraw?.id || false;
    }

    get hasMultiAttack() {
        return this.hasAttack && getProperty(this.data,"data.attackParts") != null && getProperty(this.data,"data.attackParts")?.length > 0;
    }

    get hasTemplate() {
        const v = getProperty(this.data, "data.measureTemplate.type");
        const s = getProperty(this.data, "data.measureTemplate.size");
        return (typeof v === "string" && v !== "") && ((typeof s === "string" && s.length > 0) || (typeof s === "number" && s > 0));
    }

    get hasAction() {
        return this.hasAttack
            || this.hasDamage
            || this.hasEffect
            || this.hasRolltableDraw
            || this.hasTemplate || (getProperty(this.data, "data.actionType") === "special")  || (getProperty(this.data, "data.actionType") === "summon");
    }

    get isSingleUse() {
        return getProperty(this.data, "data.uses.per") === "single";
    }

    get isCharged() {
        if (this.type === "card") return true;
        if (getProperty(this.data, "data.requiresPsionicFocus") && !this.actor?.data?.data?.attributes?.psionicFocus) return false;
        if (this.type === "consumable" && getProperty(this.data, "data.uses.per") === "single") return true;
        return ["day", "week", "charges"].includes(getProperty(this.data, "data.uses.per"));
    }

    get displayName() {
        let name = null;
        if (this.showUnidentifiedData) name = getProperty(this.data, "data.unidentified.name") || game.i18n.localize("D35E.Unidentified");
        else name = getProperty(this.data, "data.identifiedName") || this.originalName;
        return name;
    }

    get combatChangeName() {
        return getProperty(this.data,"data.combatChangeCustomDisplayName") || this.name;
    }

    get getChatDescription() {
        return getProperty(this.data,"data.description.value");
    }


    get getCombatChangesShortDescription() {
        return getProperty(this.data,"data.description.value");
    }

    get autoDeductCharges() {
        return this.type === "spell"
            ? getProperty(this.data, "data.preparation.autoDeductCharges") === true
            : (this.isCharged && getProperty(this.data, "data.uses.autoDeductCharges") === true);
    }

    get originalName() {
        if (typeof Babele !== "undefined")
            return this.getFlag("babele", "translated") ? this.getFlag("babele", "originalName") : this.name;
        else
            return this.name
    }

    get broken() {
        return (this.data.data?.hp?.value === 0 && this.data.data?.hp?.max > 0) || false;
    }

    isSpellLike() {
        return this.type === "spell" || getProperty(this.data,"data.actionType") === "rsak" || getProperty(this.data,"data.actionType") === "msak" || getProperty(this.data,"data.actionType") === "spellsave" || getProperty(this.data,"data.actionType") === "heal" || getProperty(this.data,"data.isFromSpell");
    }

    get charges() {
        return new ItemCharges(this).getCharges()
    }

    get maxCharges() {
        return new ItemCharges(this).getMaxCharges()
    }

    get chargeCost() {
        return new ItemCharges(this).getChargeCost()
    }

    async addCharges(value, data = null) {
        await new ItemCharges(this).addCharges(value, data);
    }

    get isRecharging() {
        return new ItemCharges(this).isRecharging();
    }

    get hasTimedRecharge() {
        return new ItemCharges(this).hasTimedRecharge();
    }

    static setMaxUses(data, rollData) {
        ItemChargeUpdateHelper.setMaxUses(data, rollData)
    }


    /**
     * @param {String} type - The item type (such as "attack" or "equipment")
     * @param {Number} colorType - 0 for the primary color, 1 for the secondary color
     * @returns {String} A color hex, in the format "#RRGGBB"
     */
    static getTypeColor(type, colorType) {
        switch (colorType) {
            case 0:
                switch (type) {
                    case "feat":
                        return "#8900EA";
                    case "spell":
                        return "#5C37FF";
                    case "class":
                        return "#85B1D2";
                    case "race":
                        return "#00BD29";
                    case "attack":
                        return "#F21B1B";
                    case "weapon":
                    case "equipment":
                    case "consumable":
                    case "loot":
                        return "#E5E5E5";
                    case "buff":
                        return "#FDF767";
                    default:
                        return "#FFFFFF";
                }
            case 1:
                switch (type) {
                    case "feat":
                        return "#5F00A3";
                    case "spell":
                        return "#4026B2";
                    case "class":
                        return "#6A8DA8";
                    case "race":
                        return "#00841C";
                    case "attack":
                        return "#A91212";
                    case "weapon":
                    case "equipment":
                    case "consumable":
                    case "loot":
                        return "#B7B7B7";
                    case "buff":
                        return "#FDF203";
                    default:
                        return "#C1C1C1";
                }
        }

        return "#FFFFFF";
    }

    get typeColor() {
        return this.constructor.getTypeColor(this.type, 0);
    }

    get typeColor2() {
        return this.constructor.getTypeColor(this.type, 1);
    }

    /* -------------------------------------------- */

    /**
     * Does the Item implement a damage roll as part of its usage
     * @type {boolean}
     */
    get hasDamage() {
        return !!(getProperty(this.data,"data.damage") && getProperty(this.data,"data.damage.parts")?.length);
    }

    /* -------------------------------------------- */

    /**
     * Does the item provide an amount of healing instead of conventional damage?
     * @return {boolean}
     */
    get isHealing() {
        return (getProperty(this.data,"data.actionType") === "heal") && getProperty(this.data,"data.damage.parts")?.length;
    }

    get hasEffect() {
        return this.hasDamage || (getProperty(this.data,"data.effectNotes") && getProperty(this.data,"data.effectNotes")?.length > 0) || (getProperty(this.data,"data.specialActions") && getProperty(this.data,"data.specialActions")?.length > 0);
    }

    /* -------------------------------------------- */

    /**
     * Does the Item implement a saving throw as part of its usage
     * @type {boolean}
     */
    get hasSave() {
        return !!(getProperty(this.data,"data.save") && getProperty(this.data,"data.save.ability"));
    }

    /**
     * Should the item show unidentified data
     * @type {boolean}
     */
    get showUnidentifiedData() {
        return (!game.user.isGM && getProperty(this.data, "data.identified") === false);
    }

    /* -------------------------------------------- */
    /*	Data Preparation														*/

    /* -------------------------------------------- */

    /**
     * Augment the basic Item data model with additional dynamic data.
     */
    prepareData() {
        super.prepareData();

        const itemData = this.data;
        const data = itemData.data;
        const C = CONFIG.D35E;
        const labels = {};
        
        // Physical items
        if (hasProperty(itemData, "data.weight")) {
            // Sync name
            if (!hasProperty(this.data, "data.identifiedName")) setProperty(this.data, "data.identifiedName", this.name);
            // Prepare unidentified cost
            if (!hasProperty(this.data, "data.unidentified.price")) setProperty(this.data, "data.unidentified.price", 0);

            // Set basic data
            itemData.data.hp = itemData.data.hp || {max: 10, value: 10};
            itemData.data.hardness = itemData.data.hardness || 0;
            itemData.data.carried = itemData.data.carried == null ? true : itemData.data.carried;

            // Equipped label
            labels.equipped = "";
            if (itemData.data.equipped === true) labels.equipped = game.i18n.localize("D35E.Yes");
            else labels.equipped = game.i18n.localize("D35E.No");

            // Carried label
            labels.carried = "";
            if (itemData.data.carried === true) labels.carried = game.i18n.localize("D35E.Yes");
            else labels.carried = game.i18n.localize("D35E.No");

            // Identified label
            labels.identified = "";
            if (itemData.data.identified === true) labels.identified = game.i18n.localize("D35E.YesShort");
            else labels.identified = game.i18n.localize("D35E.NoShort");

            // Slot label
            if (itemData.data.slot) {
                // Add equipment slot
                const equipmentType = getProperty(this.data, "data.equipmentType") || null;
                if (equipmentType != null) {
                    const equipmentSlot = getProperty(this.data, "data.slot") || null;
                    labels.slot = equipmentSlot == null ? null : CONFIG.D35E.equipmentSlots[equipmentType][equipmentSlot];
                } else labels.slot = null;
            }


        }

        // Spell Level,  School, and Components
        if (itemData.type === "spell") {
            labels.level = C.spellLevels[data.level];
            labels.school = C.spellSchools[data.school];
            labels.components = Object.entries(data.components).map(c => {
                c[1] === true ? c[0].titleCase().slice(0, 1) : null
            }).filterJoin(",");
            if (this.actor) {
                let spellbook  = this.actor?.data?.data?.attributes?.spells.spellbooks[data.spellbook]
                if (spellbook)
                    data.spellbookData = {class: spellbook.class,name: spellbook.name}
            }
        }

        // Feat Items
        else if (itemData.type === "feat") {
            labels.featType = C.featTypes[data.featType];
        }

        // Buff Items
        else if (itemData.type === "buff") {
            labels.buffType = C.buffTypes[data.buffType];
        }

        // Weapon Items
        else if (itemData.type === "weapon") {
            // Type and subtype labels
            let wType = getProperty(this.data, "data.weaponType");
            let typeKeys = Object.keys(C.weaponTypes);
            if (!typeKeys.includes(wType)) wType = typeKeys[0];

            let wSubtype = getProperty(this.data, "data.weaponSubtype");
            let subtypeKeys = Object.keys(C.weaponTypes[wType]).filter(o => !o.startsWith("_"));
            if (!subtypeKeys.includes(wSubtype)) wSubtype = subtypeKeys[0];

            labels.weaponType = C.weaponTypes[wType]._label;
            labels.weaponSubtype = C.weaponTypes[wType][wSubtype];
        }

        // Equipment Items
        else if (itemData.type === "equipment") {
            // Type and subtype labels
            let eType = getProperty(this.data, "data.equipmentType");
            let typeKeys = Object.keys(C.equipmentTypes);
            if (!typeKeys.includes(eType)) eType = typeKeys[0];

            let eSubtype = getProperty(this.data, "data.equipmentSubtype");
            let subtypeKeys = Object.keys(C.equipmentTypes[eType]).filter(o => !o.startsWith("_"));
            if (!subtypeKeys.includes(eSubtype)) eSubtype = subtypeKeys[0];

            labels.equipmentType = C.equipmentTypes[eType]._label;
            labels.equipmentSubtype = C.equipmentTypes[eType][eSubtype];

            // AC labels
            labels.armor = data.armor.value ? `${data.armor.value} AC` : "";
            if (data.armor.dex === "") data.armor.dex = null;
            else if (typeof data.armor.dex === "string" && /\d+/.test(data.armor.dex)) {
                data.armor.dex = parseInt(data.armor.dex);
            }
            // Add enhancement bonus
            if (data.armor.enh == null) data.armor.enh = 0;
        }

        // Activated Items
        if (data.hasOwnProperty("activation")) {

            // Ability Activation Label
            let act = data.activation || {};
            if (act) labels.activation = [["minute", "hour"].includes(act.type) ? act.cost.toString() : "", C.abilityActivationTypes[act.type]].filterJoin(" ");

            // Target Label
            let tgt = data.target || {};
            if (["none", "touch", "personal"].includes(tgt.units)) tgt.value = null;
            if (["none", "personal"].includes(tgt.type)) {
                tgt.value = null;
                tgt.units = null;
            }
            labels.target = [tgt.value, C.distanceUnits[tgt.units], C.targetTypes[tgt.type]].filterJoin(" ");
            if (labels.target) labels.target = `Target: ${labels.target}`;

            // Range Label
            let rng = data.range || {};
            if (!["ft", "mi", "spec"].includes(rng.units)) {
                rng.value = null;
                rng.long = null;
            }
            labels.range = [rng.value, rng.long ? `/ ${rng.long}` : null, C.distanceUnits[rng.units]].filterJoin(" ");
            if (labels.range.length > 0) labels.range = ["Range:", labels.range].join(" ");

            // Duration Label
            let dur = data.duration || {};
            if (["inst", "perm", "spec"].includes(dur.units)) dur.value = null;
            labels.duration = [dur.value, C.timePeriods[dur.units]].filterJoin(" ");
        }

        // Item Actions
        if (data.hasOwnProperty("actionType")) {
            // Save DC
            let save = data.save || {};
            if (save.description || save.type) {
                labels.save = `DC ${save.dc}`;
            }

            // Damage
            let dam = data.damage || {};
            if (dam.parts) {
                labels.damage = dam.parts.map(d => d[0]).join(" + ").replace(/\+ -/g, "- ");
                labels.damageTypes = dam.parts.map(d => d[1]).join(", ");
            }

            // Add attack parts
            if (!data.attack) data.attack = {parts: []};
        }
        itemData['custom'] = {}
        if (data.hasOwnProperty('customAttributes')) {
            //console.log(data.customAttributes)
            for (let prop in data.customAttributes || {}) {
                let propData = data.customAttributes[prop];
                itemData['custom'][(propData.name || propData.id).replace(/ /g, '').toLowerCase()] = (propData?.selectListArray || false) ? propData.selectListArray[propData.value] : propData.value;
            }
        }
        //console.log('D35E | Custom properties', itemData['custom'])

        // Assign labels and return the Item
        this.labels = labels;
    }

    static _fillTemplate(templateString, templateVars){
        return new Function("return `"+templateString +"`;").call(templateVars);
    }

    async update(data, options = {}) {
        if (options['recursive'] !== undefined && options['recursive'] === false) {
            //console.log('D35E | Skipping update logic since it is not recursive')
            await super.update(data, options);
            return
        }
        console.log('Is true/false', data, getProperty(this.data,"data.active"))
        let expandedData = expandObject(data);
        const srcData = mergeObject(this.data.toObject(), expandedData);

        let needsUpdate = false; // if we do not have changes we often do not need to update actor
        if (this.type === 'class' ||
            srcData.data?.changes?.length > 0 ||
            srcData.data?.damageReduction?.length > 0 ||
            srcData.data?.resistances?.length > 0 ||
            srcData.data?.requirements?.length > 0 ||
            srcData.data.uses?.isResource ||
            srcData.data.uses?.canBeLinked ||
            data['data.quantity'] !== undefined ||
            data['data.equipped'] !== undefined ||
            data['data.carried'] !== undefined)
            needsUpdate = true

        

        console.log('Should be true/false, is true true', data, getProperty(this.data,"data.active"))

        for (var key in expandedData?.data?.customAttributes) {
            if (data[`data.customAttributes.${key}`] === null) continue;
            if (expandedData.data.customAttributes.hasOwnProperty(key)) {
                let customAttribute = expandedData.data.customAttributes[key];
                let addedAttributes = new Set()
                if (customAttribute.selectList !== undefined) {
                    if (customAttribute.selectList) {
                        data[`data.customAttributes.${key}.selectListArray`] = {}
                        for (let selectAttribute of customAttribute.selectList.split("|")) {
                            if (selectAttribute.indexOf(":") !== -1) {
                                if (!selectAttribute.split(":")[1]) continue;
                                addedAttributes.add(selectAttribute.split(":")[1])
                                data[`data.customAttributes.${key}.selectListArray`][selectAttribute.split(":")[1]] = selectAttribute.split(":")[0];
                            } else {
                                if (!selectAttribute) continue;
                                addedAttributes.add(selectAttribute)
                                data[`data.customAttributes.${key}.selectListArray`][selectAttribute] = selectAttribute;
                            }
                            
                        }
                    }
                    let existingCustomAttribute = this.data.data.customAttributes[key];
                    for (var _key in existingCustomAttribute.selectListArray) {
                        if (!addedAttributes.has(_key))
                            data[`data.customAttributes.${key}.selectListArray.-=${_key}`] = null;
                    }
                }
            }
        }

        //const srcDataWithRolls = srcData.data;
        if (data["firstChangeTarget"]) {
            data["data.changes.0.2"] = data["firstChangeTarget"].split(":")[0];
            data["data.changes"][0][2] = data["firstChangeTarget"].split(":")[0];
            srcData.firstChangeTargetName = data["firstChangeTarget"].split(":")[1];
            delete data["firstChangeTarget"];
        }
        if (data['data.nameFromFormula'] || getProperty(this.data, "data.nameFromFormula")) {
            const srcDataWithRolls = this.getRollData(srcData);
            srcDataWithRolls.firstChangeTargetName = srcData.firstChangeTargetName;
            data["name"] = ItemPF._fillTemplate(data['data.nameFormula'] || getProperty(this.data, "data.nameFormula"), srcDataWithRolls) || data["name"]
        }
        // Update name
        if (data["data.identifiedName"]) data["name"] = data["data.identifiedName"];
        else if (data["name"]) data["data.identifiedName"] = data["name"];


        let activateBuff = data["data.active"] && data["data.active"] !== getProperty(this.data,"data.active");
        let deactivateBuff = getProperty(this.data,"data.active") && (data["data.active"] !== undefined && !data["data.active"]);
        // Update description
        if (this.type === "spell") await this._updateSpellDescription(data, srcData);
        if (this.type === "card") await this._updateCardDescription(data, srcData);

        // Set weapon subtype
        if (data["data.weaponType"] != null && data["data.weaponType"] !== getProperty(this.data, "data.weaponType")) {
            const type = data["data.weaponType"];
            const subtype = data["data.weaponSubtype"] || getProperty(this.data, "data.weaponSubtype") || "";
            const keys = Object.keys(CONFIG.D35E.weaponTypes[type])
                .filter(o => !o.startsWith("_"));
            if (!subtype || !keys.includes(subtype)) {
                data["data.weaponSubtype"] = keys[0];
            }
        }

        if (data["data.hasSpellbook"] != null && data["data.hasSpellbook"] !== getProperty(this.data, "data.hasSpellbook")) {
            const curValue = getProperty(this.data.data, "spellbook");
            if (curValue == null || curValue.length === 0) {
                let spellbook = []
                for (let a = 0; a < 10; a++) {
                    spellbook.push({level: a, spells: []})
                }
                data["data.spellbook"] = spellbook;
            }
        }

        if (this.pack && this.pack.startsWith("D35E")) {
            data["data.originVersion"] = getProperty(this.data,"data.originVersion") + 1;
        }

        if (data["data.weaponData.size"] && data["data.weaponData.size"] !== getProperty(this.data,"data.weaponData.size")) {
            let newSize = Object.keys(CONFIG.D35E.actorSizes).indexOf(data["data.weaponData.size"] || "");
            let oldSize = Object.keys(CONFIG.D35E.actorSizes).indexOf(getProperty(this.data,"data.weaponData.size") || "");
            let weightChange = Math.pow(2,newSize-oldSize);
            data["data.weight"] = getProperty(this.data,"data.weight") * weightChange;
        }

        //console.log("D35E Item Update", data)
        if (data["data.convertedWeight"] !== undefined && data["data.convertedWeight"] !== null ) {
            const conversion = game.settings.get("D35E", "units") === "metric" ? 2 : 1;
            data["data.weight"] = data["data.convertedWeight"] * conversion;
        }

        if (data["data.classType"] !== undefined && data["data.classType"] === 'template') {
            data["data.hp"] = 0;
        }

        this._updateCalculateAutoDC(data);

        if (data["data.convertedCapacity"] !== undefined && data["data.convertedCapacity"] !== null) {
            const conversion = game.settings.get("D35E", "units") === "metric" ? 2 : 1;
            data["data.capacity"] = data["data.convertedCapacity"] * conversion;
        }

        if (data["data.selectedMaterial"] && data["data.selectedMaterial"] !== "none") {
            data["data.material"] = duplicate(CACHE.Materials.get(data["data.selectedMaterial"]).data);
        } else if (data["data.selectedMaterial"]  && data["data.selectedMaterial"] === "none") {
            data["data.-=material"] = null;
        }

        {
            let rollData = {};
            if (this.actor != null) rollData = this.actor.getRollData();
            this._updateCalculateTimelineData(data, rollData);
            this._updateCalculateDamagePoolData(data, rollData);
            this._updateCalculateEnhancementData(rollData, data);
            this._updateCalculatePriceData(data, rollData);
            this._updateCalculateMaxDamageDice(data, rollData);
        }

        // Set equipment subtype and slot
        if (data["data.equipmentType"] != null && data["data.equipmentType"] !== getProperty(this.data, "data.equipmentType")) {
            // Set subtype
            const type = data["data.equipmentType"];
            const subtype = data["data.equipmentSubtype"] || getProperty(this.data, "data.equipmentSubtype") || "";
            let keys = Object.keys(CONFIG.D35E.equipmentTypes[type])
                .filter(o => !o.startsWith("_"));
            if (!subtype || !keys.includes(subtype)) {
                data["data.equipmentSubtype"] = keys[0];
            }

            // Set slot
            const slot = data["data.slot"] || getProperty(this.data, "data.slot") || "";
            keys = Object.keys(CONFIG.D35E.equipmentSlots[type]);
            if (!slot || !keys.includes(slot)) {
                data["data.slot"] = keys[0];
            }
        }

        // Update enh from Enhancements
        let _enhancements = duplicate(getProperty(srcData, `data.enhancements.items`) || []);
        this._updateBaseEnhancement(data, _enhancements, this.type, srcData);
        this._updateAlignmentEnhancement(data, _enhancements, this.type, srcData);




        this._updateMaxUses(data, {srcData: srcData});

        const diff = diffObject(flattenObject(this.data.toObject()), data);
        let updatedItem = null;
        // if (Object.keys(diff).length) {
        //     updatedItem = await super.update(diff, options);
        // }

        if (activateBuff) {
            data["data.timeline.elapsed"] = 0;
            data["data.damagePool.current"] = data["data.damagePool.total"] || getProperty(this.data, "data.damagePool.total");
        }
        let updateData = await super.update(data, options);
        if (this.actor !== null && !options.massUpdate) {

            if (activateBuff) {
                //Buff or item was activated
                data["data.timeline.elapsed"] = 0
                let actionValue = (getProperty(this.data,"data.activateActions") || []).map(a => a.action).join(";")
                if (!actionValue) await this.actor.refresh(options); 
                else {
                    if (this.actor && this.actor.token !== null) {
                        const srcDataWithRolls = this.getRollData(srcData);
                        await this.actor.token.actor.applyActionOnSelf(actionValue, this.actor.token.actor, srcDataWithRolls, "self")
                    } else if (this.actor) {
                        const srcDataWithRolls = this.getRollData(srcData);
                        await this.actor.applyActionOnSelf(actionValue, this.actor, srcDataWithRolls, "self")
                    }
                }
                if (getProperty(this.data,"data.buffType") === "shapechange") {
                    if (getProperty(this.data,"data.shapechange.type") === "wildshape" || getProperty(this.data,"data.shapechange.type") === "polymorph") {
                        let itemsToCreate = []
                        for (const i of getProperty(this.data,"data.shapechange.source.items")) {
                            if (i.type === "attack" && (i.data.attackType === "natural" || i.data.attackType === "extraordinary")) {
                                //console.log('add polymorph attack')
                                if (!this.actor) continue;
                                let data = duplicate(i);
                                data.data.fromPolymorph = true;
                                data.name = i.name;
                                delete data._id;
                                itemsToCreate.push(data)
                            }
                        }
    
                        if (this.actor.token !== null) {
                            await this.actor.token.actor.createEmbeddedDocuments("Item", itemsToCreate,{stopUpdates: true})
                        } else {
                            await this.actor.createEmbeddedDocuments("Item", itemsToCreate,{stopUpdates: true})
                        }
                    }
                }
                if (this.type === "aura") {
                    await this.actor.refresh({reloadAuras: true})
                }
                if (game.combats.active) {
                    game.combats.active.addBuffToCombat(this,this.actor)
                }

            } else if (deactivateBuff) {
                if (getProperty(this.data,"data.buffType") === "shapechange") {
                    if (getProperty(this.data,"data.shapechange.type") === "wildshape" || getProperty(this.data,"data.shapechange.type") === "polymorph") {
                        let itemsToDelete = []
                        if (this.actor) {
                            for (const i of this.actor.items) {
                                if (i.data.data.fromPolymorph) {
                                    //console.log('remove polymorph attack',i,this.actor,this.actor.token)
                                    itemsToDelete.push(i._id)
                                }
                            }
                        }
                        if (itemsToDelete.length)
                            if (this.actor.token !== null) {
                                await this.actor.token.actor.deleteEmbeddedDocuments("Item",itemsToDelete,{stopUpdates: true})
                            } else {
                                await this.actor.deleteEmbeddedDocuments("Item",itemsToDelete,{stopUpdates: true})
                            }
                    }
                }
                let actionValue = (getProperty(this.data,"data.deactivateActions") || []).map(a => a.action).join(";")
                if (!actionValue) await this.actor.refresh(options); 
                else {
                    if (this.actor && this.actor.token !== null) {
                        const srcDataWithRolls = this.getRollData(srcData);
                        await this.actor.token.actor.applyActionOnSelf(actionValue, this.actor.token.actor, srcDataWithRolls, "self")
                    } else if (this.actor) {
                        const srcDataWithRolls = this.getRollData(srcData);
                        await this.actor.applyActionOnSelf(actionValue, this.actor, srcDataWithRolls, "self")
                    }
                }
                if (this.type === "aura") {
                    await this.actor.refresh({reloadAuras: true})
                }
                if (game.combats.active) {
                    game.combats.active.removeBuffFromCombat(this)
                }
    
            } else {

                if ((data["data.range"] || data["data.auraTarget"]) && this.type === "aura") {
                    await this.actor.refresh({reloadAuras: true})
                } else {
                    if (needsUpdate)
                        await this.actor.refresh(options);
                }
            }

        }

        console.log('D35E | ITEM UPDATE | Updated')
        return Promise.resolve(updateData);
        // return super.update(data, options);
    }

    _updateCalculateAutoDC(data) {
        if (data["data.save.dcAutoType"] !== undefined && data["data.save.dcAutoType"] !== null && data["data.save.dcAutoType"] !== "") {
            let autoDCBonus = 0;
            if (this.actor && this.actor.racialHD) {
                let autoType = data["data.save.dcAutoType"];
                switch (autoType) {
                    case "racialHD":
                        autoDCBonus += this.actor.racialHD.data.data.levels;
                        break;
                    case "halfRacialHD":
                        autoDCBonus += this.actor.racialHD.data.data.levels;
                        autoDCBonus = Math.floor(autoDCBonus / 2.0);
                        break;
                    case "HD":
                        autoDCBonus += this.actor.data.data.attributes.hd.total;
                        break;
                    case "halfHD":
                        autoDCBonus += this.actor.data.data.attributes.hd.total;
                        autoDCBonus = Math.floor(autoDCBonus / 2.0);
                        break;
                    default:
                        break;
                }
                let ability = data["data.save.dcAutoAbility"];
                data["data.save.dc"] = 10 + (this.actor.data.data.abilities[ability]?.mod || 0) + autoDCBonus;
            } else {
                data["data.save.dc"] = 0;
            }
        }
    }

    _updateCalculatePriceData(data, rollData) {
        let rollFormula = getProperty(this.data, "data.priceFormula");
        if (data["data.priceFormula"] != null && data["data.priceFormula"] !== getProperty(this.data, "data.priceFormula"))
            rollFormula = data["data.priceFormula"];
        if (rollFormula !== undefined && rollFormula !== null && rollFormula !== "") {
            data["data.price"] = new Roll35e(rollFormula, rollData).roll().total;
        }
    }

    _updateCalculateMaxDamageDice(data, rollData) {
        if (data["data.maxDamageDiceFormula"] != null && data["data.maxDamageDiceFormula"] !== getProperty(this.data, "data.maxDamageDiceFormula")) {
            let roll = new Roll35e(data["data.maxDamageDiceFormula"], rollData).roll();
            data["data.maxDamageDice"] = roll.total;
        }
    }

    _updateCalculateEnhancementData(rollData, data) {
        rollData.enhancement = data["data.enh"] !== undefined ? data["data.enh"] : getProperty(this.data, "data.enh");
        let rollFormula = getProperty(this.data, "data.enhIncreaseFormula");
        if (data["data.enhIncreaseFormula"] != null && data["data.enhIncreaseFormula"] !== getProperty(this.data, "data.enhIncreaseFormula"))
            rollFormula = data["data.enhIncreaseFormula"];
        if (rollFormula !== undefined && rollFormula !== null && rollFormula !== "") {
            data["data.enhIncrease"] = new Roll35e(rollFormula, rollData).roll().total;
        }
        rollData.enhancement = data["data.enh"] !== undefined ? data["data.enh"] : getProperty(this.data, "data.enh");
        rollData.enhIncrease = data["data.enhIncrease"] !== undefined ? data["data.enhIncrease"] : getProperty(this.data, "data.enhIncrease");
        
    }

    _updateCalculateDamagePoolData(data, rollData) {
        let rollFormula = getProperty(this.data, "data.damagePool.formula");
        if (data["data.damagePool.formula"] != null && data["data.damagePool.formula"] !== getProperty(this.data, "data.damagePool.formula"))
            rollFormula = data["data.damagePool.formula"];
        if (rollFormula !== undefined && rollFormula !== null && rollFormula !== "") {

            rollData.item = {};
            rollData.item.level = getProperty(this.data, "data.level");
            if (data["data.level"] != null && data["data.level"] !== getProperty(this.data, "data.level"))
                rollData.item.level = data["data.level"];
            try {
                data["data.damagePool.total"] = new Roll35e(rollFormula, rollData).roll().total;
            } catch (e) {
                data["data.damagePool.total"] = 0;
            }
        }
    }

    _updateCalculateTimelineData(data, rollData) {
        let rollFormula = getProperty(this.data, "data.timeline.formula");
        if (data["data.timeline.formula"] != null && data["data.timeline.formula"] !== getProperty(this.data, "data.timeline.formula"))
            rollFormula = data["data.timeline.formula"];
        if (rollFormula !== undefined && rollFormula !== null && rollFormula !== "") {

            rollData.item = {};
            rollData.item.level = getProperty(this.data, "data.level");
            if (data["data.level"] != null && data["data.level"] !== getProperty(this.data, "data.level"))
                rollData.item.level = data["data.level"];
            try {
                data["data.timeline.total"] = new Roll35e(rollFormula.toString(), rollData).roll().total;
            } catch (e) {
                data["data.timeline.total"] = 0;
            }
        }
    }

    _updateAlignmentEnhancement(data, enhancements, type, srcData) {
        let doLinkData = true;
        if (srcData == null) {
            srcData = this.data;
            doLinkData = false;
        }

        let alignment = {
            "good": false,
                "evil": false,
                "lawful": false,
                "chaotic": false
        }

        enhancements.forEach(function( obj ) {
            if (obj.data.weaponData.alignment) {
                alignment.good = obj.data.weaponData.alignment.good || alignment.good;
                alignment.evil = obj.data.weaponData.alignment.evil || alignment.evil;
                alignment.lawful = obj.data.weaponData.alignment.lawful || alignment.lawful;
                alignment.chaotic = obj.data.weaponData.alignment.chaotic || alignment.chaotic;
            }
        });
        //console.log('Total enh',totalEnchancement, type)
        if (type === 'weapon' && enhancements.length) {
            if (doLinkData) linkData(srcData, data, "data.weaponData.alignment", alignment);
            else data['data.weaponData.alignment'] = alignment
        }
    }

    _updateBaseEnhancement(data, enhancements, type, srcData) {
        let doLinkData = true;
        if (srcData == null) {
            srcData = this.data;
            doLinkData = false;
        }
        let totalEnchancement = 0;
        enhancements.forEach(function( obj ) {

            if (!obj.data.enhIsLevel) {
                if (obj.data.enhancementType === "weapon" && type === 'weapon')
                    totalEnchancement += obj.data.enh
                if (obj.data.enhancementType === "armor" && type === 'equipment')
                    totalEnchancement += obj.data.enh
            }
        });
        //console.log('Total enh',totalEnchancement, type)
        if (totalEnchancement > 0) {
            if (type === 'weapon') {
                if (doLinkData) linkData(srcData, data, "data.enh", totalEnchancement);
                else data['data.enh'] = totalEnchancement
            }
            else if (type === 'equipment') {
                if (doLinkData) linkData(srcData, data, "data.armor.enh", totalEnchancement);
                else data['data.armor.enh'] = totalEnchancement
            }
        }
    }

    _updateMaxUses(data, {srcData = null, actorData = null, actorRollData = null} = {}) {
        ItemChargeUpdateHelper.updateMaxUses(this, data, {srcData: srcData, actorData: actorData, actorRollData: actorRollData})
    }
    /* -------------------------------------------- */

    /**
     * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
     * @return {Promise}
     */
    async roll(altChatData = {}, tempActor = null) {
        return new ItemRolls(this).roll(altChatData, tempActor)
    }

    /* -------------------------------------------- */
    /*  Chat Cards																	*/

    /* -------------------------------------------- */

    getChatData(htmlOptions, rollData) {
        return new ItemChatData(this).getChatData(htmlOptions, rollData)
    }

    _addCombatChangesToRollData(allCombatChanges, rollData) {
        allCombatChanges.forEach(change => {
            if (change[3].indexOf('$') !== -1) {
                setProperty(rollData, change[3].substr(1), ItemPF._fillTemplate(change[4], rollData))
            } else if (change[3].indexOf('&') !== -1) {
                setProperty(rollData, change[3].substr(1), (getProperty(rollData, change[3].substr(1)) || "0") + " + " + ItemPF._fillTemplate(change[4], rollData))
            } else {
                setProperty(rollData, change[3], (getProperty(rollData, change[3]) || 0) + (change[4] || 0))
            }
        })
    }

    /* -------------------------------------------- */

    /**
     * Prepare chat card data for equipment type items
     * @private
     */
    _equipmentChatData(data, labels, props) {
        props.push(
            CONFIG.D35E.equipmentTypes[data.equipmentType][data.equipmentSubtype],
            labels.armor || null,
        );
    }

    /* -------------------------------------------- */

    /**
     * Prepare chat card data for weapon type items
     * @private
     */
    _weaponChatData(data, labels, props) {
        props.push(
            CONFIG.D35E.weaponTypes[data.weaponType]._label,
            CONFIG.D35E.weaponTypes[data.weaponType][data.weaponSubtype],
        );
    }



    /* -------------------------------------------- */

    /**
     * Prepare chat card data for consumable type items
     * @private
     */
    _consumableChatData(data, labels, props) {
        props.push(
            CONFIG.D35E.consumableTypes[data.consumableType]
        );
        if (["day", "week", "charges"].includes(data.uses.per)) {
            props.push(data.uses.value + "/" + data.uses.max + " Charges");
        } else props.push(CONFIG.D35E.limitedUsePeriods[data.uses.per]);
        data.hasCharges = data.uses.value >= 0;
    }

    /* -------------------------------------------- */

    /**
     * Prepare chat card data for tool type items
     * @private
     */
    _lootChatData(data, labels, props) {
        props.push(
            data.weight ? data.weight + " " + (game.settings.get("D35E", "units") === "metric" ? game.i18n.localize("D35E.Kgs") : game.i18n.localize("D35E.Lbs")) : null
        );
    }

    /* -------------------------------------------- */

    /**
     * Render a chat card for Spell type data
     * @return {Object}
     * @private
     */
    _spellChatData(data, labels, props) {
        const ad = this.actor.data.data;

        // Spell saving throw text
        // const abl = data.ability || ad.attributes.spellcasting || "int";
        // if ( this.hasSave && !data.save.dc ) data.save.dc = 8 + ad.abilities[abl].mod + ad.attributes.prof;
        // labels.save = `DC ${data.save.dc} ${CONFIG.D35E.abilities[data.save.ability]}`;

        // Spell properties
        props.push(
            labels.level,
            labels.components,
        );
    }

    /* -------------------------------------------- */

    /**
     * Prepare chat card data for items of the "Feat" type
     */
    _featChatData(data, labels, props) {
        //const ad = this.actor.data.data;

        // Spell saving throw text
        // const abl = data.ability || ad.attributes.spellcasting || "str";
        // if ( this.hasSave && !data.save.dc ) data.save.dc = 8 + ad.abilities[abl].mod + ad.attributes.prof;
        // labels.save = `DC ${data.save.dc} ${CONFIG.D35E.abilities[data.save.ability]}`;

        // Feat properties
        props.push(
            CONFIG.D35E.featTypes[data.featType]
        );
    }

    /* -------------------------------------------- */
    /*  Item Rolls - Attack, Damage, Saves, Checks  */

    /* -------------------------------------------- */

    async use({ev = null, skipDialog = false, replacementId = null, rollModeOverride = null, temporaryItem = false}, tempActor= null, skipChargeCheck=false) {
        return await this.uses.use(tempActor, replacementId, ev, skipDialog, rollModeOverride, temporaryItem, skipChargeCheck);
    }

    getActorItemRollData() {
        const itemData = this.getRollData();
        const rollData = this.actor ? duplicate(this.actor.getRollData(null, true)) : {};
        rollData.item = duplicate(itemData);
        return rollData;
    }

    getCombatActor(actor) {
        return actor.isToken ? game.combats.active.getCombatantByToken(actor.token.id) : game.combats.active.getCombatantByActor(actor.id);
    }

    async _addCombatSpecialActionsToAttack(allCombatChanges, attack, actor, rollData, optionalFeatRanges, attackId) {
        for (const c of allCombatChanges) {
            if (c[5] && c[5] !== "0") {
                if (c[9] && attackId !== 0) continue;
                await attack.addCommandAsSpecial(c[7], c[8], c[5], actor, rollData.useAmount || 1, rollData.cl, optionalFeatRanges.get(c[6])?.base || 0);
            }
        }
    }


    isCombatChangeItemType() {
        return ItemCombatChangesHelper.isCombatChangeItemType();
    }

    get hasUseableChange() {
        if (this.isCharged && !this.charges) return false;
        return true;
    }

    /* -------------------------------------------- */

    /**
     * Adjust a cantrip damage formula to scale it for higher level characters and monsters
     * @private
     */
    _scaleCantripDamage(parts, level, scale) {
        const add = Math.floor((level + 1) / 6);
        if (add === 0) return;
        if (scale && (scale !== parts[0])) {
            parts[0] = parts[0] + " + " + scale.replace(new RegExp(Roll.diceRgx, "g"), (match, nd, d) => `${add}d${d}`);
        } else {
            parts[0] = parts[0].replace(new RegExp(Roll.diceRgx, "g"), (match, nd, d) => `${parseInt(nd) + add}d${d}`);
        }
    }

    /* -------------------------------------------- */

    /**
     * Place an attack roll using an item (weapon, feat, spell, or equipment)
     * Rely upon the DicePF.d20Roll logic for the core implementation
     */
    async rollFormula(options = {}) {
        const itemData = this.data.data;
        if (!itemData.formula) {
            throw new Error(game.i18n.localize("D35E.ErrorNoFormula").format(this.name));
        }

        // Define Roll Data
        const rollData = this.actor.getRollData();
        rollData.item = itemData;
        const title = `${this.name} - ${game.i18n.localize("D35E.OtherFormula")}`;

        const roll = new Roll35e(itemData.formula, rollData).roll();
        return roll.toMessage({
            speaker: ChatMessage.getSpeaker({actor: this.actor}),
            flavor: itemData.chatFlavor || title,
            rollMode: game.settings.get("core", "rollMode")
        });
    }

    /* -------------------------------------------- */

    /**
     * Use a consumable item
     */
    async rollConsumable(options = {}) {
        let itemData = this.data.data;
        const labels = this.labels;
        let parts = itemData.damage.parts;
        const data = this.actor.getRollData();

        // Add effect string
        let effectStr = "";
        if (typeof itemData.effectNotes === "string" && itemData.effectNotes.length) {
            effectStr = DicePF.messageRoll({
                data: data,
                msgStr: itemData.effectNotes
            });
        }

        parts = parts.map(obj => {
            return obj[0];
        });
        // Submit the roll to chat
        if (effectStr === "") {
            new Roll35e(parts.join("+")).toMessage({
                speaker: ChatMessage.getSpeaker({actor: this.actor}),
                flavor: game.i18n.localize("D35E.UsesItem").format(this.name)
            });
        } else {
            const chatTemplate = "systems/D35E/templates/chat/roll-ext.html";
            const chatTemplateData = {hasExtraText: true, extraText: effectStr};
            // Execute the roll
            let roll = new Roll35e(parts.join("+"), data).roll();

            // Create roll template data
            const rollData = mergeObject({
                user: game.user.id,
                formula: roll.formula,
                tooltip: await roll.getTooltip(),
                total: roll.total,
            }, chatTemplateData || {});

            // Create chat data
            let chatData = {
                user: game.user.id,
                type: CONST.CHAT_MESSAGE_TYPES.CHAT,
                sound: CONFIG.sounds.dice,
                speaker: ChatMessage.getSpeaker({actor: this.actor}),
                flavor: game.i18n.localize("D35E.UsesItem").format(this.name),
                rollMode: game.settings.get("core", "rollMode"),
                roll: roll,
                content: await renderTemplate(chatTemplate, rollData),
            };
            // Handle different roll modes
            switch (chatData.rollMode) {
                case "gmroll":
                    chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u._id);
                    break;
                case "selfroll":
                    chatData["whisper"] = [game.user.id];
                    break;
                case "blindroll":
                    chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u._id);
                    chatData["blind"] = true;
            }

            // Send message
            ChatMessage.create(chatData);
        }
    }

    /* -------------------------------------------- */

    /**
     * @returns {Object} An object with data to be used in rolls in relation to this item.
     */
    getRollData(customData = null) {
        let _base = this.data.toObject(false).data;
        let result = {}
        if (customData)
            result = mergeObject(_base, customData.data)
        else
            result = _base

        if (this.type === "buff") result.level = result.level;
        if (this.type === "enhancement") result.enhancement = result.enh;
        if (this.type === "enhancement") result.enhIncrease = result.enhIncrease;
        if (this.type === "spell") result.name = this.name;
        result['custom'] = {}
        result['customNames'] = {}
        if (result.hasOwnProperty('customAttributes')) {
            for (let prop in result.customAttributes || {}) {
                let propData = result.customAttributes[prop];
                result['custom'][(propData.name || propData.id).replace(/ /g, '').toLowerCase()] = propData.value;
                result['customNames'][(propData.name || propData.id).replace(/ /g, '').toLowerCase()] = (propData?.selectListArray || false) ? propData.selectListArray[propData.value] : propData.value;
            }
        }
        //console.log('D35E | Roll data', result)
        return result;
    }

    /* -------------------------------------------- */

    static chatListeners(html) {
        html.on('click', '.card-buttons button', ItemChatAction._onChatCardAction.bind(this));
        html.on('click', '.item-name', ItemChatAction._onChatCardToggleContent.bind(this));
    }

    static parseAction(action) {
        let actions = []
        for (let group of action.split(";")) {
            let condition = "";
            let groupAction = group;
            if (group.indexOf(" if ") !== -1) {
                condition = group.split(" if ")[1]
                groupAction = group.split(" if ")[0]
            }
            let actionParts = groupAction.match('([A-Za-z]+) (.*?) on (target|self)')
            if (actionParts !== null)
                actions.push({
                    originalAction: group,
                    action: actionParts[1],
                    condition: condition,
                    parameters: actionParts[2].match(/(?:[^\s"]+|"[^"]*")+/g),
                    body: actionParts[2],
                    target: actionParts[3]
                })
        }
        return actions
    }

    /**
     * Get the Actor which is the author of a chat card
     * @param {HTMLElement} card    The chat card being used
     * @return {Actor|null}         The Actor entity or null
     * @private
     */
    static _getChatCardActor(card) {

        // Case 1 - a synthetic actor from a Token
        const tokenKey = card.dataset.tokenId;
        if (tokenKey) {
            const [sceneId, tokenId] = tokenKey.split(".");
            const scene = game.scenes.get(sceneId);
            if (!scene) return null;
            const tokenData = scene.getEmbeddedDocument("Token", tokenId);
            if (!tokenData) return null;
            const token = new Token(tokenData);
            return token.actor;
        }

        // Case 2 - use Actor ID directory
        const actorId = card.dataset.actorId;
        return game.actors.get(actorId) || null;
    }


    resetPerEncounterUses() {
        if (getProperty(this.data,"data.uses") != null && getProperty(this.data,"data.activation") != null && getProperty(this.data,"data.activation.type") !== "") {
            let itemData = this.data.data
            let updateData = {}
            if (itemData.uses && itemData.uses.per === "encounter" && itemData.uses.value !== itemData.uses.max) {
                updateData["data.uses.value"] = itemData.uses.max;
                this.update(updateData);
            }
        }
    }

    async addElapsedTime(time) {
        if (getProperty(this.data,"data.timeline") !== undefined && getProperty(this.data,"data.timeline") !== null) {
            if (!getProperty(this.data,"data.timeline.enabled"))
                return
            if (!getProperty(this.data,"data.active"))
                return
            if (getProperty(this.data,"data.timeline.elapsed") + time >= getProperty(this.data,"data.timeline.total")) {
                if (!getProperty(this.data,"data.timeline.deleteOnExpiry")) {
                    let updateData = {}
                    updateData["data.active"] = false;
                    await this.update(updateData);
                } else {
                    if (!this.actor) return;
                    await this.actor.deleteOwnedItem(this.id)
                }
            } else {
                let updateData = {}
                updateData["data.timeline.elapsed"] = getProperty(this.data,"data.timeline.elapsed") + time;
                await this.update(updateData);
            }
        }
    }

    getElapsedTimeUpdateData(time) {
        if (getProperty(this.data,"data.timeline") !== undefined && getProperty(this.data,"data.timeline") !== null) {
            if (getProperty(this.data,"data.timeline.enabled") && getProperty(this.data,"data.active")) {
                if (getProperty(this.data,"data.timeline.elapsed") + time >= getProperty(this.data,"data.timeline.total")) {
                    if (!getProperty(this.data,"data.timeline.deleteOnExpiry")) {
                        let updateData = {}
                        updateData["data.active"] = false;
                        updateData["data.timeline.elapsed"] = 0;
                        updateData["_id"] = this._id;
                        return updateData;
                    } else {
                        if (!this.actor) return;
                        if (this.actor.token) {
                            let updateData = {}
                            updateData["data.active"] = false;
                            //updateData["data.timeline.elapsed"] = 0;
                            updateData["_id"] = this._id;
                            updateData["delete"] = true;
                            return updateData;
                        } else
                            return {'_id': this._id, 'delete': true, 'data.active': false};
                    }
                } else {
                    let updateData = {}
                    updateData["data.active"] = true;
                    updateData["data.timeline.elapsed"] = getProperty(this.data,"data.timeline.elapsed") + time;
                    updateData["_id"] = this._id;
                    return updateData;
                }
            }
        }
        if (getProperty(this.data,"data.recharge") !== undefined && getProperty(this.data,"data.recharge") !== null) {
            if (getProperty(this.data,"data.recharge.enabled")) {

                if (getProperty(this.data,"data.recharge.current") - time < 1) {
                    let updateData = {}
                    updateData["data.recharge.current"] = 0;
                    updateData["data.uses.value"] = getProperty(this.data,"data.uses.max");
                    updateData["_id"] = this._id;
                    return updateData;
                } else {
                    let updateData = {}
                    updateData["data.recharge.current"] = getProperty(this.data,"data.recharge.current") - time;
                    updateData["_id"] = this._id;
                    return updateData;
                }

            }
        }
        return {'_id': this._id, 'ignore': true};
    }

    getTimelineTimeLeft() {
        if (getProperty(this.data,"data.timeline") !== undefined && getProperty(this.data,"data.timeline") !== null) {
            if (!getProperty(this.data,"data.timeline.enabled"))
                return -1;
            if (!getProperty(this.data,"data.active"))
                return -1;
            return getProperty(this.data,"data.timeline.total") - this.data.data.timeline.elapsed
        }
        return 0
    }

    getTimelineTimeLeftDescriptive() {
        if (getProperty(this.data,"data.timeline") !== undefined && getProperty(this.data,"data.timeline") !== null) {
            if (!getProperty(this.data,"data.timeline.enabled"))
                return "Indefinite";
            if (!getProperty(this.data,"data.active"))
                return "Not active";
            if (getProperty(this.data,"data.timeline.total") - getProperty(this.data,"data.timeline.elapsed") >= 600) {
                return Math.floor((getProperty(this.data,"data.timeline.total") - getProperty(this.data,"data.timeline.elapsed")) / 600) + "h"
            } else if (getProperty(this.data,"data.timeline.total") - getProperty(this.data,"data.timeline.elapsed") >= 10) {
                return Math.floor((getProperty(this.data,"data.timeline.total") - getProperty(this.data,"data.timeline.elapsed")) / 10) + "min"
            } else if (getProperty(this.data,"data.timeline.total") - getProperty(this.data,"data.timeline.elapsed") > 1)
                return (getProperty(this.data,"data.timeline.total") - getProperty(this.data,"data.timeline.elapsed")) + " rounds"
            return "Last round";
        }
        return "Indefinite"
    }

    /**
     * Updates the spell's description.
     */
    async _updateSpellDescription(updateData, srcData) {
        const data = ItemSpellHelpers.generateSpellDescription(this,srcData);

        linkData(srcData, updateData, "data.description.value", await renderTemplate("systems/D35E/templates/internal/spell-description.html", data));
    }

    async _updateCardDescription(updateData, srcData) {
        const data = this._generateSpellDescription(srcData);

        linkData(srcData, updateData, "data.description.value", await renderTemplate("systems/D35E/templates/internal/spell-description.html", data));
    }





    /* -------------------------------------------- */

    /**
     * Get the Actor which is the author of a chat card
     * @param {HTMLElement} card    The chat card being used
     * @return {Array.<Actor>}      The Actor entity or null
     * @private
     */
    static _getChatCardTargets(card) {
        const character = game.user.character;
        const controlled = canvas.tokens.controlled;
        const targets = controlled.reduce((arr, t) => t.actor ? arr.concat([t.actor]) : arr, []);
        if (character && (controlled.length === 0)) targets.push(character);
        if (!targets.length) throw new Error(`You must designate a specific Token as the roll target`);
        return targets;
    }






    static async toPolymorphBuff(origData, type) {
        let data = duplicate(game.system.template.Item.buff);
        for (let t of data.templates) {
            mergeObject(data, duplicate(game.system.template.Item.templates[t]));
        }
        delete data.templates;
        data = await this.polymorphBuffFromActor(data, origData, type)
        return data;
    }

    static async polymorphBuffFromActor(data, origData,type) {

        data = {
            type: "buff",
            name: origData.name,
            img: origData.img,
            data: data,
        };

        data.data.shapechange = {source: origData, type:type}
        data.data.buffType = "shapechange";
        data.data.sizeOverride = origData.data.traits.size;


        data.data.changes = []
        data.data.changes.push(
            ...(origData.items.find(i => i.type === "class")?.data?.changes || [])
        )
        if (type === "polymorph" || type === "wildshape") {
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.abilities.str.total")}`, "ability", "str", "replace", getProperty(origData, "data.abilities.str.total")]]) // Strength
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.abilities.dex.total")}`, "ability", "dex", "replace", getProperty(origData, "data.abilities.dex.total")]]) // Dexterity
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.abilities.con.total")}`, "ability", "con", "replace", getProperty(origData, "data.abilities.con.total")]]) // Constitution
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.attributes.speed.land.total")}`, "speed", "landSpeed", "replace", getProperty(origData, "data.attributes.speed.land.total")]])
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.attributes.speed.climb.total")}`, "speed", "climbSpeed", "replace", getProperty(origData, "data.attributes.speed.climb.total")]])
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.attributes.speed.swim.total")}`, "speed", "swimSpeed", "replace", getProperty(origData, "data.attributes.speed.swim.total")]])
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.attributes.speed.burrow.total")}`, "speed", "burrowSpeed", "replace", getProperty(origData, "data.attributes.speed.burrow.total")]])
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.attributes.speed.fly.total")}`, "speed", "flySpeed", "replace", getProperty(origData, "data.attributes.speed.fly.total")]])
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.attributes.naturalACTotal")}`, "ac", "nac", "base", getProperty(origData, "data.attributes.naturalACTotal")]])
        }

        data.data.activateActions = []
        if (type === "wildshape") {
            data.data.activateActions = data.data.activateActions.concat([{
                "name": "Activate Wildshape",
                "action": "Condition set wildshaped to true on self",
                "condition": "",
                "img": ""
            },{
                "name": "Set Portrait",
                "action": `Update set data.shapechangeImg to ${origData.data.tokenImg} on self`,
                "condition": "",
                "img": ""
            },{
                "name": "Meld weapons",
                "action": "Set attack * field data.melded to true on self; Set weapon * field data.melded to true on self; Set equipment * field data.melded to true on self",
                "condition": "",
                "img": ""
            }])
        } else if (type === "polymorph") {
            data.data.activateActions = data.data.activateActions.concat([ {
                "name": "Activate Polymorph",
                "action": "Condition set polymorph to true on self",
                "condition": "",
                "img": ""
            },{
                "name": "Set Portrait",
                "action": `Update set data.shapechangeImg to ${origData.data.tokenImg} on self`,
                "condition": "",
                "img": ""
            },{
                "name": "Meld weapons",
                "action": "Set attack:natural * field data.melded to true on self;",
                "condition": "",
                "img": ""
            }])
        } else if (type === "alter-self") {
            data.data.activateActions = data.data.activateActions.concat([{
                "name": "Set Portrait",
                "action": `Update set data.shapechangeImg to ${origData.data.tokenImg} on self`,
                "condition": "",
                "img": ""
            }])
        }

        data.data.deactivateActions = []

        if (type === "wildshape") {
            data.data.deactivateActions = data.data.deactivateActions.concat([{
                "name": "Deactivate Wildshape",
                "action": "Condition set wildshaped to false on self",
                "condition": "",
                "img": ""
            },{
                "name": "Unmeld weapons",
                "action": "Set attack * field data.melded to false on self; Set weapon * field data.melded to false on self; Set equipment * field data.melded to false on self",
                "condition": "",
                "img": ""
            },{
                "name": "Set Portrait",
                "action": `Update set data.shapechangeImg to icons/svg/mystery-man.svg on self`,
                "condition": "",
                "img": ""
            }])
        } else if (type === "polymorph") {
            data.data.deactivateActions = data.data.deactivateActions.concat([ {
                "name": "Deactivate Polymorph",
                "action": "Condition set polymorph to false on self",
                "condition": "",
                "img": ""
            },{
                "name": "Unmeld weapons",
                "action": "Set attack:natural * field data.melded to false on self;",
                "condition": "",
                "img": ""
            },{
                "name": "Set Portrait",
                "action": `Update set data.shapechangeImg to icons/svg/mystery-man.svg on self`,
                "condition": "",
                "img": ""
            }])
        } else if (type === "alter-self") {
            data.data.deactivateActions = data.data.deactivateActions.concat([{
                "name": "Set Portrait",
                "action": `Update set data.shapechangeImg to icons/svg/mystery-man.svg on self`,
                "condition": "",
                "img": ""
            }])
        }

        // Speedlist
        let speedDesc = []
        for (let speedKey of Object.keys(origData.data.attributes.speed)) {
            if (getProperty(origData, `data.attributes.speed.${speedKey}.total`) > 0)
                speedDesc.push(speedKey.charAt(0).toUpperCase() + speedKey.slice(1) + " " + getProperty(origData, `data.attributes.speed.${speedKey}.total`) + " ft.")
        }

        // Set description
        data.data.description.value = await renderTemplate("systems/D35E/templates/internal/shapechange-description.html", {
            size: game.i18n.localize(CONFIG.D35E.actorSizes[origData.data.traits.size]),
            type: origData.data.details.type,
            speed: speedDesc.join(', '),
            str: origData.data.abilities.str.total,
            dex: origData.data.abilities.dex.total,
            con: origData.data.abilities.con.total,
        });
        return data;
    }

    static async toAttack(origData, type) {
        let data = duplicate(game.system.template.Item.attack);
        for (let t of data.templates) {
            mergeObject(data, duplicate(game.system.template.Item.templates[t]));
        }
        delete data.templates;
        data = {
            type: "attack",
            name: origData.name,
            data: data,
        };

        const slcl = ItemSpellHelper.getMinimumCasterLevelBySpellData(origData.data);

        data.name = `${origData.name}`;
        data.img = `${origData.img}`;


        // Set activation method
        data.data.activation.type = "standard";

        // Set measure template
        if (type !== "potion" && type !== "tattoo") {
            data.data.measureTemplate = getProperty(origData, "data.measureTemplate");
        }

        // Set damage formula
        data.data.actionType = origData.data.actionType;
        for (let d of getProperty(origData, "data.damage.parts")) {
            d[0] = d[0].replace(/@sl/g, slcl[0]);
            d[0] = d[0].replace(/@cl/g, slcl[1]);
            data.data.damage.parts.push(d);
        }
        data.data.attackType = "misc"
        // Set saves
        data.data.save.description = origData.data.save.description;
        data.data.save.type = origData.data.save.type;
        data.data.save.ability = origData.data.save.ability;
        data.data.save.dc = 10 + slcl[0] + Math.floor(slcl[0] / 2);

        // Copy variables
        data.data.attackNotes = origData.data.attackNotes;
        data.data.effectNotes = origData.data.effectNotes;
        data.data.attackBonus = origData.data.attackBonus;
        data.data.critConfirmBonus = origData.data.critConfirmBonus;
        data.data.specialActions = origData.data.specialActions;
        data.data.attackCountFormula = origData.data.attackCountFormula.replace(/@cl/g, slcl[1]).replace(/@sl/g, slcl[0]);

        // Determine aura power
        let auraPower = "faint";
        for (let a of CONFIG.D35E.magicAuraByLevel.item) {
            if (a.level <= slcl[1]) auraPower = a.power;
        }
        if (type === "potion") {
            data.img = `systems/D35E/icons/items/potions/generated/${auraPower}.png`;
        }
        // Determine caster level label
        ItemSpellHelper.calculateSpellCasterLevelLabels(slcl);

        // Set description
        data.data.description.value = getProperty(origData, "data.description.value");

        return data;
    }



    static async toTrait(origData, type) {
        let data = duplicate(game.system.template.Item.feat);
        for (let t of data.templates) {
            mergeObject(data, duplicate(game.system.template.Item.templates[t]));
        }
        delete data.templates;
        data = {
            type: "feat",
            name: origData.name,
            data: data,
        };

        const slcl = ItemSpellHelper.getMinimumCasterLevelBySpellData(origData.data);


        data.name = `${origData.name}`;
        data.img = origData.img;

        data.data.featType = "trait";

        data.data.activation.type = "standard";

        data.data.measureTemplate = getProperty(origData, "data.measureTemplate");

        // Set damage formula
        data.data.actionType = origData.data.actionType;
        for (let d of getProperty(origData, "data.damage.parts")) {
            d[0] = d[0].replace(/@sl/g, slcl[0]);
            d[0] = d[0].replace(/@cl/g, "@attributes.hd.total");
            data.data.damage.parts.push(d);
        }

        // Set saves
        data.data.save.description = origData.data.save.description;
        data.data.save.dc = origData.data.save.dc;
        data.data.save.type = origData.data.save.type;

        // Copy variables
        data.data.attackNotes = origData.data.attackNotes;
        data.data.effectNotes = origData.data.effectNotes;
        data.data.attackBonus = origData.data.attackBonus;
        data.data.critConfirmBonus = origData.data.critConfirmBonus;
        data.data.specialActions = origData.data.specialActions;
        data.data.attackCountFormula = origData.data.attackCountFormula.replace(/@cl/g, slcl[1]).replace(/@sl/g, slcl[0]);

        data.data.description.value = getProperty(origData, "data.description.value");

        return data;
    }


    async getEnhancementItem(tag) {
        return this.enhancements.getEnhancementItem(tag)
    }

    async useEnhancementItem(item) {
        await this.enhancements.useEnhancementItem(item)
    }

    async addEnhancementCharges(item, charges) {
        await this.enhancements.addEnhancementCharges(item,charges)
    }

    /*
    ---- Conditional modifiers support
     */
    /**
     * Generates a list of targets this modifier can have.
     * @param {ItemPF} item - The item for which the modifier is to be created.
     * @returns {Object.<string, string>} A list of targets
     */
    getConditionalTargets() {
        let result = {};
        if (this.hasAttack) result["attack"] = game.i18n.localize(CONFIG.D35E.conditionalTargets.attack._label);
        if (this.hasDamage) result["damage"] = game.i18n.localize(CONFIG.D35E.conditionalTargets.damage._label);
        if (this.type === "spell" || this.hasSave)
            result["effect"] = game.i18n.localize(CONFIG.D35E.conditionalTargets.effect._label);
        // Only add Misc target if subTargets are available
        if (Object.keys(this.getConditionalSubTargets("misc")).length > 0) {
            result["misc"] = game.i18n.localize(CONFIG.D35E.conditionalTargets.misc._label);
        }
        return result;
    }

    /**
     * Generates lists of conditional subtargets this attack can have.
     * @param {string} target - The target key, as defined in CONFIG.PF1.conditionTargets.
     * @returns {Object.<string, string>} A list of conditionals
     */
    getConditionalSubTargets(target) {
        let result = {};
        // Add static targets
        if (hasProperty(CONFIG.D35E.conditionalTargets, target)) {
            for (let [k, v] of Object.entries(CONFIG.D35E.conditionalTargets[target])) {
                if (!k.startsWith("_")) result[k] = v;
            }
        }
        // Add subtargets depending on attacks
        if (["attack", "damage"].includes(target)) {
            // Add specific attacks
            if (this.hasAttack) {
                result["attack.0"] = `${game.i18n.localize("D35E.Attack")} 1`;
            }
            if (this.hasMultiAttack) {
                for (let [k, v] of Object.entries(getProperty(this.data,"data.attackParts"))) {
                    result[`attack.${Number(k) + 1}`] = v[1];
                }
            }
        }
        // Add subtargets affecting effects
        if (target === "effect") {
            if (this.data.type === "spell") result["cl"] = game.i18n.localize("D35E.CasterLevel");
            if (this.hasSave) result["dc"] = game.i18n.localize("D35E.DC");
        }
        // Add misc subtargets
        if (target === "misc") {
            // Add charges subTarget with specific label
            if (this.type === "spell" && this.useSpellPoints()) result["charges"] = game.i18n.localize("D35E.SpellPointsCost");
            else if (this.isCharged) result["charges"] = game.i18n.localize("D35E.ChargeCost");
        }
        return result;
    }

    /* Generates lists of conditional modifier bonus types applicable to a formula.
     * @param {string} target - The target key as defined in CONFIG.PF1.conditionTargets.
     * @returns {Object.<string, string>} A list of bonus types.
     * */
    getConditionalModifierTypes(target) {
        let result = {};
        if (target === "attack") {
            // Add bonusModifiers from CONFIG.PF1.bonusModifiers
            for (let [k, v] of Object.entries(CONFIG.D35E.bonusModifiers)) {
                result[k] = v;
            }
        }
        if (target === "damage") {
            for (let [k, v] of CACHE.DamageTypes.entries()) {
                result[k] = v.data.name;
            }
        }
        return result;
    }

    /* Generates a list of critical applications for a given formula target.
     * @param {string} target - The target key as defined in CONFIG.D35E.conditionalTargets.
     * @returns {Object.<string, string>} A list of critical applications.
     * */
    getConditionalCritical(target) {
        let result = {};
        // Attack bonuses can only apply as critical confirm bonus
        if (target === "attack") {
            result = { ...result, normal: "D35E.Normal"};
        }
        // Damage bonuses can be multiplied or not
        if (target === "damage") {
            result = { ...result, normal: "D35E.Normal" };
        }
        return result;
    }
    static get defaultConditional() {
        return {
            default: false,
            name: "",
            modifiers: [],
        };
    }

    static get defaultConditionalModifier() {
        return {
            formula: "",
            target: "",
            subTarget: "",
            type: "",
            critical: "",
        };
    }

    useSpellPoints() {
        if (!this.actor) return false;
        if (getProperty(this.data,"data.atWill")) return false;

        const spellbook = getProperty(this.actor.data, `data.attributes.spells.spellbooks.${this.data.data.spellbook}`);
        return spellbook.usePowerPoints;
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
        const packItem = await game.packs.find(p => p.collection === packName).getDocument(packId);
        if (packItem != null) {
            itemData = packItem.data
            itemData.data.enh = enhValue;
            ItemPF.setEnhItemPrice(itemData)
            return await this.enhancements.getEnhancementFromData(itemData)
        }

    }

    static setEnhItemPrice(item) {
        {
            let rollData = {};
            if (this.actor != null) rollData = this.actor.getRollData();
            rollData.enhancement = item.data.enh;
            if (item.data.enhIncreaseFormula !== undefined && item.data.enhIncreaseFormula !== null && item.data.enhIncreaseFormula !== "") {
                item.data.enhIncrease = new Roll35e(item.data.enhIncreaseFormula, rollData).roll().total;
            }
        }
        {
            let rollData = {};
            if (this.actor != null) rollData = this.actor.getRollData();
            rollData.enhancement = item.data.enh;
            rollData.enhIncrease = item.data.enhIncrease;
            if (item.data.priceFormula !== undefined && item.data.priceFormula !== null && item.data.priceFormula !== "") {
                item.data.price = new Roll35e(item.data.priceFormula, rollData).roll().total;
            }
        }
    }

    async addLinkedItemFromData(itemData) {
        return this.update(await this.getLinkDataFromData(itemData))
    }

    async getLinkDataFromData(itemData) {
        const updateData = {};
        let _linkedItems = duplicate(getProperty(this.data, `data.linkedItems`) || []);
        let linkedData = {};
        linkedData.name = itemData.name;
        linkedData.img = itemData.img;
        linkedData.itemId = itemData._id;
        linkedData.packId = itemData.document.pack;
        _linkedItems.push(linkedData);
        updateData[`data.linkedItems`] = _linkedItems;
        return updateData
    }

    updateMagicItemName(updateData, _enhancements, force = false, useIdentifiedName = false) {
        if ((getProperty(this.data,"data.enhancements") !== undefined && getProperty(this.data,"data.enhancements.automation") !== undefined && getProperty(this.data,"data.enhancements.automation") !== null) || force) {
            if (getProperty(this.data,"data.enhancements.automation.updateName") || force) {
                let baseName = useIdentifiedName && getProperty(this.data,"data.identifiedName") || getProperty(this.data,"data.unidentified.name") 
                if (getProperty(this.data,"data.unidentified.name") === '') {
                    updateData[`data.unidentified.name`] = this.name;
                    baseName = this.name
                }
                updateData[`data.identifiedName`] = this.buildName(baseName, _enhancements)
            }
        }
    }

    updateMagicItemProperties(updateData, _enhancements, force = false) {
        if ((getProperty(this.data,"data.enhancements") !== undefined && getProperty(this.data,"data.enhancements.automation") !== undefined && getProperty(this.data,"data.enhancements.automation") !== null) || force) {
            if (getProperty(this.data,"data.enhancements.automation.updateName") || force) {
                let basePrice = this.data.data.unidentified.price
                if (!getProperty(this.data,"data.unidentified.price")) {
                    updateData[`data.unidentified.price`] = getProperty(this.data,"data.price");
                    basePrice = this.data.data.price
                }
                updateData[`data.price`] = this.buildPrice(basePrice, _enhancements)
            }
        }
    }

    buildName(name, enhancements) {
        let prefixes = []
        let suffixes = []
        let totalEnchancement = 0;
        for (const obj of enhancements) {
            if (obj.data.nameExtension !== undefined && obj.data.nameExtension !== null) {
                if (obj.data.nameExtension.prefix !== null && obj.data.nameExtension.prefix.trim() !== "") prefixes.push(obj.data.nameExtension.prefix.trim())
                if (obj.data.nameExtension.suffix !== null && obj.data.nameExtension.suffix.trim() !== "") suffixes.push(obj.data.nameExtension.suffix.trim())
            }

            if (obj.data.enhancementType === "weapon" && this.type === 'weapon')
                if (!obj.data.enhIsLevel)
                    totalEnchancement += obj.data.enh
            if (obj.data.enhancementType === "armor" && this.type === 'equipment')
                if (!obj.data.enhIsLevel)
                    totalEnchancement += obj.data.enh
        }
        let enhSuffix = ''
        let ofSuffix = ''
        if (totalEnchancement > 0)
            enhSuffix = ` +${totalEnchancement}`
        if (suffixes.length > 0) {
            ofSuffix = ` of ${suffixes.join(' and ').trim()}`
        }
        return `${prefixes.join(' ')} ${name}${ofSuffix}`.trim() + `${enhSuffix}`
    }

    buildPrice(basePrice, enhancements) {
        let totalPrice = basePrice;
        let totalEnchancementIncrease = 0;
        let totalEnchancement = 0;
        let maxSingleEnhancementIncrease = 0;
        let flatPrice = 0;
        for (const obj of enhancements) {
            if (obj.data.enhancementType === "weapon" && this.type === 'weapon') {
                totalEnchancementIncrease += obj.data.enhIncrease
                if (!obj.data.enhIsLevel)
                    totalEnchancement += obj.data.enh
                flatPrice += obj.data.price
                maxSingleEnhancementIncrease = Math.max(obj.data.enhIncrease, maxSingleEnhancementIncrease)
            }
            if (obj.data.enhancementType === "armor" && this.type === 'equipment') {
                totalEnchancementIncrease += obj.data.enhIncrease
                if (!obj.data.enhIsLevel)
                    totalEnchancement += obj.data.enh
                flatPrice += obj.data.price
                maxSingleEnhancementIncrease = Math.max(obj.data.enhIncrease, maxSingleEnhancementIncrease)
            }
            if (obj.data.enhancementType === "misc") {
                totalEnchancementIncrease += obj.data.enhIncrease
                flatPrice += obj.data.price
                maxSingleEnhancementIncrease = Math.max(obj.data.enhIncrease, maxSingleEnhancementIncrease)
            }
        }
        let useEpicPricing = false
        if (maxSingleEnhancementIncrease > 5 || totalEnchancement > 5)
            useEpicPricing = true
        // Base price for weapon
        if (this.type === 'weapon') {
            if (totalEnchancementIncrease > 0)
                totalPrice += 300
            if (!useEpicPricing)
                totalPrice += totalEnchancementIncrease * totalEnchancementIncrease * 2000 + flatPrice
            else
                totalPrice += totalEnchancementIncrease * totalEnchancementIncrease * 2000 * 10 + 10 * flatPrice
        } else if (this.type === 'equipment') {
            if (totalEnchancementIncrease > 0)
                totalPrice += 150
            if (!useEpicPricing)
                totalPrice += totalEnchancementIncrease * totalEnchancementIncrease * 1000 + flatPrice
            else
                totalPrice += totalEnchancementIncrease * totalEnchancementIncrease * 1000 * 10 + 10 * flatPrice
        }

        return totalPrice;
    }

 

    getRawEffectData() {
        const createData = { label: this.name, name: this.name, icon: this.img, origin: this.uuid, disabled: this.type === "aura" ? false : !getProperty(this.data,"data.active") };
        if (this.type === "buff")
            createData["flags.D35E.show"] = !getProperty(this.data,"data.hideFromToken") && !game.settings.get("D35E", "hideTokenConditions");
        if (this.type === "aura")
            createData["flags.D35E.show"] = !getProperty(this.data,"data.hideFromToken") && !game.settings.get("D35E", "hideTokenConditions");
        return createData;
      }
    

    async renderBuffEndChatCard() {
        const chatTemplate = "systems/D35E/templates/chat/roll-ext.html";

        // Create chat data
        let chatData = {
            user: game.user.id,
            type: CONST.CHAT_MESSAGE_TYPES.CHAT,
            sound: CONFIG.sounds.dice,
            speaker: ChatMessage.getSpeaker({actor: this.actor}),
            rollMode: game.settings.get("core", "rollMode"),
            content: await renderTemplate(chatTemplate, {item: this, actor: this.actor}),
        };
        // Handle different roll modes
        switch (chatData.rollMode) {
            case "gmroll":
                chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u._id);
                break;
            case "selfroll":
                chatData["whisper"] = [game.user.id];
                break;
            case "blindroll":
                chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u._id);
                chatData["blind"] = true;
        }

        // Send message
        await createCustomChatMessage("systems/D35E/templates/chat/deactivate-buff.html", {items: [this], actor: this.actor}, chatData,  {rolls: []})
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    hasUnmetRequirements(rollData) {
        if (!rollData) {
            if (!this.actor) return []; //There are no requirements when item has no actor!
            rollData = this.actor.getRollData();
        }
        let unmetRequirements = []
        rollData.item = this.getRollData();
        for (const _requirement of getProperty(this.data,"data.requirements") || []) {
            if (_requirement[2] === "generic") {
                if (!(new Roll35e(_requirement[1], rollData).roll().total)){
                    unmetRequirements.push(_requirement[0])
                }
            } else if (_requirement[2] === "feat") {
                if (!this.actor.getItemByTag(_requirement[1])) {
                    unmetRequirements.push(_requirement[0])
                }
            } else if (_requirement[2] === "bab") {
                if (rollData.attributes.bab.total < parseInt(_requirement[1])) {

                    unmetRequirements.push(_requirement[0] || (game.i18n.localize("D35E.BAB") + " " + _requirement[1]))
                }
            } else {
                if (_requirement[2] && rollData.abilities[_requirement[2]].value < parseInt(_requirement[1])) {

                    unmetRequirements.push(_requirement[0] || (game.i18n.localize(`D35E.Ability${this.capitalizeFirstLetter(_requirement[2])}`) + " " + _requirement[1]))
                }
            }
        }
        return unmetRequirements;
    }



    async addSpellToClassSpellbook(level, spell) {
        const updateData = {};
        let _spellbook = duplicate(this.data.data?.spellbook|| []);
        let _spells = _spellbook[level]?.spells || []
        for (let _spell of _spells) {
            if (_spell.id === spell.id) return;
        }
        _spells.push(spell);
        updateData[`data.spellbook`] = _spellbook;
        await this.update(updateData);
    }

    async deleteSpellFromClassSpellbook(level, spellId) {
        const updateData = {};
        let _spellbook = duplicate(this.data.data?.spellbook|| []);
        let _spells = (_spellbook[level]?.spells || []).filter(_spell => _spell.id !== spellId)
        _spellbook[level].spells = _spells;
        updateData[`data.spellbook`] = _spellbook;
        await this.update(updateData);
    }

}
