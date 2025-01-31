export const CACHE = {};

CACHE.ClassFeatures = new Map()
CACHE.AllClassFeatures = []
CACHE.RacialFeatures = new Map()
CACHE.AllRacialFeatures = []
CACHE.AllAbilities = new Map()
CACHE.Materials = new Map()
CACHE.DamageTypes = new Map()

export const addClassAbilitiesFromPackToCache = async function(itemPack) {
    const entities = await itemPack.getDocuments();
    for (let e of entities) {
        //e.pack = packName;
        if (e.system.associations !== undefined && e.system.associations.classes !== undefined) {
            e.system.associations.classes.forEach(cl => {
                if (!CACHE.ClassFeatures.has(cl[0]))
                    CACHE.ClassFeatures.set(cl[0], [])
                CACHE.ClassFeatures.get(cl[0]).push(e)
            })
        }
        if (e.system.uniqueId) {
            CACHE.AllAbilities.set(e.system.uniqueId, e)
            CACHE.AllClassFeatures.push(e);
        }
    }

}

export const addRacialAbilitiedFromPackToCache = async function (itemPack) {
    const entities = await itemPack.getDocuments();
    for (let e of entities) {
        //e.pack = packName;
        if (e.system.tags !== undefined) {
            e.system.tags.forEach(cl => {
                if (!CACHE.RacialFeatures.has(cl[0]))
                    CACHE.RacialFeatures.set(cl[0], [])
                CACHE.RacialFeatures.get(cl[0]).push(e)
            })
        }
        if (e.system.uniqueId) {
            CACHE.AllAbilities.set(e.system.uniqueId, e)
            CACHE.AllRacialFeatures.push(e);
        }
    }

}

export const rebuildCache = async function() {
    CACHE.ClassFeatures = new Map()
    CACHE.AllClassFeatures = []
    CACHE.RacialFeatures = new Map()
    CACHE.AllRacialFeatures = []
    CACHE.AllAbilities = new Map()
    CACHE.Materials = new Map()
    CACHE.DamageTypes = new Map()
    return buildCache();
}

export const buildCache = async function() {

    //console.log("D35E | Building Caches for compendiums...")
    ui.notifications.info(`Building Caches for compendiums...`);

    for (const entry of game.packs.entries()) {
        const packName = entry[0];
        const itemPack = entry[1];

        if (packName.endsWith('.class-abilities')) {
            addClassAbilitiesFromPackToCache(itemPack);
            continue;
        }

        if (packName.endsWith('.racial-abilities')) {
            addRacialAbilitiedFromPackToCache(itemPack);
            continue;
        }

        if (packName.endsWith('.spelllike-abilities') || packName.endsWith('.spell-like-abilities') || packName.endsWith('.spelllike')) {
            const entities = await itemPack.getDocuments();
            for (let e of entities) {
                //e.pack = packName;
                if (e.system.tags !== undefined) {
                    e.system.tags.forEach(cl => {
                        if (!CACHE.RacialFeatures.has(cl[0]))
                            CACHE.RacialFeatures.set(cl[0], [])
                        CACHE.RacialFeatures.get(cl[0]).push(e)
                    })
                }
                if (e.system.uniqueId) {
                    CACHE.AllAbilities.set(e.system.uniqueId, e)
                    CACHE.AllRacialFeatures.push(e);
                }
            }
            continue;
        }

        if (packName.endsWith('.materials')) {
            const entities = await itemPack.getDocuments();
            for (let e of entities) {
                //e.pack = packName;
                if (e.system.uniqueId) {
                    CACHE.Materials.set(e.system.uniqueId, e)
                }
            }
            continue;
        }

        if (packName.endsWith('.damage-types')) {
            const entities = await itemPack.getDocuments();
            for (let e of entities) {
                //e.pack = packName;
                if (e.system.uniqueId) {
                    CACHE.DamageTypes.set(e.system.uniqueId, e)
                }
            }
            continue;
        }
    };

    ui.notifications.info(`Building Caches for compendiums finished!`);
    //console.log("D35E | Building Caches for finished!")
}
