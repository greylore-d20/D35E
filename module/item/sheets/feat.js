
import {ItemSheetPF} from "./base.js";
import {LinkedItemsSheetComponent} from "./components/linkedItemsSheetComponent.js";

export class FeatSheet35E extends ItemSheetPF {
    constructor(...args) {
        super(...args);

        this.sheetComponents.push(new LinkedItemsSheetComponent(this));
    }

    async getData() {
        let sheetData = await super.getData();
        sheetData.isClassFeature = true; //Any feat can be a class feature
        if (this.item.system.featType === 'spellSpecialization')
            sheetData.isSpellSpecialization = true;
        sheetData.isFeat = this.item.system.featType === "feat"
        sheetData.hasCombatChanges = true;
        sheetData.hasRequirements = true;
        sheetData.featCounters = []
        if (this.item.actor) {
            for (let [a, s] of Object.entries(this.item.actor.system.counters.feat || [])) {
                if (a === "base") continue;
                sheetData.featCounters.push({name: a.charAt(0).toUpperCase() + a.substr(1).toLowerCase(), val: a})
            }
        }
        return sheetData;
    }
}
