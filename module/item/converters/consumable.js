import {ItemSpellHelper} from "../helpers/itemSpellHelper.js";

export class ItemConsumableConverter {
    static async toConsumable(origData, type, cl, scrollType) {
        let data = duplicate(game.system.template.Item.consumable);
        for (let t of data.templates) {
            mergeObject(data, duplicate(game.system.template.Item.templates[t]));
        }
        delete data.templates;
        data = {
            type: "consumable",
            name: origData.name,
            data: data,
        };

        const slcl = ItemSpellHelper.getMinimumCasterLevelBySpellData(origData.data);
        if (cl) slcl[1] = cl;
        // Set consumable type
        data.data.consumableType = type;

        // Set name
        if (type === "wand") {
            data.name = `Wand of ${origData.name}`;
            data.img = "systems/D35E/icons/items/magic/generated/wand-low.png";
            data.data.price = Math.max(0.5, slcl[0]) * slcl[1] * 750;
            data.data.hardness = 5;
            data.data.hp.max = 5;
            data.data.hp.value = 5;
        } else if (type === "potion") {
            data.name = `Potion of ${origData.name}`;
            data.img = "systems/D35E/icons/items/potions/generated/med.png";
            data.data.price = Math.max(0.5, slcl[0]) * slcl[1] * 50;
            data.data.hardness = 1;
            data.data.hp.max = 1;
            data.data.hp.value = 1;
        } else if (type === "scroll") {
            data.name = `Scroll of ${origData.name}`;
            data.img = "systems/D35E/icons/items/magic/generated/scroll.png";
            data.data.price = Math.max(0.5, slcl[0]) * slcl[1] * 25;
            data.data.hardness = 0;
            data.data.hp.max = 1;
            data.data.hp.value = 1;
        } else if (type === "dorje") {
            data.name = `Dorje of ${origData.name}`;
            data.img = "systems/D35E/icons/items/magic/generated/droje.png";
            data.data.price = Math.max(0.5, slcl[0]) * slcl[1] * 750;
            data.data.hardness = 5;
            data.data.hp.max = 5;
            data.data.hp.value = 5;
        } else if (type === "tattoo") {
            data.name = `Tattoo of ${origData.name}`;
            data.img = "systems/D35E/icons/items/magic/generated/tattoo.png";
            data.data.price = Math.max(0.5, slcl[0]) * slcl[1] * 50;
            data.data.hardness = 1;
            data.data.hp.max = 1;
            data.data.hp.value = 1;
        } else if (type === "powerstone") {
            data.name = `Power Stone of ${origData.name}`;
            data.img = "systems/D35E/icons/items/magic/generated/crystal.png";
            data.data.price = Math.max(0.5, slcl[0]) * slcl[1] * 25;
            data.data.hardness = 0;
            data.data.hp.max = 1;
            data.data.hp.value = 1;
        }


        // Set charges
        if (type === "wand" || type === "dorje") {
            data.data.uses.maxFormula = "50";
            data.data.uses.value = 50;
            data.data.uses.max = 50;
            data.data.uses.per = "charges";
        } else {
            data.data.uses.per = "single";
        }

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
            data.data.damage.parts.push(d);
        }

        // Set saves
        data.data.save.description = origData.data.save.description;
        data.data.save.type = origData.data.save.type;
        data.data.save.ability = origData.data.save.ability;
        data.data.save.dc = 10 + slcl[0] + Math.floor(slcl[0] / 2);
        data.data.baseCl = `${slcl[1]}`
        data.data.sr = origData.data.sr
        data.data.pr = origData.data.pr
        // Copy variables
        if (scrollType)
            data.data.scrollType = scrollType;
        data.data.attackNotes = origData.data.attackNotes;
        data.data.actionType = origData.data.actionType;
        data.data.effectNotes = origData.data.effectNotes;
        data.data.attackBonus = origData.data.attackBonus;
        data.data.critConfirmBonus = origData.data.critConfirmBonus;
        data.data.specialActions = origData.data.specialActions;
        data.data.isFromSpell = true;


        data.data.attackCountFormula = origData.data.attackCountFormula.replace(/@sl/g, slcl[0]);

        // Determine aura power
        let auraPower = "faint";
        for (let a of CONFIG.D35E.magicAuraByLevel.item) {
            if (a.level <= slcl[1]) auraPower = a.power;
        }
        if (type === "potion") {
            data.img = `systems/D35E/icons/items/potions/generated/${auraPower}.png`;
        }
        // Determine caster level label
        let slClLabels = ItemSpellHelper.calculateSpellCasterLevelLabels(slcl);
        let clLabel = slClLabels.clLabel;
        let slLabel = slClLabels.slLabel;


        // Set description
        data.data.description.value = await renderTemplate("systems/D35E/templates/internal/consumable-description.html", {
            origData: origData,
            data: data,
            isWand: type === "wand" || type === "dorje",
            isPotion: type === "potion" || type === "tattoo",
            isScroll: type === "scroll" || type === "powerstone",
            auraPower: auraPower,
            aura: (CONFIG.D35E.spellSchools[origData.data.school] || "").toLowerCase(),
            sl: slcl[0],
            cl: slcl[1],
            slLabel: slLabel,
            clLabel: clLabel,
            config: CONFIG.D35E,
        });



        return data;
    }
}
