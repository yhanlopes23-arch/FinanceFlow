import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("interfaces de desenvolvimento e publicação são idênticas",()=>{
 for(const path of ["index.html","styles.css","dashboard-v4.css","assets/goal-mountain.svg","src/app.mjs","src/core.mjs","src/categorizer.mjs"])
  assert.equal(read(path),read("public/"+path),path+" divergiu da pasta publicada");
});
test("navegação em abas possui identificadores exclusivos e telas necessárias",()=>{
 const html=read("index.html");
 const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,"IDs duplicados");
 const pages=[...html.matchAll(/<section id="([^"]+)" data-page="\1"/g)].map(x=>x[1]);
 for(const required of ["dashboard","agenda","movimentos","contas","metas","planejamento","relatorios","cartoes","dados"])
  assert.ok(pages.includes(required),"Falta aba "+required);
 const source=read("src/app.mjs");
 assert.match(source,/page.hidden=!active/);
 assert.match(source,/hashchange/);
 assert.match(html,/href="#agenda"/);
});
test("dashboard exibe efetivos, pendentes e projeções separadamente",()=>{
 const html=read("index.html"),js=read("src/app.mjs");
 for(const id of ["income","income-paid","income-pending","expense","expense-paid","expense-pending","month-result","actual-result","forecast-balance","all-upcoming"]){
   assert.ok(html.includes('id="'+id+'"'),"Falta indicador "+id);
   if(id!=="all-upcoming")assert.ok(js.includes('$("'+id+'")'),"Indicador sem atualização: "+id);
 }
 assert.match(js,/monthlyForecast\(state,month\)/);
 assert.match(js,/projectedBalance\(state,month\)/);
});

test("sugestões de categorias dependem da descrição e são confirmadas manualmente",()=>{
 const html=read("index.html"),js=read("src/app.mjs");
 for(const id of ["tx-description","tx-category","category-suggestion"])
  assert.ok(html.includes('id="'+id+'"'),"Campo não encontrado: "+id);
 assert.match(js,/suggestCategories\(description,type,state.categories,state.transactions\)/);
 assert.match(js,/button.addEventListener\("click"/);
 assert.match(js,/\$\("tx-category"\)\.value=suggestion\.category/);
 assert.match(js,/\$\("tx-description"\)\.addEventListener\("input"/);
});

test("edição usa o mesmo formulário, preserva versão e oferece ação no histórico e vencimentos",()=>{
 const html=read("index.html"),code=read("src/app.mjs");
 assert.match(html,/id="tx-save"/);
 assert.match(html,/id="tx-edit-hint"/);
 assert.match(code,/function openEditTransaction\(id\)/);
 assert.match(code,/edit\.onclick=\(\)=>openEditTransaction\(t\.id\)/);
 assert.match(code,/editTransaction\(s,editingId,changes,editingRevision\)/);
 assert.match(code,/form\.elements\.amount\.value=/);
 assert.match(code,/form\.elements\.date\.value=tx\.date/);
 assert.match(code,/tx\.revision\?\?0/);
 assert.match(code,/function describeAudit\(event\)/);
});

test("edição de lançamentos expõe ações nas abas e formulário preenchido",()=>{
 const html=read("index.html"),app=read("src/app.mjs");
 for(const id of ["tx-edit-hint","tx-save","tx-title"])assert.ok(html.includes('id="'+id+'"'));
 assert.match(app,/function openEditTransaction\(id\)/);
 assert.match(app,/edit\.onclick=\(\)=>openEditTransaction\(t\.id\)/);
 assert.match(app,/editTransaction\(s,editingId,changes,editingRevision\)/);
 assert.match(app,/form\.elements\.date\.value=tx\.date/);
 assert.match(app,/Salvar alterações/);
});

test("dashboard contém cartão funcional de quitação proporcional sem dados falsos",()=>{
 const html=read("index.html"),app=read("src/app.mjs"),core=read("src/core.mjs");
 for(const id of ["settlement-title","settlement-available","settlement-account","settlement-budget","settlement-items","settlement-total","settlement-apply","settlement-explain"]){
  assert.ok(html.includes('id="'+id+'"'),"Falta "+id);
 }
 assert.match(app,/function renderSettlement\(\)/);
 assert.match(app,/proportionalPaymentPlan\(state,chosen,requested\)/);
 assert.match(app,/applyProportionalPayments\(s,accountId,plan.distributed\)/);
 assert.match(app,/if\(!confirm\(message\)\)return/);
 assert.match(core,/export function partialPaid\(/);
 assert.match(core,/export function proportionalPaymentPlan\(/);
 assert.match(core,/export function applyProportionalPayments\(/);
 assert.doesNotMatch(html,/R\$ 1\.200,00|Assinatura Spotify Família/);
});

test("página inicial segue ordem e composição do layout de referência V4",()=>{
 const html=read("index.html"),css=read("dashboard-v4.css"),app=read("src/app.mjs");
 assert.match(html,/data-layout="financeflow-reference-v4"/);
 assert.match(html,/dashboard-v4\.css\?v=reference-v4-20261104/);
 const anchors=["hero-balance","forecast-grid","dashboard-mid","dashboard-panel","dashboard-bottom"];
 const indexes=anchors.map(c=>html.indexOf('class="glass '+c)||html.indexOf(c));
 assert.ok(indexes.every(n=>n>=0),"Falta bloco essencial do dashboard");
 assert.ok(indexes.every((n,i)=>i===0||n>indexes[i-1]),"Blocos fora da ordem da referência");
 assert.ok(html.includes('class="bottom-main"'));
 assert.ok(html.includes("Gerenciamento &amp; SQL"));
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.dashboard-mid\{display:grid;grid-template-columns/);
 assert.match(css,/\.dashboard-bottom\{grid-template-columns/);
 assert.match(css,/\.bottom-nav\{display:block;position:fixed/);
 assert.match(css,/goal-mountain\.svg/);
 assert.match(app,/pending\.slice\(0,2\)/);
 assert.match(app,/state\.accounts\.slice\(0,3\)/);
});
test("quitação proporcional mantém funcionalidade na aba Vencimentos, fora da homepage",()=>{
 const html=read("index.html"),app=read("src/app.mjs");
 const start=html.indexOf('<section id="agenda"'),end=html.indexOf('<section id="movimentos"');
 const settlement=html.indexOf('class="glass panel settlement-panel"');
 assert.ok(start>=0&&end>start&&settlement>start&&settlement<end);
 assert.ok(!html.slice(html.indexOf('<section id="dashboard"'),start).includes('settlement-panel'));
 assert.match(app,/renderSettlement\(\)/);
});
