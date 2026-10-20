'use strict';

// The expectations below are transcribed independently from the course inventory.
// They deliberately do not import the production catalog or external source files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const al = pos => ({type:'al',pos});
const ona = pos => ({type:'ona',pos});
const chain = (n,groups,bonds=[],subs=[]) => ({kind:'chain',n,groups,bonds,subs});
const methyl = pos => ({pos,len:1});
const fixtures = [
  {name:'metanal',family:'aldehido',formula:'CH2O',atoms:{C:1,H:2,O:1},mol:chain(1,[al(1)])},
  {name:'etanal',family:'aldehido',formula:'C2H4O',atoms:{C:2,H:4,O:1},mol:chain(2,[al(1)])},
  {name:'propanal',family:'aldehido',formula:'C3H6O',atoms:{C:3,H:6,O:1},mol:chain(3,[al(1)])},
  {name:'butanal',family:'aldehido',formula:'C4H8O',atoms:{C:4,H:8,O:1},mol:chain(4,[al(1)])},
  {name:'2,2-dimetilbutanal',family:'aldehido',formula:'C6H12O',atoms:{C:6,H:12,O:1},mol:chain(4,[al(1)],[],[methyl(2),methyl(2)])},
  {name:'benzaldehído',family:'aldehido',formula:'C7H6O',atoms:{C:7,H:6,O:1},mol:chain(1,[al(1)],[],[{kind:'phenyl',pos:1}])},
  {name:'1,5-pentanodial',family:'aldehido',formula:'C5H8O2',atoms:{C:5,H:8,O:2},mol:chain(5,[al(1),al(5)])},
  {name:'propanona',family:'cetona',formula:'C3H6O',atoms:{C:3,H:6,O:1},mol:chain(3,[ona(2)])},
  {name:'butanona',family:'cetona',formula:'C4H8O',atoms:{C:4,H:8,O:1},mol:chain(4,[ona(2)])},
  {name:'2-pentanona',family:'cetona',formula:'C5H10O',atoms:{C:5,H:10,O:1},mol:chain(5,[ona(2)])},
  {name:'3-pentanona',family:'cetona',formula:'C5H10O',atoms:{C:5,H:10,O:1},mol:chain(5,[ona(3)])},
  {name:'3-hexanona',family:'cetona',formula:'C6H12O',atoms:{C:6,H:12,O:1},mol:chain(6,[ona(3)])},
  {name:'2,4-pentanodiona',family:'cetona',formula:'C5H8O2',atoms:{C:5,H:8,O:2},mol:chain(5,[ona(2),ona(4)])},
  {name:'1,7,7-trimetilbiciclo[2.2.1]heptan-2-ona',family:'cetona',formula:'C10H16O',atoms:{C:10,H:16,O:1},mol:{kind:'bicyclo221',n:7,groups:[ona(2)],bonds:[],subs:[methyl(1),methyl(7),methyl(7)]}},
  {name:'4-metil-2-pentanona',family:'cetona',formula:'C6H12O',atoms:{C:6,H:12,O:1},mol:chain(5,[ona(2)],[],[methyl(4)])},
  {name:'heptanal',family:'aldehido',formula:'C7H14O',atoms:{C:7,H:14,O:1},mol:chain(7,[al(1)])},
  {name:'octanal',family:'aldehido',formula:'C8H16O',atoms:{C:8,H:16,O:1},mol:chain(8,[al(1)])},
  {name:'pentanal',family:'aldehido',formula:'C5H10O',atoms:{C:5,H:10,O:1},mol:chain(5,[al(1)])},
  {name:'3-hidroxibutanal',family:'aldehido',formula:'C4H8O2',atoms:{C:4,H:8,O:2},mol:chain(4,[al(1),{type:'ol',pos:3}])},
  {name:'2-butenal',family:'aldehido',formula:'C4H6O',atoms:{C:4,H:6,O:1},mol:chain(4,[al(1)],[{pos:2,order:2}])}
];
function section(start,end) {
  const begin=html.indexOf(start),finish=html.indexOf(end,begin+start.length);
  assert.ok(begin>=0&&finish>begin,`Missing source markers: ${start}`);
  return html.slice(begin,finish);
}
function load(initialSeed=0x32304d4f,forceFallback=false) {
  let seed=initialSeed>>>0;
  const math=Object.create(Math);
  math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0x100000000;};
  const context=vm.createContext({Math:math});
  new vm.Script([
    section('const ROOTS =','const state ='),
    section('/* NQ_FORMULA_CORE_START */','/* NQ_FORMULA_CORE_END */'),
    section('/* NQ_FORMULA_SESSION_START */','/* NQ_FORMULA_SESSION_END */'),
    forceFallback?'analyzeCarbonyl=()=>null;':'',
    'globalThis.engine={courseTargets,courseTarget,COURSE:COURSE_CARBONYLS,assembleName,oxygenateEquivalents,generateOx,customCfg,CUSTOM_FAMS,LEVELS_OX,normalizeCustomPreference,developedGraph,renderDevelopedMolecule,renderMolecule,C:NQCourse,F:NQFormula,S:NQFormulaSession};'
  ].join('\n'),{filename:'index.html:twenty-course-references'}).runInContext(context);
  return {...context.engine,context};
}
function act(F,current,action) {
  const before=JSON.stringify(current),result=F.apply(current,action,'ox');
  assert.equal(JSON.stringify(current),before,'Editing is immutable');
  assert.equal(result.ok,true,`${JSON.stringify(action)}: ${result.message}`);
  return result.draft;
}
function construct(F,mol,groupsFirst=false) {
  let current=act(F,F.empty(),{type:'skeleton',kind:mol.kind,n:mol.n});
  for(const sub of mol.subs)current=act(F,current,{type:'addSub',...sub});
  const groups=()=>{for(const group of mol.groups)current=act(F,current,{type:'addGroup',groupType:group.type,pos:group.pos});};
  const bonds=()=>{for(const bond of mol.bonds)current=act(F,current,{type:'bond',...bond});};
  if(groupsFirst){groups();bonds();}else{bonds();groups();}
  return current;
}
function fromAnswer(answer) {
  const lengths={metil:1,etil:2,propil:3,butil:4,pentil:5};
  const type={dial:'al',diona:'ona',enal:'al'}[answer.suffix]||answer.suffix;
  const positions=answer.fgLocants||[answer.fgLocant];
  return {kind:answer.kind,n:answer.root,
    groups:[...positions.map(pos=>({type,pos})),...(answer.hydroxyLocants||[]).map(pos=>({type:'ol',pos}))],
    bonds:(answer.bondLocants||[]).map(pos=>({pos,order:2})),
    subs:answer.substituents.flatMap(sub=>sub.locants.map(pos=>sub.name==='fenil'?{kind:'phenyl',pos}:{pos,len:lengths[sub.name]}))};
}
function reversed(mol) {
  return {...plain(mol),groups:mol.groups.map(g=>({...g,pos:mol.n+1-g.pos})),
    bonds:mol.bonds.map(b=>({...b,pos:mol.n-b.pos})),subs:mol.subs.map(s=>({...s,pos:mol.n+1-s.pos}))};
}
function composition(F,draft) {
  let C=draft.n,H=0,O=0;
  for(let p=1;p<=draft.n;p++)H+=F.hydrogens(draft,p);
  for(const sub of draft.subs){if(sub.kind==='phenyl'){C+=6;H+=5;}else{C+=sub.len;H+=2*sub.len+1;}}
  for(const group of draft.groups){O+=group.type==='oico'?2:1;if(group.type==='ol'||group.type==='oico')H++;}
  return {C,H,O};
}
function byOrder(engine,order){return engine.courseTargets('all').find(target=>target.course.order===order);}
function expectedHeavyGraph(mol) {
  const symbols=Array(mol.n).fill('C'),bonds=[];
  const atom=symbol=>{symbols.push(symbol);return symbols.length-1;};
  const edge=(a,b,order=1)=>bonds.push({a,b,order});
  if(mol.kind==='bicyclo221'){
    for(const [a,b] of [[1,2],[2,3],[3,4],[4,5],[5,6],[6,1],[1,7],[7,4]])edge(a-1,b-1);
  }else for(let pos=1;pos<mol.n;pos++)edge(pos-1,pos,(mol.bonds.find(b=>b.pos===pos)||{order:1}).order);
  for(const sub of mol.subs){
    if(sub.kind==='phenyl'){
      const ring=Array.from({length:6},()=>atom('C'));edge(sub.pos-1,ring[0]);
      ring.forEach((a,i)=>edge(a,ring[(i+1)%6],i%2?1:2));
    }else{let previous=sub.pos-1;for(let i=0;i<sub.len;i++){const next=atom('C');edge(previous,next);previous=next;}}
  }
  for(const group of mol.groups)edge(group.pos-1,atom('O'),group.type==='ol'?1:2);
  return {atoms:symbols.map(symbol=>({symbol})),bonds};
}
function sameHeavyConnectivity(actual,expected) {
  const prepare=graph=>{
    const keep=graph.atoms.map((atom,i)=>atom.symbol!=='H'?i:-1).filter(i=>i>=0),map=new Map(keep.map((old,i)=>[old,i]));
    const nodes=keep.map(i=>({symbol:graph.atoms[i].symbol,edges:new Map()}));
    for(const bond of graph.bonds)if(map.has(bond.a)&&map.has(bond.b)){
      const a=map.get(bond.a),b=map.get(bond.b);nodes[a].edges.set(b,bond.order);nodes[b].edges.set(a,bond.order);
    }
    return nodes;
  };
  const a=prepare(actual),b=prepare(expected);if(a.length!==b.length)return false;
  const sig=node=>node.symbol+':'+[...node.edges.values()].sort().join(',');
  const order=a.map((_,i)=>i).sort((i,j)=>b.filter(node=>sig(node)===sig(a[i])).length-b.filter(node=>sig(node)===sig(a[j])).length);
  const assigned=new Map(),used=new Set();
  function visit(depth){
    if(depth===order.length)return true;
    const source=order[depth];
    for(let target=0;target<b.length;target++){
      if(used.has(target)||sig(a[source])!==sig(b[target]))continue;
      if([...assigned].some(([left,right])=>a[source].edges.get(left)!==b[target].edges.get(right)))continue;
      assigned.set(source,target);used.add(target);
      if(visit(depth+1))return true;assigned.delete(source);used.delete(target);
    }
    return false;
  }
  return visit(0);
}

test('the course inventory contains exactly 20 independent, ordered references: 12 aldehydes and 8 ketones',()=>{
  const engine=load(),all=engine.courseTargets('all');
  assert.equal(all.length,20);assert.equal(engine.COURSE.length,20);
  assert.equal(engine.courseTargets('aldehidos').length,12);assert.equal(engine.courseTargets('cetonas').length,8);
  assert.deepEqual(plain(all.map(target=>target.course.order)),Array.from({length:20},(_,i)=>i+1));
  assert.equal(new Set(all.map(target=>target.course.id)).size,20);
  for(const [index,target] of all.entries()){
    const expected=fixtures[index];
    assert.equal(target.name,expected.name);assert.equal(target.course.family,expected.family);
    assert.equal(target.course.formula,expected.formula);assert.ok(target.course.source.length>5);
    assert.ok(target.label||target.famLabel,'Each entry has an educational label');
    assert.equal(engine.courseTargets(target.course.id).length,1);
    assert.equal(engine.courseTarget(target.course.id).course.order,index+1);
  }
});

for(const [index,fixture] of fixtures.entries())test(`source ${index+1}: ${fixture.name} works in naming and construction, including solution and H counts`,()=>{
  const engine=load(),F=engine.F,target=byOrder(engine,index+1),current=construct(F,fixture.mol);
  assert.equal(target.name,fixture.name);assert.equal(engine.assembleName(target.struct),fixture.name);
  assert.equal(F.check(current,target.mol,'ox').ok,true,'The independent source structure matches the production target');
  assert.equal(F.check(construct(F,fromAnswer(target.struct)),fixture.mol,'ox').ok,true,'The structured name reconstructs the same molecule');
  assert.deepEqual(composition(F,current),fixture.atoms);
  if(fixture.mol.kind==='chain')assert.equal(F.check(construct(F,reversed(fixture.mol)),target.mol,'ox').ok,true);
  for(let pos=1;pos<=current.n;pos++)assert.ok(Number.isInteger(F.hydrogens(current,pos))&&F.hydrogens(current,pos)>=0);
  let session=engine.S.create({unit:'ox',level:'custom'},target);
  session=engine.S.solve(session);
  assert.equal(session.feedback.kind,'sol');assert.equal(session.target.name,fixture.name);
  assert.equal(F.check(F.fromMol(session.target.mol),fixture.mol,'ox').ok,true);
  assert.equal(session.stats.ok,0);assert.equal(session.stats.total,1);
});

test('catalog callers cannot mutate a later target, another mode or the production metadata',()=>{
  const engine=load(),first=byOrder(engine,5),id=first.course.id,before=plain(engine.courseTarget(id));
  first.mol.subs[0].pos=99;first.mol.groups[0].type='ol';first.struct.substituents[0].locants[0]=99;
  first.course.source='changed';first.name='changed';
  const fresh=engine.courseTarget(id);assert.deepEqual(plain(fresh),before);
  const all=engine.courseTargets('all');all.length=0;
  assert.equal(engine.courseTargets('all').length,20);
  const dione=byOrder(engine,13),dioneId=dione.course.id;
  dione.struct.fgLocants[0]=99;
  assert.deepEqual(plain(engine.courseTarget(dioneId).struct.fgLocants),[2,4]);
});

test('the professor-style names stay primary, with current systematic forms only as equivalent names',()=>{
  const engine=load();
  for(const [order,name,alias] of [[7,'1,5-pentanodial','pentanodial'],[10,'2-pentanona','pentan-2-ona'],
    [11,'3-pentanona','pentan-3-ona'],[12,'3-hexanona','hexan-3-ona'],[13,'2,4-pentanodiona','pentano-2,4-diona'],
    [15,'4-metil-2-pentanona','4-metilpentan-2-ona'],[20,'2-butenal','but-2-enal']]){
    const target=byOrder(engine,order),aliases=plain(engine.oxygenateEquivalents(target));
    assert.equal(target.name,name);assert.ok(aliases.includes(alias),`${name}: ${JSON.stringify(aliases)}`);
    assert.equal(new Set(aliases).size,aliases.length);assert.ok(!aliases.includes(name));
  }
  assert.ok(engine.oxygenateEquivalents(byOrder(engine,14)).some(name=>name.toLowerCase()==='alcanfor'));
});

test('course queues cover every selection in source order before repeating, without changing the other mode',()=>{
  const engine=load(),C=engine.C;
  for(const filter of ['all','aldehidos','cetonas',byOrder(engine,14).course.id]){
    let naming=C.create(filter),formula=C.create(filter);const before=JSON.stringify(formula),seen=[];
    const expected=engine.courseTargets(filter).map(target=>target.course.id);
    for(let i=0;i<expected.length;i++){
      assert.equal(C.current(naming).course.id,expected[i]);seen.push(C.current(naming).course.id);
      assert.deepEqual(plain(C.summary(naming)),{position:i+1,total:expected.length,round:1});
      const old=JSON.stringify(naming);const next=C.next(naming);
      assert.equal(JSON.stringify(naming),old,'Advancing does not mutate its input');naming=next;
    }
    assert.equal(new Set(seen).size,expected.length);assert.equal(C.current(naming).course.id,expected[0]);
    assert.deepEqual(plain(C.summary(naming)),{position:1,total:expected.length,round:2});
    assert.equal(JSON.stringify(formula),before,'Each practice mode owns a queue');
    const exposed=C.current(formula);exposed.mol.n=99;
    assert.notEqual(C.current(formula).mol.n,99,'A displayed target is a fresh catalog copy');
  }
});

test('2-butenal builds CHO-first or C=C-first, preserves the carbonyl and rejects other isomers or tautomers',()=>{
  const engine=load(),F=engine.F,target=byOrder(engine,20);
  for(const groupsFirst of [true,false]){
    const draft=construct(F,fixtures[19].mol,groupsFirst);
    assert.equal(F.check(draft,target.mol,'ox').ok,true);assert.deepEqual(composition(F,draft),{C:4,H:6,O:1});
    assert.deepEqual(Array.from({length:4},(_,i)=>F.hydrogens(draft,i+1)),[1,1,1,3]);
  }
  for(const other of [chain(4,[al(1)]),chain(4,[al(1)],[{pos:3,order:2}]),chain(4,[{type:'ol',pos:2}],[{pos:1,order:2}])]){
    assert.equal(F.check(F.fromMol(other),target.mol,'ox').ok,false,JSON.stringify(other));
  }
  const invalid=F.fromMol(chain(4,[al(1)],[{pos:1,order:2}]));
  assert.equal(F.validate(invalid,'ox').ok,false,'The aldehyde carbon cannot also form C=C');
  const good=construct(F,fixtures[19].mol,true),before=JSON.stringify(good);
  const failed=F.apply(good,{type:'bond',pos:1,order:2},'ox');
  assert.equal(failed.ok,false);assert.equal(JSON.stringify(failed.draft),before);
});

test('camphor uses a bridged bicyclic graph and accepts its numbering symmetry but not wrong methyl positions',()=>{
  const engine=load(),F=engine.F,target=byOrder(engine,14),draft=construct(F,fixtures[13].mol);
  assert.deepEqual(Array.from({length:7},(_,i)=>F.hydrogens(draft,i+1)),[0,0,2,1,2,2,0]);
  // This automorphism interchanges the bridgeheads and the two long bridges.
  const map={1:4,2:3,3:2,4:1,5:6,6:5,7:7};
  const equivalent={...plain(fixtures[13].mol),groups:[ona(3)],subs:[methyl(4),methyl(7),methyl(7)]};
  assert.ok(map[1]===4&&map[2]===3);
  assert.equal(F.check(construct(F,equivalent),target.mol,'ox').ok,true);
  for(const subs of [[methyl(1),methyl(6),methyl(7)],[methyl(4),methyl(7),methyl(7)],[methyl(1),methyl(7)]]){
    const other={...plain(fixtures[13].mol),subs};assert.equal(F.check(F.fromMol(other),target.mol,'ox').ok,false);
  }
  const excess=F.apply(draft,{type:'addSub',pos:7,len:1},'ox');assert.equal(excess.ok,false);
  assert.deepEqual(plain(excess.draft),plain(draft),'C7 already has four carbon bonds');
  assert.equal(F.apply(draft,{type:'bond',pos:2,order:2},'ox').ok,false,'The fixed bridge bonds cannot be replaced by a chain bond');
  assert.equal(F.validate(F.fromMol({...plain(fixtures[13].mol),n:6}),'ox').ok,false);
});

test('the two new random-practice families are fixed references at every custom complexity and start in difficult',()=>{
  const engine=load(),families=['aldehido_insaturado','cetona_biciclica'];
  for(const [i,family] of families.entries()){
    assert.ok(engine.CUSTOM_FAMS.ox.some(item=>item.f===family));
    assert.ok(engine.LEVELS_OX.dificil.families.includes(family));
    assert.ok(!engine.LEVELS_OX.medio.families.includes(family));
    for(const cx of ['baja','media','alta'])for(let attempt=0;attempt<10;attempt++){
      const target=engine.generateOx(engine.customCfg('ox',[family],cx),{}),fixture=fixtures[i?13:19];
      assert.equal(target.fam,family);assert.equal(target.name,fixture.name);
      assert.equal(engine.F.check(construct(engine.F,target.mol),fixture.mol,'ox').ok,true);
    }
  }
  const old=engine.normalizeCustomPreference('ox',{fams:{alcohol:true,aldehido:true,cetona:true},cx:'media'});
  const fresh=engine.normalizeCustomPreference('ox',null);
  for(const family of families){assert.equal(old.fams[family],false);assert.equal(fresh.fams[family],true);}
});

test('forced analysis failure retains each newly selected fixed family and its valid structure',()=>{
  const engine=load(0x46414c4c,true);
  for(const [family,fixture] of [['aldehido_insaturado',fixtures[19]],['cetona_biciclica',fixtures[13]]]){
    for(const cx of ['baja','media','alta']){
      const target=engine.generateOx(engine.customCfg('ox',[family],cx),{});
      assert.equal(target.fam,family);assert.equal(target.name,fixture.name);
      assert.equal(engine.F.check(construct(engine.F,target.mol),fixture.mol,'ox').ok,true);
    }
  }
});

test('editing, undo and solution keep the new targets and count each attempt once',()=>{
  const engine=load(),S=engine.S;
  for(const order of [14,20]){
    const target=byOrder(engine,order),mol=fixtures[order-1].mol;
    let session=S.create({unit:'ox',level:'dificil'},target);
    const actions=[{type:'skeleton',kind:mol.kind,n:mol.n},
      ...mol.subs.map(sub=>({type:'addSub',...sub})),...mol.groups.map(g=>({type:'addGroup',groupType:g.type,pos:g.pos})),
      ...mol.bonds.map(b=>({type:'bond',...b}))];
    for(const action of actions){const result=S.edit(session,action);assert.equal(result.ok,true,result.message);session=result.session;}
    session=S.verify(session);assert.equal(session.feedback.kind,'ok');
    assert.equal(session.stats.ok,1);assert.equal(session.stats.total,1);
    const before=plain(session.draft),score=plain(session.stats),id=session.draft.groups[0].id;
    session=S.edit(session,{type:'remove',id}).session;session=S.verify(session);
    assert.equal(session.feedback.kind,'hint');session=S.undo(session);
    assert.deepEqual(plain(session.draft),before);session=S.verify(session);
    assert.equal(session.feedback.kind,'ok');assert.deepEqual(plain(session.stats),score);
    session=S.resume(S.solve(session));assert.deepEqual(plain(session.draft),before);assert.deepEqual(plain(session.stats),score);
  }
});

function namingUI() {
  const engine=load(),nodes=new Map();
  class Element {
    constructor(){this.children=[];this.attrs={};this.style={};this.classes=new Set();this.textContent='';
      this.classList={add:v=>this.classes.add(v),remove:v=>this.classes.delete(v),contains:v=>this.classes.has(v),
        toggle:(v,force)=>{const include=force===undefined?!this.classes.has(v):force;if(include)this.classes.add(v);else this.classes.delete(v);return include;}};}
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
    {filename:'index.html:enals-bicyclic-naming-controls'}).runInContext(engine.context);
  const api=engine.context.naming;api.resetUser();
  return {...engine,naming:api,state:engine.context.state,get,
    click(id,match){const node=get(id).children.find(child=>match instanceof RegExp?match.test(String(child.textContent)):String(child.textContent)===String(match));
      assert.ok(node,`${id} misses ${match}`);assert.equal(typeof node.onclick,'function');node.onclick();}
  };
}

test('the enal naming controls require the C=C locant while keeping CHO implicitly at C1',()=>{
  const app=namingUI(),target=byOrder(app,20);
  app.state.user={kind:'chain',root:4,suffix:null,bondLocants:[],subs:[],fg:{type:'enal',loc:null,locs:[],hydroxyLocants:[]}};
  app.naming.renderBuilder();assert.equal(app.naming.userComplete(),false);
  assert.equal(app.get('bond-field').classList.contains('hidden'),false);
  assert.equal(app.get('fgloc-field').classList.contains('hidden'),true);
  app.click('bond-chips',2);assert.equal(app.naming.userComplete(),true);
  const answer=app.naming.buildUserStruct();
  assert.equal(answer.fgLocant,1);assert.equal(app.assembleName(answer),'2-butenal');
  assert.equal(app.naming.compareStructs(answer,target.struct).ok,true);
  assert.equal(app.naming.compareStructs({...plain(answer),bondLocants:[3]},target.struct).ok,false);
});

test('the bicyclic naming controls expose the seven-carbon base, carbonyl and all three methyl locants',()=>{
  const app=namingUI(),target=byOrder(app,14);
  app.naming.renderBuilder();app.click('kind-chips',/biciclo/i);
  assert.equal(app.state.user.kind,'bicyclo221');assert.equal(app.state.user.root,7);
  assert.equal(app.naming.userComplete(),false,'Selecting the base does not fill the answer');
  assert.equal(app.state.user.subs.length,0);
  assert.match(app.get('root-chips').children.map(node=>node.textContent).join(' '),/biciclo\[2\.2\.1\]heptano/i);
  assert.ok(app.get('fg-chips').children.every(node=>/cetona/.test(node.textContent)));
  app.click('fgloc-chips',2);
  app.state.user.subs=[{name:'metil',locants:[1,7,7]}];app.naming.renderBuilder();
  assert.equal(app.naming.userComplete(),true);
  const answer=app.naming.buildUserStruct();assert.equal(answer.kind,'bicyclo221');
  assert.deepEqual(plain(answer.substituents),[{name:'metil',locants:[1,7,7]}]);
  assert.equal(app.assembleName(answer),target.name);assert.equal(app.naming.compareStructs(answer,target.struct).ok,true);
  assert.equal(app.naming.compareStructs({...plain(answer),fgLocant:3},target.struct).ok,false);
  assert.equal(app.naming.compareStructs({...plain(answer),substituents:[{name:'metil',locants:[1,6,7]}]},target.struct).ok,false);
  app.click('kind-chips','Cadena abierta');assert.equal(app.state.user.kind,'chain');assert.equal(app.state.user.root,null);
});

for(const [index,fixture] of fixtures.entries())test(`developed formula ${index+1}: ${fixture.name} displays every atom and bond with complete valences`,()=>{
  const engine=load(),graph=plain(engine.developedGraph(fixture.mol));
  assert.ok(Array.isArray(graph.atoms)&&Array.isArray(graph.bonds));
  const counts={C:0,H:0,O:0},valence=Array(graph.atoms.length).fill(0),edges=new Set();
  for(const atom of graph.atoms){assert.ok(Object.hasOwn(counts,atom.symbol));counts[atom.symbol]++;assert.ok(Number.isFinite(atom.x)&&Number.isFinite(atom.y));}
  for(const bond of graph.bonds){
    assert.ok(Number.isInteger(bond.a)&&Number.isInteger(bond.b));assert.ok(bond.a>=0&&bond.b>=0&&bond.a<graph.atoms.length&&bond.b<graph.atoms.length&&bond.a!==bond.b);
    assert.ok([1,2,3].includes(bond.order));const key=[bond.a,bond.b].sort((a,b)=>a-b).join(':');assert.ok(!edges.has(key));edges.add(key);
    valence[bond.a]+=bond.order;valence[bond.b]+=bond.order;
  }
  assert.deepEqual(counts,fixture.atoms);
  graph.atoms.forEach((atom,i)=>assert.equal(valence[i],{C:4,H:1,O:2}[atom.symbol],`${atom.symbol} #${i+1}`));
  assert.equal(sameHeavyConnectivity(graph,expectedHeavyGraph(fixture.mol)),true,'The drawing has the independently expected heavy-atom connectivity');
  const drawn=engine.renderDevelopedMolecule(fixture.mol);
  assert.equal(drawn.isSvg,true);assert.match(drawn.html,/<svg\b/);assert.doesNotMatch(drawn.html,/undefined|NaN/);
  assert.equal((drawn.html.match(/>H<\/text>/g)||[]).length,fixture.atoms.H,'Every hydrogen has an explicit label');
  assert.equal((drawn.html.match(/>C<\/text>/g)||[]).length,fixture.atoms.C,'Every carbon has an explicit label');
  assert.equal((drawn.html.match(/>O<\/text>/g)||[]).length,fixture.atoms.O,'Every oxygen has an explicit label');
});
