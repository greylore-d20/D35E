import {ItemSpellHelper} from "../helpers/itemSpellHelper.js";

export class ItemEnhancementConverter {
    static async toEnhancement(origData, type, cl) {
        let data = duplicate(game.system.template.Item.enhancement);
        for (let t of data.templates) {
            mergeObject(data, duplicate(game.system.template.Item.templates[t]));
        }
        delete data.templates;
        data = {
            type: "enhancement",
            name: origData.name,
            data: data,
        };

        const slcl = ItemSpellHelper.getMinimumCasterLevelBySpellData(origsystem);
        system.enhancementType = "misc";

        // Set name
        data.name = `${origData.name}`;
        data.img = origData.img;
        data.id = origData._id
        if (type === 'command' || type === 'use') {
            system.uses.per = "day";
            system.uses.maxFormula = "1";
            system.uses.value = 1;
            system.uses.max = 1;
        } else {
            system.uses.per = "charges";
            system.uses.maxFormula = "50";
            system.uses.value = 50;
            system.uses.max = 50;
        }

        system.uses.chargesPerUse = 1


        system.baseCl = slcl[1]
        system.enhIncreaseFormula = ""
        system.priceFormula = ""
        system.price = 0

        system.isFromSpell = true;

        // Set activation method
        system.activation.type = "standard";

        system.measureTemplate = getProperty(origData, "data.measureTemplate");


        // Set damage formula
        system.actionType = origsystem.actionType;
        for (let d of getProperty(origData, "data.damage.parts")) {
            d[0] = d[0].replace(/@sl/g, slcl[0]);
            system.damage.parts.push(d);
        }

        // Set saves
        system.save.description = origsystem.save.description;
        system.save.type = origsystem.save.type;
        system.save.ability = origsystem.save.ability;
        system.save.dc = 10 + slcl[0] + Math.floor(slcl[0] / 2);

        // Copy variables
        system.attackNotes = origsystem.attackNotes;
        system.effectNotes = origsystem.effectNotes;
        system.attackBonus = origsystem.attackBonus;
        system.critConfirmBonus = origsystem.critConfirmBonus;
        system.specialActions = origsystem.specialActions;
        system.attackCountFormula = origsystem.attackCountFormula;

        // Determine aura power
        let auraPower = "faint";
        for (let a of CONFIG.D35E.magicAuraByLevel.item) {
            if (a.level <= slcl[1]) auraPower = a.power;
        }
        ItemSpellHelper.calculateSpellCasterLevelLabels(slcl);

        // Set description
        system.description.value = getProperty(origData, "data.description.value");

        return data;
    }

    static async toEnhancementBuff(origData) {
        let data = duplicate(game.system.template.Item.enhancement);
        for (let t of data.templates) {
            mergeObject(data, duplicate(game.system.template.Item.templates[t]));
        }
        delete data.templates;
        data = {
            type: "enhancement",
            name: origData.name,
            data: data,
        };


        system.enhancementType = "misc";

        // Set name
        data.name = `${origData.name}`;
        data.img = origData.img;
        data.id = origData._id

        system.isFromBuff = true;

        system.enh = 1
        system.enhIncreaseFormula = ""
        system.priceFormula = ""
        system.price = 0


        system.changes = origsystem.changes;
        for (const c of system.changes) {
            c[0] = c[0].replace(new RegExp('@item.level', 'g'), '@enhancement');
        }
        system.contextNotes = origsystem.contextNotes;
        for (const c of system.contextNotes) {
            c[0] = c[0].replace(new RegExp('@item.level', 'g'), '@enhancement');
        }


        system.description.value = getProperty(origData, "data.description.value");

        return data;
    }
}
