export class ItemEquipHook {
  static register() {
    Hooks.on("preCreateOwnedItem", (actor, item) => {
      if (!(actor instanceof Actor)) return;
      if (actor.race == null) return;
    });

    Hooks.on("preCreateItem", (item, d, options, user) => {
      if (!(item.parent instanceof Actor)) return;
      if (user !== game.userId) return;
      // we care only about items that are equipped
      if (item.system.equipped === true && ['weapon', 'equipment'].includes(item.type)) {
        /**
         * @hook D35E.ItemEquip.preEquipItem
         * The hook is called before an item is equipped (by the means of creating a new item or updating an existing one)
         * The item has not been changed yet, so you can use this hook to modify the item before it is equipped.
         *
         * Params:
         * @param{item} the item being equipped
         * @param{options} the options passed to the creation of the item
         * @param{user} the user that is equipping the item
         */
        Hooks.call("D35E.ItemEquip.preEquipItem", item, options, user)
      }
    });

    Hooks.on("createItem", (item, options, user) => {
      if (!(item.parent instanceof Actor)) return;
      if (user !== game.userId) return;
      // we care only about items that are equipped
      if (item.system.equipped === true && ['weapon', 'equipment'].includes(item.type)) {
        /**
         * @hook D35E.ItemEquip.postEquipItem
         * The hook is called before an item is equipped (by the means of creating a new item or updating an existing one)
         *
         * Params:
         * @param{item} the item being equipped
         * @param{options} the options passed to the creation of the item
         * @param{user} the user that is equipping the item
         */
        Hooks.call("D35E.ItemEquip.postEquipItem", item, options, user)
      }
    });


    Hooks.on("preDeleteItem", (data, options, user) => {
      if (!(data.parent instanceof Actor)) return;
      if (user !== game.userId) return;
      // deleted items are unequipped
      /**
       * @hook D35E.ItemEquip.preUnequipItem
       * The hook is called before an item is unequipped (by the means of creating a new item or updating an existing one)
       * The item has not been changed yet, so you can use this hook to modify the item before it is unequipped.
       *
       * Params:
       * @param{item} the item being unequipped
       * @param{options} the options passed to the creation of the item
       * @param{user} the user that is equipping the item
       */
      Hooks.call("D35E.ItemEquip.preUnequipItem", data, options, user)
    });

    Hooks.on("deleteItem", (data, options, user) => {
      if (!(data.parent instanceof Actor)) return;
      if (user !== game.userId) return;
      // deleted items are unequipped
      /**
       * @hook D35E.ItemEquip.postUnequipItem
       * The hook is called before an item is unequipped (by the means of creating a new item or updating an existing one)
       *
       * Params:
       * @param{item} the item being unequipped
       * @param{options} the options passed to the creation of the item
       * @param{user} the user that is equipping the item
       */
      Hooks.call("D35E.ItemEquip.postUnequipItem", data, options, user)
    });


    Hooks.on("preUpdateItem", (data, updateData, options, user) => {
      if (!(data.parent instanceof Actor)) return;
      if (user !== game.userId) return;
      if (updateData.system.equipped === undefined) return;
      if (data.system.equipped === true && data.system.equipped != updateData.system.equipped && ['weapon', 'equipment'].includes(data.type)) {
        Hooks.call("D35E.ItemEquip.preEquipItem", data, options, user)
      } else if (data.system.equipped === false && data.system.equipped != updateData.system.equipped && ['weapon', 'equipment'].includes(data.type)) {
        Hooks.call("D35E.ItemEquip.preUnequipItem", data, options, user)
      }
    });

    Hooks.on("updateItem", (data, updateData, options, user) => {
      if (!(data.parent instanceof Actor)) return;
      if (user !== game.userId) return;
      if (updateData.system.equipped === undefined) return;
      if (data.system.equipped === true && ['weapon', 'equipment'].includes(data.type)) {
        Hooks.call("D35E.ItemEquip.postEquipItem", data, options, user)
      } else if (data.system.equipped === false && ['weapon', 'equipment'].includes(data.type)) {
        Hooks.call("D35E.ItemEquip.postUnequipItem", data, options, user)
      }
    });

    ItemEquipHook.registerInternalHooksHandlers();
  }

  /**
   * Register the internal hooks handlers for the ItemEquipHook
   */
  static registerInternalHooksHandlers() {
    Hooks.on("D35E.ItemEquip.postEquipItem", (item, options, user) => {
      if (item.parent && item.type === "weapon") {
        item.parent.createAttackFromWeapon(item, {deleteExistingAttack: false});
      }
    });
  }
}
