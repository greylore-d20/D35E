var assert = require('assert');
const {ActorDamageHelper} = require(
    '../../../module/actor/helpers/actorDamageHelper.js');
describe('ActorDamageHelper', function () {
  describe('mergeDamageTypes', function () {
    it('should correctly merge damage types', function () {
      let inputDamageArray = [
        {damageTypeUid: 'fire', roll: {total: 1}},
        {damageTypeUid: 'cold', roll: {total: 2}},
        {damageTypeUid: 'acid', roll: {total: 3}},
        {damageTypeUid: 'fire', roll: {total: 4}}
      ]
      let expectedDamage = [
          {damageTypeUid: 'fire', roll: {total: 5}},
          {damageTypeUid: 'cold', roll: {total: 2}},
          {damageTypeUid: 'acid', roll: {total: 3}}
      ]
      let damageArray = ActorDamageHelper.mergeDamageTypes(inputDamageArray);
      assert.deepEqual(damageArray, expectedDamage);
    });
  });
});
