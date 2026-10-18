'use strict';

// Pure-module regression checks; no browser, packages or production randomness
// are changed. Run together with the two existing test files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function section(start, end) {
  const begin = html.indexOf(start), finish = html.indexOf(end, begin + start.length);
  assert.ok(begin >= 0 && finish > begin, `Missing source markers: ${start}`);
  return html.slice(begin, finish);
}
function load(initialSeed = 0x4f484f48, forceFallback = false) {
  let seed = initialSeed >>> 0;
  const seededMath = Object.create(Math);
  seededMath.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const context = vm.createContext({Math: seededMath});
  const source = [section('const ROOTS =', 'const state ='),
    section('/* NQ_FORMULA_CORE_START */', '/* NQ_FORMULA_CORE_END */'),
    section('/* NQ_FORMULA_SESSION_START */', '/* NQ_FORMULA_SESSION_END */'),
    forceFallback ? 'analyzeAlcohol = () => null; analyzeCarbonyl = () => null;' : '',
    'globalThis.engine={molGroups,normalizeMolecule,alcoholEquivalents,analyzeAlcohol,assembleName,renderChainFormula,renderMolecule,generateOx,customCfg,COMPLEXITY_OX,LEVELS_OX,CUSTOM_FAMS,normalizeCustomPreference,F:NQFormula,S:NQFormulaSession};'
  ].join('\n');
  new vm.Script(source, {filename:'index.html:alcohol-regression-modules'}).runInContext(context);
  return {...context.engine, context};
}
const chain = (n, positions, subs = []) => ({kind:'chain',n,bonds:[],subs,groups:positions.map(pos=>({type:'ol',pos}))});
const phenyl = pos => ({kind:'phenyl',pos});
const reverse = mol => ({...plain(mol),
  groups: mol.groups.map(group=>({...group,pos:mol.n+1-group.pos})),
  subs: mol.subs.map(sub=>({...sub,pos:mol.n+1-sub.pos}))});
function targetFor(engine, mol, family) {
  const analysis = engine.analyzeAlcohol(mol);
  assert.ok(analysis, `The alcohol analyzer must accept ${JSON.stringify(mol)}`);
  return {mol,struct:analysis.struct,name:engine.assembleName(analysis.struct),fam:family};
}
function act(F, current, action) {
  const before = JSON.stringify(current), result = F.apply(current,action,'ox');
  assert.equal(JSON.stringify(current),before,'Editor actions must not mutate their input');
  assert.equal(result.ok,true,result.message||JSON.stringify(action));
  return result.draft;
}
function construct(F, mol) {
  let current=act(F,F.empty(),{type:'skeleton',kind:mol.kind,n:mol.n});
  for (const sub of mol.subs || []) current=act(F,current,{type:'addSub',...sub});
  for (const group of mol.groups || (mol.fg ? [mol.fg] : [])) current=act(F,current,{type:'addGroup',pos:group.pos,groupType:group.type});
  return current;
}
function fromAnswer(answer) {
  const lengths={metil:1,etil:2,propil:3,butil:4,pentil:5};
  return {kind:answer.kind,n:answer.root,bonds:[],
    subs:answer.substituents.flatMap(sub=>sub.locants.map(pos=>sub.name==='fenil'?phenyl(pos):{pos,len:lengths[sub.name]})),
    groups:(answer.fgLocants||[answer.fgLocant]).map(pos=>({type:'ol',pos}))};
}
function atoms(F, draft) {
  let C=draft.n,H=0,O=0;
  for(let pos=1;pos<=draft.n;pos++)H+=F.hydrogens(draft,pos);
  for(const sub of draft.subs) {
    if(sub.kind==='phenyl'){C+=6;H+=5;}
    else {C+=sub.len;H+=2*sub.len+1;}
  }
  for(const group of draft.groups){if(group.type==='ol'){O++;H++;}}
  return {C,H,O};
}
const canonical = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/β/g,'beta');

const fixtures = [
  {name:'1,2-etanodiol',modern:'etano-1,2-diol',family:'diol',mol:chain(2,[1,2]),atoms:{C:2,H:6,O:2},carbonH:[2,2]},
  {name:'1,2-propanodiol',modern:'propano-1,2-diol',family:'diol',mol:chain(3,[1,2]),atoms:{C:3,H:8,O:2},carbonH:[2,1,3]},
  {name:'1,3-propanodiol',modern:'propano-1,3-diol',family:'diol',mol:chain(3,[1,3]),atoms:{C:3,H:8,O:2},carbonH:[2,2,2]},
  {name:'1,2,3-propanotriol',modern:'propano-1,2,3-triol',family:'triol',mol:chain(3,[1,2,3]),atoms:{C:3,H:8,O:3},carbonH:[2,1,2]},
  {name:'fenilmetanol',common:/bencilico/,family:'alcohol_aromatico',mol:chain(1,[1],[phenyl(1)]),atoms:{C:7,H:8,O:1},carbonH:[2]},
  {name:'2-feniletanol',common:/feniletilico/,family:'alcohol_aromatico',mol:chain(2,[1],[phenyl(2)]),atoms:{C:8,H:10,O:1},carbonH:[2,2]}
];

for (const fixture of fixtures) test(`reference: ${fixture.name} has the intended name, C/H/O counts and equivalent names`,()=>{
  const engine=load(),target=targetFor(engine,fixture.mol,fixture.family),current=construct(engine.F,fixture.mol);
  assert.equal(target.name,fixture.name);
  assert.equal(engine.F.check(current,target.mol,'ox').ok,true);
  assert.deepEqual(atoms(engine.F,current),fixture.atoms);
  assert.deepEqual(Array.from({length:current.n},(_,i)=>engine.F.hydrogens(current,i+1)),fixture.carbonH);
  const formula=engine.renderChainFormula(fixture.mol).replace(/<[^>]*>/g,'');
  assert.equal((formula.match(/O/g)||[]).length,fixture.atoms.O,'The semideveloped formula must show every oxygen');
  assert.ok(!/undefined|NaN|H-\d/.test(formula));
  if(fixture.family==='alcohol_aromatico'){
    assert.match(formula,/C6H5/,'The condensed branch identifies the phenyl composition');
    const display=engine.renderMolecule(fixture.mol);
    assert.equal(display.isSvg,true);assert.match(display.html,/<polygon/);assert.match(display.html,/OH/);
  }
  const aliases=plain(engine.alcoholEquivalents(target));
  assert.ok(Array.isArray(aliases)&&aliases.every(name=>typeof name==='string'));
  assert.equal(new Set(aliases).size,aliases.length);
  assert.ok(!aliases.includes(target.name),'The primary name need not be repeated as an alias');
  if(fixture.modern)assert.ok(aliases.includes(fixture.modern),JSON.stringify(aliases));
  if(fixture.common)assert.ok(aliases.some(name=>fixture.common.test(canonical(name))),JSON.stringify(aliases));
});

for (const [family,amount] of [['diol',2],['triol',3]]) for(const [cx,range] of Object.entries(
  family==='diol'?{baja:[2,5],media:[3,8],alta:[4,12]}:{baja:[3,5],media:[3,8],alta:[4,12]})) {
  test(`${family}/${cx}: 200 reproducible targets retain all OH positions and can be built`,()=>{
    const engine=load(0x4f484f48+amount*257+['baja','media','alta'].indexOf(cx));
    for(let i=0;i<200;i++){
      const target=engine.generateOx(engine.customCfg('ox',[family],cx)),groups=engine.molGroups(target.mol);
      assert.equal(target.fam,family);
      assert.equal(target.mol.kind,'chain');
      assert.equal(target.mol.subs.length,0,'Generated polyols are linear');
      assert.equal((target.mol.bonds||[]).length,0,'Generated polyols are saturated');
      assert.ok(target.mol.n>=range[0]&&target.mol.n<=range[1]);
      assert.equal(groups.length,amount);
      assert.equal(new Set(groups.map(group=>group.pos)).size,amount);
      assert.ok(groups.every(group=>group.type==='ol'));
      assert.equal(target.struct.suffix,family);
      assert.equal(target.struct.fgLocants.length,amount);
      assert.equal(engine.assembleName(target.struct),target.name);
      const current=construct(engine.F,target.mol);
      assert.equal(engine.F.check(current,target.mol,'ox').ok,true,target.name);
      assert.equal(engine.F.equivalent(current,engine.F.fromMol(reverse(target.mol))),true,target.name);
      assert.equal(engine.F.equivalent(current,engine.F.fromMol(fromAnswer(target.struct))),true,target.name);
      const composition=atoms(engine.F,current);
      assert.deepEqual(composition,{C:target.mol.n,H:2*target.mol.n+2,O:amount});
    }
  });
}

test('each aromatic complexity produces only the two catalog structures and includes both',()=>{
  for(const [ci,cx] of ['baja','media','alta'].entries()){
    const engine=load(0x41524f4d+ci),seen=new Set();
    for(let i=0;i<100;i++){
      const target=engine.generateOx(engine.customCfg('ox',['alcohol_aromatico'],cx));
      assert.equal(target.fam,'alcohol_aromatico');
      assert.ok(['fenilmetanol','2-feniletanol'].includes(target.name),target.name);
      seen.add(target.name);
      assert.equal(engine.molGroups(target.mol).length,1);
      assert.equal(target.mol.subs.length,1);
      assert.equal(target.mol.subs[0].kind,'phenyl');
      const current=construct(engine.F,target.mol);
      assert.equal(engine.F.check(current,target.mol,'ox').ok,true);
      assert.equal(engine.F.equivalent(current,engine.F.fromMol(fromAnswer(target.struct))),true);
      assert.equal(engine.F.equivalent(current,engine.F.fromMol(reverse(target.mol))),true);
      assert.deepEqual(atoms(engine.F,current),target.name==='fenilmetanol'?{C:7,H:8,O:1}:{C:8,H:10,O:1});
    }
    assert.deepEqual([...seen].sort(),['2-feniletanol','fenilmetanol']);
  }
});

test('groups is the source of truth while legacy fg remains readable without double counting',()=>{
  const engine=load(),mol={...chain(3,[2]),fg:{type:'ol',pos:1}},before=JSON.stringify(mol);
  for(const family of ['alcohol','aldehido','cetona','acido']){
    const target=engine.generateOx(engine.customCfg('ox',[family],'baja'));
    assert.ok(Array.isArray(target.mol.groups),'Every generated oxygenated target is normalized');
    assert.equal(target.mol.groups.length,1);
    assert.deepEqual(plain(target.mol.groups[0]),plain(target.mol.fg));
  }
  assert.deepEqual(plain(engine.molGroups(mol)),[{type:'ol',pos:2}]);
  const normalized=engine.normalizeMolecule(mol);
  assert.equal(JSON.stringify(mol),before);
  assert.deepEqual(plain(engine.molGroups(normalized)),[{type:'ol',pos:2}]);
  assert.equal(engine.F.fromMol(mol).groups.length,1);
  assert.equal(targetFor(engine,mol,'alcohol').name,'2-propanol');
  assert.equal(engine.molGroups({...mol,groups:[]}).length,0);
  const legacy={kind:'chain',n:2,bonds:[],subs:[],fg:{type:'ol',pos:1}};
  assert.deepEqual(plain(engine.molGroups(legacy)),[{type:'ol',pos:1}]);
  assert.equal(engine.F.check(construct(engine.F,legacy),legacy,'ox').ok,true);
});

test('a one-carbon parent with an extra methyl is not silently named methanol',()=>{
  const engine=load(),incompleteParent=chain(1,[1],[{pos:1,len:1}]);
  assert.equal(engine.analyzeAlcohol(incompleteParent),null,'The naming analyzer must reject an incomplete choice of parent');
  assert.equal(engine.analyzeAlcohol({kind:'chain',n:1,bonds:[],subs:[{pos:1,len:1}],fg:{type:'ol',pos:1}}),null);
  const current=construct(engine.F,incompleteParent);
  assert.deepEqual(atoms(engine.F,current),{C:2,H:6,O:1});
  assert.equal(engine.F.check(current,chain(1,[1]),'ox').ok,false,'The extra carbon must never disappear');
  assert.equal(engine.F.check(current,chain(2,[1]),'ox').ok,true,'A different drawn parent can still describe ethanol correctly');
});

test('inverted polyols and another drawn parent chain represent the same connectivity',()=>{
  const engine=load(),F=engine.F;
  const expected=chain(3,[1,2]),alternate=chain(2,[1,2],[{pos:2,len:1}]);
  assert.equal(F.check(construct(F,alternate),expected,'ox').ok,true);
  const branched=chain(6,[3],[{pos:3,len:1}]),otherParent=chain(5,[2],[{pos:2,len:2}]);
  assert.equal(F.equivalent(construct(F,branched),construct(F,otherParent)),true);
  assert.equal(F.equivalent(F.fromMol(chain(5,[1,2,4])),F.fromMol(reverse(chain(5,[1,2,4])))),true);
});

test('the OH count and positions must match, rather than just the molecular formula',()=>{
  const {F}=load(),expected=chain(4,[1,2]);
  for(const other of [chain(4,[1]),chain(4,[1,2,3]),chain(4,[1,3])]){
    assert.equal(F.check(F.fromMol(other),expected,'ox').ok,false);
    assert.equal(F.equivalent(F.fromMol(other),F.fromMol(expected)),false);
  }
  assert.equal(F.check(F.fromMol(chain(5,[1,2,4])),chain(5,[1,2,3]),'ox').ok,false);
});

test('repeated OH on one carbon, four OH and mixed oxygen functions are rejected atomically',()=>{
  const {F}=load(),current=construct(F,chain(4,[1,2,3]));
  for(const action of [{type:'addGroup',pos:1,groupType:'ol'},{type:'addGroup',pos:4,groupType:'ol'},
    {type:'addGroup',pos:4,groupType:'al'},{type:'addGroup',pos:4,groupType:'oico'},{type:'addGroup',pos:3,groupType:'ona'}]){
    const before=JSON.stringify(current),result=F.apply(current,action,'ox');
    assert.equal(result.ok,false,JSON.stringify(action));
    assert.equal(JSON.stringify(current),before);
    assert.deepEqual(plain(result.draft),plain(current));
  }
  const invalid=F.fromMol(chain(3,[1,1]));
  assert.equal(F.validate(invalid,'ox').ok,false);
  const mixed=F.fromMol({...chain(3,[1]),groups:[{type:'ol',pos:1},{type:'ona',pos:2}]});
  assert.equal(F.validate(mixed,'ox').ok,false);
});

test('phenyl is six aromatic carbons and beta-phenylethanol is distinct from the alpha isomer',()=>{
  const {F}=load(),benzyl=construct(F,chain(1,[1],[phenyl(1)])),beta=construct(F,chain(2,[1],[phenyl(2)]));
  assert.equal(benzyl.subs[0].kind,'phenyl');
  assert.ok(!Object.hasOwn(benzyl.subs[0],'len')||benzyl.subs[0].len===undefined,'Phenyl does not pretend to be a linear arm');
  assert.equal(F.equivalent(benzyl,F.fromMol(chain(7,[1]))),false);
  assert.equal(F.equivalent(beta,F.fromMol(chain(8,[1]))),false);
  const alpha=F.fromMol(chain(2,[1],[phenyl(1)]));
  assert.equal(F.check(alpha,chain(2,[1],[phenyl(2)]),'ox').ok,false);
  assert.equal(F.equivalent(alpha,beta),false);
  const noOH=act(F,F.empty(),{type:'skeleton',kind:'chain',n:2});
  assert.equal(F.apply(noOH,{type:'addSub',kind:'phenyl',pos:2},'ox').ok,true,'A builder may place phenyl before OH');
});

test('phenols, several phenyls, aromatic polyols and phenyl-carbonyl mixtures are outside this scope',()=>{
  const {F}=load(),current=construct(F,chain(2,[1],[phenyl(2)]));
  for(const action of [{type:'addSub',kind:'phenyl',pos:1},{type:'addGroup',groupType:'ol',pos:2},
    {type:'addGroup',groupType:'al',pos:2}])assert.equal(F.apply(current,action,'ox').ok,false);
  assert.equal(F.validate(F.fromMol({kind:'aromatic',n:6,subs:[],groups:[{type:'ol',pos:1}]}),'ox').ok,false);
  assert.equal(F.apply(F.empty(),{type:'skeleton',kind:'aromatic',n:6},'ox').ok,false);
  assert.equal(F.apply(F.fromMol({kind:'chain',n:2,bonds:[],subs:[]}),{type:'addSub',kind:'phenyl',pos:1},'hc').ok,false);
});

test('undo restores all OH groups and does not duplicate the score after editing a solved polyol',()=>{
  const engine=load(),target=targetFor(engine,chain(3,[1,2,3]),'triol'),S=engine.S;
  let current=S.create({unit:'ox',level:'custom',custom:{fams:{triol:true},cx:'baja'}},target);
  const edit=action=>{const result=S.edit(current,action);assert.equal(result.ok,true,result.message);current=result.session;};
  edit({type:'skeleton',kind:'chain',n:3});
  for(const pos of [1,2,3])edit({type:'addGroup',pos,groupType:'ol'});
  current=S.verify(current);assert.equal(current.stats.ok,1);assert.equal(current.stats.total,1);
  const scored=plain(current.stats),lastGroup=current.draft.groups[2].id;
  edit({type:'remove',id:lastGroup});current=S.verify(current);
  assert.equal(current.feedback.kind,'hint');
  current=S.undo(current);assert.equal(current.draft.groups.length,3);
  current=S.verify(current);assert.equal(current.feedback.kind,'ok');
  assert.deepEqual(plain(current.stats),scored);
});

test('phenyl metadata and the editable construction survive clear, undo and viewing the solution',()=>{
  const engine=load(),target=targetFor(engine,chain(2,[1],[phenyl(2)]),'alcohol_aromatico'),S=engine.S;
  let current=S.create({unit:'ox',level:'medio'},target);
  for(const action of [{type:'skeleton',kind:'chain',n:2},{type:'addSub',kind:'phenyl',pos:2},{type:'addGroup',groupType:'ol',pos:1}]){
    const result=S.edit(current,action);assert.equal(result.ok,true,result.message);current=result.session;
  }
  const before=plain(current.draft);
  current=S.edit(current,{type:'clear'}).session;
  current=S.undo(current);assert.deepEqual(plain(current.draft),before);
  assert.equal(current.draft.subs[0].kind,'phenyl');
  current=S.resume(S.solve(current));current=S.verify(current);
  assert.equal(current.stats.ok,0);assert.equal(current.stats.total,1);assert.equal(current.counted,true);
  assert.deepEqual(plain(current.draft),before);
});

test('saved custom preferences preserve old choices without enabling the new families',()=>{
  const engine=load(),old={fams:{alcohol:true,aldehido:false,cetona:true,acido:false},cx:'baja'},before=JSON.stringify(old);
  const normalized=engine.normalizeCustomPreference('ox',old);
  assert.equal(JSON.stringify(old),before);
  assert.equal(normalized.fams.alcohol,true);assert.equal(normalized.fams.cetona,true);assert.equal(normalized.fams.aldehido,false);
  for(const family of ['diol','triol','alcohol_aromatico'])assert.equal(normalized.fams[family],false);
  assert.equal(normalized.cx,'baja');
  const fresh=engine.normalizeCustomPreference('ox',null);
  for(const {f} of engine.CUSTOM_FAMS.ox)assert.equal(fresh.fams[f],true,f);
});

test('both preference readers migrate independently and fresh installations expose every family',()=>{
  const engine=load(),stored=new Map([
    ['nq_custom_ox',JSON.stringify({fams:{alcohol:true,aldehido:false,cetona:false,acido:false},cx:'baja'})],
    ['nq_formula_custom_ox',JSON.stringify({fams:{alcohol:false,aldehido:false,cetona:true,acido:false},cx:'alta'})]
  ]);
  engine.context.LS={get:(key,fallback)=>stored.get(key)??fallback,set:(key,value)=>stored.set(key,value)};
  engine.context.state={custom:{}};
  const originalReader=section('function loadCustom(unit)', '// Familias tildadas');
  const formulaReader=section('function savedCustom(unit)', 'function targetFor(unit');
  new vm.Script(originalReader+'\n'+formulaReader+'\nglobalThis.readers={loadCustom,savedCustom};').runInContext(engine.context);
  engine.context.readers.loadCustom('ox');
  const naming=engine.context.state.custom.ox,formula=engine.context.readers.savedCustom('ox');
  assert.equal(naming.fams.alcohol,true);assert.equal(naming.fams.cetona,false);assert.equal(naming.cx,'baja');
  assert.equal(formula.fams.alcohol,false);assert.equal(formula.fams.cetona,true);assert.equal(formula.cx,'alta');
  for(const family of ['diol','triol','alcohol_aromatico']){assert.equal(naming.fams[family],false);assert.equal(formula.fams[family],false);}
  stored.clear();engine.context.readers.loadCustom('ox');
  const freshNaming=engine.context.state.custom.ox,freshFormula=engine.context.readers.savedCustom('ox');
  for(const {f} of engine.CUSTOM_FAMS.ox){assert.equal(freshNaming.fams[f],true);assert.equal(freshFormula.fams[f],true);}
  freshNaming.fams.diol=false;assert.equal(freshFormula.fams.diol,true,'The modes must not share a preferences object');
});

test('preset family additions and polyol complexity limits match the intended progression',()=>{
  const engine=load();
  const labels=Object.fromEntries(engine.CUSTOM_FAMS.ox.map(item=>[item.f,item.t]));
  assert.equal(labels.alcohol,'Alcoholes monohidroxilados');
  assert.equal(labels.diol,'Dioles');assert.equal(labels.triol,'Trioles');assert.equal(labels.alcohol_aromatico,'Alcoholes aromáticos');
  assert.ok(engine.LEVELS_OX.facil.families.includes('diol'));
  for(const level of ['medio','dificil'])for(const family of ['diol','triol','alcohol_aromatico'])assert.ok(engine.LEVELS_OX[level].families.includes(family));
  for(const [family,profiles] of Object.entries({diol:{baja:[2,5],media:[3,8],alta:[4,12]},triol:{baja:[3,5],media:[3,8],alta:[4,12]}})){
    for(const [cx,expected] of Object.entries(profiles))assert.deepEqual(plain(engine.COMPLEXITY_OX[cx][family].n),expected);
  }
});

test('exhausting retries keeps the requested alcohol family and a valid profile-compatible fallback',()=>{
  for(const family of ['alcohol','aldehido','cetona','diol','triol','alcohol_aromatico'])for(const cx of ['baja','media','alta']){
    const engine=load(0x46414c4c,true),target=engine.generateOx(engine.customCfg('ox',[family],cx));
    assert.equal(target.fam,family,`${family}/${cx}`);
    assert.equal(engine.assembleName(target.struct),target.name);
    assert.ok(!/undefined|NaN|null/.test(target.name));
    const current=construct(engine.F,target.mol);
    assert.equal(engine.F.check(current,target.mol,'ox').ok,true,`${family}/${cx}`);
    if(family==='alcohol_aromatico')assert.equal(target.name,'fenilmetanol');
    else {
      const [min,max]=engine.COMPLEXITY_OX[cx][family].n;
      assert.ok(target.mol.n>=min&&target.mol.n<=max,`${family}/${cx}`);
      if(family==='diol'||family==='triol')assert.equal(engine.molGroups(target.mol).length,family==='diol'?2:3);
    }
  }
});

function namingUI() {
  const engine=load(),nodes=new Map();
  class Element {
    constructor(){this.children=[];this.attrs={};this.style={};this.classes=new Set();this.textContent='';
      this.classList={add:value=>this.classes.add(value),remove:value=>this.classes.delete(value),contains:value=>this.classes.has(value)};}
    set innerHTML(value){this.markup=String(value);this.children=[];}
    get innerHTML(){return this.markup||'';}
    appendChild(child){this.children.push(child);return child;}
    setAttribute(key,value){this.attrs[key]=String(value);}
    getAttribute(key){return this.attrs[key]??null;}
  }
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
  engine.context.$=get;engine.context.document={createElement:()=>new Element()};
  engine.context.state={unit:'ox',user:{},solved:false};
  const uiSource=section('const KINDS=[','function compareStructs(u,a)')+
    section('function compareStructs(u,a)','const HINTS=')+
    '\nglobalThis.naming={resetUser,renderBuilder,renderFgLocField,userComplete,buildUserStruct,compareStructs};';
  new vm.Script(uiSource,{filename:'index.html:naming-controls'}).runInContext(engine.context);
  const api=engine.context.naming;api.resetUser();
  return {...engine,naming:api,state:engine.context.state,get,
    click(id,text){const node=get(id).children.find(child=>String(child.textContent)===String(text));assert.ok(node,`${id} misses ${text}`);assert.equal(typeof node.onclick,'function');node.onclick();}
  };
}

test('name verification distinguishes wrong OH count, repeated positions and wrong canonical numbering',()=>{
  const app=namingUI(),compare=app.naming.compareStructs;
  const expected=targetFor(app,chain(5,[1,2]),'diol').struct;
  assert.equal(compare({...plain(expected),fgLocants:[2,1]},expected).ok,true);
  for(const positions of [[1],[1,1],[1,2,3],[1,3],[4,5]]){
    assert.equal(compare({...plain(expected),fgLocants:positions},expected).ok,false,JSON.stringify(positions));
  }
  assert.equal(compare({...plain(expected),suffix:'ol',fgLocant:1},expected).code,'fgCount');
  assert.equal(compare({...plain(expected),root:4},expected).code,'root');
  app.state.user={kind:'chain',root:5,suffix:null,bondLocants:[],subs:[],fg:{type:'diol',loc:null,locs:[1,1]}};
  assert.equal(app.naming.userComplete(),false);
  app.state.user.fg.locs=[1,6];assert.equal(app.naming.userComplete(),false);
  app.state.user.fg.locs=[1,2.5];assert.equal(app.naming.userComplete(),false);
  app.state.user.fg.locs=[2,1];assert.equal(app.naming.userComplete(),true);
  assert.deepEqual(plain(app.naming.buildUserStruct().fgLocants),[1,2]);
});

test('shrinking the named parent clears out-of-range OH selections without inventing replacements',()=>{
  const app=namingUI();
  app.state.user={kind:'chain',root:5,suffix:null,bondLocants:[],subs:[],fg:{type:'triol',loc:null,locs:[1,3,5]}};
  app.naming.renderBuilder();assert.equal(app.naming.userComplete(),true);
  app.click('root-chips','et');
  assert.equal(app.state.user.root,2);
  assert.deepEqual(plain(app.state.user.fg.locs),[1]);
  assert.equal(app.naming.userComplete(),false);
  assert.equal(app.get('preview').textContent,'—');
  app.click('root-chips','but');
  assert.deepEqual(plain(app.state.user.fg.locs),[1]);
  app.click('fg-chips','–diol (2 OH)');
  assert.deepEqual(plain(app.state.user.fg.locs),[]);
  assert.equal(app.state.user.fg.loc,null);
  assert.equal(app.state.user.fg.type,'diol');
});

test('the OH selector toggles distinct sites, caps their count and resets when the suffix changes',()=>{
  const app=namingUI();
  app.state.user={kind:'chain',root:4,suffix:null,bondLocants:[],subs:[],fg:{type:'diol',loc:null,locs:[]}};
  app.naming.renderBuilder();
  app.click('fgloc-chips',1);app.click('fgloc-chips',1);
  assert.deepEqual(plain(app.state.user.fg.locs),[]);
  app.click('fgloc-chips',1);app.click('fgloc-chips',2);app.click('fgloc-chips',3);
  assert.deepEqual(plain(app.state.user.fg.locs),[1,2],'A third click must not silently replace an existing diol position');
  assert.equal(app.naming.userComplete(),true);
  app.click('fg-chips','–triol (3 OH)');
  assert.deepEqual(plain(app.state.user.fg.locs),[]);assert.equal(app.naming.userComplete(),false);
  for(const pos of [1,2,3])app.click('fgloc-chips',pos);
  assert.equal(app.naming.userComplete(),true);
  assert.equal(app.assembleName(app.naming.buildUserStruct()),'1,2,3-butanotriol');
  app.naming.resetUser();
  assert.deepEqual(plain(app.state.user.fg.locs),[]);assert.equal(app.state.user.fg.type,null);
});

test('after a correct naming answer the solution still reveals aliases without altering score or streak',()=>{
  const app=namingUI(),target=targetFor(app,chain(2,[1,2]),'diol'),feedback=[];
  let scoreUpdates=0;
  app.context.updateScore=()=>{scoreUpdates++;};
  app.context.showFeedback=(kind,message)=>feedback.push({kind,message});
  new vm.Script(section('function solve(){','function updateScore(){')+'\nglobalThis.namingSolve=solve;').runInContext(app.context);
  Object.assign(app.state,{current:target,solved:true,ok:4,total:5,streak:3,record:4});
  const before=JSON.stringify(app.state);
  app.context.namingSolve();
  assert.equal(scoreUpdates,0);
  assert.equal(JSON.stringify(app.state),before);
  assert.equal(feedback.at(-1).kind,'sol');
  assert.match(feedback.at(-1).message,/etilenglicol/);
  assert.match(feedback.at(-1).message,/etano-1,2-diol/);
  app.context.namingSolve();
  assert.equal(scoreUpdates,0);assert.equal(JSON.stringify(app.state),before);
  // The same button still counts an unanswered exercise exactly once.
  Object.assign(app.state,{solved:false,ok:4,total:5,streak:3,record:4});
  app.context.namingSolve();app.context.namingSolve();
  assert.equal(scoreUpdates,1);assert.equal(app.state.total,6);assert.equal(app.state.ok,4);assert.equal(app.state.streak,0);
});
