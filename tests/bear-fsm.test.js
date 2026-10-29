import test from 'node:test';
import assert from 'node:assert/strict';
import { BearFSM } from '../src/ai/BearFSM.js';

test('bear transitions through alert, chase, search and return', () => {
  const bear = new BearFSM({ alertDelay: 0.5, searchDuration: 2 });
  assert.equal(bear.state, 'idle');

  bear.update(0.1, { playerVisible: true, distance: 12, inHomeRange: true });
  assert.equal(bear.state, 'alert');
  bear.update(0.6, { playerVisible: true, distance: 12, inHomeRange: true });
  assert.equal(bear.state, 'chase');
  bear.update(0.1, { playerVisible: false, distance: 15, inHomeRange: true });
  assert.equal(bear.state, 'search');
  bear.update(2.1, { playerVisible: false, distance: 30, inHomeRange: false });
  assert.equal(bear.state, 'return');
  bear.update(0.1, { playerVisible: false, distance: 0, inHomeRange: true });
  assert.equal(bear.state, 'idle');
});

test('bear attacks only at close range and cooldown prevents repeated hits', () => {
  const bear = new BearFSM({ alertDelay: 0, attackDistance: 1.8, attackCooldown: 1 });
  bear.forceChase();
  let result = bear.update(0.1, { playerVisible: true, distance: 1.2, inHomeRange: true });
  assert.equal(bear.state, 'attack');
  assert.equal(result.didAttack, true);

  result = bear.update(0.2, { playerVisible: true, distance: 1.2, inHomeRange: true });
  assert.equal(result.didAttack, false);
  bear.update(1.1, { playerVisible: true, distance: 3, inHomeRange: true });
  assert.equal(bear.state, 'chase');
});
