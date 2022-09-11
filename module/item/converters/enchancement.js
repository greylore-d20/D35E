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

        const slcl = ItemSpellHelper.getMinimumCasterLevelBySpellData(origData.data);
        data.data.enhancementType = "misc";

        // Set name
        data.name = `${origData.name}`;
        data.img = origData.img;
        data.id = origData._id
        if (type === 'command' || type === 'use') {
            data.data.uses.per = "day";
            data.data.uses.maxFormula = "1";
            data.data.uses.value = 1;
            data.data.uses.max = 1;
        } else {
            data.data.uses.per = "charges";
            data.data.uses.maxFormula = "50";
            data.data.uses.value = 50;
            data.data.uses.max = 50;
        }

        data.data.uses.chargesPerUse = 1


        data.data.baseCl = slcl[1]
        data.data.enhIncreaseFormula = ""
        data.data.priceFormula = ""
        data.data.price = 0

        data.data.isFromSpell = true;

        // Set activation method
        data.data.activation.type = "standard";

        data.data.measureTemplate = getProperty(origData, "data.measureTemplate");


        // Set damage formula
        data.data.actionType = origData.data.actionType;
        for (let d of getProperty(origData, "data.damage.parts")) {
            d[0] = d[0].replace(/@sl/g, slcl[0]);
            data.data.damage.parts.push(d);
        }

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
        data.data.attackCountFormula = origData.data.attackCountFormula;

        // Determine aura power
        let auraPower = "faint";
        for (let a of CONFIG.D35E.magicAuraByLevel.item) {
            if (a.level <= slcl[1]) auraPower = a.power;
        }
        ItemSpellHelper.calculateSpellCasterLevelLabels(slcl);

        // Set description
        data.data.description.value = getProperty(origData, "data.description.value");

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


        data.data.enhancementType = "misc";

        // Set name
        data.name = `${origData.name}`;
        data.img = origData.img;
        data.id = origData._id

        data.data.isFromBuff = true;

        data.data.enh = 1
        data.data.enhIncreaseFormula = ""
        data.data.priceFormula = ""
        data.data.price = 0


        data.data.changes = origData.data.changes;
        for (const c of data.data.changes) {
            c[0] = c[0].replace(new RegExp('@item.level', 'g'), '@enhancement');
        }
        data.data.contextNotes = origData.data.contextNotes;
        for (const c of data.data.contextNotes) {
            c[0] = c[0].replace(new RegExp('@item.level', 'g'), '@enhancement');
        }


        data.data.description.value = getProperty(origData, "data.description.value");

        return data;
    }
}
