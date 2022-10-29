import { ItemSheetComponent } from "./itemSheetComponent.js";

/***
 * Provides support for Changes Tab on an item
 */
export class ChangesSheetComponent extends ItemSheetComponent {

    registerTab(sheetData) {
        sheetData.registeredTabs.push({id:'changes',name:"Changes",sheet:'systems/D35E/templates/items/parts/item-changes.html'})
    }

    activateListeners(html) {
        // Modify buff changes
        html.find(".change-control").click(this.#onChangeControl.bind(this));
        html.find(".combat-change-control").click(this.#onCombatChangeControl.bind(this));
        html.find(".requirement-control").click(this.#onRequirementsControl.bind(this));
        html.find(".creation-changes-control").click(this.#onCreationChangesControl.bind(this));
        html.find(".resistance-control").click(this.#onResistanceControl.bind(this));
        html.find(".dr-control").click(this.#onDRControl.bind(this));
    }

    prepareSheetData(sheetData) {
        // Prepare stuff for items with changes
        let firstChange = true;
        if (this.sheet.item.system.changes) {
            sheetData.changes = {targets: {}, modifiers: CONFIG.D35E.bonusModifiers};
            for (let [k, v] of Object.entries(CONFIG.D35E.buffTargets)) {
                if (typeof v === "object") sheetData.changes.targets[k] = v._label;
            }
            sheetData.data.system.changes.forEach(item => {
                item.subTargets = {};
                // Add specific skills
                if (item[1] === "skill") {
                    if (this.sheet.item.actor != null) {
                        const actorSkills = this.sheet.item.actor.system.skills;
                        for (let [s, skl] of Object.entries(actorSkills)) {
                            if (!skl.subSkills) {
                                if (skl.custom) item.subTargets[`skill.${s}`] = skl.name;
                                else item.subTargets[`skill.${s}`] = CONFIG.D35E.skills[s];
                            } else {
                                for (let [s2, skl2] of Object.entries(skl.subSkills)) {
                                    item.subTargets[`skill.${s}.subSkills.${s2}`] = `${CONFIG.D35E.skills[s]} (${skl2.name})`;
                                }
                            }
                        }
                    } else {
                        for (let [s, skl] of Object.entries(CONFIG.D35E.skills)) {
                            if (!skl.subSkills) {
                                if (skl.custom) item.subTargets[`skill.${s}`] = skl.name;
                                else item.subTargets[`skill.${s}`] = CONFIG.D35E.skills[s];
                            } else {
                                for (let [s2, skl2] of Object.entries(skl.subSkills)) {
                                    item.subTargets[`skill.${s}.subSkills.${s2}`] = `${CONFIG.D35E.skills[s]} (${skl2.name})`;
                                }
                            }
                        }
                    }
                } else if (item[1] === "spells") {
                    //  "spells.spellbooks.primary.spells.spell1.bonus": "Level 1",
                    for (let spellbook of ["primary", "secondary", "tetriary", "spelllike"]) {
                        for (let level = 0; level < 10; level++)
                            item.subTargets[`spells.spellbooks.${spellbook}.spells.spell${level}.bonus`] = game.i18n.localize("D35E.BuffSpellbookSpellsPreparedLevel").format(spellbook, level);
                    }
                }
                // Add static targets
                else if (item[1] != null && CONFIG.D35E.buffTargets.hasOwnProperty(item[1])) {
                    for (let [k, v] of Object.entries(CONFIG.D35E.buffTargets[item[1]])) {
                        if (!k.startsWith("_")) item.subTargets[k] = v;
                    }
                }
                if (firstChange) {
                    firstChange = false;
                    sheetData.firstChangeName =  sheetData.changes.targets[item[1]];
                    sheetData.firstItemSubtargets = item.subTargets;
                    sheetData.selectedFirstChange = item[2] + ":" + sheetData.firstItemSubtargets[item[2]]
                }
            });
        }
    }

    updateForm(formData) {
        // Handle change array
        let change = Object.entries(formData).filter(e => e[0].startsWith("system.changes"));
        formData["system.changes"] = change.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);

        let changes = Object.entries(formData).filter(e => e[0].startsWith("system.combatChanges"));
        formData["system.combatChanges"] = changes.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);


        let requirements = Object.entries(formData).filter(e => e[0].startsWith("system.requirements"));
        formData["system.requirements"] = requirements.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);


        let creationChanges = Object.entries(formData).filter(e => e[0].startsWith("system.creationChanges"));
        formData["system.creationChanges"] = creationChanges.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);

        let resistances = Object.entries(formData).filter(e => e[0].startsWith("system.resistances"));
        formData["system.resistances"] = resistances.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);

        let damageReduction = Object.entries(formData).filter(e => e[0].startsWith("system.damageReduction"));
        formData["system.damageReduction"] = damageReduction.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);

    }


    async #onCombatChangeControl(event) {
        event.preventDefault();
        const a = event.currentTarget;

        // Add new change
        if (a.classList.contains("add-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const changes =this.sheet.item.system.combatChanges || [];
            // Combat Changes are
            await this.sheet.item.update({"data.combatChanges": changes.concat([["", "", "", "", "", ""]])});
        }

        // Remove a change
        if (a.classList.contains("delete-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const li = a.closest(".change");
            const changes = duplicate(this.sheet.item.system.combatChanges);
            changes.splice(Number(li.dataset.change), 1);
            await this.sheet.item.update({"data.combatChanges": changes});
        }
    }

    async #onCreationChangesControl(event) {
        event.preventDefault();
        const a = event.currentTarget;

        // Add new change
        if (a.classList.contains("add-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const changes = duplicate(this.sheet.item.system.creationChanges) || [];
            // Combat Changes are
            return this.sheet.item.update({"data.creationChanges": changes.concat([["", ""]])});
        }

        // Remove a change
        if (a.classList.contains("delete-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const li = a.closest(".change");
            const changes = duplicate(this.sheet.item.system.creationChanges);
            changes.splice(Number(li.dataset.change), 1);
            return this.sheet.item.update({"data.creationChanges": changes});
        }
    }

    async #onRequirementsControl(event) {
        event.preventDefault();
        const a = event.currentTarget;

        // Add new change
        if (a.classList.contains("add-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const changes = duplicate(this.sheet.item.system.requirements) || [];
            // Combat Changes are
            return this.sheet.item.update({"data.requirements": changes.concat([["", "", ""]])});
        }

        // Remove a change
        if (a.classList.contains("delete-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const li = a.closest(".change");
            const changes = duplicate(this.sheet.item.system.requirements);
            changes.splice(Number(li.dataset.change), 1);
            return this.sheet.item.update({"data.requirements": changes});
        }
    }

    async #onResistanceControl(event) {
        event.preventDefault();
        const a = event.currentTarget;

        // Add new change
        if (a.classList.contains("add-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const changes = duplicate(this.sheet.item.system.resistances) || [];
            // Combat Changes are
            return this.sheet.item.update({"data.resistances": changes.concat([["", "", false, false, false]])});
        }

        // Remove a change
        if (a.classList.contains("delete-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const li = a.closest(".change");
            const changes = duplicate(this.sheet.item.system.resistances);
            changes.splice(Number(li.dataset.change), 1);
            return this.sheet.item.update({"data.resistances": changes});
        }
    }

    async #onDRControl(event) {
        event.preventDefault();
        const a = event.currentTarget;

        // Add new change
        if (a.classList.contains("add-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const changes = duplicate(this.sheet.item.system.damageReduction) || [];
            // Combat Changes are
            return this.sheet.item.update({"data.damageReduction": changes.concat([["", "", false]])});
        }

        // Remove a change
        if (a.classList.contains("delete-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const li = a.closest(".change");
            const changes = duplicate(this.sheet.item.system.damageReduction);
            changes.splice(Number(li.dataset.change), 1);
            return this.sheet.item.update({"data.damageReduction": changes});
        }
    }

    async #onChangeControl(event) {
        event.preventDefault();
        const a = event.currentTarget;

        // Add new change
        if (a.classList.contains("add-change")) {
            //console.log('AAAAAITEM', this.sheet.item);
            let _changes = duplicate(this.sheet.item.system.changes) || [];
            return this.sheet.item.update({"data.changes": _changes.concat([["", "", "", "", 0]])});
        }

        // Remove a change
        if (a.classList.contains("delete-change")) {
            //await this._onSubmit(event);
            const li = a.closest(".change");
            const changes = duplicate(this.sheet.item.system.changes);
            changes.splice(Number(li.dataset.change), 1);
            return this.sheet.item.update({"data.changes": changes});
        }
    }
}
