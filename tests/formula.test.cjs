'use strict';

// Run with: node --test tests/formula.test.cjs
// The production page remains one standalone file. These tests evaluate its
// independent chemistry and session modules without loading the interface.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function section(start, end) {
  const begin = html.indexOf(start);
  const finish = html.indexOf(end, begin + start.length);
  assert.ok(begin >= 0 && finish > begin, `Missing source markers: ${start}`);
  return html.slice(begin, finish);
}
let seed = 0x4e514955;
const seededMath = Object.create(Math);
seededMath.random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 0x100000000;
};
const boxes = new Map();
const sandbox = vm.createContext({
  Math: seededMath,
  console: { log() {}, error() {} },
  window: {},
  $: id => {
    if (!boxes.has(id)) boxes.set(id, { innerHTML: '' });
    return boxes.get(id);
  }
});
const source = [
  section('const ROOTS =', 'const state ='),
  section('/* NQ_FORMULA_CORE_START */', '/* NQ_FORMULA_CORE_END */'),
  section('/* NQ_FORMULA_SESSION_START */', '/* NQ_FORMULA_SESSION_END */'),
  section('function runSelfTests()', '/* boot */'),
  'globalThis.exports = {F:NQFormula,S:NQFormulaSession,generate,generateOx,customCfg,runSelfTests,runAlcoholTests,runCarbonylTests,runAcidTests,runCustomTests};'
].join('\n');
new vm.Script(source, { filename: 'index.html:independent-modules' }).runInContext(sandbox);
const { F, S, generate, generateOx, customCfg, ...legacy } = sandbox.exports;
const plain = value => JSON.parse(JSON.stringify(value));
const clone = plain;
const chain = (n, subs = [], bonds = [], fg) => ({kind: 'chain', n, bonds, subs, ...(fg ? {fg} : {})});
const draft = (...args) => F.fromMol(chain(...args));

function apply(current, action, unit = 'hc') {
  const before = JSON.stringify(current);
  const result = F.apply(current, action, unit);
  assert.equal(JSON.stringify(current), before, `Mutation by ${JSON.stringify(action)}`);
  assert.equal(result.ok, true, `${JSON.stringify(action)}: ${result.message}`);
  return result.draft;
}
function construct(mol, unit) {
  let current = apply(F.empty(), {type: 'skeleton', kind: mol.kind, n: mol.n}, unit);
  for (const bond of mol.bonds || []) current = apply(current, {type: 'bond', ...bond}, unit);
  for (const sub of mol.subs || []) current = apply(current, {type: 'addSub', ...sub}, unit);
  if (mol.fg) current = apply(current, {type: 'addGroup', pos: mol.fg.pos, groupType: mol.fg.type}, unit);
  return current;
}
function reversed(mol) {
  return {
    ...clone(mol),
    bonds: (mol.bonds || []).map(b => ({...b, pos: mol.n - b.pos})),
    subs: (mol.subs || []).map(s => ({...s, pos: mol.n + 1 - s.pos})),
    ...(mol.fg ? {fg: {...mol.fg, pos: mol.n + 1 - mol.fg.pos}} : {})
  };
}
function reindexRing(mol, offset, reflected) {
  const vertex = pos => (((reflected ? -1 : 1) * (pos - 1) + offset) % mol.n + mol.n) % mol.n + 1;
  return {...clone(mol), subs: mol.subs.map(s => ({...s, pos: vertex(s.pos)}))};
}

test('the complete inline application scripts parse, including interface integration', () => {
  const scripts = Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi));
  assert.ok(scripts.length > 0, 'The standalone page must contain application scripts');
  scripts.forEach((match, i) => {
    assert.doesNotThrow(() => new vm.Script(match[1], {filename: `index.html:inline-script-${i + 1}`}));
  });
});

test('all 93 existing nomenclature and custom-generator checks still pass', () => {
  let total = 0;
  for (const [name, run] of Object.entries(legacy)) {
    const result = run();
    assert.equal(result.pass, result.total, `${name}: ${JSON.stringify(result.fails)}`);
    total += result.total;
  }
  assert.equal(total, 93);
});

const families = {
  hc: ['alcano', 'alqueno', 'dieno', 'alquino', 'ciclo', 'aromatico'],
  ox: ['alcohol', 'aldehido', 'cetona', 'acido']
};
for (const [unit, list] of Object.entries(families)) {
  for (const family of list) {
    for (const complexity of ['baja', 'media', 'alta']) {
      test(`${family}/${complexity}: 20 generated targets are buildable and orientation independent`, () => {
        seed = 0x4e514955 ^ (list.indexOf(family) * 100 + ['baja','media','alta'].indexOf(complexity));
        for (let i = 0; i < 20; i++) {
          const target = (unit === 'ox' ? generateOx : generate)(customCfg(unit, [family], complexity));
          assert.equal(target.fam, family);
          assert.ok(target.name && !/undefined|NaN|null/.test(target.name));
          const current = construct(target.mol, unit);
          assert.equal(F.validate(current, unit).ok, true, target.name);
          assert.equal(F.check(current, target.mol, unit).ok, true, target.name);
          assert.equal(F.equivalent(current, F.fromMol(target.mol)), true, target.name);
          if (target.mol.kind === 'chain') {
            assert.equal(F.check(construct(reversed(target.mol), unit), target.mol, unit).ok, true, target.name);
          } else {
            for (const reflection of [false, true]) {
              for (let offset = 0; offset < target.mol.n; offset++) {
                const other = construct(reindexRing(target.mol, offset, reflection), unit);
                assert.equal(F.equivalent(other, current), true, `${target.name}: rotation ${offset}/${reflection}`);
              }
            }
          }
        }
      });
    }
  }
}

test('comparison expands branches and accepts another choice of parent chain', () => {
  const expected = chain(6, [{pos: 3, len: 1}]); // 3-methylhexane
  const alternative = construct(chain(5, [{pos: 2, len: 2}]), 'hc');
  assert.equal(F.check(alternative, expected, 'hc').ok, true);
  assert.equal(F.check(construct(chain(3, [{pos: 1, len: 2}]), 'hc'), chain(5), 'hc').ok, true);
  const remapped = clone(alternative);
  remapped.subs.forEach((s, i) => {s.id = `s${i + 100}`;});
  assert.equal(F.equivalent(remapped, F.fromMol(expected)), true);
});

test('same carbon count does not make constitutional isomers equivalent', () => {
  assert.equal(F.equivalent(draft(5), draft(4, [{pos: 2, len: 1}])), false);
  assert.equal(F.equivalent(draft(6, [], [{pos: 1, order: 2}]), draft(6, [], [{pos: 2, order: 2}])), false);
  assert.equal(F.equivalent(draft(6, [], [{pos: 2, order: 2}]), draft(6, [], [{pos: 2, order: 3}])), false);
  assert.equal(F.equivalent(draft(8, [{pos: 3, len: 1}]), draft(7, [{pos: 3, len: 2}])), false);
});

test('aromatic correction distinguishes ortho, meta and para', () => {
  const aromatic = position => F.fromMol({kind: 'aromatic', n: 6, subs: [{pos: 1, len: 1}, {pos: position, len: 1}]});
  for (const a of [2, 3, 4]) for (const b of [2, 3, 4]) {
    assert.equal(F.equivalent(aromatic(a), aromatic(b)), a === b);
  }
  assert.equal(F.equivalent(aromatic(2), F.fromMol({kind: 'cycle', n: 6, subs: [{pos: 1, len: 1}, {pos: 2, len: 1}]})), false);
});

test('methane and one-carbon oxygenated compounds keep correct carbon hydrogens', () => {
  for (const [type, h] of [[null, 4], ['ol', 3], ['al', 2], ['oico', 1]]) {
    const mol = chain(1, [], [], type ? {type, pos: 1} : undefined);
    const current = construct(mol, type ? 'ox' : 'hc');
    assert.equal(current.n, 1);
    assert.equal(current.subs.length, 0);
    assert.equal(F.hydrogens(current, 1), h);
    assert.equal(F.check(current, mol, type ? 'ox' : 'hc').ok, true);
  }
  const acid = construct(chain(9, [{pos: 5, len: 2}], [], {type: 'oico', pos: 1}), 'ox');
  assert.equal(acid.n + acid.subs.reduce((total, s) => total + s.len, 0), 11);
  assert.equal(F.hydrogens(acid, 1), 0);
  assert.equal(F.hydrogens(F.fromMol({kind: 'cycle', n: 6, subs: []}), 1), 2);
  assert.equal(F.hydrogens(F.fromMol({kind: 'aromatic', n: 6, subs: []}), 1), 1);
});

test('functional group identity and positions belong to the full comparison', () => {
  for (const type of ['ol', 'al', 'oico']) for (const other of ['ol', 'al', 'oico']) {
    assert.equal(F.equivalent(draft(4, [], [], {type, pos: 1}), draft(4, [], [], {type: other, pos: 1})), type === other);
  }
  assert.equal(F.equivalent(draft(5, [], [], {type: 'ona', pos: 2}), draft(5, [], [], {type: 'ona', pos: 3})), false);
  assert.equal(F.equivalent(draft(5, [], [], {type: 'ol', pos: 1}), draft(5, [], [], {type: 'ol', pos: 2})), false);
});

test('prototype false positives: extra OH or second COOH cannot pass', () => {
  const target = chain(9, [{pos: 5, len: 2}], [], {type: 'oico', pos: 1});
  const current = construct(target, 'ox');
  for (const addition of [{id: 'f2', type: 'ol', pos: 3}, {id: 'f2', type: 'oico', pos: 9}]) {
    const invalid = {...clone(current), groups: [...clone(current.groups), addition]};
    assert.equal(F.validate(invalid, 'ox').ok, false);
    assert.equal(F.check(invalid, target, 'ox').ok, false);
    assert.equal(F.equivalent(invalid, current), false);
    const result = F.apply(current, {type: 'addGroup', groupType: addition.type, pos: addition.pos}, 'ox');
    assert.equal(result.ok, false);
    assert.deepEqual(plain(result.draft), plain(current));
  }
});

test('valence and terminal rules use actual carbon neighbours', () => {
  const alkane = draft(3, [{pos: 2, len: 1}, {pos: 2, len: 1}]);
  assert.equal(F.apply(alkane, {type: 'addSub', pos: 2, len: 1}, 'hc').ok, false);
  assert.equal(F.apply(alkane, {type: 'addGroup', pos: 2, groupType: 'ol'}, 'ox').ok, false);
  for (const type of ['al', 'oico']) {
    assert.equal(F.apply(draft(3), {type: 'addGroup', pos: 2, groupType: type}, 'ox').ok, false);
    assert.equal(F.apply(draft(3, [{pos: 1, len: 1}]), {type: 'addGroup', pos: 1, groupType: type}, 'ox').ok, false);
  }
  assert.equal(F.apply(draft(3), {type: 'addGroup', pos: 1, groupType: 'ona'}, 'ox').ok, false);
  const actualKetone = apply(draft(2, [{pos: 1, len: 1}]), {type: 'addGroup', pos: 1, groupType: 'ona'}, 'ox');
  assert.equal(F.check(actualKetone, chain(3, [], [], {type: 'ona', pos: 2}), 'ox').ok, true);
});

test('units, ring dimensions and allowed unsaturations are enforced', () => {
  assert.equal(F.validate(F.empty(), 'hc').ok, true);
  assert.equal(F.check(F.empty(), chain(1), 'hc').ok, false);
  assert.equal(F.validate(draft(3), 'ox').ok, true); // still being edited
  assert.equal(F.check(draft(3), chain(3, [], [], {type: 'ol', pos: 1}), 'ox').ok, false);
  const invalid = [
    ['hc', draft(5, [], [{pos: 1, order: 2}, {pos: 3, order: 3}])],
    ['hc', draft(5, [], [{pos: 1, order: 2}, {pos: 2, order: 2}])],
    ['hc', draft(8, [], [{pos: 1, order: 2}, {pos: 3, order: 2}, {pos: 5, order: 2}])],
    ['ox', draft(3, [], [{pos: 1, order: 2}])],
    ['ox', F.fromMol({kind: 'cycle', n: 4, subs: []})],
    ['hc', draft(3, [], [], {type: 'ol', pos: 1})]
  ];
  for (const [unit, current] of invalid) assert.equal(F.validate(current, unit).ok, false, JSON.stringify(current));
  for (const [kind, n] of [['chain', 16], ['cycle', 2], ['cycle', 7], ['aromatic', 5]]) {
    assert.equal(F.apply(F.empty(), {type: 'skeleton', kind, n}, 'hc').ok, false);
  }
  assert.equal(F.validate(draft(5, [], [{pos: 1, order: 2}, {pos: 3, order: 2}]), 'hc').ok, true);
});

test('malformed state is rejected rather than throwing or accepting a partial match', () => {
  const malformed = [
    null, {}, {...draft(3), n: -1}, {...draft(3), n: 2.5}, {...draft(3), kind: 'unknown'},
    {...draft(3), bonds: [{pos: 0, order: 2}]}, {...draft(3), bonds: [{pos: 1, order: 4}]},
    {...draft(3), bonds: [{pos: 1, order: 2}, {pos: 1, order: 2}]},
    {...draft(3), subs: [{id: 's1', pos: 8, len: 1}]}, {...draft(3), subs: [{id: 's1', pos: 2, len: 6}]},
    {...draft(3), groups: [{id: 'f1', pos: 1, type: 'ether'}]}
  ];
  for (const current of malformed) {
    assert.equal(F.validate(current, 'hc').ok, false, JSON.stringify(current));
    assert.equal(F.check(current, chain(3), 'hc').ok, false, JSON.stringify(current));
  }
});

test('placing, moving, replacing, removing and clearing are immutable atomic actions', () => {
  let current = draft(5);
  current = apply(current, {type: 'addSub', pos: 2, len: 1});
  const subId = current.subs[0].id;
  current = apply(current, {type: 'move', id: subId, pos: 3});
  assert.equal(current.subs[0].pos, 3);
  current = apply(current, {type: 'replaceSub', id: subId, len: 2});
  assert.equal(current.subs[0].len, 2);
  current = apply(current, {type: 'addGroup', pos: 1, groupType: 'al'}, 'ox');
  const groupId = current.groups[0].id;
  current = apply(current, {type: 'replaceGroup', id: groupId, groupType: 'oico'}, 'ox');
  current = apply(current, {type: 'move', id: groupId, pos: 5}, 'ox');
  assert.equal(current.groups[0].type, 'oico');
  assert.equal(current.groups[0].pos, 5);
  current = apply(current, {type: 'remove', id: subId}, 'ox');
  assert.equal(current.subs.length, 0);
  current = apply(current, {type: 'clear'}, 'ox');
  assert.equal(current.n, 5);
  assert.equal(current.kind, 'chain');
  assert.equal(current.groups.length, 0);
  current = apply(current, {type: 'skeleton', kind: 'cycle', n: 4});
  assert.equal(current.n, 4);
  assert.equal(current.kind, 'cycle');
  current = apply(draft(4), {type: 'bond', pos: 1, order: 3});
  current = apply(current, {type: 'bond', pos: 1, order: 1});
  assert.equal(current.bonds.length, 0);
});

test('invalid actions preserve every part of the previous draft', () => {
  const original = construct(chain(3, [{pos: 2, len: 1}, {pos: 2, len: 1}]), 'hc');
  for (const action of [
    {type: 'addSub', pos: 2, len: 1}, {type: 'bond', pos: 1, order: 2},
    {type: 'move', id: original.subs[0].id, pos: 99}, {type: 'replaceSub', id: original.subs[0].id, len: -1},
    {type: 'addGroup', pos: 1, groupType: 'ol'}, {type: 'skeleton', kind: 'chain', n: 16}
  ]) {
    const before = JSON.stringify(original);
    const result = F.apply(original, action, 'hc');
    assert.equal(result.ok, false, JSON.stringify(action));
    assert.equal(JSON.stringify(original), before);
    assert.deepEqual(plain(result.draft), plain(original));
    assert.ok(result.message);
  }
});

function session(unit = 'hc', mol = chain(4), stats = {}) {
  return S.create({unit, level: 'custom', custom: {fams: [unit === 'hc' ? 'alcano' : 'alcohol'], cx: 'media'}, stats}, {mol, name: 'test target'});
}
function edit(current, action) {
  const before = JSON.stringify(current);
  const result = S.edit(current, action);
  assert.equal(result.ok, true, result.message);
  assert.equal(JSON.stringify(current), before);
  return result.session;
}

test('undo restores complete edits including skeleton and clear, never settings', () => {
  const initial = session();
  let current = edit(initial, {type: 'skeleton', kind: 'chain', n: 4});
  const skeleton = clone(current.draft);
  current = edit(current, {type: 'addSub', pos: 2, len: 1});
  const branched = clone(current.draft);
  current = edit(current, {type: 'move', id: current.draft.subs[0].id, pos: 3});
  current = S.undo(current);
  assert.deepEqual(plain(current.draft), branched);
  current = edit(current, {type: 'clear'});
  assert.deepEqual(plain(current.draft), skeleton);
  current = S.undo(current);
  assert.deepEqual(plain(current.draft), branched);
  current = edit(current, {type: 'skeleton', kind: 'cycle', n: 6});
  current = S.undo(current);
  assert.deepEqual(plain(current.draft), branched);
  assert.deepEqual(plain(current.custom), {fams: ['alcano'], cx: 'media'});
  assert.equal(current.level, 'custom');
  assert.equal(initial.draft.n, 0);
  assert.equal(initial.history.length, 0);
  assert.equal(S.undo(initial), initial);
});

test('only changed valid edits enter history and clear old feedback', () => {
  let current = edit(session(), {type: 'skeleton', kind: 'chain', n: 3});
  current = S.verify(current);
  assert.equal(current.feedback.kind, 'hint');
  const history = current.history.length;
  const invalid = S.edit(current, {type: 'bond', pos: 99, order: 2});
  assert.equal(invalid.ok, false);
  assert.equal(invalid.session, current);
  const noChange = S.edit(current, {type: 'bond', pos: 1, order: 1}).session;
  assert.equal(noChange.history.length, history);
  current = edit(current, {type: 'addSub', pos: 1, len: 1});
  assert.equal(current.feedback, null);
  assert.equal(current.solution, false);
});

test('wrong answers reset the streak without counting a completed exercise', () => {
  let current = edit(session('hc', chain(4), {ok: 2, total: 3, streak: 2, record: 4}), {type: 'skeleton', kind: 'chain', n: 3});
  current = S.verify(current);
  assert.deepEqual(plain(current.stats), {ok: 2, total: 3, streak: 0, record: 4});
  assert.equal(current.counted, false);
  current = edit(current, {type: 'skeleton', kind: 'chain', n: 4});
  current = S.verify(current);
  assert.deepEqual(plain(current.stats), {ok: 3, total: 4, streak: 1, record: 4});
});

test('correct answer counts once even after repeated verification, edit, undo and solve', () => {
  let current = edit(session('hc', chain(4), {streak: 3, record: 3}), {type: 'skeleton', kind: 'chain', n: 4});
  current = S.verify(current);
  const scored = clone(current.stats);
  assert.deepEqual(scored, {ok: 1, total: 1, streak: 4, record: 4});
  current = S.verify(current);
  current = edit(current, {type: 'addSub', pos: 2, len: 1});
  current = S.verify(current);
  current = S.undo(current);
  current = S.verify(current);
  current = S.solve(current);
  assert.deepEqual(plain(current.stats), scored);
  assert.equal(current.counted, true);
});

test('consulting solution then undoing or correcting never earns the same exercise', () => {
  let current = edit(session('hc', chain(4), {ok: 2, total: 3, streak: 2, record: 2}), {type: 'skeleton', kind: 'chain', n: 3});
  const ownDraft = clone(current.draft);
  current = S.solve(current);
  assert.equal(current.solution, true);
  assert.deepEqual(plain(current.draft), ownDraft);
  assert.deepEqual(plain(current.stats), {ok: 2, total: 4, streak: 0, record: 2});
  current = S.solve(current);
  current = S.undo(current);
  current = edit(current, {type: 'skeleton', kind: 'chain', n: 4});
  current = S.verify(current);
  assert.equal(current.feedback.kind, 'ok');
  assert.deepEqual(plain(current.stats), {ok: 2, total: 4, streak: 0, record: 2});
  assert.equal(current.counted, true);
});

test('returning from the solution preserves the construction and cannot earn extra points', () => {
  let current = edit(session('hc', chain(4), {ok: 2, total: 3, streak: 2, record: 2}), {type: 'skeleton', kind: 'chain', n: 4});
  current = S.solve(current);
  const solvedSnapshot = JSON.stringify(current);
  const expectedDraft = clone(current.draft), expectedHistory = clone(current.history), expectedStats = clone(current.stats);
  const resumed = S.resume(current);
  assert.equal(JSON.stringify(current), solvedSnapshot, 'Returning to the editor must not mutate the solution session');
  assert.equal(resumed.solution, false);
  assert.equal(resumed.feedback, null);
  assert.equal(resumed.counted, true);
  assert.deepEqual(plain(resumed.draft), expectedDraft);
  assert.deepEqual(plain(resumed.history), expectedHistory);
  assert.deepEqual(plain(resumed.stats), expectedStats);
  const verified = S.verify(resumed);
  assert.equal(verified.feedback.kind, 'ok');
  assert.deepEqual(plain(verified.stats), expectedStats);
  const edited = edit(verified, {type: 'addSub', pos: 2, len: 1});
  const restored = S.verify(S.undo(edited));
  assert.equal(restored.feedback.kind, 'ok');
  assert.deepEqual(plain(restored.stats), expectedStats);
});

test('independent exercise sessions retain their own target, settings, edits and score', () => {
  let first = edit(session(), {type: 'skeleton', kind: 'chain', n: 4});
  first = S.verify(first);
  const snapshot = JSON.stringify(first);
  let second = session('ox', chain(3, [], [], {type: 'ol', pos: 1}));
  second = edit(second, {type: 'skeleton', kind: 'chain', n: 3});
  second = S.solve(second);
  assert.equal(JSON.stringify(first), snapshot);
  assert.equal(first.stats.ok, 1);
  assert.equal(second.stats.ok, 0);
  const next = session('hc', chain(5), first.stats);
  assert.equal(next.history.length, 0);
  assert.equal(next.draft.n, 0);
  assert.equal(next.counted, false);
  assert.equal(next.stats.ok, 1);
});
