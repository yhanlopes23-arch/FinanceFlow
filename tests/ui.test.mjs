import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("interfaces de desenvolvimento e publicação são idênticas",()=>{
 for(const path of ["index.html","styles.css","src/app.mjs","src/core.mjs","src/categorizer.mjs"])
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
