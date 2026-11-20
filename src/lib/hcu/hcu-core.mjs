// Núcleo HCU (sin DOM). Misma fuente que public/hcu/index.html; verificada contra node:crypto en src/test/hcu-core.test.ts.
/* Núcleo lógico del instrumento HCU. Sin DOM: se prueba en Node y se incrusta en la página. */
const Core=(function(){
"use strict";
var Y0=2026,T=24;

/* ---------- SHA3-512 (FIPS 202), implementación propia con BigInt ---------- */
var M64=(1n<<64n)-1n;
var RC=[0x0000000000000001n,0x0000000000008082n,0x800000000000808An,0x8000000080008000n,0x000000000000808Bn,0x0000000080000001n,0x8000000080008081n,0x8000000000008009n,0x000000000000008An,0x0000000000000088n,0x0000000080008009n,0x000000008000000An,0x000000008000808Bn,0x800000000000008Bn,0x8000000000008089n,0x8000000000008003n,0x8000000000008002n,0x8000000000000080n,0x000000000000800An,0x800000008000000An,0x8000000080008081n,0x8000000000008080n,0x0000000080000001n,0x8000000080008008n];
var ROT=[[0,36,3,41,18],[1,44,10,45,2],[62,6,43,15,61],[28,55,25,21,56],[27,20,39,8,14]];
function rotl(v,r){return r?(((v<<r)|(v>>(64n-r)))&M64):v;}
function keccakF(s){
  var r,x,y,i,C=[],D=[],B=[];
  for(r=0;r<24;r++){
    for(x=0;x<5;x++)C[x]=s[x]^s[x+5]^s[x+10]^s[x+15]^s[x+20];
    for(x=0;x<5;x++)D[x]=C[(x+4)%5]^rotl(C[(x+1)%5],1n);
    for(i=0;i<25;i++)s[i]^=D[i%5];
    for(x=0;x<5;x++)for(y=0;y<5;y++)B[y+5*((2*x+3*y)%5)]=rotl(s[x+5*y],BigInt(ROT[x][y]));
    for(x=0;x<5;x++)for(y=0;y<5;y++)s[x+5*y]=B[x+5*y]^((~B[(x+1)%5+5*y]&M64)&B[(x+2)%5+5*y]);
    s[0]^=RC[r];
  }
}
function sha3(str){
  var bytes=new TextEncoder().encode(String(str)),rate=72,len=bytes.length,pad=rate-(len%rate);
  var msg=new Uint8Array(len+pad),s=[],i,j,off;
  for(i=0;i<25;i++)s.push(0n);
  msg.set(bytes);msg[len]^=0x06;msg[len+pad-1]^=0x80;
  for(off=0;off<msg.length;off+=rate){
    for(i=0;i<rate/8;i++){var v=0n;for(j=7;j>=0;j--)v=(v<<8n)|BigInt(msg[off+i*8+j]);s[i]^=v;}
    keccakF(s);
  }
  var out="";
  for(i=0;i<8;i++)for(j=0;j<8;j++)out+=("0"+Number((s[i]>>BigInt(8*j))&0xFFn).toString(16)).slice(-2);
  return out;
}

/* ---------- Validadores de identificadores ---------- */
function mod112(d15){var t=0,i;for(i=0;i<d15.length;i++)t=(t+(+d15[i]))*2;var c=(12-(t%11))%11;return c===10?"X":String(c);}
function orcid(s){var m=/^(\d{4})-(\d{4})-(\d{4})-(\d{3}[\dX])$/.exec(String(s||"").trim());if(!m)return false;var d=m[1]+m[2]+m[3]+m[4];return mod112(d.slice(0,15))===d[15];}
function isni(s){var d=String(s||"").replace(/\s+/g,"");return /^\d{15}[\dX]$/.test(d)&&mod112(d.slice(0,15))===d[15];}
function tri(s){return /^TRI-TAMV-(20\d{2})-(\d{4})$/.test(String(s||"").trim());}
var ROLES=[
 ["TRI-F","Founding Custodian / Dirección Científica","Preservación del canon conceptual, visión sistémica y liderazgo de la arquitectura civilizatoria."],
 ["TRI-R","Research Fellow / Investigador Principal","Formulación de hipótesis, modelado matemático, diseño metodológico y redacción científica."],
 ["TRI-D","Systems Engineer & Code Architect","Desarrollo de software, implementación de motores, construcción de algoritmos (ML/WebGL/criptografía) y reproducibilidad técnica."],
 ["TRI-E","Editor & Auditor Neutral","Verificación de integridad metodológica, revisión por pares y auditoría de seguridad y código."],
 ["TRI-C","Specialized Collaborator","Aportación de datos primarios, trabajo de campo, preservación histórica o análisis territorial."],
 ["TRI-A","External Associated Researcher","Coautoría de investigadores adscritos a universidades o centros de investigación externos."],
 ["TRI-S","Student / Junior Developer","Investigador en formación que participa bajo mentoría técnica documentada."]
];
function roleOk(r){return ROLES.some(function(x){return x[0]===r;});}
function doiNorm(s){return String(s||"").trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i,"").replace(/^doi:\s*/i,"");}
function doi(s){return /^10\.\d{4,9}\/\S+$/i.test(doiNorm(s));}
function url(s){return /^https?:\/\/[^\s/]+\.[^\s/]+\S*$/i.test(String(s||"").trim());}
function refOk(s){return doi(s)||url(s);}

/* ---------- Datos semilla (tomados de los prototipos del autor) ---------- */
var DOMS=[
 ["IA y Cognición","La inteligencia artificial redefine la producción de conocimiento, la toma de decisiones y la organización del trabajo."],
 ["Economía Soberana","El valor económico se desplaza hacia activos cognitivos, datos verificables y capacidades de ejecución."],
 ["Gobernanza","La legitimidad depende de evidencia, transparencia, participación y rendición de cuentas."],
 ["Clima y Biosfera","El clima reorganiza economía, salud, seguridad y estabilidad geopolítica."],
 ["Salud y Vida","La salud se vuelve preventiva, personalizada y dependiente de datos, biotecnología y confianza pública."],
 ["Seguridad","La seguridad ya no es solo militar: es digital, informacional, biológica y cognitiva."]
];
var SEED_A=[
 ["ia","IA Generativa",0,94,72,98,"La IA generativa transforma la creación de conocimiento, pero exige gobernanza, trazabilidad y validación de evidencia."],
 ["ag","Agentes Autónomos",0,88,86,95,"Los agentes autónomos ejecutan tareas complejas y redistribuyen capacidad cognitiva entre personas, organizaciones y sistemas."],
 ["mem","Memoria Ejecutiva",0,86,68,93,"La memoria persistente permite continuidad contextual, aprendizaje institucional y decisiones más coherentes."],
 ["rns","Razonamiento Neuro-Simbólico",0,91,74,96,"La fusión de redes neuronales, lógica y grafos mejora explicabilidad, verificación y razonamiento complejo."],
 ["edu","Educación",0,88,62,84,"La educación se redefine con IA: personalización, evaluación y nuevas competencias; exige evidencia sobre el aprendizaje real.",1],
 ["mia","Mercados de IA",1,87,79,92,"Los mercados de capacidades cognitivas convierten skills, agentes y datos en activos económicos licenciables."],
 ["edig","Economía Digital",1,91,74,94,"La economía digital reorganiza producción, distribución y captura de valor mediante plataformas e infraestructura digital."],
 ["fsos","Finanzas Sostenibles",1,83,68,90,"El capital se alinea con riesgo climático, impacto social y resiliencia de largo plazo."],
 ["isa","Créditos ISA",1,78,62,88,"Los créditos cognitivos permiten microtransacciones, acceso progresivo y liquidez dentro de ecosistemas digitales."],
 ["trab","Trabajo",1,90,74,82,"El trabajo se reorganiza por automatización y agentes: nuevas ocupaciones, transición de habilidades y protección social.",1],
 ["ggl","Gobernanza Global",2,89,84,95,"La gobernanza global coordina Estados, empresas, ciencia y sociedad frente a riesgos transnacionales."],
 ["icie","Integridad Científica",2,95,72,98,"La integridad científica sostiene la confianza pública mediante reproducibilidad, transparencia y revisión independiente."],
 ["ddig","Democracia Digital",2,81,76,91,"La democracia digital enfrenta desinformación, concentración de poder y nuevas formas de participación ciudadana."],
 ["vet","VETRA Governance",2,97,64,99,"VETRA integra evidencia, seguridad, ética y gobernanza en una certificación integral de confianza."],
 ["cc","Cambio Climático",3,97,95,99,"El cambio climático es una fuerza sistémica que reconfigura economía, salud, migración y seguridad global."],
 ["ten","Transición Energética",3,92,86,96,"La transición energética sustituye sistemas fósiles por arquitecturas limpias, distribuidas y resilientes."],
 ["bio","Biodiversidad",3,88,81,94,"La biodiversidad sostiene la estabilidad ecológica, alimentaria y climática del planeta."],
 ["ecir","Economía Circular",3,84,66,92,"La economía circular reduce residuos, presión material y dependencia de recursos finitos."],
 ["sg","Salud Global",4,90,83,95,"La salud global depende de equidad, vigilancia, prevención y cooperación científica internacional."],
 ["sm","Salud Mental",4,85,71,92,"La salud mental es un determinante central de productividad, cohesión social y resiliencia."],
 ["bte","Biotecnología",4,89,77,94,"La biotecnología transforma medicina, alimentos y bioeconomía, pero exige gobernanza ética rigurosa."],
 ["mp","Medicina Preventiva",4,86,69,93,"La medicina preventiva desplaza el foco del tratamiento hacia detección temprana y resiliencia."],
 ["cib","Ciberseguridad",5,96,91,98,"La ciberseguridad protege identidades, infraestructura crítica, datos y confianza digital."],
 ["cdel","Ciberdelito",5,93,94,90,"El ciberdelito evoluciona como amenaza transnacional, automatizada y adaptativa."],
 ["ghib","Guerra Híbrida",5,90,88,89,"La guerra híbrida combina presión ciber, informativa, económica y geopolítica sobre sociedades."],
 ["sdig","Soberanía Digital",5,92,79,96,"La soberanía digital determina quién controla datos, identidad, infraestructura y decisiones algorítmicas."]
];
/* Hiperaristas: los 5 conjuntos de los prototipos (resueltos), el vínculo transversal del texto del autor y 2 de mitigación añadidos como hipótesis. */
var SEED_H=[
 ["h1","Transformación cognitiva-económica",["ia","ag","mia"],["ggl","edig","cib"],.35,2,"proto"],
 ["h2","Resiliencia planetaria",["cc","ten"],["sg","edig","D5"],.3,3,"proto"],
 ["h3","Estabilidad digital",["cib","cdel","ghib"],["ddig","sdig","ggl"],.3,2,"proto"],
 ["h4","Confianza verificable",["icie","vet"],["ia","sg","mia"],.3,2,"proto"],
 ["h5","Cognición humana aumentada",["sm","mem","bte"],["edu","trab","sg"],.3,3,"proto"],
 ["h6","IA transversal",["ia"],["edu","edig","trab","cib","ggl","sg","bio"],.3,2,"proto"],
 ["h7","Mitigación climática",["ten","ecir","fsos"],["-cc"],.35,5,"hip"],
 ["h8","Contención del ciberdelito",["cib","vet"],["-cdel"],.35,1,"hip"]
];
function tgt(a){return a.map(function(x){return x[0]==="-"?[x.slice(1),-1]:[x,1];});}
function seedState(){
  return {
    v:2,
    atoms:SEED_A.map(function(r){return {id:r[0],name:r[1],dom:r[2],impact:r[3],risk:r[4],ev:r[5],note:r[6],prov:!!r[7],custom:false,tri:"",role:""};}),
    hyp:SEED_H.map(function(r){return {id:r[0],label:r[1],S:r[2].slice(),T:tgt(r[3]),w:r[4],lag:r[5],off:false,origin:r[6],ref:"",lvl:""};}),
    shocks:[{id:"s1",node:"ia",year:2026,mag:1}],
    quar:[],seal:null,ledger:[],reviews:[],
    actor:{name:"",tri:"",orcid:"",role:""},
    exp:{level:"",auth:false,problem:"",repl:"",plag:"",code:"",deposit:"",doi:"",sigRef:"",pub:"",version:"0.1.0"},
    ui:{scen:"B",year:2032,sel:"ia",layer:"dom",showH:true,flow:true,rotate:true}
  };
}
var SC={
 A:{name:"Expansión controlada",gain:.8,decay:.6,amp:.2},
 B:{name:"Transformación estructural",gain:1,decay:.72,amp:.5},
 C:{name:"Mutación sistémica",gain:1.3,decay:.85,amp:1}
};

/* ---------- Construcción del modelo ---------- */
function clamp(v,a,b){v=+v;if(isNaN(v))v=a;return Math.max(a,Math.min(b,v));}
function build(S){
  var nodes=[{id:"core",name:"Ω Core",kind:"core",dom:-1}],idx={},i;
  for(i=0;i<6;i++)nodes.push({id:"D"+i,name:DOMS[i][0],kind:"domain",dom:i,note:DOMS[i][1]});
  S.atoms.forEach(function(a){nodes.push({id:a.id,name:a.name,kind:"atom",dom:a.dom,impact:+a.impact,risk:+a.risk,ev:+a.ev,note:a.note||"",prov:!!a.prov,custom:!!a.custom,tri:a.tri||"",role:a.role||""});});
  nodes.forEach(function(n,j){idx[n.id]=j;});
  var domAtoms=[[],[],[],[],[],[]];
  nodes.forEach(function(n,j){if(n.kind==="atom"&&domAtoms[n.dom])domAtoms[n.dom].push(j);});
  function mean(list,key){if(!list.length)return 0;var s=0;list.forEach(function(j){s+=nodes[j][key];});return s/list.length;}
  for(i=0;i<6;i++){var d=nodes[1+i];d.impact=mean(domAtoms[i],"impact");d.risk=mean(domAtoms[i],"risk");d.ev=mean(domAtoms[i],"ev");}
  var c=nodes[0],ds=[1,2,3,4,5,6];c.impact=mean(ds,"impact");c.risk=mean(ds,"risk");c.ev=mean(ds,"ev");
  var H=[],invalid=[];
  S.hyp.forEach(function(h){
    var s=h.S.map(function(id){return idx[id];}),t=h.T.map(function(x){return [idx[x[0]],x[1]];});
    var bad=!s.length||!t.length||s.some(function(v){return v===undefined||v===0;})||t.some(function(x){return x[0]===undefined||x[0]===0;});
    if(bad){invalid.push(h.id);return;}
    H.push({id:h.id,S:s,T:t,w:+h.w,lag:+h.lag,off:!!h.off,raw:h});
  });
  var N=nodes.length,deg=[],cross=[];
  for(i=0;i<N;i++){deg.push(0);cross.push(false);}
  H.forEach(function(h){
    if(h.off)return;
    var ids=h.S.concat(h.T.map(function(x){return x[0];})),dm={};
    ids.forEach(function(j){dm[nodes[j].dom]=1;});
    var multi=Object.keys(dm).length>1;
    ids.forEach(function(j){deg[j]++;if(multi)cross[j]=true;});
  });
  var groups={};
  nodes.forEach(function(n,j){
    n.deg=deg[j];n.cross=cross[j];
    if(n.kind==="atom"){
      n.orb=deg[j]===0?"S":(deg[j]>=2&&cross[j]?(n.ev>=95?"F":"D"):"P");
      var g=n.dom+n.orb;groups[g]=(groups[g]||0)+1;n.slot=groups[g]-1;n.gk=g;
    }
  });
  nodes.forEach(function(n){if(n.kind==="atom")n.cnt=groups[n.gk];});
  var psiSeed=nodes.map(function(n){return parseInt(sha3("psi|"+n.id).slice(0,8),16)/4294967296*Math.PI*2;});
  nodes.forEach(function(n,j){n.psi=psiSeed[j];});
  return {nodes:nodes,idx:idx,H:H,deg:deg,cross:cross,domAtoms:domAtoms,invalid:invalid};
}
function orbReason(n){
  if(n.orb==="S")return "S · sin hiperaristas activas: información básica aislada; requiere vincularse para ser modelada.";
  if(n.orb==="P")return "P · participa en "+n.deg+" hiperarista(s) sin cruzar dominios: conocimiento estructurado.";
  if(n.orb==="D")return "D · "+n.deg+" hiperaristas con cruce de dominios: nodo de interdependencia.";
  if(n.orb==="F")return "F · interdependiente (≥2 hiperaristas con cruce de dominios) y evidencia declarada ≥ 95: apto para predicción.";
  return "";
}

/* ---------- Simulación determinista (propagación en hipergrafo dirigido) ---------- */
function simulate(M,shocks,quar,scen,pert){
  var sc=SC[scen],N=M.nodes.length,qf=new Float64Array(N),i,t,hi,k,a=[],tx=[];
  for(i=0;i<N;i++)qf[i]=quar.indexOf(M.nodes[i].id)>=0?0:1;
  var gain=sc.gain*(pert?pert.gm:1),decay=Math.min(.95,sc.decay*(pert?pert.dm:1)),amp=sc.amp;
  for(t=0;t<=T;t++){
    var cur=new Float64Array(N),tr=new Float64Array(M.H.length),prev=t?a[t-1]:null;
    if(prev)for(i=0;i<N;i++)cur[i]=prev[i]*decay;
    if(t>0){
      for(hi=0;hi<M.H.length;hi++){
        var h=M.H[hi];if(h.off)continue;
        var lag=pert?pert.lag[hi]:h.lag,ts=t-lag;if(ts<0)continue;
        var src=a[ts],s=0;
        for(k=0;k<h.S.length;k++)s+=src[h.S[k]]*qf[h.S[k]];
        s/=Math.sqrt(h.S.length);if(s===0)continue;
        var w=pert?pert.w[hi]:h.w;
        tr[hi]=Math.abs(s)*w*gain;
        for(k=0;k<h.T.length;k++){var j=h.T[k][0];cur[j]+=h.T[k][1]*w*gain*s*(1+amp*(M.nodes[j].risk/100-.5));}
      }
      for(var d=0;d<6;d++){
        var list=M.domAtoms[d],di=1+d;
        if(list.length){var m=0;for(k=0;k<list.length;k++)m+=prev[list[k]]*qf[list[k]];m/=list.length;cur[di]+=.25*gain*m;}
        var pd=prev[di]*qf[di];
        if(pd!==0)for(k=0;k<list.length;k++)cur[list[k]]+=.1*gain*pd;
      }
    }
    for(k=0;k<shocks.length;k++){var sh=shocks[k];if(sh.year-Y0===t){var ji=M.idx[sh.node];if(ji!==undefined&&ji>0)cur[ji]+=sh.mag;}}
    for(i=0;i<N;i++)cur[i]=Math.max(-1,Math.min(1,cur[i]));
    a.push(cur);tx.push(tr);
  }
  return {a:a,tx:tx};
}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
/* Análisis de sensibilidad Monte Carlo con semilla fija: w ±25 %, rezago ±1 año, ganancia ±15 %, persistencia ±10 %. */
function mc(M,shocks,quar,scen,runs,seed){
  var r=rng(seed),N=M.nodes.length,hl=M.H.length,t,i,run;
  var vals=[];for(t=0;t<=T;t++){var row=[];for(i=0;i<N;i++)row.push(new Float32Array(runs));vals.push(row);}
  for(run=0;run<runs;run++){
    var p={w:[],lag:[],gm:.85+.3*r(),dm:.9+.2*r()};
    for(var h=0;h<hl;h++){p.w.push(clamp(M.H[h].w*(.75+.5*r()),.05,1));var u=r();p.lag.push(clamp(M.H[h].lag+(u<1/3?-1:(u<2/3?0:1)),1,15));}
    var sm=simulate(M,shocks,quar,scen,p);
    for(t=0;t<=T;t++)for(i=0;i<N;i++)vals[t][i][run]=sm.a[t][i];
  }
  var lo=[],md=[],hi=[],fp=[],fn=[];
  for(t=0;t<=T;t++){
    var L=new Float32Array(N),Mm=new Float32Array(N),Hh=new Float32Array(N),P=new Float32Array(N),Ng=new Float32Array(N);
    for(i=0;i<N;i++){
      var arr=Array.prototype.slice.call(vals[t][i]).sort(function(x,y){return x-y;}),pos=0,neg=0;
      arr.forEach(function(v){if(v>.02)pos++;else if(v<-.02)neg++;});
      L[i]=arr[Math.floor(.1*(runs-1))];Mm[i]=arr[Math.floor(.5*(runs-1))];Hh[i]=arr[Math.ceil(.9*(runs-1))];P[i]=pos/runs;Ng[i]=neg/runs;
    }
    lo.push(L);md.push(Mm);hi.push(Hh);fp.push(P);fn.push(Ng);
  }
  return {lo:lo,md:md,hi:hi,fp:fp,fn:fn,runs:runs,seed:seed};
}

/* ---------- Métricas derivadas ---------- */
function Q(n,year){return clamp(.10+.5*(1-n.ev/100)+.012*(year-Y0),0,1);}
function omega(n,year){return n.impact*(1-Q(n,year));}
function coherence(n,year){return n.ev/100*(1-Q(n,year));}
function incident(M,j){return M.H.filter(function(h){return !h.off&&(h.S.indexOf(j)>=0||h.T.some(function(x){return x[0]===j;}));});}
function traz(M,j){var inc=incident(M,j);if(!inc.length)return null;return inc.filter(function(h){return refOk(h.raw.ref);}).length/inc.length;}
var LV={N1:1,N2:2,N3:3};
function supportLevel(M,j){var best="";incident(M,j).forEach(function(h){if(refOk(h.raw.ref)&&LV[h.raw.lvl]&&(!best||LV[h.raw.lvl]>LV[best]))best=h.raw.lvl;});return best;}
function cert(M,j){
  var n=M.nodes[j],tz=traz(M,j);
  if(n.ev>=95&&n.deg>0&&tz===1)return {c:"Ω7",why:"Evidencia declarada ≥ 95 y todas las hiperaristas incidentes con fuente válida."};
  if(n.ev>=95)return {c:"Ω6",why:"Evidencia declarada ≥ 95; para Ω7 falta fuente válida en "+(n.deg===0?"al menos una hiperarista (sin vínculos)":"todas las hiperaristas incidentes")+"."};
  if(n.ev>=90)return {c:"Ω6",why:"Evidencia declarada ≥ 90."};
  return {c:"Ω5",why:"Evidencia declarada < 90."};
}
function trust(M,j){var n=M.nodes[j],tz=traz(M,j);return .7*n.ev/100+.3*(tz||0);}
function tension(M,sim,t){var a=sim.a[t],num=0,den=0;M.nodes.forEach(function(n,j){if(n.kind==="atom"){num+=n.impact*Math.abs(a[j]);den+=n.impact;}});return den?num/den:0;}
function riskW(M,sim,t){var a=sim.a[t],num=0,den=0;M.nodes.forEach(function(n,j){if(n.kind==="atom"){num+=n.risk*Math.abs(a[j]);den+=Math.abs(a[j]);}});return den>.001?num/den:null;}

/* ---------- Integridad de datos, sello y registro encadenado ---------- */
function atomCanon(S,M,j){
  var n=M.nodes[j];
  var inc=incident(M,j).map(function(h){var r=h.raw;return [r.id,r.S.join(","),r.T.map(function(x){return x.join(":");}).join(","),r.w,r.lag,r.ref||"",r.lvl||""].join("~");}).sort();
  return JSON.stringify([n.id,n.name,n.dom,n.impact,n.risk,n.ev,n.note,n.tri,n.role,inc]);
}
function atomHashes(S,M){var o={};M.nodes.forEach(function(n,j){if(n.kind==="atom")o[n.id]=sha3(atomCanon(S,M,j));});return o;}
function rootOf(hs){return sha3(Object.keys(hs).sort().map(function(k){return k+":"+hs[k];}).join("|"));}
function sealStatus(S,M,hs){
  if(!S.seal)return {st:"none",mod:[],add:[],del:[]};
  var mod=[],add=[],del=[];
  Object.keys(hs).forEach(function(k){if(!(k in S.seal.h))add.push(k);else if(S.seal.h[k]!==hs[k])mod.push(k);});
  Object.keys(S.seal.h).forEach(function(k){if(!(k in hs))del.push(k);});
  return {st:(mod.length||add.length||del.length)?"mod":"ok",mod:mod,add:add,del:del};
}
function ledgerAppend(L,actor,act,det){
  var prev=L.length?L[L.length-1].hash:"GENESIS";
  var e={seq:L.length+1,t:new Date().toISOString(),actor:actor||"sin identificar",act:act,det:String(det).slice(0,300),prev:prev};
  e.hash=sha3([e.seq,e.t,e.actor,e.act,e.det,e.prev].join("|"));
  L.push(e);if(L.length>1000)L.shift();
  return e;
}
function ledgerVerify(L){
  var prev="GENESIS",i;
  for(i=0;i<L.length;i++){
    var e=L[i];
    if(i===0&&L.length>=1000)prev=e.prev;
    var h=sha3([e.seq,e.t,e.actor,e.act,e.det,e.prev].join("|"));
    if(e.prev!==prev||e.hash!==h)return {ok:false,at:e.seq,n:L.length};
    prev=e.hash;
  }
  return {ok:true,n:L.length,head:prev};
}

/* ---------- Auditoría TQAF etapa 1 ---------- */
function digest(sim){var s="";sim.a.forEach(function(r){for(var i=0;i<r.length;i++)s+=r[i].toFixed(9)+",";});return sha3(s);}
function audit(S,M,hs){
  var out=[],ids={},names={},dupId=[],dupName=[],i;
  S.atoms.forEach(function(a){if(ids[a.id])dupId.push(a.id);ids[a.id]=1;var k=a.name.trim().toLowerCase();if(names[k])dupName.push(a.name);names[k]=1;});
  var rangeBad=[];
  S.atoms.forEach(function(a){["impact","risk","ev"].forEach(function(k){if(!(a[k]>=0&&a[k]<=100))rangeBad.push(a.id+"."+k);});});
  S.hyp.forEach(function(h){if(!(h.w>0&&h.w<=1))rangeBad.push(h.id+".w");if(!(h.lag>=1&&h.lag<=15&&Math.floor(h.lag)===h.lag))rangeBad.push(h.id+".lag");});
  var lv=ledgerVerify(S.ledger),ss=sealStatus(S,M,hs);
  var d1=digest(simulate(M,S.shocks,S.quar,S.ui.scen)),d2=digest(simulate(M,S.shocks,S.quar,S.ui.scen));
  var iso=M.nodes.filter(function(n){return n.kind==="atom"&&n.deg===0;}).map(function(n){return n.name;});
  out.push({id:"A1",crit:true,label:"Integridad referencial de hiperaristas",pass:M.invalid.length===0,detail:M.invalid.length?"Extremos inexistentes en: "+M.invalid.join(", "):"Todos los extremos resuelven a nodos existentes."});
  out.push({id:"A2",crit:true,label:"Rangos admisibles (puntajes 0–100, fuerza (0,1], rezago 1–15 años)",pass:rangeBad.length===0,detail:rangeBad.length?"Fuera de rango: "+rangeBad.join(", "):"Sin valores fuera de rango."});
  out.push({id:"A3",crit:true,label:"Unicidad de identificadores y nombres",pass:!dupId.length&&!dupName.length,detail:(dupId.length||dupName.length)?"Duplicados: "+dupId.concat(dupName).join(", "):"Sin duplicados."});
  out.push({id:"A4",crit:true,label:"Cadena del registro de procedencia íntegra",pass:lv.ok,detail:lv.ok?lv.n+" entradas verificadas.":"Ruptura en la entrada n.º "+lv.at+"."});
  out.push({id:"A5",crit:false,label:"Coincidencia con el sello de datos",pass:ss.st!=="mod",detail:ss.st==="none"?"No hay sello de datos emitido (no aplica).":(ss.st==="ok"?"Los datos coinciden con el sello.":"Cambios desde el sello: "+ss.mod.length+" modificados, "+ss.add.length+" añadidos, "+ss.del.length+" eliminados.")});
  out.push({id:"A6",crit:false,label:"Reproducibilidad numérica (dos ejecuciones idénticas)",pass:d1===d2,detail:d1===d2?"Resumen SHA3-512 de la simulación: "+d1.slice(0,24)+"…":"Las ejecuciones difieren."});
  out.push({id:"A7",crit:false,label:"Átomos sin hiperaristas activas",pass:iso.length===0,detail:iso.length?iso.length+" aislado(s): "+iso.join(", ")+".":"Todos los átomos participan en al menos una hiperarista.",warn:true});
  return out;
}

/* ---------- Matriz TQAF-10 ---------- */
var ST={ok:"Verificado",decl:"Declarado",part:"Parcial",pend:"Pendiente",ext:"Externo"};
function actorValid(a){return !!(a.name&&a.name.trim().length>2&&tri(a.tri)&&orcid(a.orcid)&&roleOk(a.role));}
function affiliation(a){
  return (a.name||"[Nombre del autor]")+", "+(a.tri||"[Código TRI]")+", "+(a.orcid||"[Código ORCID]")+". TAMV Online Network / UTAMV, Nodo Cero, Real del Monte, Hidalgo, México.";
}
function tqaf(S,M,hs){
  var E=S.exp,act=S.actor,live=M.H.filter(function(h){return !h.off;}),nl=live.length;
  var refs=live.filter(function(h){return refOk(h.raw.ref);}).length,dois=live.filter(function(h){return doi(h.raw.ref);}).length;
  var atr=S.atoms.filter(function(a){return tri(a.tri)&&roleOk(a.role);}).length,na=S.atoms.length;
  var lv=ledgerVerify(S.ledger),it=[];
  function add(n,title,st,why){it.push({n:n,title:title,st:st,why:why});}
  add(1,"Integridad y antiplagio",E.auth&&E.plag?"decl":(E.auth?"part":"pend"),E.auth?(E.plag?"Declaración de autenticidad y referencia al informe de coincidencia: "+E.plag:"Declaración de autenticidad presente; falta la referencia al informe de coincidencia textual (proceso externo)."):"Falta la declaración de autenticidad. El instrumento verifica integridad de datos, no originalidad textual.");
  add(2,"Vacío de conocimiento y justificación",E.problem.trim().length>=80?"decl":"pend",E.problem.trim().length>=80?"Planteamiento del problema declarado ("+E.problem.trim().length+" caracteres); su suficiencia la dictamina la revisión.":"Falta el planteamiento del problema no resuelto (mínimo 80 caracteres).");
  add(3,"Metodología reproducible",refOk(E.code)?"ok":"part",refOk(E.code)?"Parámetros, semilla de sensibilidad y determinismo verificados; código referenciado en "+E.code+".":"Parámetros de escenario, semilla de sensibilidad y determinismo verificados (§9). Falta referenciar el repositorio de código con identificador persistente.");
  add(4,"Respaldo de evidencia empírica",nl&&refs===nl?"ok":(refs?"part":"pend"),refs+" de "+nl+" hiperaristas activas citan una fuente con formato válido (DOI o URL). El formato se verifica; el contenido de la fuente, no.");
  add(5,"Declaración de replicabilidad",["Total","Parcial","Condicionada"].indexOf(E.repl)>=0?"decl":"pend",E.repl?"Factibilidad de reproducción declarada: "+E.repl+".":"Falta clasificar la replicabilidad (Total, Parcial o Condicionada).");
  var f6=nl&&dois===nl&&doi(E.doi);
  add(6,"Cumplimiento de estándares FAIR",f6?"ok":((dois||doi(E.doi))?"part":"pend"),dois+" de "+nl+" fuentes con DOI válido; DOI del expediente "+(doi(E.doi)?"válido":"sin asignar")+". Exportación JSON-LD disponible (§6).");
  add(7,"Matriz de autoría transparente",na&&atr===na?"ok":(atr?"part":"pend"),atr+" de "+na+" átomos con código TRI válido y rol asignado.");
  var par=S.reviews.filter(function(r){return r.kind==="par";}),auth={};
  S.atoms.forEach(function(a){if(tri(a.tri))auth[a.tri]=1;});if(tri(act.tri))auth[act.tri]=1;
  var indep=par.filter(function(r){return tri(r.tri)&&!auth[r.tri]&&r.resp&&r.resp.trim();});
  add(8,"Acta de auditoría y dictamen",indep.length?"ok":(par.length?"part":"pend"),par.length?par.length+" dictamen(es) de pares; "+indep.length+" con revisor independiente de la autoría y respuesta registrada.":"No hay dictámenes registrados (§5).");
  add(9,"Normalización de afiliación",actorValid(act)?"ok":"pend",actorValid(act)?affiliation(act):"Identidad de la sesión incompleta o con TRI/ORCID inválido (§3).");
  var f10=lv.ok&&lv.n>0&&doi(E.deposit);
  add(10,"Preservación inmutable y política de erratas",f10?"ok":(lv.ok&&lv.n>0?"part":"pend"),(lv.ok&&lv.n>0?"Registro de cambios encadenado con "+lv.n+" entradas (política de erratas local). ":"Sin registro de cambios. ")+(doi(E.deposit)?"Depósito declarado: "+E.deposit+".":"El depósito en Zenodo/OSF/Figshare es un proceso externo aún no declarado."));
  return it;
}

/* ---------- Pipeline editorial (8 etapas del BLUEPRINT) ---------- */
function pipeline(S,M,tq,au){
  var E=S.exp,rows=[],crit=au.filter(function(a){return a.crit&&!a.pass;});
  var par=S.reviews.filter(function(r){return r.kind==="par";}),com=S.reviews.filter(function(r){return r.kind==="comite";});
  function add(n,t,st,why){rows.push({n:n,title:t,st:st,why:why});}
  add(1,"Recepción e ingesta en el Nodo Cero",M.nodes.length>7?"complete":"pending","Expediente con "+S.atoms.length+" átomos y "+S.hyp.length+" hiperaristas, ingresado en este instrumento (almacenamiento local).");
  add(2,"Clasificación de nivel (N1 / N2 / N3)",E.level?"complete":"pending",E.level?"Nivel declarado: "+E.level+".":"Falta declarar el nivel del expediente (§4).");
  var idv=actorValid(S.actor);
  add(3,"Control de identidad y metadatos",idv&&E.sigRef?"complete":(idv?"partial":"pending"),idv?(E.sigRef?"TRI y ORCID válidos (dígito de control verificado); firma referenciada en "+E.sigRef+".":"TRI y ORCID válidos; falta referenciar la firma criptográfica (el instrumento no firma)."):"Identidad de la sesión incompleta o inválida (§3).");
  add(4,"Auditoría de integridad y código (TQAF etapa 1)",crit.length?"fail":"complete",crit.length?"Defecto crítico → rechazo directo: "+crit.map(function(c){return c.id;}).join(", ")+".":"Controles críticos superados ("+au.filter(function(a){return a.crit;}).length+"/"+au.filter(function(a){return a.crit;}).length+").");
  var rej=par.some(function(r){return r.verdict==="Rechazado";}),app=par.some(function(r){return r.verdict==="Aprobado";}),ok8=tq[7].st==="ok";
  add(5,"Arbitraje técnico y revisión por pares (TQAF etapa 2)",rej?"fail":(app&&ok8?"complete":(par.length?"partial":"pending")),par.length?par.length+" dictamen(es); "+(ok8?"hay revisor independiente con respuesta.":"falta revisor independiente con respuesta registrada."):"Sin dictámenes (§5).");
  var ca=com.some(function(r){return r.verdict==="Aprobado";});
  add(6,"Aprobación del Comité de Gobernanza Científica",ca&&rows[4].st==="complete"?"complete":"pending",ca?"Aprobación registrada (declarativa).":"Sin acta del Comité.");
  add(7,"Metadatos FAIR y asignación de DOI",tq[5].st==="ok"?"complete":(doi(E.doi)?"partial":"pending"),doi(E.doi)?"DOI del expediente: "+doiNorm(E.doi)+".":"Sin DOI asignado (Zenodo/OSF/Crossref).");
  var prior=rows.slice(0,7).every(function(r){return r.st==="complete";});
  add(8,"Publicación abierta y registro en el catálogo TAMV",prior&&url(E.pub)?"complete":"pending",url(E.pub)?"Publicación declarada en "+E.pub+".":"Sin publicación declarada.");
  return rows;
}
function eligibility(tq,pl){
  var sat=tq.filter(function(x){return x.st==="ok"||x.st==="decl";}).length;
  var first7=pl.slice(0,7).every(function(r){return r.st==="complete";});
  return {sat:sat,first7:first7,eligible:sat===10&&first7,done:pl.filter(function(r){return r.st==="complete";}).length};
}

/* ---------- Exportación FAIR (JSON-LD, schema.org/Dataset) ---------- */
function jsonld(S,M,hs){
  var a=S.actor,E=S.exp;
  return {
    "@context":"https://schema.org","@type":"Dataset",
    name:"TAMV Ω∞ HCU — modelo de transformación sistémica",
    description:"Hipergrafo dirigido de "+S.atoms.length+" átomos cognitivos en 6 dominios, con "+S.hyp.length+" hiperaristas ponderadas y rezagadas, y simulación determinista 2026–2050.",
    version:E.version||"0.1.0",
    identifier:doi(E.doi)?"https://doi.org/"+doiNorm(E.doi):null,
    license:"https://creativecommons.org/licenses/by/4.0/",
    dateModified:new Date().toISOString(),
    creator:{"@type":"Person",name:a.name||null,identifier:orcid(a.orcid)?"https://orcid.org/"+a.orcid:null,affiliation:{"@type":"Organization",name:"METAVERSO TAMV Online Network / UTAMV Campus Online",address:"Real del Monte, Hidalgo, México"}},
    additionalProperty:[
      {"@type":"PropertyValue",name:"TRI",value:a.tri||null},
      {"@type":"PropertyValue",name:"Nivel de evidencia declarado (TQAF)",value:E.level||null},
      {"@type":"PropertyValue",name:"Raíz de integridad SHA3-512",value:rootOf(hs)},
      {"@type":"PropertyValue",name:"Modelo",value:"HCU-sim v1.0: propagación discreta anual sobre hipergrafo dirigido; escenarios "+Object.keys(SC).map(function(k){return k+"(γ="+SC[k].gain+",δ="+SC[k].decay+",α="+SC[k].amp+")";}).join(", ")+"; sensibilidad Monte Carlo con semilla fija"}
    ],
    variableMeasured:["Influencia sistémica (X, 0–100)","Riesgo (Y, 0–100)","Evidencia declarada (Z, 0–100)"],
    hasPart:S.atoms.map(function(x){return {"@type":"Dataset",identifier:x.id,name:x.name,isPartOf:DOMS[x.dom][0],author:tri(x.tri)?x.tri:null,role:roleOk(x.role)?x.role:null};}),
    citation:S.hyp.filter(function(h){return refOk(h.ref);}).map(function(h){return {"@type":"CreativeWork",name:h.label,identifier:doi(h.ref)?"https://doi.org/"+doiNorm(h.ref):h.ref,additionalType:h.lvl||null};})
  };
}

return {Y0:Y0,T:T,DOMS:DOMS,SC:SC,ROLES:ROLES,ST:ST,sha3:sha3,orcid:orcid,isni:isni,tri:tri,doi:doi,doiNorm:doiNorm,url:url,refOk:refOk,roleOk:roleOk,
  seedState:seedState,build:build,orbReason:orbReason,simulate:simulate,mc:mc,Q:Q,omega:omega,coherence:coherence,incident:incident,traz:traz,supportLevel:supportLevel,cert:cert,trust:trust,
  tension:tension,riskW:riskW,atomHashes:atomHashes,rootOf:rootOf,sealStatus:sealStatus,ledgerAppend:ledgerAppend,ledgerVerify:ledgerVerify,audit:audit,
  actorValid:actorValid,affiliation:affiliation,tqaf:tqaf,pipeline:pipeline,eligibility:eligibility,jsonld:jsonld,digest:digest,clamp:clamp};
})();
export default Core;
export const {Y0,T,DOMS,SC,ROLES,ST,sha3,orcid,isni,tri,doi,doiNorm,url,refOk,roleOk,seedState,build,orbReason,simulate,mc,Q,omega,coherence,incident,traz,supportLevel,cert,trust,tension,riskW,atomHashes,rootOf,sealStatus,ledgerAppend,ledgerVerify,audit,actorValid,affiliation,tqaf,pipeline,eligibility,jsonld,digest,clamp}=Core;
