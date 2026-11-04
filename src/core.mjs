import {SMART_CATEGORIES} from "./categorizer.mjs";
// FinanceFlow — motor financeiro local: valores sempre em centavos inteiros.
export const VERSION = 1;
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `ff-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
export const money = cents => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export function parseMoney(value) {
  const text = String(value ?? "").trim().replace(/^R\$\s*/i,"").replace(/\s/g,"");
  if (!text || !/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(text)) throw Error("Informe um valor válido (ex.: 125,50).");
  const [reais, cents=""] = text.split(",");
  const num = Number(reais.replaceAll(".","")) * 100 + Number(cents.padEnd(2,"0"));
  if (!Number.isSafeInteger(num) || num <= 0) throw Error("O valor deve ser maior que zero e caber em centavos.");
  return num;
}
export const initial = () => ({version:VERSION,accounts:[{id:uid(),name:"Conta principal",opening:0}],categories:[...SMART_CATEGORIES],transactions:[],budgets:{},goals:[],audit:[]});
export function validateState(s) {
  if (!s || s.version !== VERSION || !Array.isArray(s.accounts) || !Array.isArray(s.transactions) || !Array.isArray(s.audit) || !Array.isArray(s.categories) || typeof s.budgets !== "object" || s.budgets === null) throw Error("Arquivo de dados incompatível.");
  if(s.goals!==undefined && (!Array.isArray(s.goals)||s.goals.some(g=>!g.id||typeof g.name!=="string"||!Number.isSafeInteger(g.target)||g.target<=0||!Number.isSafeInteger(g.saved)||g.saved<0))) throw Error("Metas inválidas.");
  const ids = new Set();
  for (const a of s.accounts) {
    if (!a.id || typeof a.name!=="string" || !Number.isSafeInteger(a.opening)) throw Error("Conta inválida.");
    if(ids.has(a.id)) throw Error("Identificador de conta repetido."); ids.add(a.id);
  }
  const txids=new Set();
  for (const t of s.transactions) {
    if (!t.id || txids.has(t.id) || !["income","expense","transfer"].includes(t.type) || !Number.isSafeInteger(t.amount) || t.amount<=0 || !ids.has(t.accountId) || (t.type==="transfer" && (!ids.has(t.toAccountId) || t.toAccountId===t.accountId)) || !/^\d{4}-\d{2}-\d{2}$/.test(t.date) || !["paid","pending"].includes(t.status)) throw Error("Lançamento inválido.");
    txids.add(t.id);
  }
  for(const v of Object.values(s.budgets)) if(!Number.isSafeInteger(v)||v<0) throw Error("Orçamento inválido.");
  if (s.goals !== undefined) {if(!Array.isArray(s.goals)) throw Error("Metas inválidas.");for(const g of s.goals){if(!g.id || typeof g.name!=="string" || g.name.length>80 || !Number.isSafeInteger(g.target) || g.target<=0 || !Number.isSafeInteger(g.saved) || g.saved<0 || (g.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(g.deadline)))throw Error("Meta inválida.");}}
  return s;
}
export function balance(s,accountId) {
  const a=s.accounts.find(a=>a.id===accountId); if(!a) throw Error("Conta não encontrada.");
  return s.transactions.reduce((total,t)=> {
    if(t.status!=="paid" || t.reversedBy) return total;
    if(t.type==="income" && t.accountId===accountId) return total+t.amount;
    if((t.type==="expense"||t.type==="transfer") && t.accountId===accountId) return total-t.amount;
    if(t.type==="transfer" && t.toAccountId===accountId) return total+t.amount;
    return total;
  },a.opening);
}
export function summary(s) {
  const actual=s.transactions.filter(t=>t.status==="paid"&&!t.reversedBy);
  return {balance:s.accounts.reduce((n,a)=>n+balance(s,a.id),0),income:actual.filter(t=>t.type==="income").reduce((n,t)=>n+t.amount,0),expense:actual.filter(t=>t.type==="expense").reduce((n,t)=>n+t.amount,0),pending:s.transactions.filter(t=>t.status==="pending"&&!t.reversedBy).length};
}
export function record(s,action,details){s.audit.unshift({id:uid(),date:new Date().toISOString(),action,details});s.audit=s.audit.slice(0,1000);}
export function addAccount(s,name,opening=0){name=String(name).trim();if(!name||name.length>80)throw Error("Nome da conta inválido.");if(!Number.isSafeInteger(opening))throw Error("Saldo inicial inválido."); const a={id:uid(),name,opening};s.accounts.push(a);record(s,"account.create",name);return a;}
export function addTransaction(s,p) {
  const type=p.type,amount=p.amount, date=p.date, status=p.status;
  if(!["income","expense","transfer"].includes(type)||!Number.isSafeInteger(amount)||amount<=0||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!["paid","pending"].includes(status)||!s.accounts.some(a=>a.id===p.accountId))throw Error("Verifique os dados do lançamento.");
  if(type==="transfer"&&(!s.accounts.some(a=>a.id===p.toAccountId)||p.toAccountId===p.accountId))throw Error("Selecione contas diferentes.");
  const tx={id:uid(),type,amount,date,status,accountId:p.accountId,toAccountId:type==="transfer"?p.toAccountId:null,category:type==="transfer"?"Transferência":String(p.category||"Outros").slice(0,80),description:String(p.description||"").trim().slice(0,180),createdAt:new Date().toISOString(),reversedBy:null};
  s.transactions.unshift(tx);record(s,"transaction.create",tx.id);return tx;
}
export function reverse(s,id){const t=s.transactions.find(t=>t.id===id);if(!t||t.reversedBy)throw Error("Lançamento já estornado ou inexistente.");t.reversedBy=uid();record(s,"transaction.reverse",id);return t;}
export function settle(s,id){const t=s.transactions.find(t=>t.id===id);if(!t||t.reversedBy||t.status!=="pending")throw Error("Pendente não encontrado.");t.status="paid";record(s,"transaction.settle",id);}
export function monthRows(s,month) {return s.transactions.filter(t=>!t.reversedBy&&t.date.startsWith(month));}
export function categoryTotals(s,month){const out={};for(const t of monthRows(s,month)){if(t.type==="expense"&&t.status==="paid")out[t.category]=(out[t.category]||0)+t.amount;}return out;}
export function exportData(s){validateState(s);return JSON.stringify(s,null,2);}
export function importData(raw){const s=validateState(JSON.parse(raw));return structuredClone(s);}

export function createGoal(s,{name,target,deadline=""}) {
 name=String(name||"").trim();
 if(!name||name.length>80||!Number.isSafeInteger(target)||target<=0||(deadline&&!/^\d{4}-\d{2}-\d{2}$/.test(deadline)))throw Error("Dados da meta inválidos.");
 s.goals??=[];const goal={id:uid(),name,target,saved:0,deadline};
 s.goals.push(goal);record(s,"goal.create",goal.id);return goal;
}
export function contributeGoal(s,id,amount){
 const goal=(s.goals||[]).find(g=>g.id===id);
 if(!goal||!Number.isSafeInteger(amount)||amount<=0||!Number.isSafeInteger(goal.saved+amount))throw Error("Aporte inválido.");
 goal.saved+=amount;record(s,"goal.progress",goal.id);return goal;
}

// Compatibilidade com a interface que usa criação simples de metas.
export function addGoal(s,name,target){return createGoal(s,{name,target});}

/**
 * Projeção do mês: inclui lançamentos liquidados e pendentes, sem duplicidade.
 * Transferências internas não são receitas/despesas, e estornos são ignorados.
 * Todas as quantias permanecem em centavos inteiros.
 */
export function monthlyForecast(s,month){
 if(!/^\d{4}-\d{2}$/.test(month))throw Error("Mês de referência inválido.");
 const rows=s.transactions.filter(t=>!t.reversedBy && t.date.startsWith(month) && t.type!=="transfer");
 const totals={paidIncome:0,pendingIncome:0,paidExpense:0,pendingExpense:0};
 const expenseCategories={};
 for(const t of rows){
  const key=(t.status==="paid"?"paid":"pending")+(t.type==="income"?"Income":"Expense");
  totals[key]+=t.amount;
  if(t.type==="expense")expenseCategories[t.category]=(expenseCategories[t.category]||0)+t.amount;
 }
 const expectedIncome=totals.paidIncome+totals.pendingIncome;
 const expectedExpense=totals.paidExpense+totals.pendingExpense;
 return {...totals,expectedIncome,expectedExpense,expectedResult:expectedIncome-expectedExpense,actualResult:totals.paidIncome-totals.paidExpense,expenseCategories};
}
/** Saldo atual + todas as pendências até o último dia do mês, inclusive atrasadas. */
export function projectedBalance(s,month){
 if(!/^\d{4}-\d{2}$/.test(month))throw Error("Mês de referência inválido.");
 const balanceNow=summary(s).balance;
 const pendingUntilMonth=s.transactions.filter(t=>!t.reversedBy&&t.status==="pending"&&t.date.slice(0,7)<=month);
 return balanceNow+pendingUntilMonth.reduce((amount,t)=>amount+(t.type==="income"?t.amount:t.type==="expense"?-t.amount:0),0);
}

/**
 * A data do lançamento representa:
 * - Receita: dia do recebimento (se liquidada) ou data prevista de entrada.
 * - Despesa: vencimento, o ÚLTIMO dia em que o pagamento pode ser feito em dia.
 * - Transferência: data programada/realizada entre contas.
 * A liquidação de um registro não altera esta data.
 */
export function dateFieldLabel(type,status="pending"){
 if(type==="income")return status==="paid"?"Data do recebimento":"Previsão de recebimento";
 if(type==="expense")return "Vencimento (último dia para pagar)";
 if(type==="transfer")return status==="paid"?"Data da transferência":"Data prevista da transferência";
 throw Error("Tipo de lançamento inválido.");
}
export function dateFieldHint(type,status="pending"){
 if(type==="income")return status==="paid"
  ?"Informe a data em que o valor entrou na conta."
  :"Informe o dia em que o valor deverá entrar na conta.";
 if(type==="expense")return "Esta é a data limite para pagar em dia. Só ficará em atraso a partir do dia seguinte, se ainda estiver pendente.";
 if(type==="transfer")return "Data da movimentação entre contas (não conta como receita nem despesa).";
 throw Error("Tipo de lançamento inválido.");
}
/** Avaliação por datas locais YYYY-MM-DD; o próprio dia do vencimento nunca é atraso. */
export function paymentDateStatus(tx,reference=today()){
 if(!tx || !["income","expense","transfer"].includes(tx.type) || !["paid","pending"].includes(tx.status) || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date) || !/^\d{4}-\d{2}-\d{2}$/.test(reference))throw Error("Dados de vencimento inválidos.");
 if(tx.reversedBy)return {label:"Estornado",kind:"neutral"};
 if(tx.status==="paid")return {label:tx.type==="income"?"Recebido":tx.type==="expense"?"Pago":"Transferido",kind:"success"};
 if(tx.type==="transfer")return {label:"Transferência pendente",kind:"pending"};
 if(tx.date<reference)return {label:tx.type==="income"?"Recebimento atrasado":"Pagamento atrasado",kind:"overdue"};
 if(tx.date===reference)return {label:tx.type==="income"?"Receber hoje":"Último dia para pagar",kind:"today"};
 return {label:tx.type==="income"?"A receber":"A pagar",kind:"pending"};
}
