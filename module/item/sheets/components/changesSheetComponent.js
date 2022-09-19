import { ItemSheetComponent } from "./itemSheetComponent";

/***
 * Provides support for Changes Tab on an item
 */
export class ChangesSheetComponent extends ItemSheetComponent {
    
    prepareSheetData(sheetData) {
        // Prepare stuff for items with changes
        let firstChange = true;
        if (this.item.system.changes) {
            sheetData.changes = {targets: {}, modifiers: CONFIG.D35E.bonusModifiers};
            for (let [k, v] of Object.entries(CONFIG.D35E.buffTargets)) {
                if (typeof v === "object") sheetData.changes.targets[k] = v._label;
            }
            this.item.system.changes.forEach(item => {
                item.subTargets = {};
                // Add specific skills
                if (item[1] === "skill") {
                    if (this.item.actor != null) {
                        const actorSkills = this.item.actor.system.skills;
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

        if (this.item.system.contextNotes) {
            sheetData.contextNotes = {targets: {}};
            for (let [k, v] of Object.entries(CONFIG.D35E.contextNoteTargets)) {
                if (typeof v === "object") sheetData.contextNotes.targets[k] = v._label;
            }
            this.item.system.contextNotes.forEach(item => {
                item.subNotes = {};
                // Add specific skills
                if (item[1] === "skill") {
                    if (this.item.actor != null) {
                        const actorSkills = this.item.actor.system.skills;
                        for (let [s, skl] of Object.entries(actorSkills)) {
                            if (!skl.subSkills) {
                                if (skl.custom) item.subNotes[`skill.${s}`] = skl.name;
                                else item.subNotes[`skill.${s}`] = CONFIG.D35E.skills[s];
                            } else {
                                for (let [s2, skl2] of Object.entries(skl.subSkills)) {
                                    item.subNotes[`skill.${s}.subSkills.${s2}`] = `${CONFIG.D35E.skills[s]} (${skl2.name})`;
                                }
                            }
                        }
                    } else {
                        for (let [s, skl] of Object.entries(CONFIG.D35E.skills)) {
                            if (!skl.subSkills) {
                                if (skl.custom) item.subNotes[`skill.${s}`] = skl.name;
                                else item.subNotes[`skill.${s}`] = CONFIG.D35E.skills[s];
                            } else {
                                for (let [s2, skl2] of Object.entries(skl.subSkills)) {
                                    item.subNotes[`skill.${s}.subSkills.${s2}`] = `${CONFIG.D35E.skills[s]} (${skl2.name})`;
                                }
                            }
                        }
                    }
                    
                }
                // Add static targets
                else if (item[1] != null && CONFIG.D35E.contextNoteTargets.hasOwnProperty(item[1])) {
                    for (let [k, v] of Object.entries(CONFIG.D35E.contextNoteTargets[item[1]])) {
                        if (!k.startsWith("_")) item.subNotes[k] = v;
                    }
                }
            });
        }
    }
}