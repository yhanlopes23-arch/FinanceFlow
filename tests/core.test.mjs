import test from "node:test";
import assert from "node:assert/strict";
import {initial,parseMoney,addAccount,addTransaction,editTransaction,balance,summary,reverse,settle,categoryTotals,exportData,importData,addGoal,contributeGoal,monthlyForecast,projectedBalance,dateFieldLabel,dateFieldHint,paymentDateStatus,today,partialPaid,remainingDue,overdueExpenses,proportionalPaymentPlan,applyProportionalPayments} from "../src/core.mjs";
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

test("edição mantém ID, salva auditoria e recalcula dashboard e projeções",()=>{
 const s=initial(), account=s.accounts[0].id;
 const tx=add(s,{type:"expense",amount:8000,accountId:account,status:"pending",date:"2026-11-12",description:"Mercado",category:"Alimentação"});
 const id=tx.id,createdAt=tx.createdAt;
 const before=monthlyForecast(s,"2026-11");
 assert.equal(before.pendingExpense,8000);
 const edited=editTransaction(s,id,{type:"expense",amount:10000,date:"2026-12-05",status:"paid",accountId:account,toAccountId:null,category:"Moradia",description:"Conta de água"},0);
 assert.equal(edited.id,id);
 assert.equal(edited.createdAt,createdAt);
 assert.equal(edited.revision,1);
 assert.equal(summary(s).balance,-10000);
 assert.equal(monthlyForecast(s,"2026-11").expectedExpense,0);
 assert.equal(monthlyForecast(s,"2026-12").paidExpense,10000);
 assert.equal(s.transactions.length,1);
 const record=s.audit.find(e=>e.action==="transaction.edit");
 const changes=JSON.parse(record.details);
 assert.equal(changes.before.amount,8000);
 assert.equal(changes.after.amount,10000);
 assert.equal(changes.before.status,"pending");
 assert.equal(changes.after.status,"paid");
 assert.equal(changes.before.date,"2026-11-12");
 assert.equal(changes.after.date,"2026-12-05");
 const count=s.audit.length;
 editTransaction(s,id,{type:"expense",amount:10000,date:"2026-12-05",status:"paid",accountId:account,toAccountId:null,category:"Moradia",description:"Conta de água"},1);
 assert.equal(s.audit.length,count,"edição sem alterações não gera nova auditoria");
});
test("edição de transferências ajusta contas sem produzir receitas ou despesas",()=>{
 const s=initial(),a=s.accounts[0],b=addAccount(s,"Poupança"),c=addAccount(s,"Carteira");
 a.opening=90000;
 const tx=add(s,{type:"transfer",amount:12000,accountId:a.id,toAccountId:b.id});
 editTransaction(s,tx.id,{type:"transfer",amount:30000,date:tx.date,status:"paid",accountId:a.id,toAccountId:c.id,description:"Reserva de emergência"},0);
 assert.equal(balance(s,a.id),60000);
 assert.equal(balance(s,b.id),0);
 assert.equal(balance(s,c.id),30000);
 assert.equal(summary(s).balance,90000);
 assert.equal(summary(s).income,0);
 assert.equal(summary(s).expense,0);
 assert.equal(monthlyForecast(s,"2026-11").expectedIncome,0);
 assert.throws(()=>editTransaction(s,tx.id,{type:"transfer",amount:30000,date:tx.date,status:"paid",accountId:a.id,toAccountId:a.id,description:"Inválido"},1));
});
test("edições inválidas, obsoletas ou de estornados são bloqueadas",()=>{
 const s=initial(),accountId=s.accounts[0].id;
 const tx=add(s,{type:"income",amount:1500,accountId,status:"pending"});
 const payload={type:"income",amount:1700,date:tx.date,status:"pending",accountId,toAccountId:null,category:"Salário",description:"Salário"};
 assert.throws(()=>editTransaction(s,tx.id,{...payload,amount:0},0));
 assert.equal(tx.amount,1500);
 editTransaction(s,tx.id,payload,0);
 assert.throws(()=>editTransaction(s,tx.id,{...payload,amount:2000},0),/Reabra a edição/);
 assert.equal(tx.amount,1700);
 reverse(s,tx.id);
 assert.throws(()=>editTransaction(s,tx.id,payload,1),/estornado/);
 assert.equal(s.transactions.length,1);
});

test("edição preserva ID e atualiza projeções",()=>{
 const s=initial(),from=s.accounts[0].id,to=addAccount(s,"Reserva",1000).id;
 const tx=add(s,{type:"income",amount:20000,accountId:from});
 const originalId=tx.id,originalCreatedAt=tx.createdAt;
 const updated=editTransaction(s,tx.id,{...tx,type:"expense",amount:7500,date:"2026-12-20",status:"pending",accountId:to,category:"Moradia",description:"Aluguel dezembro"},0);
 assert.equal(updated.id,originalId);assert.equal(updated.createdAt,originalCreatedAt);
 assert.equal(updated.revision,1);assert.equal(s.transactions.length,1);
 assert.equal(summary(s).balance,1000);assert.equal(monthlyForecast(s,"2026-11").expectedIncome,0);
 assert.equal(monthlyForecast(s,"2026-12").pendingExpense,7500);assert.equal(projectedBalance(s,"2026-12"),-6500);
 assert.equal(s.audit[0].action,"transaction.edit");
 const history=JSON.parse(s.audit[0].details);
 assert.equal(history.id,originalId);assert.equal(history.before.amount,20000);assert.equal(history.after.amount,7500);
 assert.throws(()=>editTransaction(s,tx.id,{...updated,description:"Mudança concorrente"},0),/alterado/);
 const auditCount=s.audit.length;
 editTransaction(s,tx.id,{...updated},1);assert.equal(s.audit.length,auditCount,"não registrar edição sem mudanças");
 settle(s,tx.id);assert.equal(summary(s).balance,-6500);
 editTransaction(s,tx.id,{...updated,status:"pending"},1);assert.equal(summary(s).balance,1000);
 assert.equal(importData(exportData(s)).transactions[0].id,originalId);
 reverse(s,tx.id);assert.throws(()=>editTransaction(s,tx.id,{...updated,amount:1000}),/estornado/);
});
test("edição inválida de transferência é rejeitada sem efeitos",()=>{
 const s=initial(),from=s.accounts[0].id,to=addAccount(s,"Reserva").id;
 const tx=add(s,{type:"transfer",amount:1000,accountId:from,toAccountId:to});
 const before=structuredClone(tx),auditCount=s.audit.length;
 assert.throws(()=>editTransaction(s,tx.id,{...tx,toAccountId:from}),/Confira valor/);
 assert.deepEqual(tx,before);assert.equal(s.audit.length,auditCount);
 editTransaction(s,tx.id,{...tx,description:"Transferência corrigida"});
 assert.equal(balance(s,from),-1000);assert.equal(balance(s,to),1000);
});

test("rateio distribui centavos exatos e inclui todas as despesas vencidas",()=>{
 const state=initial(), account=state.accounts[0];
 account.opening=120000;
 const t1=add(state,{type:"expense",accountId:account.id,amount:85000,status:"pending",date:"2026-10-01",description:"Spotify"}),
       t2=add(state,{type:"expense",accountId:account.id,amount:39000,status:"pending",date:"2026-10-02",description:"Energia"}),
       t3=add(state,{type:"expense",accountId:account.id,amount:241000,status:"pending",date:"2026-10-03",description:"Internet"});
 const plan=proportionalPaymentPlan(state,account.id,120000,"2026-11-04");
 assert.equal(plan.rows.length,3);
 assert.equal(plan.outstanding,365000);
 assert.equal(plan.distributed,120000);
 assert.equal(plan.rows.reduce((n,r)=>n+r.amount,0),120000);
 assert.ok(plan.rows.every(r=>r.amount<=r.outstanding&&r.amount>0));
 const applied=applyProportionalPayments(state,account.id,120000,"2026-11-04");
 assert.deepEqual(applied.rows,plan.rows);
 assert.equal(balance(state,account.id),0);
 assert.equal(summary(state).expense,120000);
 assert.equal(summary(state).pending,3);
 assert.equal(state.transactions.length,3);
 assert.equal(overdueExpenses(state,"2026-11-04").length,3);
 assert.equal(state.transactions.reduce((n,t)=>n+remainingDue(t),0),245000);
 assert.equal(monthlyForecast(state,"2026-10").paidExpense,120000);
 assert.equal(monthlyForecast(state,"2026-10").pendingExpense,245000);
 assert.equal(projectedBalance(state,"2026-11"),-245000);
 const audit=state.audit.find(a=>a.action==="expenses.proportional-payment");
 assert.ok(audit);assert.equal(JSON.parse(audit.details).allocations.length,3);
 assert.deepEqual(importData(exportData(state)),state);
});
test("rateio integral liquida despesas sem duplicação e usa conta escolhida",()=>{
 const s=initial(),a=s.accounts[0],b=addAccount(s,"Conta 2",65000);
 a.opening=100;
 const tx=add(s,{type:"expense",amount:39000,accountId:a.id,status:"pending",date:"2026-10-10"});
 const plan=proportionalPaymentPlan(s,b.id,39000,"2026-11-04");
 assert.equal(plan.distributed,39000);
 applyProportionalPayments(s,b.id,39000,"2026-11-04");
 assert.equal(tx.status,"paid");
 assert.equal(partialPaid(tx),39000);
 assert.equal(remainingDue(tx),0);
 assert.equal(summary(s).balance,26100);
 assert.equal(balance(s,a.id),100);
 assert.equal(balance(s,b.id),26000);
 assert.equal(summary(s).expense,39000);
 assert.equal(monthlyForecast(s,"2026-10").paidExpense,39000);
 assert.equal(monthlyForecast(s,"2026-10").pendingExpense,0);
 assert.equal(overdueExpenses(s,"2026-11-04").length,0);
 assert.throws(()=>applyProportionalPayments(s,b.id,100,"2026-11-04"),/Não há valor/);
});
test("contas a vencer, liquidadas e estornadas ficam fora do rateio",()=>{
 const s=initial();s.accounts[0].opening=100000;const id=s.accounts[0].id;
 add(s,{type:"expense",amount:10000,accountId:id,status:"pending",date:"2026-11-04"});
 add(s,{type:"expense",amount:15000,accountId:id,status:"paid",date:"2026-10-01"});
 const reversed=add(s,{type:"expense",amount:20000,accountId:id,status:"pending",date:"2026-10-01"});reverse(s,reversed.id);
 assert.deepEqual(overdueExpenses(s,"2026-11-04"),[]);
 assert.equal(proportionalPaymentPlan(s,id,10000,"2026-11-04").distributed,0);
 assert.throws(()=>proportionalPaymentPlan(s,id,100001,"2026-11-04"),/excede/);
});
test("edição de despesa parcialmente paga não permite perder pagamentos",()=>{
 const s=initial(),account=s.accounts[0];account.opening=100000;
 const tx=add(s,{type:"expense",amount:20000,accountId:account.id,status:"pending",date:"2026-10-01",description:"Internet"});
 applyProportionalPayments(s,account.id,8000,"2026-11-04");
 const previous=balance(s,account.id);
 const update={type:"expense",amount:25000,date:"2026-10-01",status:"pending",accountId:account.id,toAccountId:null,category:"Alimentação",description:"Internet corrigida"};
 editTransaction(s,tx.id,update,1);
 assert.equal(balance(s,account.id),previous);
 assert.equal(remainingDue(tx),17000);
 assert.throws(()=>editTransaction(s,tx.id,{...update,amount:5000},2),/pagamentos parciais/);
 assert.throws(()=>editTransaction(s,tx.id,{...update,type:"income"},2),/pagamentos parciais/);
 settle(s,tx.id);
 assert.equal(summary(s).expense,25000);
 assert.equal(balance(s,account.id),75000);
});
test("arredondamento de um centavo é determinístico mesmo para várias despesas",()=>{
 const s=initial();const id=s.accounts[0].id;s.accounts[0].opening=1;
 for(let i=0;i<3;i++)add(s,{type:"expense",amount:100,accountId:id,status:"pending",date:"2026-10-01",description:"Despesa "+i});
 const plan=proportionalPaymentPlan(s,id,1,"2026-11-04");
 assert.equal(plan.rows.length,3);
 assert.equal(plan.rows.reduce((n,r)=>n+r.amount,0),1);
 assert.equal(plan.rows.filter(r=>r.amount>0).length,1);
});
