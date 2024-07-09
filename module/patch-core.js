import "./apps/vision-permission.js";
import { _preProcessDiceFormula } from "./dice.js";
import { ActorPF } from "./actor/entity.js";

const FormApplication_close = FormApplication.prototype.close;

export async function PatchCore() {

  // Patch FormApplication
  FormApplication.prototype.saveMCEContent = async function (updateData = null) {};

  FormApplication.prototype.close = async function (options = {}) {
    await this.saveMCEContent();
    return FormApplication_close.call(this, options);
  };

  // Patch Roll._replaceData
  if (!isMinimumCoreVersion("0.7.2")) {
    const Roll__replaceData = Roll.prototype._replaceData;
    Roll.prototype._replaceData = function (formula) {
      let result = Roll__replaceData.call(this, formula);
      result = _preProcessDiceFormula(result, this.data);
      return result;
    };
  } else {
    const Roll__identifyTerms = Roll.prototype._identifyTerms;
    Roll.prototype._identifyTerms = function (formula) {
      formula = _preProcessDiceFormula(formula, this.data);
      const terms = Roll__identifyTerms.call(this, formula);
      return terms;
    };
  }

  const Token_animateMovement = Token.prototype.animateMovement;
  Token.prototype.animateMovement = async function (...args) {
    await Token_animateMovement.call(this, ...args);
    //game.D35E.logger.log("Calling _calculateMinionDistance")
    ActorMinionsHelper.calculateMinionDistance(this.actor, {});
    // Do something?
  };

  Object.defineProperty(ActiveEffect.prototype, "isTemporary", {
    get: function () {
      const duration = this.data.duration.seconds ?? (this.data.duration.rounds || this.data.duration.turns) ?? 0;
      return duration > 0 || this.getFlag("core", "statusId") || this.getFlag("D35E", "show");
    },
  });


  const StringTerm_eval = StringTerm.prototype.evaluate;
  StringTerm.prototype.evaluate = async function (...args) {
    return this;
  };

  //patchCoreForLowLightVision()

  import("./lib/intro.js");
}

import { isMinimumCoreVersion } from "./lib.js";
import { patchCoreForLowLightVision } from "./canvas/low-light-vision.js";
patchCoreForLowLightVision();
