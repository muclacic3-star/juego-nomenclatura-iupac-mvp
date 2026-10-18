'use strict';

// Run with node --test tests/formula.test.cjs tests/name-layout.test.cjs.
// This small DOM stand-in executes the real navigation code. It does not claim
// to simulate a browser's layout, CSS engine, or touch gestures.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function sourceBetween(start, end) {
  const begin = html.indexOf(start), finish = html.indexOf(end, begin + start.length);
  assert.ok(begin >= 0 && finish > begin, `Missing source markers: ${start}`);
  return html.slice(begin, finish);
}

class EventStandIn {
  constructor(type, init = {}) { this.type = type; Object.assign(this, init); this.defaultPrevented = false; }
  preventDefault() { this.defaultPrevented = true; }
}

class NodeStandIn {
  constructor(tag, attrs = {}, document = null) {
    this.tagName = tag.toUpperCase(); this.attrs = {...attrs}; this.ownerDocument = document;
    this.children = []; this.parentElement = null; this.listeners = new Map();
    this.dataset = {}; this.disabled = Object.hasOwn(attrs, 'disabled'); this.hidden = Object.hasOwn(attrs, 'hidden');
    this.clientWidth = 0; this.scrollWidth = 0; this.scrollLeft = 0; this.clientHeight = 0;
    this.scrollCalls = []; this.focusCalls = []; this.text = '';
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('data-')) this.dataset[camel(key.slice(5))] = value;
    }
    this.classList = {
      contains: value => this.className.split(/\s+/).includes(value),
      add: (...values) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...values])].join(' '); },
      remove: (...values) => { this.className = this.className.split(/\s+/).filter(value => value && !values.includes(value)).join(' '); },
      toggle: (value, force) => {
        const include = force === undefined ? !this.classList.contains(value) : force;
        if (include) this.classList.add(value); else this.classList.remove(value);
        return include;
      }
    };
  }
  get id() { return this.attrs.id || ''; }
  set id(value) { this.attrs.id = value; }
  get className() { return this.attrs.class || ''; }
  set className(value) { this.attrs.class = value; }
  get textContent() { return this.text + this.children.map(node => node.textContent).join(''); }
  set textContent(value) { this.text = String(value); this.children = []; }
  get isConnected() {
    let node = this;
    while (node.parentElement) node = node.parentElement;
    return node === this.ownerDocument?.root;
  }
  setAttribute(name, value) {
    this.attrs[name] = String(value);
    if (name === 'hidden') this.hidden = true;
    if (name.startsWith('data-')) this.dataset[camel(name.slice(5))] = String(value);
  }
  getAttribute(name) { return Object.hasOwn(this.attrs, name) ? this.attrs[name] : null; }
  removeAttribute(name) {
    delete this.attrs[name];
    if (name === 'hidden') this.hidden = false;
    if (name.startsWith('data-')) delete this.dataset[camel(name.slice(5))];
  }
  append(...nodes) {
    for (const node of nodes) {
      node.parentElement = this; node.ownerDocument = this.ownerDocument; this.children.push(node);
    }
  }
  contains(node) { return this === node || this.children.some(child => child.contains(node)); }
  matches(selector) {
    return selector.split(',').some(part => {
      part = part.trim();
      const tag = part.match(/^[a-z][\w-]*/i);
      if (tag && this.tagName !== tag[0].toUpperCase()) return false;
      for (const match of part.matchAll(/#([\w-]+)/g)) if (this.id !== match[1]) return false;
      for (const match of part.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(match[1])) return false;
      for (const match of part.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)) {
        const value = match[1] === 'hidden' ? this.hidden ? '' : null : this.getAttribute(match[1]);
        if (value === null || (match[2] !== undefined && value !== match[2])) return false;
      }
      return true;
    });
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(callback => callback !== listener));
  }
  dispatchEvent(event) {
    if (!event.target) event.target = this;
    for (const listener of this.listeners.get(event.type) || []) listener(event);
    return !event.defaultPrevented;
  }
  focus(options) {
    this.ownerDocument.activeElement = this; this.focusCalls.push(options);
    for (let node = this; node; node = node.parentElement) node.dispatchEvent(new EventStandIn('focusin', {target: this}));
  }
  scrollIntoView(options) { this.scrollCalls.push(options); }
  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter(node => node !== this); this.parentElement = null;
  }
}

const camel = text => text.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
function documentFromMarkup(markup) {
  const document = {};
  document.root = new NodeStandIn('document', {}, document);
  document.getElementById = id => document.root.querySelector('#' + id);
  document.querySelector = selector => document.root.querySelector(selector);
  document.querySelectorAll = selector => document.root.querySelectorAll(selector);
  const clean = markup.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const stack = [document.root], voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  for (const match of clean.matchAll(/<\/?[a-z][^>]*>/gi)) {
    const token = match[0], tag = token.match(/^<\/?([\w-]+)/)[1].toLowerCase();
    if (token.startsWith('</')) {
      assert.equal(stack.at(-1).tagName, tag.toUpperCase(), `Unbalanced closing tag ${tag}`);
      stack.pop(); continue;
    }
    const attrs = {};
    for (const attr of token.slice(tag.length + 1).replace(/\/?\s*>$/, '').matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attrs[attr[1]] = attr[2] ?? attr[3] ?? attr[4] ?? '';
    }
    const node = new NodeStandIn(tag, attrs, document); stack.at(-1).append(node);
    if (!voidTags.has(tag) && !/\/\s*>$/.test(token)) stack.push(node);
  }
  assert.equal(stack.length, 1, 'Every structural element must have a closing tag');
  document.body = document.querySelector('body'); document.activeElement = document.body;
  return document;
}

function navigation(savedDirection = 'practice') {
  const document = documentFromMarkup(html), calls = [], store = new Map([['nq_direction', savedDirection]]);
  const listeners = new Map();
  const window = {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    removeEventListener(type, callback) {
      listeners.set(type, (listeners.get(type) || []).filter(item => item !== callback));
    },
    dispatchEvent(event) {
      calls.push(event);
      for (const callback of listeners.get(event.type) || []) callback(event);
    }
  };
  const LS = {get: (key, fallback) => store.get(key) ?? fallback, set: (key, value) => store.set(key, value)};
  const context = vm.createContext({document, window, LS, CustomEvent: EventStandIn});
  new vm.Script(sourceBetween('/* NQ_MODES_START */', '/* NQ_MODES_END */')).runInContext(context);
  const nav = document.getElementById('nq-modes');
  return {
    document, window, calls, store, nav,
    practice: document.getElementById('nq-practice'), formula: document.getElementById('formula-practice'),
    select(mode) {
      const button = nav.querySelectorAll('[data-nq-mode]').find(node => node.dataset.nqMode === mode);
      assert.ok(button, `Missing mode button ${mode}`);
      // Browsers focus a navigation button before delivering its click.
      button.focus(); nav.dispatchEvent(new EventStandIn('click', {target: button}));
    }
  };
}

function assertActive(app, mode) {
  for (const [value, panel] of [['practice', app.practice], ['formula', app.formula]]) {
    assert.equal(panel.hidden, value !== mode, `${value} hidden property`);
    assert.equal(panel.classList.contains('hidden'), value !== mode, `${value} visibility class`);
  }
  for (const button of app.nav.querySelectorAll('[data-nq-mode]')) {
    assert.equal(button.getAttribute('aria-current'), button.dataset.nqMode === mode ? 'page' : null);
  }
}

test('standalone markup is balanced and contains exactly the two practice modes', () => {
  const document = documentFromMarkup(html), nav = document.getElementById('nq-modes');
  assert.deepEqual(nav.querySelectorAll('button[data-nq-mode]').map(node => node.dataset.nqMode).sort(), ['formula', 'practice']);
  for (const id of ['nq-learn', 'nq-shell', 'nq-property-card', 'nq-lesson-title']) assert.equal(document.getElementById(id), null);
  assert.doesNotMatch(html, /PROPIEDADES_OX|conectarNQModosYFichas|data-nq-answer|nq:modechange/);
  const ids = document.querySelectorAll('[id]').map(node => node.id);
  assert.equal(new Set(ids).size, ids.length, 'Element ids must stay unique');
});

test('the saved formula direction opens only its panel and announces the mode', () => {
  const app = navigation('formula');
  assertActive(app, 'formula');
  assert.equal(app.store.get('nq_direction'), 'formula');
  assert.equal(app.document.activeElement, app.document.body, 'Loading the saved mode must not steal focus');
  assert.equal(app.calls.at(-1).type, 'nq:practicechange');
  assert.equal(app.calls.at(-1).detail.mode, 'formula');
});

test('old Learn and unknown saved preferences return to naming practice', () => {
  for (const previous of ['learn', 'missing-old-mode', '']) {
    const app = navigation(previous);
    assertActive(app, 'practice');
    assert.equal(app.store.get('nq_direction'), 'practice');
  }
});

test('mode changes restore the last focused control even after the nav button takes focus', () => {
  const app = navigation(), namingControl = app.document.getElementById('btn-verify');
  namingControl.focus(); app.select('formula');
  assertActive(app, 'formula');
  assert.equal(app.document.activeElement, app.formula.querySelector('h1'));
  const formulaControl = app.formula.querySelector('[data-fb-command="verify"]');
  formulaControl.focus(); app.select('practice');
  assert.equal(app.document.activeElement, namingControl);
  app.select('formula');
  assert.equal(app.document.activeElement, formulaControl);
  assertActive(app, 'formula');
});

test('disconnected, disabled and hidden saved controls fall back to the visible heading', () => {
  for (const unavailable of ['disconnected', 'disabled', 'hidden']) {
    const app = navigation(), control = app.document.getElementById('btn-verify');
    control.focus(); app.select('formula');
    if (unavailable === 'disconnected') control.remove();
    if (unavailable === 'disabled') control.disabled = true;
    if (unavailable === 'hidden') control.hidden = true;
    app.select('practice');
    assert.equal(app.document.activeElement, app.practice.querySelector('h1'), unavailable);
  }
});

test('reselecting the active mode preserves the exercise and emits no duplicate transition', () => {
  const app = navigation(); app.select('formula');
  const calls = app.calls.length;
  const target = app.formula.querySelector('[data-fb-target]');
  target.textContent = 'ácido 5-etilnonanoico';
  const molecule = app.document.getElementById('mol-display');
  molecule.textContent = 'CH₃–CH₂–CH₃';
  app.select('formula');
  assert.equal(app.calls.length, calls);
  assert.equal(target.textContent, 'ácido 5-etilnonanoico');
  app.select('practice');
  assertActive(app, 'practice');
  assert.equal(molecule.textContent, 'CH₃–CH₂–CH₃');
  app.select('formula');
  assert.equal(target.textContent, 'ácido 5-etilnonanoico');
  app.select('practice');
  assert.equal(app.store.get('nq_direction'), 'practice');
});

function nameView({width = 280, contentWidth = 700, hidden = false} = {}) {
  const document = documentFromMarkup(html), listeners = new Map(), frames = [], observers = [];
  const pane = document.getElementById('nq-practice'), viewport = document.getElementById('name-molecule-viewport');
  assert.ok(viewport, 'The molecule needs its own scrolling viewport');
  viewport.clientWidth = width; viewport.scrollWidth = contentWidth;
  pane.hidden = hidden; pane.classList.toggle('hidden', hidden);
  class ObserverStandIn {
    constructor(callback) { this.callback = callback; this.nodes = []; observers.push(this); }
    observe(node) { this.nodes.push(node); }
    disconnect() {}
    trigger(records = []) { this.callback(records, this); }
  }
  class MutationStandIn extends ObserverStandIn { constructor(callback) { super(callback); this.kind = 'mutation'; } }
  class ResizeStandIn extends ObserverStandIn { constructor(callback) { super(callback); this.kind = 'resize'; } }
  const window = {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    removeEventListener(type, callback) {
      listeners.set(type, (listeners.get(type) || []).filter(item => item !== callback));
    },
    dispatchEvent(event) { for (const callback of listeners.get(event.type) || []) callback(event); }
  };
  const state = {unit: 'hc', level: 'facil', current: {exerciseSentinel: 'keep-the-exercise'}, user: {root: 5}},
    UNITS = {
      hc: {label: 'Hidrocarburos', levels: {facil: {label: 'Fácil'}, medio: {label: 'Medio'}}},
      ox: {label: 'Compuestos oxigenados', levels: {facil: {label: 'Fácil'}, medio: {label: 'Medio'}}}
    };
  const requestAnimationFrame = callback => {frames.push(callback); return frames.length;};
  Object.assign(window, {MutationObserver: MutationStandIn, ResizeObserver: ResizeStandIn, requestAnimationFrame});
  const context = vm.createContext({document, window, state, UNITS, MutationObserver: MutationStandIn,
    ResizeObserver: ResizeStandIn, requestAnimationFrame});
  new vm.Script(sourceBetween('/* NQ_NAME_VIEW_START */', '/* NQ_NAME_VIEW_END */')).runInContext(context);
  const flush = () => {
    let runs = 0;
    while (frames.length) { assert.ok(runs++ < 20, 'A view update must not schedule itself forever'); frames.shift()(); }
  };
  flush();
  return {document, window, state, viewport, pane, observers, flush,
    hint: document.getElementById('name-molecule-hint'), summary: document.getElementById('name-config-summary'),
    mutateDisplay() {
      const display = document.getElementById('mol-display');
      const observer = observers.find(item => item.kind === 'mutation' && item.nodes.includes(display));
      assert.ok(observer, 'New molecule content must be observed');
      observer.trigger([{type: 'childList', target: display}]); flush();
    },
    resize() { window.dispatchEvent(new EventStandIn('resize')); flush(); }
  };
}

test('the molecule hint follows measurable horizontal overflow and visible viewport width', () => {
  const app = nameView();
  assert.equal(app.hint.hidden, false);
  app.viewport.scrollWidth = 280; app.resize();
  assert.equal(app.hint.hidden, true);
  app.viewport.scrollWidth = 281; app.resize();
  assert.equal(app.hint.hidden, true, 'One rounding pixel is not meaningful overflow');
  app.viewport.scrollWidth = 700; app.viewport.clientWidth = 0; app.resize();
  assert.equal(app.hint.hidden, true, 'Do not show a misleading hint while the mode is unmeasurable');
  app.viewport.clientWidth = 280; app.resize();
  assert.equal(app.hint.hidden, false);
});

test('a resize or configuration toggle retains the reading position and current exercise', () => {
  const app = nameView(), before = JSON.stringify(app.state);
  app.viewport.scrollLeft = 140;
  app.viewport.clientWidth = 360; app.resize();
  assert.equal(app.viewport.scrollLeft, 140);
  const details = app.document.querySelector('.nq-practice-config');
  details.dispatchEvent(new EventStandIn('toggle')); app.flush();
  assert.equal(app.viewport.scrollLeft, 140);
  assert.equal(JSON.stringify(app.state), before);
});

test('new molecule content resets only its horizontal reading position and refreshes the summary', () => {
  const app = nameView();
  assert.equal(app.summary.textContent, 'Hidrocarburos · Fácil');
  app.state.unit = 'ox'; app.state.level = 'custom';
  const before = JSON.stringify(app.state);
  app.viewport.scrollLeft = 170; app.mutateDisplay();
  assert.equal(app.viewport.scrollLeft, 0);
  assert.equal(app.summary.textContent, 'Compuestos oxigenados · A tu medida');
  assert.equal(JSON.stringify(app.state), before, 'Reading helpers must not change generator or answer state');
});

test('switching back to names recalculates the hint without generating or clearing an exercise', () => {
  const app = nameView({hidden: true}), before = JSON.stringify(app.state);
  assert.equal(app.hint.hidden, true);
  app.pane.hidden = false; app.pane.classList.remove('hidden');
  app.viewport.scrollLeft = 110;
  app.window.dispatchEvent(new EventStandIn('nq:practicechange', {detail: {mode: 'practice'}})); app.flush();
  assert.equal(app.hint.hidden, false);
  assert.equal(app.viewport.scrollLeft, 110);
  assert.equal(JSON.stringify(app.state), before);
});

test('Ver molécula returns keyboard focus to the scrollable structure without changing the answer', () => {
  const app = nameView(), before = JSON.stringify(app.state);
  const control = app.document.getElementById('name-view-target'), target = app.document.getElementById('name-target');
  app.viewport.scrollLeft = 140;
  control.dispatchEvent(new EventStandIn('click')); app.flush();
  assert.equal(app.document.activeElement, app.viewport);
  assert.equal(app.viewport.getAttribute('tabindex'), '0');
  assert.equal(app.viewport.getAttribute('role'), 'region');
  assert.equal(target.scrollCalls.at(-1).block, 'start');
  assert.equal(app.viewport.scrollLeft, 140);
  assert.equal(JSON.stringify(app.state), before);
});
