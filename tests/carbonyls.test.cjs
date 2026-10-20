'use strict';

// Chemistry, editor and naming regressions for the course's carbonyl block.
// Uses the production modules directly, with reproducible randomness and no packages.
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
function load(initialSeed = 0x43415242, forceFallback = false) {
  let seed = initialSeed >>> 0;
  const seededMath = Object.create(Math);
  seededMath.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const context = vm.createContext({Math: seededMath});
  new vm.Script([
    section('const ROOTS =', 'const state ='),
    section('/* NQ_FORMULA_CORE_START */', '/* NQ_FORMULA_CORE_END */'),
    section('/* NQ_FORMULA_SESSION_START */', '/* NQ_FORMULA_SESSION_END */'),
    forceFallback ? 'analyzeAlcohol=()=>null; analyzeCarbonyl=()=>null; analyzeEnol=()=>null;' : '',
    'globalThis.engine={molGroups,normalizeMolecule,analyzeCarbonyl,analyzeEnol,assembleName,renderChainFormula,renderMolecule,oxygenateEquivalents,generateOx,customCfg,COMPLEXITY_OX,LEVELS_OX,CUSTOM_FAMS,normalizeCustomPreference,F:NQFormula,S:NQFormulaSession};'
  ].join('\n'), {filename: 'index.html:carbonyl-regressions'}).runInContext(context);
  return {...context.engine, context};
}
const chain = (n, groups, bonds = [], subs = []) => ({kind:'chain',n,bonds,subs,groups});
const group = (type, pos) => ({type,pos});
const phenyl = pos => ({kind:'phenyl',pos});
const fixtures = [
  {name:'benzaldehído',family:'aldehido_aromatico',mol:chain(1,[group('al',1)],[],[phenyl(1)]),atoms:{C:7,H:6,O:1},carbonH:[1],alias:/bencenocarbaldehído/},
  {name:'1,5-pentanodial',family:'dialdehido',mol:chain(5,[group('al',1),group('al',5)]),atoms:{C:5,H:8,O:2},carbonH:[1,2,2,2,1],alias:/pentano-1,5-dial/},
  {name:'2,4-pentanodiona',family:'dicetona',mol:chain(5,[group('ona',2),group('ona',4)]),atoms:{C:5,H:8,O:2},carbonH:[3,0,2,0,3],alias:/pentano-2,4-diona/},
  {name:'etenol',family:'enol',mol:chain(2,[group('ol',1)],[{pos:1,order:2}]),atoms:{C:2,H:4,O:1},carbonH:[1,2]},
  {name:'prop-1-en-2-ol',family:'enol',mol:chain(3,[group('ol',2)],[{pos:1,order:2}]),atoms:{C:3,H:6,O:1},carbonH:[2,0,3]},
  {name:'3-hidroxibutanal',family:'hidroxialdehido',mol:chain(4,[group('al',1),group('ol',3)]),atoms:{C:4,H:8,O:2},carbonH:[1,2,1,3],alias:/3-hidroxibutanal|aldol/}
];
const families = [...new Set(fixtures.map(f=>f.family))];
const reverse = mol => ({...plain(mol),
  groups:mol.groups.map(g=>({...g,pos:mol.n+1-g.pos})),
  bonds:mol.bonds.map(b=>({...b,pos:mol.n-b.pos})),
  subs:mol.subs.map(s=>({...s,pos:mol.n+1-s.pos}))});
function targetFor(engine, fixture) {
  const analysis=(fixture.family==='enol'?engine.analyzeEnol:engine.analyzeCarbonyl)(fixture.mol);
  assert.ok(analysis, `Analyze ${fixture.name}`);
  return {mol:fixture.mol,struct:analysis.struct,name:engine.assembleName(analysis.struct),fam:fixture.family};
}
function act(F,current,action) {
  const before=JSON.stringify(current),result=F.apply(current,action,'ox');
  assert.equal(JSON.stringify(current),before,'Editor actions must preserve their input');
  assert.equal(result.ok,true,result.message||JSON.stringify(action));
  return result.draft;
}
function construct(F,mol,groupsFirst=false) {
  let current=act(F,F.empty(),{type:'skeleton',kind:mol.kind,n:mol.n});
  for(const s of mol.subs)current=act(F,current,{type:'addSub',...s});
  const addGroups=()=>{for(const g of mol.groups)current=act(F,current,{type:'addGroup',groupType:g.type,pos:g.pos});};
  const addBonds=()=>{for(const b of mol.bonds)current=act(F,current,{type:'bond',...b});};
  if(groupsFirst){addGroups();addBonds();}else{addBonds();addGroups();}
  return current;
}
function atoms(F,draft) {
  let C=draft.n,H=0,O=0;
  for(let pos=1;pos<=draft.n;pos++)H+=F.hydrogens(draft,pos);
  for(const s of draft.subs){if(s.kind==='phenyl'){C+=6;H+=5;}else{C+=s.len;H+=2*s.len+1;}}
  for(const g of draft.groups){O+=g.type==='oico'?2:1;if(g.type==='ol'||g.type==='oico')H++;}
  return {C,H,O};
}
function fromAnswer(answer) {
  const lengths={metil:1,etil:2,propil:3,butil:4,pentil:5};
  const type={dial:'al',diona:'ona',enol:'ol'}[answer.suffix]||answer.suffix;
  const positions=answer.fgLocants||[answer.fgLocant];
  return chain(answer.root,[...positions.map(pos=>group(type,pos)),...(answer.hydroxyLocants||[]).map(pos=>group('ol',pos))],
    (answer.bondLocants||[]).map(pos=>({pos,order:2})),
    answer.substituents.flatMap(s=>s.locants.map(pos=>s.name==='fenil'?phenyl(pos):{pos,len:lengths[s.name]})));
}

for(const fixture of fixtures)test(`course reference: ${fixture.name} names, builds, counts H/C/O and reverses correctly`,()=>{
  const engine=load(),target=targetFor(engine,fixture),F=engine.F,current=construct(F,fixture.mol);
  assert.equal(target.name,fixture.name);
  assert.equal(F.check(current,fixture.mol,'ox').ok,true);
  assert.deepEqual(atoms(F,current),fixture.atoms);
  assert.deepEqual(Array.from({length:current.n},(_,i)=>F.hydrogens(current,i+1)),fixture.carbonH);
  assert.equal(F.check(construct(F,reverse(fixture.mol)),fixture.mol,'ox').ok,true);
  assert.equal(F.check(construct(F,fromAnswer(target.struct)),fixture.mol,'ox').ok,true,'The naming answer encodes the same structure');
  const formula=engine.renderChainFormula(fixture.mol).replace(/<[^>]*>/g,'');
  assert.equal((formula.match(/O/g)||[]).length,fixture.atoms.O,'Every oxygen is drawn');
  assert.doesNotMatch(formula,/undefined|NaN|H-\d/);
  if(fixture.family==='aldehido_aromatico'){
    assert.match(formula,/C6H5/);assert.match(formula,/CHO/);assert.doesNotMatch(formula,/CH2/);
    const display=engine.renderMolecule(fixture.mol);
    assert.equal(display.isSvg,true);assert.match(display.html,/<polygon/);assert.match(display.html,/CHO/);assert.doesNotMatch(display.html,/>OH</);
  }
  if(fixture.family==='enol'){
    assert.match(formula,/=/);assert.match(formula,/OH/);
    assert.equal(F.check(construct(F,fixture.mol,true),fixture.mol,'ox').ok,true,'Both OH-first and double-bond-first drafts work');
  }
  const aliases=plain(engine.oxygenateEquivalents(target));
  assert.ok(Array.isArray(aliases)&&aliases.every(name=>typeof name==='string'));
  assert.equal(new Set(aliases).size,aliases.length);assert.ok(!aliases.includes(target.name));
  if(fixture.alias)assert.ok(aliases.some(name=>fixture.alias.test(name)),JSON.stringify(aliases));
  let session=engine.S.create({unit:'ox',level:'custom',custom:{fams:{[fixture.family]:true},cx:'baja'}},target);
  session=engine.S.solve(session);
  assert.equal(session.feedback.kind,'sol');assert.equal(session.target.name,fixture.name);
  assert.equal(F.check(F.fromMol(session.target.mol),fixture.mol,'ox').ok,true,'The displayed solution retains the requested structure');
  assert.equal(session.stats.ok,0);assert.equal(session.stats.total,1);
});

const ranges={dialdehido:{baja:[2,5],media:[3,8],alta:[4,12]},dicetona:{baja:[4,5],media:[5,8],alta:[5,12]},hidroxialdehido:{baja:[3,5],media:[3,8],alta:[4,12]}};
for(const [family,profiles] of Object.entries(ranges))for(const [cx,range] of Object.entries(profiles))test(`${family}/${cx}: 200 reproducible variants satisfy naming, composition and construction`,()=>{
  const engine=load(0x43415242+families.indexOf(family)*101+['baja','media','alta'].indexOf(cx));
  const seen=new Set(),progress={};
  for(let i=0;i<200;i++){
    const target=engine.generateOx(engine.customCfg('ox',[family],cx),progress),mol=target.mol,groups=engine.molGroups(mol);
    assert.equal(target.fam,family);assert.equal(mol.kind,'chain');assert.equal(mol.subs.length,0);assert.equal(mol.bonds.length,0);
    assert.ok(mol.n>=range[0]&&mol.n<=range[1],target.name);
    assert.equal(groups.length,2);assert.equal(new Set(groups.map(g=>g.pos)).size,2);
    if(family==='dialdehido'){
      assert.ok(groups.every(g=>g.type==='al'));assert.deepEqual(plain(groups.map(g=>g.pos).sort((a,b)=>a-b)),[1,mol.n]);
      assert.equal(target.struct.suffix,'dial');assert.equal(target.struct.fgLocants.length,2);
    }else if(family==='dicetona'){
      assert.ok(groups.every(g=>g.type==='ona'&&g.pos>1&&g.pos<mol.n));assert.equal(target.struct.suffix,'diona');assert.equal(target.struct.fgLocants.length,2);
    }else{
      assert.equal(groups.filter(g=>g.type==='al').length,1);assert.equal(groups.filter(g=>g.type==='ol').length,1);
      assert.equal(target.struct.suffix,'al');assert.equal(target.struct.fgLocant,1);assert.equal(target.struct.hydroxyLocants.length,1);
    }
    assert.equal(engine.assembleName(target.struct),target.name);
    const current=construct(engine.F,mol);
    assert.equal(engine.F.check(current,mol,'ox').ok,true,target.name);
    assert.equal(engine.F.check(construct(engine.F,reverse(mol)),mol,'ox').ok,true,target.name);
    assert.equal(engine.F.check(construct(engine.F,fromAnswer(target.struct)),mol,'ox').ok,true,target.name);
    assert.deepEqual(atoms(engine.F,current),{C:mol.n,H:2*mol.n-(family==='hidroxialdehido'?0:2),O:2});
    seen.add(target.name);
  }
  assert.ok(seen.size>1,'Complexity profiles include actual variants');
});

test('the fixed aromatic/enol catalog remains available at every complexity',()=>{
  const expected={aldehido_aromatico:['benzaldehído'],enol:['etenol','prop-1-en-2-ol']};
  for(const [family,names] of Object.entries(expected))for(const cx of ['baja','media','alta']){
    const engine=load(),seen=new Set(),progress={};
    for(let i=0;i<12;i++){
      const target=engine.generateOx(engine.customCfg('ox',[family],cx),progress);
      assert.equal(target.fam,family);assert.ok(names.includes(target.name),target.name);seen.add(target.name);
      assert.equal(engine.F.check(construct(engine.F,target.mol),target.mol,'ox').ok,true);
      if(family==='enol')assert.equal(target.name,names[i%2]);
    }
    assert.deepEqual([...seen].sort(),[...names].sort());
  }
});

test('course references appear first for each category in each independent mode session',()=>{
  const engine=load(),naming={},formula={};
  for(const family of families){
    const expected=fixtures.find(f=>f.family===family).name,cfg=engine.customCfg('ox',[family],'alta');
    assert.equal(engine.generateOx(cfg,naming).name,expected);
    engine.generateOx(cfg,naming);engine.generateOx(cfg,naming);
    assert.equal(engine.generateOx(cfg,formula).name,expected,'The other mode owns its progress');
    assert.equal(formula[family],1);assert.equal(naming[family],3);
  }
  const fresh={};assert.equal(engine.generateOx(engine.customCfg('ox',['enol'],'baja'),fresh).name,'etenol','Reloading a session starts the reference sequence again');
});

test('after the first reference, reproducible sampling reaches both source references and distinct variants',()=>{
  const engine=load(0x52454653);
  for(const family of Object.keys(ranges)){
    const progress={},cfg=engine.customCfg('ox',[family],'media'),reference=fixtures.find(f=>f.family===family).name;
    const first=engine.generateOx(cfg,progress);
    assert.equal(first.name,reference);assert.equal(first.source.kind,'reference');
    let referenceCount=0,variantCount=0;
    for(let i=0;i<300;i++){
      const target=engine.generateOx(cfg,progress);
      if(target.source.kind==='reference'){referenceCount++;assert.equal(target.name,reference);}
      else {variantCount++;assert.equal(target.source.kind,'variant');assert.notEqual(target.name,reference);}
    }
    assert.ok(referenceCount>60&&referenceCount<140,`${family}: seeded reference probability remains around 1/3`);
    assert.ok(variantCount>160&&variantCount<240,`${family}: seeded variants remain around 2/3`);
  }
});

test('selected-family fallback stays inside the family and complexity profile',()=>{
  const engine=load(0x46414c4c,true);
  for(const family of families)for(const cx of ['baja','media','alta']){
    const target=engine.generateOx(engine.customCfg('ox',[family],cx));
    assert.equal(target.fam,family);assert.ok(target.name&&!/undefined|NaN/.test(target.name));
    const current=construct(engine.F,target.mol);assert.equal(engine.F.check(current,target.mol,'ox').ok,true);
    if(ranges[family]){const [min,max]=ranges[family][cx];assert.ok(target.mol.n>=min&&target.mol.n<=max,target.name);}
  }
});

test('multi-selection sampling keeps every requested carbonyl category reachable',()=>{
  const engine=load(),seen=new Set(),cfg=engine.customCfg('ox',families,'baja'),progress={};
  for(let i=0;i<200;i++){const target=engine.generateOx(cfg,progress);assert.ok(families.includes(target.fam));seen.add(target.fam);}
  assert.deepEqual([...seen].sort(),[...families].sort());
});

test('same molecular formula cannot substitute another function, locant or tautomer',()=>{
  const {F}=load(),dial=fixtures[1].mol,dione=fixtures[2].mol;
  assert.equal(F.check(F.fromMol(dial),dione,'ox').ok,false,'C5H8O2 is not enough');
  for(const [actual,expected] of [
    [chain(5,[group('al',1)]),dial],
    [chain(5,[group('ona',2),group('ona',3)]),dione],
    [chain(4,[group('al',1),group('ol',2)]),fixtures[5].mol],
    [chain(2,[group('al',1)]),fixtures[3].mol],
    [chain(3,[group('ona',2)]),fixtures[4].mol],
    [chain(3,[group('ol',1)],[{pos:2,order:2}]),fixtures[4].mol],
    [chain(2,[group('al',1)],[],[phenyl(2)]),fixtures[0].mol]
  ])assert.equal(F.check(F.fromMol(actual),expected,'ox').ok,false);
});

test('every group participates in valence and terminality; invalid combinations fail atomically',()=>{
  const {F}=load();
  for(const mol of [
    chain(4,[group('al',1),group('al',3)]),
    chain(4,[group('ona',1),group('ona',3)]),
    chain(4,[group('al',1),group('ol',1)]),
    chain(5,[group('ona',2),group('ona',2)]),
    chain(5,[group('ona',2),group('ona',3),group('ona',4)]),
    chain(4,[group('al',1),group('ona',3)]),
    chain(4,[group('al',1),group('ol',2),group('ol',3)]),
    chain(3,[group('ol',1)],[{pos:1,order:3}]),
    chain(5,[group('ol',1)],[{pos:1,order:2},{pos:3,order:2}]),
    chain(3,[group('al',1)],[{pos:1,order:2}]),
    chain(3,[group('ol',1),group('ol',3)],[{pos:1,order:2}]),
    chain(2,[group('ol',1)],[{pos:1,order:2}],[phenyl(2)]),
    chain(3,[group('ol',1)],[{pos:2,order:2}])
  ])assert.equal(F.validate(F.fromMol(mol),'ox').ok,false,JSON.stringify(mol));
  const current=construct(F,fixtures[5].mol),before=JSON.stringify(current);
  const invalid=F.apply(current,{type:'addGroup',groupType:'ona',pos:2},'ox');
  assert.equal(invalid.ok,false);assert.equal(JSON.stringify(current),before);assert.deepEqual(plain(invalid.draft),plain(current));
});

test('authoritative groups override conflicting legacy fg for every carbonyl operation',()=>{
  const engine=load(),mol={...plain(fixtures[1].mol),fg:group('ona',3)};
  assert.deepEqual(plain(engine.molGroups(mol)),fixtures[1].mol.groups);
  assert.equal(engine.assembleName(engine.analyzeCarbonyl(mol).struct),'1,5-pentanodial');
  assert.deepEqual(atoms(engine.F,engine.F.fromMol(mol)),fixtures[1].atoms);
  assert.equal((engine.renderChainFormula(mol).replace(/<[^>]*>/g,'').match(/O/g)||[]).length,2);
});

test('2,2-dimetilbutanal and the pre-existing carbonyl/acid conventions remain intact',()=>{
  const engine=load();
  for(const [mol,name] of [
    [chain(4,[group('al',1)],[],[{pos:2,len:1},{pos:2,len:1}]),'2,2-dimetilbutanal'],
    [chain(1,[group('al',1)]),'metanal'],[chain(2,[group('al',1)]),'etanal'],
    [chain(3,[group('ona',2)]),'propanona'],[chain(4,[group('ona',2)]),'butanona'],
    [chain(5,[group('ona',2)]),'2-pentanona']
  ]){
    assert.equal(engine.assembleName(engine.analyzeCarbonyl(mol).struct),name);
    assert.equal(engine.F.check(construct(engine.F,mol),mol,'ox').ok,true);
  }
});

test('new categories enter the agreed levels without dropping earlier families',()=>{
  const engine=load(),labels=Object.fromEntries(engine.CUSTOM_FAMS.ox.map(({f,t})=>[f,t]));
  for(const family of families)assert.ok(Object.hasOwn(labels,family),family);
  for(const family of ['aldehido_aromatico','dialdehido','dicetona'])assert.ok(engine.LEVELS_OX.medio.families.includes(family),family);
  for(const family of families)assert.ok(engine.LEVELS_OX.dificil.families.includes(family),family);
  for(const family of engine.LEVELS_OX.medio.families)assert.ok(engine.LEVELS_OX.dificil.families.includes(family),family);
  for(const family of ['enol','hidroxialdehido'])assert.ok(!engine.LEVELS_OX.medio.families.includes(family));
  const saved=engine.normalizeCustomPreference('ox',{fams:{alcohol:true,diol:false,triol:true,alcohol_aromatico:true,aldehido:false,cetona:true,acido:false},cx:'media'});
  assert.equal(saved.fams.alcohol,true);assert.equal(saved.fams.triol,true);assert.equal(saved.fams.alcohol_aromatico,true);assert.equal(saved.fams.cetona,true);
  for(const family of families)assert.equal(saved.fams[family],false);
  const fresh=engine.normalizeCustomPreference('ox',null);
  for(const family of families)assert.equal(fresh.fams[family],true);
});

test('carbonyl editing, undo and solution preserve the answer and count the score once',()=>{
  const engine=load(),target=targetFor(engine,fixtures[5]),S=engine.S;
  let current=S.create({unit:'ox',level:'dificil'},target);
  for(const action of [{type:'skeleton',kind:'chain',n:4},{type:'addGroup',groupType:'al',pos:1},{type:'addGroup',groupType:'ol',pos:3}]){
    const result=S.edit(current,action);assert.equal(result.ok,true,result.message);current=result.session;
  }
  current=S.verify(current);assert.equal(current.stats.ok,1);assert.equal(current.stats.total,1);
  const score=plain(current.stats),before=plain(current.draft),id=current.draft.groups[1].id;
  current=S.edit(current,{type:'remove',id}).session;current=S.verify(current);assert.equal(current.feedback.kind,'hint');
  current=S.undo(current);assert.deepEqual(plain(current.draft),before);
  current=S.verify(current);assert.equal(current.feedback.kind,'ok');assert.deepEqual(plain(current.stats),score);
  current=S.resume(S.solve(current));assert.deepEqual(plain(current.draft),before);assert.deepEqual(plain(current.stats),score);
});

function namingUI() {
  const engine=load(),nodes=new Map();
  class Element {
    constructor(){this.children=[];this.attrs={};this.style={};this.classes=new Set();this.textContent='';
      this.classList={add:value=>this.classes.add(value),remove:value=>this.classes.delete(value),contains:value=>this.classes.has(value),
        toggle:(value,force)=>{const include=force===undefined?!this.classes.has(value):force;if(include)this.classes.add(value);else this.classes.delete(value);return include;}};}
    set innerHTML(value){this.markup=String(value);this.children=[];}
    get innerHTML(){return this.markup||'';}
    appendChild(child){this.children.push(child);return child;}
    setAttribute(key,value){this.attrs[key]=String(value);}
    getAttribute(key){return this.attrs[key]??null;}
  }
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
  engine.context.$=get;engine.context.document={createElement:()=>new Element()};
  engine.context.state={unit:'ox',user:{},solved:false};
  new vm.Script(section('const KINDS=[','function compareStructs(u,a)')+
    section('function compareStructs(u,a)','const HINTS=')+
    '\nglobalThis.naming={resetUser,renderBuilder,userComplete,buildUserStruct,compareStructs};',
    {filename:'index.html:carbonyl-naming-controls'}).runInContext(engine.context);
  const api=engine.context.naming;api.resetUser();
  return {...engine,naming:api,state:engine.context.state,get,
    set(root,type){this.state.user={kind:'chain',root,suffix:null,bondLocants:[],subs:[],fg:{type,loc:null,locs:[],hydroxyLocants:[]}};api.renderBuilder();},
    click(id,text){const node=get(id).children.find(child=>String(child.textContent)===String(text));assert.ok(node,`${id} misses ${text}`);assert.equal(typeof node.onclick,'function');node.onclick();}
  };
}

test('naming controls build both multiple-carbonyl suffixes with distinct locants',()=>{
  const app=namingUI();
  for(const [type,positions,expected] of [['dial',[1,5],fixtures[1]],['diona',[2,4],fixtures[2]]]){
    app.set(5,type);assert.equal(app.naming.userComplete(),false);
    if(type==='diona')for(const end of [1,5])assert.ok(!app.get('fgloc-chips').children.some(node=>node.textContent===end));
    app.click('fgloc-chips',positions[0]);assert.equal(app.naming.userComplete(),false);
    app.click('fgloc-chips',positions[1]);assert.equal(app.naming.userComplete(),true);
    const answer=app.naming.buildUserStruct(),target=targetFor(app,expected);
    assert.equal(app.assembleName(answer),expected.name);assert.equal(app.naming.compareStructs(answer,target.struct).ok,true);
    const before=plain(app.state.user.fg.locs);
    if(type==='dial'){app.click('fgloc-chips',3);assert.deepEqual(plain(app.state.user.fg.locs),before,'A third locant must not replace either chosen group');}
    assert.equal(app.naming.compareStructs({...plain(answer),fgLocants:[positions[0],positions[0]]},target.struct).code,'fgCarbonylCount');
    assert.equal(app.naming.compareStructs({...plain(answer),fgLocants:[positions[0]]},target.struct).code,'fgCarbonylCount');
    assert.equal(app.naming.compareStructs({...plain(answer),suffix:type==='dial'?'al':'ona'},target.struct).code,'fgCarbonylCount');
  }
});

test('enol naming checks both locants and omits the unambiguous OH locant only for etenol',()=>{
  const app=namingUI();
  for(const [root,oh,expected] of [[2,1,fixtures[3]],[3,2,fixtures[4]]]){
    app.set(root,'enol');assert.equal(app.get('bond-field').classList.contains('hidden'),false);
    assert.equal(app.get('fgloc-field').classList.contains('hidden'),root===2);
    app.click('bond-chips',1);
    if(root===3){assert.equal(app.naming.userComplete(),false);app.click('fgloc-chips',oh);}
    assert.equal(app.naming.userComplete(),true);
    const answer=app.naming.buildUserStruct(),target=targetFor(app,expected);
    assert.equal(app.assembleName(answer),expected.name);assert.equal(app.naming.compareStructs(answer,target.struct).ok,true);
    assert.equal(app.naming.compareStructs({...plain(answer),fgLocant:root===2?2:1},target.struct).code,'fgLoc');
    if(root===3)assert.equal(app.naming.compareStructs({...plain(answer),bondLocants:[2]},target.struct).code,'bond');
    else {
      app.state.user.fg.loc=2;
      assert.equal(app.naming.buildUserStruct().fgLocant,1,'An omitted locant cannot leave an invisible alternate answer');
      assert.equal(app.assembleName(app.naming.buildUserStruct()),'etenol');
    }
  }
  app.set(3,'enol');app.click('bond-chips',1);app.click('fgloc-chips',2);
  app.state.user.subs=[{name:'metil',locants:[1]}];app.naming.renderBuilder();app.click('fgloc-chips',2);
  assert.match(app.get('preview').innerHTML,/metil/,'An extra radical must remain visible in the preview');
  assert.notEqual(app.get('preview').innerHTML,'prop-1-en-2-ol');
  assert.equal(app.naming.compareStructs(app.naming.buildUserStruct(),targetFor(app,fixtures[4]).struct).code,'subsSet');
});

test('hydroxi names keep CHO at C1, require one OH locant and clear invalid selections on a smaller root',()=>{
  const app=namingUI();app.set(4,'hidroxial');
  assert.equal(app.get('hydroxy-field').classList.contains('hidden'),false);assert.equal(app.naming.userComplete(),false);
  assert.ok(!app.get('hydroxy-chips').children.some(node=>node.textContent===1));
  app.click('hydroxy-chips',3);assert.equal(app.naming.userComplete(),true);
  const answer=app.naming.buildUserStruct(),target=targetFor(app,fixtures[5]);
  assert.equal(answer.suffix,'al');assert.equal(answer.fgLocant,1);assert.deepEqual(plain(answer.hydroxyLocants),[3]);
  assert.equal(app.assembleName(answer),'3-hidroxibutanal');assert.equal(app.naming.compareStructs(answer,target.struct).ok,true);
  assert.equal(app.naming.compareStructs({...plain(answer),hydroxyLocants:[]},target.struct).code,'hydroxyCount');
  assert.equal(app.naming.compareStructs({...plain(answer),hydroxyLocants:[2]},target.struct).code,'hydroxyLoc');
  app.click('root-chips','et');assert.deepEqual(plain(app.state.user.fg.hydroxyLocants),[]);assert.equal(app.naming.userComplete(),false);
});

test('the retained benzaldehyde name sets the external CHO plus phenyl and can be left without stale choices',()=>{
  const app=namingUI();app.naming.renderBuilder();app.click('fg-chips','Benzaldehído (base retenida)');
  assert.equal(app.naming.userComplete(),true);assert.equal(app.state.user.root,1);
  assert.equal(app.get('root-field').classList.contains('hidden'),true);assert.equal(app.get('subs-field').classList.contains('hidden'),true);
  const answer=app.naming.buildUserStruct();assert.equal(app.assembleName(answer),'benzaldehído');
  assert.equal(app.naming.compareStructs(answer,targetFor(app,fixtures[0]).struct).ok,true);
  assert.deepEqual(plain(answer.substituents),[{name:'fenil',locants:[1]}]);
  app.click('fg-chips','–al (aldehído)');assert.equal(app.state.user.root,null);assert.deepEqual(plain(app.state.user.subs),[]);
  assert.equal(app.get('root-field').classList.contains('hidden'),false);assert.equal(app.get('subs-field').classList.contains('hidden'),false);
});

test('the naming solution reveals carbonyl equivalents after an answer without changing its score',()=>{
  const app=namingUI(),feedback=[];let scoreUpdates=0;
  app.context.updateScore=()=>{scoreUpdates++;};app.context.showFeedback=(kind,message)=>feedback.push({kind,message});
  new vm.Script(section('function solve(){','function updateScore(){')+'\nglobalThis.namingSolve=solve;').runInContext(app.context);
  for(const fixture of fixtures){
    Object.assign(app.state,{current:targetFor(app,fixture),solved:true,ok:4,total:5,streak:3,record:4});
    const before=JSON.stringify(app.state);app.context.namingSolve();
    assert.equal(scoreUpdates,0);assert.equal(JSON.stringify(app.state),before);assert.equal(feedback.at(-1).kind,'sol');
    assert.match(feedback.at(-1).message,new RegExp(fixture.name));
    const aliases=plain(app.oxygenateEquivalents(app.state.current));
    for(const alias of aliases)assert.ok(feedback.at(-1).message.includes(alias),alias);
  }
});
