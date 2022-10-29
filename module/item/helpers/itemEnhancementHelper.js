export class ItemEnhancementHelper {
    static getEnhancementData(enhancement) {
        return mergeObject(enhancement.data || {}, enhancement.system || {});
    }
}
