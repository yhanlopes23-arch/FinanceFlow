import test from "node:test";
import assert from "node:assert/strict";
import {initial,parseMoney,addAccount,addTransaction,balance,summary,reverse,settle,categoryTotals,exportData,importData,addGoal,contributeGoal,monthlyForecast,projectedBalance,dateFieldLabel,dateFieldHint,paymentDateStatus,today} from "../src/core.mjs";
const add=(s,p)=>addTransaction(s,{date:"2026-11-04",status:"paid",category:"Alimentação",description:"Teste",...p});
test("converte moeda brasileira exatamente",()=>{assert.equal(parseMoney("1.234,56"),123456);assert.equal(parseMoney("0,01"),1);assert.throws(()=>parseMoney("1,999"));assert.throws(()=>parseMoney("-2"));});
test("transferência mantém saldo consolidado e não gera receita",()=>{const s=initial();s.accounts[0].opening=100000;const b=addAccount(s,"Poupança",30000);add(s,{type:"transfer",amount:20000,accountId:s.accounts[0].id,toAccountId:b.id});assert.equal(balance(s,s.accounts[0].id),80000);assert.equal(balance(s,b.id),50000);assert.equal(summary(s).balance,130000);assert.equal(summary(s).income,0);assert.equal(summary(s).expense,0);});
test("pendências não afetam saldos até liquidação",()=>{const s=initial();const t=add(s,{type:"expense",amount:5000,accountId:s.accounts[0].id,status:"pending"});assert.equal(summary(s).balance,0);settle(s,t.id);assert.equal(summary(s).expense,5000);assert.equal(summary(s).balance,-5000);});
test("estorno preserva histórico e neutraliza saldo",()=>{const s=initial();const t=add(s,{type:"income",amount:3000,accountId:s.accounts[0].id});reverse(s,t.id);assert.equal(s.transactions.length,1);assert.equal(summary(s).income,0);assert.equal(summary(s).balance,0);assert.throws(()=>reverse(s,t.id));});
test("categoria mensal e cópia do backup",()=>{const s=initial();add(s,{type:"expense",amount:1234,accountId:s.accounts[0].id});assert.equal(categoryTotals(s,"2026-11").Alimentação,1234);const restored=importData(exportData(s));assert.deepEqual(restored,s);});
test("rejeita backup inválido",()=>{assert.throws(()=>importData('{"version":200}'));});

test("metas não alteram o saldo e sobrevivem ao backup",()=>{
 const s=initial();s.accounts[0].opening=50000;
 const goal=addGoal(s,"Reserva",100000);
 contributeGoal(s,goal.id,2500);
 assert.equal(summary(s).balance,50000);
 assert.equal(importData(exportData(s)).goals[0].saved,2500);
 assert.throws(()=>contributeGoal(s,goal.id,-1));
});

test("projeção mensal inclui pendentes sem alterar saldo efetivo",()=>{
 const s=initial();s.accounts[0].opening=100000;
 add(s,{type:"income",amount:20000,accountId:s.accounts[0].id});
 const a=add(s,{type:"income",amount:30000,accountId:s.accounts[0].id,status:"pending"});
 add(s,{type:"expense",amount:12000,accountId:s.accounts[0].id});
 const b=add(s,{type:"expense",amount:8000,accountId:s.accounts[0].id,status:"pending"});
 const f=monthlyForecast(s,"2026-11");
 assert.equal(f.paidIncome,20000);assert.equal(f.pendingIncome,30000);
 assert.equal(f.paidExpense,12000);assert.equal(f.pendingExpense,8000);
 assert.equal(f.expectedIncome,50000);assert.equal(f.expectedExpense,20000);
 assert.equal(f.expectedResult,30000);assert.equal(f.actualResult,8000);
 assert.equal(f.expenseCategories.Alimentação,20000);
 assert.equal(summary(s).balance,108000);
 assert.equal(projectedBalance(s,"2026-11"),130000);
 settle(s,a.id);settle(s,b.id);
 assert.equal(monthlyForecast(s,"2026-11").expectedResult,30000);
 assert.equal(projectedBalance(s,"2026-11"),130000);
});
test("projeção exclui transferências e estornos e respeita o mês",()=>{
 const s=initial(),a=s.accounts[0].id,b=addAccount(s,"Reserva").id;
 add(s,{type:"transfer",amount:1000,accountId:a,toAccountId:b,status:"pending"});
 const revoked=add(s,{type:"expense",amount:3000,accountId:a,status:"pending"});reverse(s,revoked.id);
 add(s,{type:"income",amount:6000,accountId:a,status:"pending",date:"2026-12-15"});
 const f=monthlyForecast(s,"2026-11");assert.equal(f.expectedIncome,0);assert.equal(f.expectedExpense,0);
 assert.equal(projectedBalance(s,"2026-11"),0);
 assert.equal(projectedBalance(s,"2026-12"),6000);
 assert.throws(()=>monthlyForecast(s,"2026-15-01"));
});

test("vencimentos usam data limite e receitas usam data prevista ou efetiva",()=>{
 assert.equal(dateFieldLabel("expense","pending"),"Vencimento (último dia para pagar)");
 assert.equal(dateFieldLabel("income","pending"),"Previsão de recebimento");
 assert.equal(dateFieldLabel("income","paid"),"Data do recebimento");
 const exp={type:"expense",date:"2026-11-10",status:"pending",reversedBy:null};
 assert.equal(paymentDateStatus(exp,"2026-11-10").label,"Último dia para pagar");
 assert.equal(paymentDateStatus(exp,"2026-11-11").label,"Pagamento atrasado");
 assert.equal(paymentDateStatus({...exp,status:"paid"},"2026-11-11").label,"Pago");
 const inc={...exp,type:"income"};
 assert.equal(paymentDateStatus(inc,"2026-11-10").label,"Receber hoje");
 assert.equal(paymentDateStatus(inc,"2026-11-11").label,"Recebimento atrasado");
 assert.match(today(),/^\d{4}-\d{2}-\d{2}$/);
});
