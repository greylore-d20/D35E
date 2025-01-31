import { ActorPF } from "../actor/entity.js";
import { D35E } from "../config.js";
import { Roll35e } from "../roll.js";
import { ActorSheetPFNPCCombat } from "../actor/sheets/npc-combat.js";

export class CombatantD35E extends Combatant {
  constructor(...args) {
    super(...args);
  }

  resetPerRoundCounters() {
    if (this.actor) {
      this.setFlag("D35E", "aaoCount", 1);
      this.setFlag("D35E", "usedAaoCount", 0);
      this.setFlag("D35E", "usedAttackAction", false);
      this.setFlag("D35E", "usedMoveAction", false);
      this.setFlag("D35E", "usedSwiftAction", false);
    }
  }

  useAttackAction() {
    let isMyTurn = game.combats?.active?.current.combatantId === this.id;
    if (isMyTurn) {
      this.setFlag("D35E", "usedAttackAction", true);
    } else {
      const usedAao = this.getFlag("D35E", "usedAaoCount") ?? 0;
      this.setFlag("D35E", "usedAaoCount", usedAao + 1);
    }
  }

  useAction(activationCost) {
    if (activationCost.type === "attack" || activationCost.type === "standard") {
      this.useAttackAction();
    } else if (activationCost.type === "swift") {
      this.setFlag("D35E", "usedASwiftAction", true);
    }
  }

  useFullAttackAction() {
    this.setFlag("D35E", "usedAttackAction", true);
    this.setFlag("D35E", "usedMoveAction", true);
    this.update({});
  }

  get usedAttackAction() {
    /* our turn is over this round if we have ended item
     * or have been marked defeated */
    return this.getFlag("D35E", "usedAttackAction") ?? false;
  }

  get usedMoveAction() {
    /* our turn is over this round if we have ended item
     * or have been marked defeated */
    return this.getFlag("D35E", "usedMoveAction") ?? false;
  }

  get usedSwiftAction() {
    /* our turn is over this round if we have ended item
     * or have been marked defeated */
    return this.getFlag("D35E", "usedSwiftAction") ?? false;
  }

  get usedAllAao() {
    /* our turn is over this round if we have ended item
     * or have been marked defeated */
    return this.getFlag("D35E", "usedAaoCount") === this.getFlag("D35E", "aaoCount") ?? false;
  }

  get isNPC() {
    if (!this.actor) return false;
    return this.actor.type !== "character";
  }
}

export class CombatD35E extends Combat {
  constructor(...args) {
    super(...args);
    this.buffs = new Map();
    this.npcSheet = null;
  }

  /**
   * Override the default Initiative formula to customize special behaviors of the game system.
   * Apply advantage, proficiency, or bonuses where appropriate
   * Apply the dexterity score as a decimal tiebreaker if requested
   * See Combat._getInitiativeFormula for more detail.
   *
   * @param {ActorPF} actor
   */
  _getInitiativeFormula(actor) {
    const defaultParts = ["1d20", "@attributes.init.total", "@attributes.init.total / 100"];
    const parts = CONFIG.Combat.initiative.formula ? CONFIG.Combat.initiative.formula.split(/\s*\+\s*/) : defaultParts;
    if (!actor) return parts[0] ?? "0";
    return parts.filter((p) => p !== null).join(" + ");
  }

  /**
   * @override
   */
  async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
    // Structure input data
    ids = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant?.id;
    if (!formula) formula = this._getInitiativeFormula(this.combatant?.actor);

    let overrideRollMode = null,
      bonus = "",
      stop = false;
    if (game.D35E.showInitiativePrompt) {
      const dialogData = await Combat.implementation.showInitiativeDialog(formula);
      overrideRollMode = dialogData.rollMode;
      bonus = dialogData.bonus || "";
      stop = dialogData.stop || false;
    }

    if (stop) return this;
    let updates = [];
    let messages = [];
    // Iterate over Combatants, performing an initiative roll for each
    let i = 0;
    for (let id of ids) {
      // Get Combatant data
      const c = this.combatants.get(id);
      if (!c) return results;
      const actorData = c.actor ? c.actor.system : {};
      formula = formula || this._getInitiativeFormula(c.actor ? c.actor : null);

      actorData.bonus = bonus;
      // Add bonus
      if (bonus.length > 0 && i === 0) {
        formula += " + @bonus";
      }

      // Roll initiative
      const rollMode =
        overrideRollMode != null
          ? overrideRollMode
          : messageOptions.rollMode || c.token.hidden || c.hidden
          ? "gmroll"
          : "roll";
      const roll = Roll35e.safeRoll(formula, actorData);
      if (roll.err) ui.notifications.warn(roll.err.message);
      updates.push({ _id: id, initiative: roll.total });

      const [notes, notesHTML] = c.actor.getInitiativeContextNotes();

      // Create roll template data
      const rollData = mergeObject(
        {
          user: game.user.id,
          formula: roll.formula,
          tooltip: await roll.getTooltip(),
          total: roll.total,
        },
        notes.length > 0 ? { hasExtraText: true, extraText: notesHTML } : {}
      );

      // Create chat data
      const chatData = mergeObject(
        {
          user: game.user.id,
          type: CONST.CHAT_MESSAGE_TYPES.CHAT,
          rollMode: rollMode,
          sound: CONFIG.sounds.dice,
          speaker: {
            scene: canvas.scene.id,
            actor: c.actor ? c.actor.id : null,
            token: c.token.id,
            alias: c.token.name,
          },

          flavor: game.i18n.localize("D35E.RollsForInitiative").format(c.token.name),
          roll: roll,
          content: await renderTemplate("systems/D35E/templates/chat/roll-ext.html", rollData),
        },
        messageOptions
      );
      setProperty(chatData, "flags.D35E.subject.core", "init");

      // Handle different roll modes
      ChatMessage.applyRollMode(chatData, chatData.rollMode);

      if (i > 0) chatData.sound = null; // Only play 1 sound for the whole set
      messages.push(chatData);
      i++;
    }
    if (!updates.length) return this;

    // Update multiple combatants
    await this.updateEmbeddedDocuments("Combatant", updates);

    // Add enabled, existing buffs to combat tracker
    for (let id of ids) {
      const c = this.combatants.get(id);
      if (!c) continue;
      if (c.actor) {
        for (let buff of c.actor.trackedBuffs) {
          await this.addBuffToCombat(buff, c.actor);
        }
      }
    }

    // Ensure the turn order remains with the same combatant
    if (updateTurn) await this.update({ turn: this.turns.findIndex((t) => t.id === currentId) });

    // Create multiple chat messages
    await ChatMessage.create(messages);

    // Return the updated Combat
    return this;
  }

  async deleteEmbeddedDocuments(type, documents) {
    await super.deleteEmbeddedDocuments(type, documents);
    Hooks.callAll("updateCombat", this, this.combatant);
    this.updateCombatCharacterSheet();
  }

  static showInitiativeDialog = function (formula = null) {
    return new Promise((resolve) => {
      const template = "systems/D35E/templates/chat/roll-dialog.hbs";
      let rollMode = game.settings.get("core", "rollMode");
      const dialogData = {
        formula: formula ? formula : "",
        rollMode: rollMode,
        rollModes: CONFIG.Dice.rollModes,
      };
      // Create buttons object
      const buttons = {
        normal: {
          label: "Roll",
          callback: (html) => {
            rollMode = html.find('[name="rollMode"]').val();
            const bonus = html.find('[name="bonus"]').val();
            resolve({ rollMode: rollMode, bonus: bonus });
          },
        },
      };
      // Show dialog
      renderTemplate(template, dialogData).then((dlg) => {
        new Dialog(
          {
            title: game.i18n.localize("D35E.InitiativeBonus"),
            content: dlg,
            buttons: buttons,
            default: "normal",
            close: (html) => {
              resolve({ stop: true });
            },
          },
          {
            classes: ["dialog", "D35E", "roll-initiative"],
          }
        ).render(true);
      });
    });
  };

  /**
   * Process current combatant: expire active effects & buffs.
   */
  async _processCurrentCombatant() {
    try {
      const actor = this.combatant.actor;
      const buffId = this.combatant?.flags?.D35E?.buffId;
      if (actor != null) {
        await actor.progressRound();
      } else if (buffId) {
        let actor;
        if (this.combatant?.flags?.D35E?.isToken) {
          actor = canvas.scene.tokens.get(this.combatant?.flags?.D35E?.tokenId).actor;
        } else {
          actor = game.actors.get(this.combatant?.flags?.D35E?.actor);
        }
        await actor.progressBuff(buffId, 1);
        await this.nextTurn();
      }
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * @override
   * @returns {Promise<Combat>}
   */
  async nextRound() {
    const combat = await super.nextRound();
    await this._resetPerRoundCounter();
    // TODO: Process skipped turns.
    await this._processCurrentCombatant();
    return combat;
  }

  updateCombatCharacterSheet() {
    if (game.settings.get("D35E", "useCombatCharacterSheet")) {
      if (this.combatant.actor) {
        if (this.npcSheet == null) {
          this.npcSheet = new ActorSheetPFNPCCombat(this.combatant.actor);
        } else {
          this.npcSheet.object = this.combatant.actor;
        }
        this.npcSheet.render(true);
      }
    }
  }

  /**
   * @override
   * @returns {Promise<Combat>}
   */
  async nextTurn() {
    const combat = await super.nextTurn();
    await this._processCurrentCombatant();
    return combat;
  }

  async addBuffToCombat(buff, actor) {
    for (let combatant of this.combatants) {
      if (this.combatant?.flags?.D35E?.buffId === buff.id) {
        await combatant.update({ initiative: this.combatant.initiaitve + 0.01 });
        return;
      }
    }
    let buffDelta = 0.01;
    if (buff.system.timeline.tickOnEnd) buffDelta = -0.01;
    let buffCombatant = (
      await this.createEmbeddedDocuments("Combatant", [
        {
          name: buff.name,
          img: buff.img,
          initiative: this.combatant.initiative + buffDelta,
          flags: {
            D35E: {
              buffId: buff.id,
              actor: actor.id,
              isToken: actor.isToken,
              tokenId: actor?.token?.id,
              actorImg: actor.img,
              actorName: actor.name,
            },
          },
        },
      ])
    )[0];
  }

  async removeBuffFromCombat(buff) {
    try {
      let combatantsToDelete = [];
      for (let combatant of this.combatants) {
        if (combatant?.flags?.D35E?.buffId === buff.id) {
          combatantsToDelete.push(combatant.id);
        }
      }
      await this.deleteEmbeddedDocuments("Combatant", combatantsToDelete);
    } catch (error) {
      console.error(error);
    }
  }

  async _resetPerRoundCounter() {
    for (let combatant of this.combatants) {
      combatant.resetPerRoundCounters();
    }
  }
}
