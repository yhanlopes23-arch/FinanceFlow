import test from "node:test";
import assert from "node:assert/strict";
import {categoryBreakdown,CHART_COLORS} from "../src/chart.mjs";
import {initial,addTransaction,monthlyForecast} from "../src/core.mjs";

test("gráfico mostra proporções exatas da referência e total de 100%",()=>{
 const rows=categoryBreakdown({"Moradia":3700,"Alimentação":2200,"Transporte":1300,"Lazer":1000,"Outros":1800});
 assert.deepEqual(rows.map(r=>[r.name,r.percentageLabel]),[
  ["Moradia","37%"],["Alimentação","22%"],["Outros","18%"],["Transporte","13%"],["Lazer","10%"]
 ]);
 assert.equal(rows.reduce((sum,r)=>sum+r.percentageTenths,0),1000);
 assert.equal(rows.reduce((sum,r)=>sum+r.proportion,0),1);
 assert.equal(rows.find(r=>r.name==="Outros").color,"#b5c2d6");
 assert.equal(rows[0].color,CHART_COLORS[0]);
});
test("reúne categorias excedentes em Outros sem perder valores",()=>{
 const input={"Moradia":6000,"Alimentação":3200,"Transporte":2100,"Lazer":1000,"Saúde":500,"Compras":300,"Outros":100};
 const rows=categoryBreakdown(input);
 assert.equal(rows.length,5);
 assert.equal(rows[4].name,"Outros");
 assert.equal(rows[4].amount,900);
 assert.equal(rows.reduce((n,r)=>n+r.amount,0),13200);
 assert.equal(rows.reduce((n,r)=>n+r.percentageTenths,0),1000);
 assert.equal(rows.reduce((n,r)=>n+r.proportion,0),1);
});
test("arredondamentos preservam 100% mesmo com três categorias iguais",()=>{
 const rows=categoryBreakdown({A:1,B:1,C:1});
 assert.equal(rows.reduce((n,r)=>n+r.percentageTenths,0),1000);
 assert.deepEqual(rows.map(r=>r.percentageTenths),[334,333,333]);
 assert.equal(rows.reduce((n,r)=>r.amount+n,0),3);
});
test("gráfico vazio não inventa valores e ignora zeros",()=>{
 assert.deepEqual(categoryBreakdown({}),[]);
 assert.deepEqual(categoryBreakdown({Alimentação:0,Transporte:-1}),[]);
 assert.deepEqual(categoryBreakdown(null),[]);
 const rows=categoryBreakdown({Alimentação:200,Transporte:0});
 assert.equal(rows.length,1);
 assert.equal(rows[0].percentageLabel,"100%");
});
test("receitas e transferências não participam; receitas e despesas pendentes separam-se corretamente",()=>{
 const s=initial(),accountId=s.accounts[0].id;
 addTransaction(s,{type:"expense",amount:30000,accountId,status:"paid",category:"Moradia",date:"2026-11-01"});
 addTransaction(s,{type:"expense",amount:20000,accountId,status:"pending",category:"Alimentação",date:"2026-11-09"});
 addTransaction(s,{type:"income",amount:100000,accountId,status:"pending",category:"Salário",date:"2026-11-09"});
 const rows=categoryBreakdown(monthlyForecast(s,"2026-11").expenseCategories);
 assert.deepEqual(rows.map(r=>[r.name,r.percentageLabel]),[["Moradia","60%"],["Alimentação","40%"]]);
 assert.equal(rows.reduce((n,r)=>n+r.amount,0),50000);
});
