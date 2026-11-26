import test from 'node:test';
import assert from 'node:assert/strict';
import { applyChoice, availableTargets, cast, chapters, finishScene, outcomes, sceneFor, targets } from '../src/story.js';
import { newJourney } from '../src/save.js';

function completeScene(state, id, replyIndex = 0) {
  const scene = sceneFor(id, state);
  assert.ok(scene.length);
  for (const item of scene) {
    assert.ok(cast[item.speaker], item.speaker);
    assert.equal(typeof item.text, 'string');
    if (item.choices) state = applyChoice(state, item.choices[replyIndex]);
  }
  return finishScene(state, id);
}

test('chapter progression is safe in either market order and a wrong organ answer can be retried', () => {
  let state = newJourney('Courier');
  assert.deepEqual(availableTargets(state).map(item => item.id), ['manifest', 'arrival']);
  state = completeScene(state, 'arrival');
  state = completeScene(state, 'ren');
  assert.equal(state.act, 1);
  state = completeScene(state, 'yun');
  assert.equal(state.act, 2);
  assert.deepEqual(availableTargets(state).map(item => item.id), ['cylinder', 'floodmark']);
  state = completeScene(state, 'cylinder');
  const wrongAnswer = completeScene(state, 'organ', 1);
  assert.deepEqual(wrongAnswer, state);
  state = completeScene(wrongAnswer, 'organ', 0);
  assert.equal(state.act, 3);
  assert.deepEqual(state.position, chapters[3].spawn);
  assert.deepEqual(availableTargets(state).map(item => item.id), ['confession', 'logbook']);
});

for (const [routeIndex, route] of ['yun', 'ren', 'friends'].entries()) {
  for (const [endingIndex, ending] of Object.keys(outcomes).entries()) {
    test(route + ' route reaches ' + ending + ' and completes the epilogue', () => {
      let state = newJourney('Courier');
      for (const id of ['arrival', 'yun', 'ren', 'cylinder', 'organ']) state = completeScene(state, id);
      state = completeScene(state, 'confession', routeIndex);
      assert.equal(state.route, route);
      state = completeScene(state, 'broadcast', endingIndex);
      assert.equal(state.ending, ending);
      assert.equal(state.act, 4);
      assert.equal(state.completed, false);
      state = completeScene(state, 'farewell');
      assert.equal(state.completed, true);
      assert.equal(state.done.length, targets.filter(target => !target.optional).length);
      assert.deepEqual(availableTargets(state), []);
    });
  }
}

test('optional discoveries persist and never advance a chapter on their own', () => {
  let state = completeScene(newJourney('信使奶龙'), 'manifest');
  assert.deepEqual(state.done, ['manifest']);
  assert.equal(state.act, 0);
  state = completeScene(state, 'arrival');
  assert.equal(state.act, 1);
  assert.deepEqual(state.done, ['manifest', 'arrival']);
});
