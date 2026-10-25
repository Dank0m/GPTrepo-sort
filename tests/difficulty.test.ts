import test from 'node:test';
import assert from 'node:assert/strict';
import { shiftDifficulty, conveyorPace } from '../src/game/difficulty.ts';
import { emptyLevels } from '../src/game/upgrades.ts';

test('successful sorts raise difficulty without purchases and cap at shift 10', () => {
  assert.equal(shiftDifficulty(19).stage,1);
  assert.equal(shiftDifficulty(20).stage,2);
  assert.equal(shiftDifficulty(179).stage,9);
  assert.equal(shiftDifficulty(180).stage,10);
  assert.equal(shiftDifficulty(100000).stage,10);
  assert.equal(shiftDifficulty(NaN).stage,1);
  assert.equal(shiftDifficulty(-10).remaining,20);
  const levels = emptyLevels();
  let previous = conveyorPace(0,levels,800,64);
  for(let sorted=20;sorted<=180;sorted+=20) {
    const next=conveyorPace(sorted,levels,800,64);
    assert.ok(next.speed>previous.speed);
    assert.ok(next.interval<previous.interval);
    previous=next;
  }
  assert.deepEqual(levels,emptyLevels());
});

test('screen width does not reduce reaction time, max upgrades stay bounded and shapes cannot overlap', () => {
  const levels = {...emptyLevels(),speed:4,buffer:3};
  for(const sorted of [0,20,180,1000]) {
    const mobile=conveyorPace(sorted,levels,300,64);
    const desktop=conveyorPace(sorted,levels,1200,64);
    assert.equal(300/mobile.speed,1200/desktop.speed);
    assert.ok(mobile.interval>=.35);
    assert.ok(mobile.gap>=76);
    assert.ok(mobile.speed<180);
  }
  assert.ok(conveyorPace(0,levels,300,64).gap>conveyorPace(0,emptyLevels(),300,64).gap);
});
