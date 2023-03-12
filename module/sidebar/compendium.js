import { CompendiumBrowser } from "../apps/compendium-browser.js";

export class CompendiumDirectoryPF extends CompendiumDirectory {
  static browser;
  constructor(...args) {
    super(...args);

    this.compendium = new CompendiumBrowser({ type: "spells", entityType: "Item" });
    CompendiumDirectoryPF.browser = this;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/D35E/templates/sidebar/compendium.html",
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".compendium-footer .compendium").click((e) => this._onBrowseCompendium(e, "spells", "Item"));
  }

  _onBrowseCompendium(event, type, entityType, filters = {}) {
    event.preventDefault();

    CompendiumDirectoryPF.browser.compendium.preset(type, entityType, filters);
    this.compendium._render(true);
  }

  static browseCompendium(type, entityType, filters = {}) {
    CompendiumDirectoryPF.browser.compendium.preset(type, entityType, filters);
    CompendiumDirectoryPF.browser.compendium._render(true);
  }
}
