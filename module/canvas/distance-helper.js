export class DistanceHelper {
  static getDistance(target, source, wallblocking = false) {
    let distanceRay = Ray.fromArrays([source.center.x, source.center.y], [target.center.x, target.center.y]);
    return distanceRay.distance
  }

  static getSurroundingTokens(token, distance = 0, minDistance = 0, distanceInFeet = false) {
    if (distance === 0) {
      distance = canvas.grid.size * 4
    }
    if (distanceInFeet) {
      distance = Math.ceil(distance / canvas.dimensions.distance) * canvas.dimensions.size
      minDistance = Math.ceil(minDistance / canvas.dimensions.distance) * canvas.dimensions.size
    }
    let originalDistance = distance
    let originalMinDistance = minDistance
    distance -= canvas.grid.size * 0.1
    minDistance += canvas.grid.size * 0.1
    const {size} = canvas.scene.getDimensions();
    const square = new PIXI.Rectangle(
        token.x - distance, //  x coord top left
        token.y - distance, //  y coord top left
        token.w+(2*distance), // width of token + 2 squares
        token.w+(2*distance) // height of token + 2 squares
    );

    const originalSquare = new PIXI.Rectangle(
        token.x - originalDistance, //  x coord top left
        token.y - originalDistance, //  y coord top left
        token.w+(2*originalDistance), // width of token + 2 squares
        token.w+(2*originalDistance) // height of token + 2 squares
    );

    const originalMinSquare = new PIXI.Rectangle(
        token.x - originalMinDistance, //  x coord top left
        token.y - originalMinDistance, //  y coord top left
        token.w+(2*originalMinDistance), // width of token + 2 squares
        token.w+(2*originalMinDistance) // height of token + 2 squares
    );

    const minSquare = new PIXI.Rectangle(
        token.x - minDistance, //  x coord top left
        token.y - minDistance, //  y coord top left
        token.w+(2*minDistance), // width of token + 2 squares
        token.w+(2*minDistance) // height of token + 2 squares
    );
      //console.log(square)
    // remove all "boundingCheck" graphics
    canvas.layers.find((l) => l.name === "DrawingsLayer").children.filter((i) => i.boundingCheck).forEach((i) => i.destroy());
    let g = new PIXI.Graphics();
    g.beginFill("red", 0.2).drawRect(originalSquare.x, originalSquare.y, originalSquare.width, originalSquare.height).beginHole().drawRect(originalMinSquare.x, originalMinSquare.y, originalMinSquare.width, originalMinSquare.height).endHole();
    let check = canvas.layers.find((l) => l.name === "DrawingsLayer").addChild(g);
    check.boundingCheck = true;


    let tokens = canvas.tokens.placeables.filter(e => square.contains(e.center.x, e.center.y) && e.id  !== token.document.id);
    // get all tokens that are in the expanded square (- the tokens that are in the square)
    for (let i = 1; i < 3; i++) {
      let expandedDistance = distance + canvas.grid.size * i
      let expandedSquare = new PIXI.Rectangle(
          token.x - expandedDistance, //  x coord top left
          token.y - expandedDistance, //  y coord top left
          token.w + (2 * expandedDistance), // width of token + 2 squares
          token.w + (2 * expandedDistance) // height of token + 2 squares
      );
      let expandedTokens = canvas.tokens.placeables.filter(
          e => expandedSquare.contains(e.center.x, e.center.y) && e.id !==
              token.document.id);
      // remove tokens that are in the square
      expandedTokens = expandedTokens.filter(
          e => !square.contains(e.center.x, e.center.y))
      // for each expanded token, draw a small circle around it

      // remove tokens that are too small (their size is less than i + 1 squares)
      expandedTokens = expandedTokens.filter(
          e => e.w >= (canvas.grid.size * (i + 1)))
      tokens = tokens.concat(expandedTokens)

      let g3 = new PIXI.Graphics();
      g3.beginFill("orange", 0.1*i).drawRect(expandedSquare.x, expandedSquare.y, expandedSquare.width, expandedSquare.height).beginHole().drawRect(square.x, square.y, square.width, square.height).endHole();
      //let check3 = canvas.layers.find((l) => l.name === "DrawingsLayer").addChild(g3);
      //check3.boundingCheck = true;
    }
    // now remove all tokens that are too small - their
    // remove tokens that are too close
    tokens = tokens.filter(e => !minSquare.contains(e.center.x, e.center.y))
    // for each token, draw a small circle around it
    tokens.forEach(e => {
      let g2 = new PIXI.Graphics();
      g2.beginFill("red", 0.5).drawCircle(e.center.x, e.center.y, e.w/2);
      let check2 = canvas.layers.find((l) => l.name === "DrawingsLayer").addChild(g2);
      check2.boundingCheck = true;
    });
    console.log("D35E | Found surrounding tokens: ", tokens)
    return tokens
  }

  static clearThreatenedTokensGraphics() {
    canvas.layers.find((l) => l.name === "DrawingsLayer").children.filter((i) => i.boundingCheck).forEach((i) => i.destroy());
  }

  static getThreatenedTokens(token) {
    // get actor from token
    let actor = token.actor
    //console.log("D35E | Getting threatened tokens for actor: ", actor)
    // get actors first equipped melee weapon
    let distance = 5
    let minDistance = 0;
    let weapon = actor.items.find(i => i.type === "weapon" && i.system.equipped && i.system.weaponSubtype !== "ranged")
    // if there is no weapon, check if there is actor.system.traits.reach value
    if (!weapon) {
      if (actor.system.traits.reach) {
        distance = parseInt(actor.system.traits.reach)
      }
    } else {
      // if weapon has reach, then minDistance is 5 and distance is 10
      if (weapon.system.properties.rch) {
        minDistance = 5
        distance = 10
      }
    }
    //console.log("D35E | Using distance: ", distance, " and minDistance: ", minDistance)
    var tokens = this.getSurroundingTokens(token, distance, minDistance, true)
    // get only tokens that have the opposite disposition
    tokens = tokens.filter(t => t.document.disposition !== token.document.disposition)
    return tokens;
  }

  static isThreatened(token, enemy) {
    let threatenedTokens = this.getThreatenedTokens(token)
    //console.log("D35E | Checking if enemy is threatened by token: ", token, " enemy: ", enemy, " threatened tokens: ", threatenedTokens)
    return threatenedTokens.some(t => t.id === enemy.id)
  }

  static isAttackThreatening(token, attack, target) {
    let actor = token.actor
    let distance = 5
    let minDistance = 0;
    // if there is no weapon, check if there is actor.system.traits.reach value
    if (attack.system.attackType === "natural") {
      if (actor.system.traits.reach) {
        distance = parseInt(actor.system.traits.reach)
      }
    } else {
      // if weapon has reach, then minDistance is 5 and distance is 10
      let weapon = actor.items.get(attack.system.originalWeaponId)
      if (weapon.system.properties.rch) {
        minDistance = 5
        distance = 10
      }
    }
    console.log("D35E | Using distance: ", distance, " and minDistance: ", minDistance)
    var tokens = this.getSurroundingTokens(token, distance, minDistance, true)
    console.log("D35E | Tokens that are threatened by attack: ", tokens, " target: ", target, "isThreatened: ", tokens.some(t => t.id === target.id))
    // check if tokens contains target
    return tokens.some(t => t.id === target.id)
  }

  static isFlanking(token, enemy, target, distance = 0, minDistance = 0) {
    // In 3.5e, flanking is a condition where two allies are on opposite sides of an enemy
    // (a ray from one to the other would pass through opposite sides of the enemy's square or two opposite corners)
    // and both allies are threatening the enemy.

    //console.log("D35E | Checking if token and target are flanking enemy for token: ", token, " target: ", target, " enemy: ", enemy, " distance: ", distance, " minDistance: ", minDistance)

    // First, check if the enemy is threatened by both the token (player) and the target (ally)
    if (!this.isThreatened(token, enemy)) return false
    if (!this.isThreatened(target, enemy)) return false

    //console.log("D35E | Both token and target are threatening enemy")

    // Then, check if the enemy is between the token and the target
    // If the token is above the enemy, the target should be below the enemy, and their
    // x-coordinates should be between the enemy's horizontal edges (so token.x should be
    // between enemy.x - enemy.w/2 and enemy.x + enemy.w/2), same with target.x.

    // Check if the token is above enemy (so my y + h is less than enemy.y)
    if (token.x + token.w <= enemy.x && token.y + token.h <= enemy.y) {
      if (target.x >= enemy.x + enemy.w && target.y >= enemy.y + enemy.h) {
        //console.log("case a")
        return true
      }
    } else if (token.x >= enemy.x + enemy.w && token.y + token.h <= enemy.y) {
      if (target.x + target.w <= enemy.x && target.y >= enemy.y + enemy.h) {
        //console.log("case b")
        return true
      }
    } else if (token.x + token.w <= enemy.x && token.y >= enemy.y + enemy.h) {
      if (target.x >= enemy.x + enemy.w && target.y + target.h <= enemy.y) {
        //console.log("case c")
        return true
      }
    } else if (token.x >= enemy.x + enemy.w && token.y >= enemy.y + enemy.h) {
      if (target.x + target.w <= enemy.x && target.y + target.h <= enemy.y) {
        //console.log("case d")
        return true
      }
    } else if (token.y + token.h <= enemy.y) {
      // Check if the target is below enemy (so target.y is greater than enemy.y)
      //console.log("D35E | Token is above enemy")
      if (target.y >= enemy.y + enemy.h) {
       //console.log("D35E | Target is below enemy")
        // Check the centers of the token and target are between the enemy's horizontal edges
        // (so token.center.x should be between enemy.x and (enemy.x + enemy.w), same with target.center.x
        if ((token.center.x >= enemy.x && token.center.x <= enemy.x + enemy.w) && (target.center.x >= enemy.x && target.center.x <= enemy.x + enemy.w)) {
          //console.log("D35E | Token and target are on opposite sides of enemy")
          return true
        }
      }
    } else if (token.y >= enemy.y + enemy.h) {
      // Check if the target is above enemy (so target.y + target.h is less than enemy.y)
      //console.log("D35E | Token is below enemy")
      if (target.y + target.h <= enemy.y) {
        //console.log("D35E | Target is above enemy")
        // Check the centers of the token and target are between the enemy's horizontal edges
        // (so token.center.x should be between enemy.x and (enemy.x + enemy.w), same with target.center.x
        if ((token.center.x >= enemy.x && token.center.x <= enemy.x + enemy.w) && (target.center.x >= enemy.x && target.center.x <= enemy.x + enemy.w)) {
          //console.log("D35E | Token and target are on opposite sides of enemy")
          return true
        }
      }
    } else if (token.x + token.w <= enemy.x) {
      // Check if the target is to the right of enemy (so target.x is greater than enemy.x)
      //console.log("D35E | Token is to the left of enemy")
      if (target.x >= enemy.x + enemy.w) {
        //console.log("D35E | Target is to the right of enemy")
        // Check the centers of the token and target are between the enemy's vertical edges
        // (so token.center.y should be between enemy.y and (enemy.y + enemy.h), same with target.center.y
        if ((token.center.y >= enemy.y && token.center.y <= enemy.y + enemy.h) && (target.center.y >= enemy.y && target.center.y <= enemy.y + enemy.h)) {
          //console.log("D35E | Token and target are on opposite sides of enemy")
          return true
        }
      }
    } else if (token.x >= enemy.x + enemy.w) {
      // Check if the target is to the left of enemy (so target.x + target.w is less than enemy.x)
      //console.log("D35E | Token is to the right of enemy")
      if (target.x + target.w <= enemy.x) {
        //console.log("D35E | Target is to the left of enemy")
        // Check the centers of the token and target are between the enemy's vertical edges
        // (so token.center.y should be between enemy.y and (enemy.y + enemy.h), same with target.center.y
        if ((token.center.y >= enemy.y && token.center.y <= enemy.y + enemy.h) && (target.center.y >= enemy.y && target.center.y <= enemy.y + enemy.h)) {
          //console.log("D35E | Token and target are on opposite sides of enemy")
          return true
        }
      }
    }

  }
}
