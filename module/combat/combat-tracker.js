export class D35ECombatTracker extends CombatTracker {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['D35E'],
            id: "combat",
            template: "systems/D35E/templates/sidebar/combat-tracker.html",
            title: "D35E Combat Tracker",
            scrollY: [".directory-list"]
        });
    }

    async getData() {
        let context = await super.getData();


        /* which turn state are we in? */
        context.playerTurn =  false;
        context.playerStyle = context.playerTurn ? 'active-turn' : 'inactive-turn';
        context.gmStyle = !context.playerTurn ? 'active-turn' : 'inactive-turn';

        /* add in the ended turn flag
         * and other combatant specific
         * info
         */
        let previousActorTurn = "final"
        let activeActorTurnId = ""
        let finalActorTurnId = ""
        context.turns = context.turns.reduce( (acc, turn) => {
            const combatant = context.combat.combatants.get(turn.id);

            /* super does not look at unlinked effects, do that here */
            turn.effects = new Set();
            if ( combatant.token ) {
                combatant.token.actor.effects.forEach(e => turn.effects.add(e));
                if ( combatant.token.data.overlayEffect ) turn.effects.add(combatant.token.data.overlayEffect);
            }

            turn.ended = combatant?.turnEnded ?? true;
            let isActor = !!combatant.actor;
            if (isActor) {
                previousActorTurn = turn.id;
                finalActorTurnId = turn.id;
                turn.usedMoveAction = combatant.usedMoveAction;
                turn.usedAttackAction = combatant.usedAttackAction;
                turn.usedSwiftAction = combatant.usedSwiftAction;
                turn.usedAllAao = combatant.usedAllAao;
                if (turn.active)
                    activeActorTurnId = turn.id;
                turn.zeroHp = combatant.actor.data.data.attributes.hp.value === 0 ? true : false;
                acc["actor"].push(turn);
            }
            else {
                turn.previousActorTurn = previousActorTurn
                turn.actorImage = combatant.data?.flags?.D35E?.actorImg
                turn.actorName = combatant.data?.flags?.D35E?.actorName
                acc["buff"].push(turn);
            }

            return acc;
        },{actor: [], buff: []});

        context.nextTurnBuffs = []
        for (let buff of context.turns.buff) {
            if (buff.previousActorTurn === activeActorTurnId
                || (finalActorTurnId === activeActorTurnId && buff.previousActorTurn === "final"))
                context.nextTurnBuffs.push(buff)
        }

        return context;
    }


}
