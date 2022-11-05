import { createTabs, uuidv4 } from "../../lib.js";
import { EntrySelector } from "../../apps/entry-selector.js";
import { Item35E } from "../entity.js";
import { CACHE } from "../../cache.js";
import { isMinimumCoreVersion } from "../../lib.js";
import { DamageTypes } from "../../damage-types.js";
import { createTag } from "../../lib.js";

import { Roll35e } from "../../roll.js";
import { ItemEnhancementHelper } from "../helpers/itemEnhancementHelper.js";
import { ItemSheetComponent } from "./components/itemSheetComponent.js";
import { ChangesSheetComponent } from "./components/changesSheetComponent.js";
import { EnhancementSheetComponent } from "./components/enhancementSheetComponent.js";
import { NotesSheetComponent } from "./components/notesSheetComponent.js";

/**
 * Override and extend the core ItemSheet implementation to handle D&D5E specific item types
 * @type {ItemSheet}
 */
export class ItemSheetPF extends ItemSheet {
  constructor(...args) {
    super(...args);

    this.options.submitOnClose = false;

    /**
     * Track the set of item filters which are applied
     * @type {Set}
     */
    this._filters = {};
    this._filters = {};

    this.items = [];
    this.childItemMap = new Map();
    this.containerMap = new Map();
    this._altTabs = null;

    this.sheetComponents = [];
    this.sheetComponents.push(new ChangesSheetComponent(this));
    this.sheetComponents.push(new NotesSheetComponent(this));
  }

  /* -------------------------------------------- */

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      width: 560,
      height: 650,
      classes: ["D35E", "sheet", "item"],
      resizable: false,
    });
  }

  get title() {
    return this.item.displayName;
  }

  /* -------------------------------------------- */

  /**
   * Return a dynamic reference to the HTML template path used to render this Item Sheet
   * @return {string}
   */
  get template() {
    const path = "systems/D35E/templates/items/";
    return `${path}/${this.item.type}.html`;
  }

  /* -------------------------------------------- */

  /**
   * Prepare item sheet data
   * Start with the base item data and extending with additional properties for rendering.
   */
  async getData() {
    const sheetData = await super.getData();
    sheetData.labels = this.item.labels;
    // Include sub-items
    this.item.datas = [];
    if (this.item.items != null) {
      this.item.datas = this.item.items.map((i) => {
        i.system.labels = i.labels;
        return i.system;
      });
    }

    // Include CONFIG values
    sheetData.config = CONFIG.D35E;
    // Include relevant settings
    sheetData.usesImperialSystem = game.settings.get("D35E", "units") === "imperial";

    sheetData.randomUuid = uuidv4();

    // Item Type, Status, and Details
    this.item.dataType = this.item.type.titleCase();
    this.item.dataStatus = this._getItemStatus(this.item);
    this.item.dataProperties = this._getItemProperties(this.item);
    this.item.dataName = this.item.name;
    sheetData.isPhysical = this.item.system.quantity !== undefined;
    console.log("D35E | Base Item Data", this.item.system.quantity !== undefined);
    sheetData.isSpell = this.item.type === "spell";
    sheetData.isConsumable = this.item.type === "consumable";
    sheetData.isScroll = this.item.system.consumableType === "scroll";
    sheetData.isClass = this.item.type === "class";
    sheetData.isRace = this.item.type === "race";
    sheetData.isAttack = this.item.type === "attack";
    sheetData.isWeaponAttack = this.item.system?.actionType === "rwak" || this.item.system?.actionType === "mwak";
    sheetData.isSpellLike =
      this.item.type === "spell" ||
      this.item.system?.actionType === "rsak" ||
      this.item.system?.actionType === "msak" ||
      this.item.system?.actionType === "heal" ||
      this.item.system?.actionType === "spellsave" ||
      this.item.system?.isFromSpell;
    sheetData.isShapechangeBuff = this.item.type === "buff" && this.item.system?.buffType === "shapechange";
    sheetData.canMeld = this.item.type === "weapon" || this.item.type === "attack" || this.item.type === "equipment";
    sheetData.isAmmo = this.item.system.subType === "ammo";
    sheetData.isContainer = this.item.system.subType === "container";
    sheetData.owner = this.item.actor != null;
    sheetData.isGM = game.user.isGM;
    sheetData.showIdentifyDescription = sheetData.isGM && sheetData.isPhysical;
    sheetData.showUnidentifiedData = this.item.showUnidentifiedData;
    sheetData.materials = Array.from(CACHE.Materials.values());
    sheetData.baseDamageTypes = DamageTypes.getBaseDRDamageTypes();
    sheetData.energyDamageTypes = DamageTypes.getERDamageTypes();
    var damageTypesUnsorded = Array.from(CACHE.DamageTypes.values());
    sheetData.damageTypes = damageTypesUnsorded.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));
    sheetData.damageTypes.forEach((d) => {
      if (d.system.damageType === "energy") d.damageTypeString = game.i18n.localize("D35E.Energy");
      else if (d.system.isPiercing || d.system.isBludgeoning || d.system.isSlashing)
        d.damageTypeString = game.i18n.localize("D35E.Physical");
      else d.damageTypeString = game.i18n.localize("D35E.Other");
    });

    // Unidentified data
    if (this.item.showUnidentifiedData) {
      sheetData.itemName =
        getProperty(this.item.system, "unidentified.name") || game.i18n.localize("D35E.Unidentified");
    } else {
      sheetData.itemName = getProperty(this.item.system, "identifiedName") || this.item.name;
    }

    // Action Details
    sheetData.hasAttackRoll = this.item.hasAttack;
    sheetData.isHealing = this.item.system.actionType === "heal";

    sheetData.isCharged = false;
    if (this.item.system.uses != null) {
      sheetData.isCharged = ["day", "week", "charges", "encounter"].includes(this.item.system.uses.per);
    }
    if (this.item.system.range != null) {
      sheetData.canInputRange = ["ft", "mi", "spec"].includes(this.item.system.range.units);
    }
    if (this.item.system.duration != null) {
      sheetData.canInputDuration = !["", "inst", "perm", "seeText"].includes(this.item.system.duration.units);
    }
    if (this.item.system.spellDurationData != null) {
      sheetData.canInputSpellDuration = !["", "inst", "perm", "seeText"].includes(
        this.item.system.spellDurationData.units
      );
    }

    sheetData.charges = this.item.charges;
    sheetData.maxCharges = this.item.maxCharges;
    sheetData.unmetRequirements = this.item.hasUnmetRequirements();

    sheetData.is07Xup = isMinimumCoreVersion("0.7.2");

    sheetData.availableContainers = {};
    sheetData.availableContainers["none"] = "None";

    sheetData.material = this.item.system.material?.system || this.item.system.material?.data;
    sheetData.materialMetadata = {
      name: this.item.system.material?.name,
      img: this.item.system.material?.img,
    };

    if (this.actor != null) {
      this.actor.items.forEach((i) => {
        if (i.type === "loot" && i.system.subType === "container") {
          sheetData.availableContainers[i._id] = i.name;
          this.containerMap.set(i._id, i);
        }
      });
    }

    // Prepare enhancement specific stuff
    if (this.item.type === "enhancement") {
      sheetData.enhancementTypes = { types: {}, subTypes: {} };
      for (let [k, v] of Object.entries(CONFIG.D35E.enhancementType)) {
        sheetData.enhancementTypes.types[k] = v;
      }

      sheetData.isWeaponEnhancement = this.item.system.enhancementType === "weapon";
      sheetData.isArmorEnhancement = this.item.system.enhancementType === "armor";
      sheetData.isMiscEnhancement = this.item.system.enhancementType === "misc";
    }

    // Prepare attack specific stuff
    if (this.item.type === "attack") {
      sheetData.isWeaponAttack = this.item.system.attackType === "weapon";
      sheetData.isNaturalAttack = this.item.system.attackType === "natural";
      if (this.item.actor) {
        sheetData.autoScaleWithBab =
          (game.settings.get("D35E", "autoScaleAttacksBab") &&
            this.item.actor.data.type !== "npc" &&
            getProperty(this.item.system, "attackType") === "weapon" &&
            getProperty(this.item.system, "autoScaleOption") !== "never") ||
          getProperty(this.item.system, "autoScaleOption") === "always";
        if (sheetData.autoScaleWithBab) {
          let attacks = [];
          let baseExtraAttack = 0;
          let bab = this.item.actor.system.attributes.bab.total;
          bab -= 5;
          while (bab > 0) {
            baseExtraAttack -= 5;
            attacks.push(baseExtraAttack);
            bab -= 5;
          }
          if (attacks.length) {
            sheetData.extraAttacksAuto = attacks.join("/");
          } else {
            sheetData.extraAttacksAuto = game.i18n.localize("D35E.NoExtraAttacks");
          }
        }
      } else {
        sheetData.notOnActor = true;
      }
      sheetData.weaponCategories = { types: {}, subTypes: {} };
      for (let [k, v] of Object.entries(CONFIG.D35E.weaponTypes)) {
        if (typeof v === "object") sheetData.weaponCategories.types[k] = v._label;
      }
      if (hasProperty(CONFIG.D35E.weaponTypes, "martial")) {
        for (let [k, v] of Object.entries(CONFIG.D35E.weaponTypes["martial"])) {
          // Add static targets
          if (!k.startsWith("_")) sheetData.weaponCategories.subTypes[k] = v;
        }
      }
    }

    if (this.item.system.weight) {
      const conversion = game.settings.get("D35E", "units") === "metric" ? 0.5 : 1;
      sheetData.convertedWeight = this.item.system.weight * conversion;
    }

    if (this.item.system.capacity) {
      const conversion = game.settings.get("D35E", "units") === "metric" ? 0.5 : 1;
      sheetData.convertedCapacity = this.item.system.capacity * conversion;
    }

    // Prepare spell specific stuff
    if (this.item.type === "spell") {
      let spellbook = null;
      if (this.actor != null) {
        spellbook = getProperty(this.actor.system, `attributes.spells.spellbooks.${this.item.system.spellbook}`);
      }

      sheetData.isPreparedSpell = spellbook != null ? !spellbook.spontaneous : false;
      sheetData.isAtWill = this.item.system.atWill;
      sheetData.spellbooks = {};
      if (this.item.actor) {
        sheetData.spellbooks = duplicate(this.item.actor.system.attributes.spells.spellbooks);
      }

      // Enrich description
      sheetData.description = TextEditor.enrichHTML(this.item.system.description.value);
    }
    if (this.item.type === "card") {
      let spellbook = null;
      if (this.actor != null) {
        spellbook = getProperty(this.actor.system, `attributes.cards.decks.${this.item.system.deck}`);
      }

      sheetData.isPreparedSpell = spellbook != null ? !spellbook.spontaneous : false;
      sheetData.isAtWill = this.item.system.atWill;
      sheetData.spellbooks = {};
      if (this.item.actor) {
        sheetData.spellbooks = duplicate(this.item.actor.system.attributes.cards.decks);
      }

      // Enrich description
      sheetData.description = TextEditor.enrichHTML(this.item.system.description.value);
    }
    if (this.item.type === "race") {
      sheetData.children = {
        spelllikes: [],
        abilities: [],
        traits: [],
        addedAbilities: [],
      };

      let alreadyAddedAbilities = new Set();

      {
        let spellLikes = game.packs.get("D35E.spelllike");
        let spellikeItems = [];
        await spellLikes.getIndex().then((index) => (spellikeItems = index));
        for (let entry of spellikeItems) {
          await spellLikes.getDocument(entry._id).then((e) => {
            if (e.system.tags.some((el) => el[0] === this.item.name)) {
              sheetData.children.spelllikes.push(e);
              this.childItemMap.set(entry._id, e);
            }
          });
        }
      }

      {
        for (let e of new Set(CACHE.RacialFeatures.get(this.item.name) || [])) {
          if (e.system.tags.some((el) => el[0] === this.item.name)) {
            sheetData.children.abilities.push({
              item: e,
              pack: e.pack,
              disabled: (this.item.system.disabledAbilities || []).some((obj) => obj.uid === e.system.uniqueId),
            });
            this.childItemMap.set(e._id, e);
          }
        }
      }

      for (let ability of this.item.system.addedAbilities || []) {
        let e = CACHE.AllAbilities.get(ability.uid);
        sheetData.children.addedAbilities.push({
          item: e,
          pack: e.pack,
        });
        if (e.system.uniqueId.indexOf("*" === -1)) alreadyAddedAbilities.add(e.system.uniqueId);
      }

      sheetData.allAbilities = [];
      for (var e of CACHE.AllAbilities.values()) {
        if (!alreadyAddedAbilities.has(e.system.uniqueId)) sheetData.allAbilities.push(e);
      }
    }

    sheetData.fieldList = Object.keys(flattenObject(this.item.system));

    if (this.item.type === "buff") {
      sheetData.hasCombatChanges = true;
    }
    if (this.item.type === "aura") {
      sheetData.hasCombatChanges = true;
    }

    sheetData.itemType = this.item.type;

    // Prepare class specific stuff
    if (this.item.type === "class") {
      for (let [a, s] of Object.entries(this.item.system.savingThrows)) {
        s.label = CONFIG.D35E.savingThrows[a];
      }
      for (let [a, s] of Object.entries(this.item.system.fc)) {
        s.label = CONFIG.D35E.favouredClassBonuses[a];
      }
      sheetData.powerPointLevels = {};
      Object.keys(this.item.system.powerPointTable).forEach((key) => {
        sheetData.powerPointLevels[key] = {
          value: this.item.system.powerPointTable[key],
          known: this.item.system.powersKnown !== undefined ? this.item.system.powersKnown[key] || 0 : 0,
          maxLevel: this.item.system.powersMaxLevel !== undefined ? this.item.system.powersMaxLevel[key] || 0 : 0,
        };
      });

      sheetData.powerPointBonusBaseAbility = this.item.system.powerPointBonusBaseAbility;
      sheetData.abilities = {};
      for (let [a, s] of Object.entries(CONFIG.D35E.abilities)) {
        sheetData.abilities[a] = {};
        sheetData.abilities[a].label = s;
      }
      sheetData.hasRequirements = true;
      sheetData.hasMaxLevel =
        this.item.system.maxLevel !== undefined &&
        this.item.system.maxLevel !== null &&
        this.item.system.maxLevel !== "" &&
        this.item.system.maxLevel !== 0;
      sheetData.isBaseClass = this.item.system.classType === "base";
      sheetData.isRacialHD = this.item.system.classType === "racial";
      sheetData.isTemplate = this.item.system.classType === "template";
      sheetData.isPsionSpellcaster = this.item.system.spellcastingType === "psionic";
      sheetData.isSpellcaster =
        this.item.system.spellcastingType !== undefined &&
        this.item.system.spellcastingType !== null &&
        this.item.system.spellcastingType !== "none";
      sheetData.isNonPsionSpellcaster = sheetData.isSpellcaster && !sheetData.isPsionSpellcaster;
      sheetData.progression = [];
      sheetData.spellProgression = [];
      sheetData.knownSpellProgression = [];
      sheetData.childItemLevels = new Map();
      sheetData.children = {
        spelllikes: [],
        abilities: [],
        traits: [],
        addedAbilities: [],
      };
      let alreadyAddedAbilities = new Set();
      let alreadyAddedDescriptions = new Set();
      sheetData.abilitiesDescription = [];
      {
        for (let e of new Set(CACHE.ClassFeatures.get(this.item.name) || [])) {
          this.childItemMap.set(e._id, e);

          let levels = e.system.associations.classes.filter((el) => el[0] === this.item.name);
          for (let _level of levels) {
            const level = _level[1];
            if (!sheetData.childItemLevels.has(level)) {
              sheetData.childItemLevels.set(level, []);
            }
            let _e = {
              item: e,
              level: level,
              pack: e.pack,
              disabled: (this.item.system.disabledAbilities || []).some(
                (obj) => parseInt(obj.level || "0") === level && obj.uid === e.system.uniqueId
              ),
            };
            sheetData.children.abilities.push(_e);
            sheetData.childItemLevels.get(level).push(_e);
            if (e.system.uniqueId.indexOf("*") === -1) alreadyAddedAbilities.add(e.system.uniqueId);
            if (e.system.description.value !== "" && !alreadyAddedDescriptions.has(e._id)) {
              sheetData.abilitiesDescription.push({
                level: level,
                name: e.name,
                description: TextEditor.enrichHTML(e.system.description.value),
              });
              alreadyAddedDescriptions.add(e._id);
            }
          }
        }

        for (let ability of this.item.system.addedAbilities || []) {
          let e = CACHE.AllAbilities.get(ability.uid);
          let _e = {};
          if (e) {
            _e = {
              item: e,
              level: ability.level,
              pack: e.pack,
            };
            sheetData.children.addedAbilities.push(_e);
            if (!sheetData.childItemLevels.has(ability.level)) {
              sheetData.childItemLevels.set(ability.level, []);
            }
            sheetData.childItemLevels.get(ability.level).push(_e);
            if (e.system.uniqueId.indexOf("*") === -1) alreadyAddedAbilities.add(e.system.uniqueId);
            if (e.system.description.value !== "" && !alreadyAddedDescriptions.has(e._id)) {
              sheetData.abilitiesDescription.push({
                level: ability.level,
                name: e.name,
                description: TextEditor.enrichHTML(e.system.description.value),
              });
              alreadyAddedDescriptions.add(e._id);
            }
          } else {
            console.warn("D35E | Missing", ability);
          }
        }
      }

      sheetData.allAbilities = [];
      for (var e of CACHE.AllAbilities.values()) {
        if (!alreadyAddedAbilities.has(e.system.uniqueId) || e.system.uniqueId.indexOf("*") !== -1)
          sheetData.allAbilities.push(e);
      }

      sheetData.spellbook = [];
      if (this.item.system.spellbook) {
        sheetData.spellbook = this.item.system.spellbook;
      }

      for (let level = 1; level < this.item.system.maxLevel + 1; level++) {
        let progressionData = {};
        let spellProgressionData = {};
        let knownSpellProgressionData = {};

        progressionData.level = level;
        spellProgressionData.level = level;
        knownSpellProgressionData.level = level;
        for (let a of ["fort", "ref", "will"]) {
          const classType = getProperty(this.item.system, "classType") || "base";

          let formula =
            CONFIG.D35E.classSavingThrowFormulas[classType][this.item.system.savingThrows[a].value] != null
              ? CONFIG.D35E.classSavingThrowFormulas[classType][this.item.system.savingThrows[a].value]
              : "0";
          progressionData[a] = Math.floor(new Roll35e(formula, { level: level }).roll().total);
        }
        {
          const formula =
            CONFIG.D35E.classBABFormulas[this.item.system.bab] != null
              ? CONFIG.D35E.classBABFormulas[this.item.system.bab]
              : "0";
          let bab = Math.floor(new Roll35e(formula, { level: level }).roll().total);
          let babModifiers = [];
          while (bab > 0) {
            babModifiers.push("+" + bab);
            bab -= 5;
          }
          progressionData.bab = babModifiers.join("/");
        }
        progressionData.abilities = sheetData.childItemLevels.get(level);
        progressionData.hasNonActive = false;
        sheetData.progression.push(progressionData);
        sheetData.hasKnownSpells = false;
        if (sheetData.isSpellcaster) {
          for (let spellLevel = 0; spellLevel <= 9; spellLevel++) {
            if (
              getProperty(this.item.system, "spellsPerLevel") !== undefined &&
              getProperty(this.item.system, "spellsPerLevel")[level - 1]
            ) {
              let spellPerLevel = getProperty(this.item.system, "spellsPerLevel")[level - 1][spellLevel + 1];
              spellProgressionData[`spells${spellLevel}`] =
                spellPerLevel !== undefined && parseInt(spellPerLevel) !== -1 ? spellPerLevel : "-";
            }
            if (
              getProperty(this.item.system, "spellsKnownPerLevel") !== undefined &&
              getProperty(this.item.system, "spellsKnownPerLevel")[level - 1]
            ) {
              let spellPerLevel = getProperty(this.item.system, "spellsKnownPerLevel")[level - 1][spellLevel + 1];
              knownSpellProgressionData[`spells${spellLevel}`] =
                spellPerLevel !== undefined && parseInt(spellPerLevel) !== -1 ? spellPerLevel : "-";
              sheetData.hasKnownSpells = true;
            }
          }
          sheetData.spellProgression.push(spellProgressionData);
          sheetData.knownSpellProgression.push(knownSpellProgressionData);
        }
      }

      if (this.item.system.nonActiveClassAbilities !== undefined && this.item.system.nonActiveClassAbilities !== null) {
        this.item.system.nonActiveClassAbilities.forEach((a) => {
          if (a[0] !== 0) {
            if (sheetData.progression[a[0] - 1]["nonActive"] === undefined) {
              sheetData.progression[a[0] - 1]["nonActive"] = [];
              sheetData.progression[a[0] - 1].hasNonActive = true;
            }
            sheetData.progression[a[0] - 1]["nonActive"].push({ name: a[1], desc: a[2] });
          }
          if (a[2] !== "") {
            sheetData.abilitiesDescription.push({ level: a[0], name: a[1], description: TextEditor.enrichHTML(a[2]) });
          }
        });
      }

      sheetData.abilitiesDescription.sort((a, b) => (a.level > b.level ? 1 : b.level > a.level ? -1 : 0));

      if (this.actor != null) {
        let healthConfig = game.settings.get("D35E", "healthConfig");
        sheetData.healthConfig = sheetData.isRacialHD
          ? healthConfig.hitdice.Racial
          : this.actor.data.type === "character"
          ? healthConfig.hitdice.PC
          : healthConfig.hitdice.NPC;
      } else sheetData.healthConfig = { auto: false };

      // Add skill list
      if (!this.item.actor) {
        sheetData.skills = Object.entries(CONFIG.D35E.skills).reduce((cur, o) => {
          cur[o[0]] = {
            name: o[1],
            classSkill: getProperty(this.item.system, `classSkills.${o[0]}`) === true,
          };
          return cur;
        }, {});
      } else {
        sheetData.skills = Object.entries(this.item.actor.system.skills).reduce((cur, o) => {
          const key = o[0];
          const name = CONFIG.D35E.skills[key] != null ? CONFIG.D35E.skills[key] : o[1].name;
          cur[o[0]] = {
            name: name,
            classSkill: getProperty(this.item.system, `classSkills.${o[0]}`) === true,
          };
          return cur;
        }, {});
      }
    }

    // Prepare stuff for attacks with conditionals
    if (this.item.system.conditionals) {
      sheetData.conditionals = duplicate(this.item.system.conditionals);
      for (const conditional of sheetData.conditionals) {
        for (const modifier of conditional.modifiers) {
          modifier.targets = this.item.getConditionalTargets();
          modifier.subTargets = this.item.getConditionalSubTargets(modifier.target);
          modifier.conditionalModifierTypes = this.item.getConditionalModifierTypes(modifier.target);
          modifier.conditionalCritical = this.item.getConditionalCritical(modifier.target);
          modifier.isAttack = modifier.target === "attack";
          modifier.isDamage = modifier.target === "damage";
          modifier.isSpell = modifier.target === "spell";
        }
      }
    }

    sheetData.registeredTabs = [];
    this.sheetComponents.forEach((component) => {
      component.prepareSheetData(sheetData);
      component.registerTab(sheetData);
    });

    return sheetData;
  }

  /* -------------------------------------------- */

  /**
   * Get the text item status which is shown beneath the Item type in the top-right corner of the sheet
   * @return {string}
   * @private
   */
  _getItemStatus(item) {
    if (item.type === "spell") {
      if (item.system.preparation.mode === "prepared") {
        return item.system.preparation.preparedAmount > 0
          ? game.i18n.localize("D35E.AmountPrepared").format(item.system.preparation.preparedAmount)
          : game.i18n.localize("D35E.Unprepared");
      } else if (item.system.preparation.mode) {
        return item.system.preparation.mode.titleCase();
      } else return "";
    } else if (["weapon", "equipment"].includes(item.type))
      return item.system.equipped ? game.i18n.localize("D35E.Equipped") : game.i18n.localize("D35E.NotEquipped");
  }

  /* -------------------------------------------- */

  /**
   * Get the Array of item properties which are used in the small sidebar of the description tab
   * @return {Array}
   * @private
   */
  _getItemProperties(item) {
    const props = [];
    const labels = this.item.labels;

    if (item.type === "weapon") {
      props.push(
        ...Object.entries(item.system.properties)
          .filter((e) => e[1] === true)
          .map((e) => CONFIG.D35E.weaponProperties[e[0]])
      );
    } else if (item.type === "spell") {
      props.push(labels.components, labels.materials);
    }

    if (item.type === "enhancement") {
      props.push(...Object.entries(item.system.allowedTypes).map((e) => e[1]));
    } else if (item.type === "equipment") {
      props.push(CONFIG.D35E.equipmentTypes[item.system.armor.type]);
      props.push(labels.armor);
    } else if (item.type === "feat") {
      props.push(labels.featType);
    }

    // Action type
    if (item.actionType) {
      props.push(CONFIG.D35E.itemActionTypes[item.system.actionType]);
    }

    // Action usage
    if (item.type !== "weapon" && item.system.activation && !isEmpty(item.system.activation)) {
      props.push(labels.activation, labels.range, labels.target, labels.duration);
    }

    // Tags
    if (getProperty(item.system, "tags") != null) {
      props.push(
        ...getProperty(item.system, "tags").map((o) => {
          return o[0];
        })
      );
    }

    return props.filter((p) => !!p);
  }

  /* -------------------------------------------- */

  setPosition(position = {}) {
    // if ( this._sheetTab === "details" ) position.height = "auto";
    return super.setPosition(position);
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */

  /* -------------------------------------------- */

  /**
   * Extend the parent class _updateObject method to ensure that damage ends up in an Array
   * @private
   */
  _updateObject(event, formData) {
    // Handle Damage Array
    let damage = Object.entries(formData).filter((e) => e[0].startsWith("system.damage.parts"));
    formData["system.damage.parts"] = damage.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(3);
      if (!arr[i]) arr[i] = [];
      arr[i][j] = entry[1];
      return arr;
    }, []);

    let altDamage = Object.entries(formData).filter((e) => e[0].startsWith("system.damage.alternativeParts"));
    formData["system.damage.alternativeParts"] = altDamage.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(3);
      if (!arr[i]) arr[i] = [];
      arr[i][j] = entry[1];
      return arr;
    }, []);

    // Handle Attack Array
    let attacks = Object.entries(formData).filter((e) => e[0].startsWith("system.attackParts"));
    formData["system.attackParts"] = attacks.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if (!arr[i]) arr[i] = [];
      arr[i][j] = entry[1];
      return arr;
    }, []);

    // Handle conditionals array
    let conditionals = Object.entries(formData).filter((e) => e[0].startsWith("system.conditionals"));
    formData["system.conditionals"] = conditionals.reduce((arr, entry) => {
      let [i, j, k] = entry[0].split(".").slice(2);
      if (!arr[i]) arr[i] = Item35E.defaultConditional;
      if (k) {
        const target = formData[`system.conditionals.${i}.${j}.target`];
        if (!arr[i].modifiers[j]) arr[i].modifiers[j] = Item35E.defaultConditionalModifier;
        arr[i].modifiers[j][k] = entry[1];
        // Target dependent keys
        if (["subTarget", "critical", "type"].includes(k)) {
          const target = (conditionals.find((o) => o[0] === `data.conditionals.${i}.${j}.target`) || [])[1];
          const val = entry[1];
          if (typeof target === "string") {
            let keys;
            switch (k) {
              case "subTarget":
                keys = Object.keys(this.item.getConditionalSubTargets(target));
                break;
              case "type":
                keys = Object.keys(this.item.getConditionalModifierTypes(target));
                break;
              case "critical":
                keys = Object.keys(this.item.getConditionalCritical(target));
                break;
            }
            // Reset subTarget, non-damage type, and critical if necessary
            if (!keys.includes(val) && target !== "damage" && k !== "type") arr[i].modifiers[j][k] = keys[0];
          }
        }
      } else {
        arr[i][j] = entry[1];
      }
      return arr;
    }, []);

    // Handle notes array
    let note = Object.entries(formData).filter((e) => e[0].startsWith("system.contextNotes"));
    formData["system.contextNotes"] = note.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if (!arr[i]) arr[i] = [];
      arr[i][j] = entry[1];
      return arr;
    }, []);

    let actions = Object.entries(formData).filter((e) => e[0].startsWith("system.specialActions"));
    formData["system.specialActions"] = actions.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if (!arr[i]) arr[i] = { name: "", action: "" };

      arr[i][j] = entry[1];
      return arr;
    }, []);

    let summon = Object.entries(formData).filter((e) => e[0].startsWith("system.summon"));
    formData["system.summon"] = summon.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if (!arr[i]) arr[i] = { name: "", id: "", pack: "", formula: "" };

      arr[i][j] = entry[1];
      return arr;
    }, []);

    let activateActions = Object.entries(formData).filter((e) => e[0].startsWith("system.activateActions"));
    formData["system.activateActions"] = activateActions.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if (!arr[i]) arr[i] = { name: "", action: "" };

      arr[i][j] = entry[1];
      return arr;
    }, []);

    let deactivateActions = Object.entries(formData).filter((e) => e[0].startsWith("system.deactivateActions"));
    formData["system.deactivateActions"] = deactivateActions.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if (!arr[i]) arr[i] = { name: "", action: "" };

      arr[i][j] = entry[1];
      return arr;
    }, []);

    let perRoundActions = Object.entries(formData).filter((e) => e[0].startsWith("system.perRoundActions"));
    formData["system.perRoundActions"] = perRoundActions.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if (!arr[i]) arr[i] = { name: "", action: "" };

      arr[i][j] = entry[1];
      return arr;
    }, []);

    // Update the Item

    if (this.containerMap.has(formData["system.containerId"])) {
      formData["system.container"] = this.containerMap.get(formData["system.containerId"]).name;
      formData["system.containerWeightless"] = this.containerMap.get(
        formData["system.containerId"]
      ).system.bagOfHoldingLike;
    } else {
      formData["system.container"] = "None";
      formData["system.containerWeightless"] = false;
    }

    this.sheetComponents.forEach((component) => {
      component.updateForm(formData);
    });

    //console.log("IM IN _UPDATE OBJECT FIXING THINGS", formData)
    return super._updateObject(event, formData);
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for interactive item sheet events
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    // Only run this if TabsV2 is already available (which is available since FoundryVTT 0.5.2)
    if (typeof TabsV2 !== "undefined") {
      const tabGroups = {
        primary: {
          description: {},
          configuration: {},
        },
      };
      this._altTabs = createTabs.call(this, html, tabGroups, this._altTabs);
    }
    // Run older Tabs as a fallback
    else {
      new Tabs(html.find(".tabs"), {
        initial: this["_sheetTab"],
        callback: (clicked) => {
          this._scrollTab = 0;
          this["_sheetTab"] = clicked.data("tab");
          this.setPosition();
        },
      });

      // Save scroll position
      html.find(".tab.active")[0].scrollTop = this._scrollTab;
      html.find(".tab").scroll((ev) => (this._scrollTab = ev.currentTarget.scrollTop));
    }

    // Tooltips
    html.mousemove((ev) => this._moveTooltips(ev));

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Trigger form submission from textarea elements.
    html.find("textarea").change(this._onSubmit.bind(this));

    // Add drop handler to textareas
    html.find("textarea").on("drop", this._onTextAreaDrop.bind(this));

    // Shapechange source drop handles
    html.find("shapechange").on("drop", this._onShapechangeDrop.bind(this));

    // Modify attack formula
    html.find(".attack-control").click(this._onAttackControl.bind(this));

    // Modify custom fields
    html.find(".custom-field-control").click(this._onCustomFieldControl.bind(this));

    // Modify special formula
    html.find(".special-control").click(this._onSpecialControl.bind(this));
    html.find(".a-special-control").click(this._onActivateSpecialControl.bind(this));
    html.find(".d-special-control").click(this._onDeactivateSpecialControl.bind(this));
    html.find(".r-special-control").click(this._onPerRoundSpecialControl.bind(this));

    // Modify damage formula
    html.find(".damage-control").click(this._onDamageControl.bind(this));
    html.find(".damage-alt-control").click(this._onAltDamageControl.bind(this));

    // Modify summons

    html.find(".summons-control").click(this._onSummonControl.bind(this));

    // Modify note changes
    html.find(".context-note-control").click(this._onNoteControl.bind(this));

    // Create attack
    if (["weapon"].includes(this.item.type) && this.item.actor != null && !this.item.showUnidentifiedData) {
      const toggleString =
        "<a style='color: white; text-decoration: none' class='header-button companion-view-button' title='" +
        game.i18n.localize("D35E.CreateAttack") +
        "'><i class='fa fa-feather-alt'></i>" +
        game.i18n.localize("D35E.CreateAttack") +
        "</a>";
      const toggleButton = $(toggleString);
      html.closest(".app").find(".companion-view-button").remove();
      const titleElement = html.closest(".app").find(".window-title");
      toggleButton.insertAfter(titleElement);
      toggleButton.click(this._createAttack.bind(this));
    }

    if (["feat"].includes(this.item.type)) {
      html.find("button[name='add-domain-spells']").click(this._addSpellsToSpellbook.bind(this));
    }

    // Modify conditionals
    html.find(".conditional-control").click(this._onConditionalControl.bind(this));

    // Listen to field entries
    html.find(".entry-selector").click(this._onEntrySelector.bind(this));

    // Item summaries
    html.find(".item .child-item h4").click((event) => this._onChildItemSummary(event));
    html.find(".item a.disable-ability").click((event) => this._onDisableAbility(event));
    html.find(".item a.enable-ability").click((event) => this._onEnableAbility(event));
    html.find(".item a.delete-ability").click((event) => this._onDeleteAbility(event));
    html.find(".item a.add-ability").click((event) => this._onAddAbility(event));
    html.find(".item .change-class-ability-level").off("change").change(this._onAbilityLevelChange.bind(this));

    html.find(".view-details-material").click((event) => this._onMaterialItemSummary(event));

    let handler = (ev) => this._onDragStart(ev);
    html.find("li.item").each((i, li) => {
      if (li.classList.contains("inventory-header")) return;
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });

    html.find(".full-attack").on("drop", this._onDropFullAttack.bind(this));
    html.find(".full-attack-control.full-attack-delete").click((event) => this._onDeleteFullAttack(event));

    html.find(".spell").on("drop", this._onDropSpell.bind(this));
    html.find(".special-actions").on("drop", this._onDropBuff.bind(this));
    html.find(".charge-link").on("drop", this._onDropChargeLink.bind(this));
    html.find(".remove-charge-link").click((event) => this._onRemoveChargeLink(event));
    html.find(".summons").on("drop", this._onDropSummomnRolltableLink.bind(this));
    html.find(".rolltable-link").on("drop", this._onDropRolltableLink.bind(this));
    html.find(".remove-rolltable-link").click((event) => this._onRemoveRolltableLink(event));

    html.find(".spellbook").on("drop", this._onDropSpellListSpell.bind(this));
    html.find('div[data-tab="spellbook"] .item-delete').click(this._onSpellListSpellDelete.bind(this));
    html.find('div[data-tab="spellbook"] .item-add').click(this._addSpellListSpellToSpellbook.bind(this));

    // Quick Item Action control
    html.find(".item-actions a").mouseup((ev) => this._quickItemActionControl(ev));

    html.find(".search-list").on("change", (event) => event.stopPropagation());

    // Conditional Dragging
    html.find("li.conditional").each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", (ev) => this._onDragConditionalStart(ev), false);
    });

    // Conditional Dropping
    html.find('div[data-tab="conditionals"]').on("drop", this._onConditionalDrop.bind(this));

    this.sheetComponents.forEach((component) => {
      component.activateListeners(html);
    });
  }

  /* -------------------------------------------- */

  _moveTooltips(event) {
    $(event.currentTarget)
      .find(".tooltip:hover .tooltipcontent")
      .css("left", `${event.clientX}px`)
      .css("top", `${event.clientY + 24}px`);
  }

  _onTextAreaDrop(event) {
    event.preventDefault();
    const elem = event.currentTarget;
  }

  /**
   * Add or remove a damage part from the damage formula
   * @param {Event} event     The original click event
   * @return {Promise}
   * @private
   */
  async _onDamageControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new damage component
    if (a.classList.contains("add-damage")) {
      await this._onSubmit(event);
      const damage = this.item.system.damage;
      return this.item.update({ "system.damage.parts": damage.parts.concat([["", ""]]) });
    }

    // Remove a damage component
    if (a.classList.contains("delete-damage")) {
      await this._onSubmit(event);
      const li = a.closest(".damage-part");
      const damage = duplicate(this.item.system.damage);
      damage.parts.splice(Number(li.dataset.damagePart), 1);
      return this.item.update({ "system.damage.parts": damage.parts });
    }
  }

  /**
   * Add or remove a alternativedamage part from the damage formula
   * @param {Event} event     The original click event
   * @return {Promise}
   * @private
   */
  async _onAltDamageControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new damage component
    if (a.classList.contains("add-alt-damage")) {
      await this._onSubmit(event);
      const damage = this.item.system.damage;
      return this.item.update({ "system.damage.alternativeParts": (damage.alternativeParts || []).concat([["", ""]]) });
    }

    // Remove a damage component
    if (a.classList.contains("delete-alt-damage")) {
      await this._onSubmit(event);
      const li = a.closest(".damage-part");
      const damage = duplicate(this.item.system.damage);
      damage.alternativeParts.splice(Number(li.dataset.damagePart), 1);
      return this.item.update({ "system.damage.alternativeParts": damage.alternativeParts });
    }
  }

  generateId() {
    return "_" + Math.random().toString(36).substr(2, 9);
  }

  async _onCustomFieldControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new attack component
    if (a.classList.contains("add")) {
      await this._onSubmit(event);
      let _customAttributes = duplicate(this.item.system.customAttributes || {});
      let newAttribute = { id: this.generateId(), name: "", value: "" };
      _customAttributes[newAttribute.id] = newAttribute;
      //console.log(`D35E | Adding custom attribute | `,_customAttributes)
      return this.item.update({ "system.customAttributes": _customAttributes });
    }

    // Remove an attack component
    if (a.classList.contains("delete")) {
      await this._onSubmit(event);
      const li = a.closest(".custom-field");
      //console.log(`D35E | Removing custom attribute | ${li.dataset.customField}`, this.item.system.customAttributes)
      const updateData = {};
      updateData[`data.customAttributes.-=${li.dataset.customField}`] = null;
      return this.item.update(updateData);
    }
  }

  async _onAttackControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new attack component
    if (a.classList.contains("add-attack")) {
      await this._onSubmit(event);
      const attackParts = this.item.system.attackParts;
      return this.item.update({ "system.attackParts": attackParts.concat([["", ""]]) });
    }

    // Remove an attack component
    if (a.classList.contains("delete-attack")) {
      await this._onSubmit(event);
      const li = a.closest(".attack-part");
      const attackParts = duplicate(this.item.system.attackParts);
      attackParts.splice(Number(li.dataset.attackPart), 1);
      return this.item.update({ "system.attackParts": attackParts });
    }
  }

  async _onSummonControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Remove an attack component
    if (a.classList.contains("delete-summons")) {
      await this._onSubmit(event);
      const li = a.closest(".summons-part");
      const summons = duplicate(this.item.system.summon);
      summons.splice(Number(li.dataset.summons), 1);
      return this.item.update({ "system.summon": summons });
    }
  }

  async _onSpecialControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    // Add new attack component
    if (a.classList.contains("add-special")) {
      await this._onSubmit(event);
      let specialActions = this.item.system.specialActions;
      if (specialActions === undefined) specialActions = [];
      return this.item.update({
        "system.specialActions": specialActions.concat([
          [
            {
              name: "",
              action: "",
              range: "",
              img: "",
              condition: "",
            },
          ],
        ]),
      });
    }

    // Remove an attack component
    if (a.classList.contains("delete-special")) {
      await this._onSubmit(event);
      const li = a.closest(".special-part");
      const specialActions = duplicate(this.item.system.specialActions);
      specialActions.splice(Number(li.dataset.specialActions), 1);
      return this.item.update({ "system.specialActions": specialActions });
    }
  }

  async _onActivateSpecialControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    // Add new attack component
    if (a.classList.contains("add-special")) {
      await this._onSubmit(event);
      let activateActions = this.item.system.activateActions;
      if (activateActions === undefined) activateActions = [];
      return this.item.update({
        "system.activateActions": activateActions.concat([
          [
            {
              name: "",
              action: "",
              range: "",
              img: "",
              condition: "",
            },
          ],
        ]),
      });
    }

    // Remove an attack component
    if (a.classList.contains("delete-special")) {
      await this._onSubmit(event);
      const li = a.closest(".special-part");
      const activateActions = duplicate(this.item.system.activateActions);
      activateActions.splice(Number(li.dataset.activateActions), 1);
      return this.item.update({ "system.activateActions": activateActions });
    }
  }

  /**
   * Adds or removes per round action from buffs.
   * Available for item type: Buff
   * @private
   */
  async _onPerRoundSpecialControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    // Add new attack component
    if (a.classList.contains("add-special")) {
      await this._onSubmit(event);
      let perRoundActions = this.item.system.perRoundActions;
      if (perRoundActions === undefined) perRoundActions = [];
      return this.item.update({
        "system.perRoundActions": perRoundActions.concat([
          [
            {
              name: "",
              action: "",
              range: "",
              img: "",
              condition: "",
            },
          ],
        ]),
      });
    }

    // Remove an attack component
    if (a.classList.contains("delete-special")) {
      await this._onSubmit(event);
      const li = a.closest(".special-part");
      const perRoundActions = duplicate(this.item.system.perRoundActions);
      perRoundActions.splice(Number(li.dataset.perRoundActions), 1);
      return this.item.update({ "system.perRoundActions": perRoundActions });
    }
  }

  async _onDeactivateSpecialControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    // Add new attack component
    if (a.classList.contains("add-special")) {
      await this._onSubmit(event);
      let deactivateActions = this.item.system.deactivateActions;
      if (deactivateActions === undefined) deactivateActions = [];
      return this.item.update({
        "system.deactivateActions": deactivateActions.concat([
          [
            {
              name: "",
              action: "",
              range: "",
              img: "",
              condition: "",
            },
          ],
        ]),
      });
    }

    // Remove an attack component
    if (a.classList.contains("delete-special")) {
      await this._onSubmit(event);
      const li = a.closest(".special-part");
      const deactivateActions = duplicate(this.item.system.deactivateActions);
      deactivateActions.splice(Number(li.dataset.deactivateActions), 1);
      return this.item.update({ "system.deactivateActions": deactivateActions });
    }
  }

  async _onNoteControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new note
    if (a.classList.contains("add-note")) {
      //await this._onSubmit(event);
      const contextNotes = duplicate(this.item.system.contextNotes) || [];
      return this.item.update({ "system.contextNotes": contextNotes.concat([["", "", "", 0]]) });
    }

    // Remove a note
    if (a.classList.contains("delete-note")) {
      //await this._onSubmit(event);
      const li = a.closest(".context-note");
      const contextNotes = duplicate(this.item.system.contextNotes);
      contextNotes.splice(Number(li.dataset.note), 1);
      return this.item.update({ "system.contextNotes": contextNotes });
    }
  }

  async _onShapechangeDrop(event) {}

  async _createAttack(event) {
    event.preventDefault();
    if (this.item.actor == null) throw new Error(game.i18n.localize("D35E.ErrorItemNoOwner"));

    //await this._onSubmit(event);

    return this.item.parent.createAttackFromWeapon(this.item);
  }

  async _addSpellsToSpellbook(event) {
    event.preventDefault();
    if (this.item.actor == null) throw new Error(game.i18n.localize("D35E.ErrorItemNoOwner"));
    await this.item.parent.addSpellsToSpellbook(this.item);
  }

  _onEntrySelector(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const options = {
      name: a.getAttribute("for"),
      isProgression: a.getAttribute("data-progression"),
      title: a.innerText,
      fields: a.dataset.fields,
      dtypes: a.dataset.dtypes,
    };
    new EntrySelector(this.item, options).render(true);
  }

  async saveMCEContent(updateData = null) {
    let manualUpdate = false;
    if (updateData == null) {
      manualUpdate = true;
      updateData = {};
    }

    for (const [key, editor] of Object.entries(this.editors)) {
      if (editor.mce == null) continue;

      updateData[key] = editor.mce.getContent();
    }

    if (manualUpdate && Object.keys(updateData).length > 0) await this.item.update(updateData);
  }

  async _onAbilityLevelChange(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item-box"),
      uid = li.attr("data-item-uid"),
      level = li.attr("data-item-level"),
      pack = li.attr("data-pack");

    let updateData = {};
    const value = Number(event.currentTarget.value);
    let _addedAbilities = duplicate(getProperty(this.item.system, `addedAbilities`) || []);
    _addedAbilities
      .filter(function (obj) {
        return obj.uid === uid && (level === "" || parseInt(obj.level) === parseInt(level));
      })
      .forEach((i) => {
        i.level = value;
      });
    updateData[`data.addedAbilities`] = _addedAbilities;
    this.item.update(updateData);
  }

  async _onAddAbility(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item-box"),
      uid = li.attr("data-item-uid"),
      level = li.attr("data-item-level"),
      pack = li.attr("data-pack");

    let updateData = {};
    let _addedAbilities = duplicate(getProperty(this.item.system, `addedAbilities`) || []);
    _addedAbilities.push({ uid: uid, level: 0 });
    updateData[`data.addedAbilities`] = _addedAbilities;
    await this.item.update(updateData);
  }

  async _onDeleteAbility(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item-box"),
      uid = li.attr("data-item-uid"),
      level = li.attr("data-item-level"),
      pack = li.attr("data-pack");

    let updateData = {};
    let _addedAbilities = duplicate(getProperty(this.item.system, `addedAbilities`) || []);
    _addedAbilities = _addedAbilities.filter(function (obj) {
      return !(obj.uid === uid && (level === "" || parseInt(obj.level) === parseInt(level)));
    });
    updateData[`data.addedAbilities`] = _addedAbilities;
    await this.item.update(updateData);
  }
  async _onEnableAbility(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item-box"),
      uid = li.attr("data-item-uid"),
      level = li.attr("data-item-level"),
      pack = li.attr("data-pack");

    let updateData = {};
    let _disabledAbilities = duplicate(getProperty(this.item.system, `disabledAbilities`) || []);
    _disabledAbilities = _disabledAbilities.filter(function (obj) {
      return !(obj.uid === uid && (level === "" || parseInt(obj.level) === parseInt(level)));
    });
    updateData[`data.disabledAbilities`] = _disabledAbilities;
    await this.item.update(updateData);
  }

  async _onDisableAbility(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item-box"),
      uid = li.attr("data-item-uid"),
      level = li.attr("data-item-level"),
      pack = li.attr("data-pack");
    let updateData = {};
    let _disabledAbilities = duplicate(getProperty(this.item.system, `disabledAbilities`) || []);
    _disabledAbilities.push({ uid: uid, level: level });
    updateData[`data.disabledAbilities`] = _disabledAbilities;
    await this.item.update(updateData);
  }

  _onChildItemSummary(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item-box"),
      item = CACHE.AllAbilities.get(li.attr("data-item-uid")),
      pack = this.childItemMap.get(li.attr("data-pack"));

    item.sheet.render(true);
  }

  _onMaterialItemSummary(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item-box"),
      materialData = this.item.system.material?.system || this.item.system.material?.data,
      item = CACHE.Materials.get(materialData.uniqueId),
      pack = this.childItemMap.get(li.attr("data-pack"));

    item.sheet.render(true);
  }

  _onDragStart(event) {
    // Get the Compendium pack
    const li = event.currentTarget;
    const packName = li.getAttribute("data-pack");
    const pack = game.packs.get(packName);
    // //console.log(event)
    if (!pack) return;
    // Set the transfer data
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        type: pack.entity,
        pack: pack.collection,
        id: li.getAttribute("data-item-id"),
      })
    );
  }

  async _onDropFullAttack(event) {
    event.preventDefault();
    let attackId = $(event.delegateTarget).attr("data-attack");
    let droppedData;

    try {
      droppedData = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
      if (droppedData.type !== "Item") return;
    } catch (err) {
      return false;
    }
    let droppedItem = await fromUuid(droppedData.uuid)
    if (droppedItem.parent.uuid !== this.actor.uuid) {
      return ui.notifications.warn(game.i18n.localize("D35E.FullAttackNeedDropFromActor"));
    }
    if (droppedData.type === "Item" && droppedItem?.type === "attack") {
      let updateData = {};
      updateData[`system.attacks.${attackId}.id`] = droppedItem._id;
      updateData[`system.attacks.${attackId}.name`] = droppedItem.name;
      updateData[`system.attacks.${attackId}.img`] = droppedItem.img;
      updateData[`system.attacks.${attackId}.count`] = 1;
      updateData[`system.attacks.${attackId}.primary`] =
          droppedItem.system.attackType === "natural" && droppedItem.system.primaryAttack;
      updateData[`system.attacks.${attackId}.isWeapon`] = droppedItem.system.attackType === "weapon";
      this.item.update(updateData);
    }
  }

  async _onDeleteFullAttack(event) {
    event.preventDefault();

    let elem = $(event.currentTarget).parents(".full-attack");
    let attackId = elem.attr("data-attack");
    let updateData = {};
    updateData[`system.attacks.${attackId}.id`] = null;
    updateData[`system.attacks.${attackId}.name`] = null;
    updateData[`system.attacks.${attackId}.img`] = null;
    updateData[`system.attacks.${attackId}.count`] = 0;
    updateData[`system.attacks.${attackId}.primary`] = false;
    updateData[`system.attacks.${attackId}.isWeapon`] = false;
    this.item.update(updateData);
  }

  async _onRemoveChargeLink(event) {
    let updateData = {};

    updateData[`system.linkedChargeItem.id`] = null;
    updateData[`system.linkedChargeItem.name`] = null;
    updateData[`system.linkedChargeItem.img`] = null;
    this.item.update(updateData);
  }

  async _onRemoveRolltableLink(event) {
    let updateData = {};
    updateData[`system.rollTableDraw.id`] = null;
    updateData[`system.rollTableDraw.name`] = null;
    updateData[`system.rollTableDraw.pack`] = null;
    this.item.update(updateData);
  }

  async _onDropChargeLink(event) {
    event.preventDefault();
    let droppedData;

    try {
      droppedData = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
      if (droppedData.type !== "Item") return;
    } catch (err) {
      return false;
    }

    let droppedItem = await fromUuid(droppedData.uuid)
    if (droppedItem.parent.uuid !== this.actor.uuid) {
      return ui.notifications.warn(game.i18n.localize("D35E.FullAttackNeedDropFromActor"));
    }
    if (droppedData.type === "Item" && droppedItem?.system?.uses?.canBeLinked && droppedItem?.system?.uses?.max) {
      let updateData = {};

      updateData[`system.linkedChargeItem.id`] = droppedItem.system.uniqueId ? droppedItem.system.uniqueId : droppedItem._id;
      updateData[`system.linkedChargeItem.name`] = droppedItem.name;
      updateData[`system.linkedChargeItem.img`] = droppedItem.img;
      this.item.update(updateData);
    }
    if (!droppedItem?.system?.uses?.canBeLinked) {
      return ui.notifications.warn(game.i18n.localize("D35E.ResourceMustBeSetAsLinkable"));
    }
  }

  async _onDropSummomnRolltableLink(event) {
    event.preventDefault();
    let droppedData;
    try {
      droppedData = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
      if (droppedData.type !== "RollTable") return;
    } catch (err) {
      return false;
    }

    let dataType = "";
    if (droppedData.type === "RollTable") {
      let itemData = {};
      let droppedItem = await fromUuid(droppedData.uuid)
      if (droppedItem.pack) {
        let updateData = {};
        dataType = "compendium";
        const pack = game.packs.find((p) => p.metadata.id === droppedItem.pack);
        const packItem = droppedItem;
        if (packItem != null) {
          itemData = packItem.data;
          let summons = duplicate(this.item.system.summon);
          if (summons === undefined || summons.rollTables !== undefined) summons = [];
          summons = summons.concat([
            {
              name: packItem.name,
              id: packItem.id,
              pack: droppedData.pack,
              formula: "",
            },
          ]);
          await this.item.update({
            "system.summon": summons,
          });
        }
      } else {
        return ui.notifications.warn(game.i18n.localize("D35E.ResourceNeedDropFromCompendium"));
      }
    }
  }

  async _onDropRolltableLink(event) {
    event.preventDefault();
    let droppedData;

    try {
      droppedData = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
      if (droppedData.type !== "RollTable") return;
    } catch (err) {
      return false;
    }

    let droppedItem = await fromUuid(droppedData.uuid)
    if (!droppedItem.pack) {
      return ui.notifications.warn(game.i18n.localize("D35E.ResourceNeedDropFromCompendium"));
    }
    if (droppedData.type === "RollTable") {
      let updateData = {};
      let rt = droppedItem;
      updateData[`system.rollTableDraw.id`] = rt.id;
      updateData[`system.rollTableDraw.pack`] = rt.pack;
      updateData[`system.rollTableDraw.name`] = rt.name;
      this.item.update(updateData);
    }
  }

  async _onDropSpellListSpell(event) {
    event.preventDefault();
    let spellLevel = $(event.delegateTarget).attr("data-spell-level");
    let droppedData;
    try {
      droppedData = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
      if (droppedData.type !== "Item") return;
    } catch (err) {
      return false;
    }

    let dataType = "";

    if (droppedData.type === "Item") {
      let itemData = {};

      let droppedItem = await fromUuid(droppedData.uuid)
      if (droppedItem.pack) {
        if (droppedItem != null) {
          let spell = { id: droppedItem.id, pack: droppedItem.pack, name: droppedItem.name, img: droppedItem.img, uuid: droppedData.uuid };
          this.item.addSpellToClassSpellbook(spellLevel, spell);
        }
      }
    }
  }

  /**
   * Handle deleting an existing Enhancement item
   * @param {Event} event   The originating click event
   * @private
   */
  async _onSpellListSpellDelete(event) {
    event.preventDefault();

    const button = event.currentTarget;
    if (button.disabled) return;

    const li = event.currentTarget.closest(".item");
    if (game.keyboard.isModifierActive("Shift")) {
      this.item.deleteSpellFromClassSpellbook(li.dataset.level, li.dataset.itemId);
    } else {
      button.disabled = true;

      const msg = `<p>${game.i18n.localize("D35E.DeleteItemConfirmation")}</p>`;
      Dialog.confirm({
        title: game.i18n.localize("D35E.DeleteItem"),
        content: msg,
        yes: () => {
          this.item.deleteSpellFromClassSpellbook(li.dataset.level, li.dataset.itemId);
          button.disabled = false;
        },
        no: () => (button.disabled = false),
      });
    }
  }

  async _addSpellListSpellToSpellbook(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    await this.item.parent.addSpellFromSpellListToSpellbook(li.dataset.level, li.dataset.itemId, li.dataset.itemPack);
  }

  async _onDropSpell(event) {
    event.preventDefault();
    let spellLevel = $(event.delegateTarget).attr("data-spell");
    let droppedData;
    try {
      droppedData = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
      if (droppedData.type !== "Item") return;
    } catch (err) {
      return false;
    }

    let dataType = "";

    if (droppedData.type === "Item") {
      let droppedItem = await fromUuid(droppedData.uuid)
      let itemData = {};
      if (droppedItem.pack) {
        let updateData = {};
        const packItem = droppedItem;
        if (packItem != null) {
          itemData = packItem.data;
          updateData[`system.spellSpecialization.spells.${spellLevel}.id`] = droppedData.id;
          updateData[`system.spellSpecialization.spells.${spellLevel}.pack`] = droppedData.pack;
          updateData[`system.spellSpecialization.spells.${spellLevel}.name`] = packItem.name;
          updateData[`system.spellSpecialization.spells.${spellLevel}.img`] = packItem.img;
          this.item.update(updateData);
        }
      }
    }
  }

  async _onDropBuff(event) {
    event.preventDefault();
    let droppedData;
    try {
      droppedData = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
      if (droppedData.type !== "Item") return;
    } catch (err) {
      return false;
    }
    let target = "target";
    if (this.item.system?.target?.value === "self") target = "self";
    if (droppedData.type === "Item") {

      let droppedItem = await fromUuid(droppedData.uuid)
      if (droppedItem.pack) {
        const packItem = droppedItem;
        if (packItem != null && packItem.data.type === "buff") {
          let buffString = `Create unique "${packItem.name}" from "${droppedData.pack}" on ${target};Set buff "${packItem.name}" field data.level to max(1,(@cl)) on ${target};Activate buff "${packItem.name}" on ${target}`;

          let specialActions = duplicate(this.item.system.specialActions);
          if (specialActions === undefined) specialActions = [];
          specialActions = specialActions.concat([
            {
              name: packItem.name,
              action: buffString,
              range: "",
              img: packItem.img,
              condition: "",
            },
          ]);
          await this.item.update({
            "system.specialActions": specialActions,
          });
        }
      } else {
        return ui.notifications.warn(game.i18n.localize("D35E.ResourceNeedDropFromCompendium"));
      }
    }
  }

  _onDragConditionalStart(event) {
    const elem = event.currentTarget;
    const conditional = this.object.system.conditionals[elem.dataset?.conditional];
    event.dataTransfer.setData("text/plain", JSON.stringify(conditional));
  }

  async _onConditionalDrop(event) {
    event.preventDefault();

    let droppedData;
    try {
      droppedData = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
      // Surface-level check for conditional
      if (
        !(droppedData.default != null && typeof droppedData.name === "string" && Array.isArray(droppedData.modifiers))
      )
        return;
    } catch (e) {
      return false;
    }

    const item = this.object;
    // Check targets and other fields for valid values, reset if necessary
    for (let modifier of droppedData.modifiers) {
      if (!Object.keys(item.getConditionalTargets()).includes(modifier.target)) modifier.target = "";
      let keys;
      for (let [k, v] of Object.entries(modifier)) {
        switch (k) {
          case "subTarget":
            keys = Object.keys(item.getConditionalSubTargets(modifier.target));
            break;
          case "type":
            keys = Object.keys(item.getConditionalModifierTypes(modifier.target));
            break;
          case "critical":
            keys = Object.keys(item.getConditionalCritical(modifier.target));
            break;
        }
        if (!keys?.includes(v)) v = keys?.[0] ?? "";
      }
    }

    const conditionals = item.system.conditionals || [];
    await this.object.update({ "system.conditionals": conditionals.concat([droppedData]) });
  }
  async _onConditionalControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new conditional
    if (a.classList.contains("add-conditional")) {
      await this._onSubmit(event);
      const conditionals = this.item.system.conditionals || [];
      return this.item.update({ "system.conditionals": conditionals.concat([Item35E.defaultConditional]) });
    }

    // Remove a conditional
    if (a.classList.contains("delete-conditional")) {
      await this._onSubmit(event);
      const li = a.closest(".conditional");
      const conditionals = duplicate(this.item.system.conditionals);
      conditionals.splice(Number(li.dataset.conditional), 1);
      return this.item.update({ "system.conditionals": conditionals });
    }

    // Add a new conditional modifier
    if (a.classList.contains("add-conditional-modifier")) {
      await this._onSubmit(event);
      const li = a.closest(".conditional");
      const conditionals = this.item.system.conditionals;
      conditionals[Number(li.dataset.conditional)].modifiers.push(Item35E.defaultConditionalModifier);
      // duplicate object to ensure update
      return this.item.update({ "system.conditionals": duplicate(conditionals) });
    }

    // Remove a conditional modifier
    if (a.classList.contains("delete-conditional-modifier")) {
      await this._onSubmit(event);
      const li = a.closest(".conditional-modifier");
      const conditionals = duplicate(this.item.system.conditionals);
      conditionals[Number(li.dataset.conditional)].modifiers.splice(Number(li.dataset.modifier), 1);
      return this.item.update({ "system.conditionals": conditionals });
    }
  }
}
