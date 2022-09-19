export class Equipement35E extends ItemPF {
    constructor(...args) {
        super(...args);

        this.extensionMap.set("enhancement",new ItemEnhancements(this));
    }
}