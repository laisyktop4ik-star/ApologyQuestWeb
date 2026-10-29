import test from 'node:test';
import assert from 'node:assert/strict';
import { QuestSystem } from '../src/game/QuestSystem.js';

test('quest flow requires signpost, three memories, chase and safe zone in order', () => {
  const quest = new QuestSystem();
  assert.equal(quest.stage, 'find-trail');
  assert.equal(quest.collectMemory('photo'), false);

  assert.equal(quest.activateSignpost(), true);
  assert.equal(quest.stage, 'memories');
  assert.equal(quest.collectMemory('photo'), true);
  assert.equal(quest.collectMemory('photo'), false);
  assert.equal(quest.collectMemory('letter'), true);
  assert.equal(quest.collectMemory('gift'), true);
  assert.equal(quest.stage, 'find-path');

  assert.equal(quest.enterBearZone(), true);
  assert.equal(quest.stage, 'escape-bear');
  assert.equal(quest.reachSafeZone(), true);
  assert.equal(quest.stage, 'final-clearing');
  assert.equal(quest.openFinalLetter(), true);
  assert.equal(quest.stage, 'complete');
});

test('checkpoint restores chase state without resetting collected memories', () => {
  const quest = new QuestSystem();
  quest.activateSignpost();
  for (const id of ['photo', 'letter', 'gift']) quest.collectMemory(id);
  quest.enterBearZone();
  const checkpoint = quest.createCheckpoint();
  quest.reachSafeZone();
  quest.restoreCheckpoint(checkpoint);

  assert.equal(quest.stage, 'escape-bear');
  assert.deepEqual([...quest.memories].sort(), ['gift', 'letter', 'photo']);
});
