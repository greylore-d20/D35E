import "./apps/vision-permission.js";
import { _preProcessDiceFormula } from "./dice.js";
import { ActorPF } from "./actor/entity.js";

const FormApplication_close = FormApplication.prototype.close;

export async function PatchCore() {
  // Patch getTemplate to prevent unwanted indentation in things things like <textarea> elements.
  async function D35E_getTemplate(path) {
    if (!_templateCache.hasOwnProperty(path)) {
      await new Promise((resolve) => {
        game.socket.emit("template", path, (resp) => {
          const compiled = Handlebars.compile(resp.html, { preventIndent: true });
          Handlebars.registerPartial(path, compiled);
          _templateCache[path] = compiled;
          //console.log(`Foundry VTT | Retrieved and compiled template ${path}`);
          resolve(compiled);
        });
      });
    }
    return _templateCache[path];
  }

  // const Token_drawEffects = Token.prototype.drawEffects;
  // Token.prototype.drawEffects = async function() {
  //   let effects = this.effects || this.hud.effects;
  //   effects.removeChildren().forEach(c => c.destroy());
  //   const tokenEffects = this.data.effects;
  //   const actorEffects = this.actor?.temporaryEffects || [];
  //   let overlay = {
  //     src: this.data.overlayEffect,
  //     tint: null
  //   };
  //
  //   // Draw status effects
  //   if ( tokenEffects.length || actorEffects.length ) {
  //     const promises = [];
  //     let w = Math.round(canvas.dimensions.size / 2 / 5) * 2;
  //     let bg = effects.addChild(new PIXI.Graphics()).beginFill(0x000000, 0.40).lineStyle(1.0, 0x000000);
  //     let i = 0;
  //
  //     // Draw actor effects first
  //     for ( let f of actorEffects ) {
  //       if ( !f.data.icon ) continue;
  //       if (f?.data?.flags?.D35E?.show && this.actor?.data?.data?.noBuffDisplay && !this.actor?.testUserPermission(game.user, "OWNER")) continue;
  //       const tint = f.data.tint ? colorStringToHex(f.data.tint) : null;
  //       if ( f.getFlag("core", "overlay") ) {
  //         overlay = {src: f.data.icon, tint};
  //         continue;
  //       }
  //       promises.push(this._drawEffect(f.data.icon, i, bg, w, tint));
  //       i++;
  //     }
  //
  //     // Next draw token effects
  //     for ( let f of tokenEffects ) {
  //       promises.push(this._drawEffect(f, i, bg, w, null));
  //       i++;
  //     }
  //     await Promise.all(promises);
  //   }
  //
  //   // Draw overlay effect
  //   return this._drawOverlay(overlay)
  // }

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
    //console.log("D35E | Calling _calculateMinionDistance")
    ActorMinionsHelper.calculateMinionDistance(this.actor, {});
    // Do something?
  };

  Object.defineProperty(ActiveEffect.prototype, "isTemporary", {
    get: function () {
      const duration = this.data.duration.seconds ?? (this.data.duration.rounds || this.data.duration.turns) ?? 0;
      return duration > 0 || this.getFlag("core", "statusId") || this.getFlag("D35E", "show");
    },
  });

  // Patch, patch, patch
  window.getTemplate = D35E_getTemplate;

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
