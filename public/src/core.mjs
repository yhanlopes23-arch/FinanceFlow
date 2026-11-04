// FinanceFlow — motor financeiro local: valores sempre em centavos inteiros.
export const VERSION = 1;
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `ff-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const today = () => new Date().toLocaleDateString("en-CA");
export const money = cents => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export function parseMoney(value) {
  const text = String(value ?? "").trim().replace(/^R\$\s*/i,"").replace(/\s/g,"");
  if (!text || !/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(text)) throw Error("Informe um valor válido (ex.: 125,50).");
  const [reais, cents=""] = text.split(",");
  const num = Number(reais.replaceAll(".","")) * 100 + Number(cents.padEnd(2,"0"));
  if (!Number.isSafeInteger(num) || num <= 0) throw Error("O valor deve ser maior que zero e caber em centavos.");
  return num;
}
export const initial = () => ({version:VERSION,accounts:[{id:uid(),name:"Conta principal",opening:0}],categories:["Alimentação","Moradia","Transporte","Saúde","Educação","Lazer","Salário","Vendas","Outros"],transactions:[],budgets:{},goals:[],audit:[]});
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

export function addGoal(s,name,target){
  if(!String(name).trim()||String(name).trim().length>80||!Number.isSafeInteger(target)||target<=0)throw Error("Informe nome e valor válido para a meta.");
  s.goals ??=[];const goal={id:uid(),name:String(name).trim(),target,saved:0};s.goals.push(goal);record(s,"goal.create",goal.id);return goal;
}
export function contributeGoal(s,id,amount){
  if(!Number.isSafeInteger(amount)||amount<=0)throw Error("Aporte inválido.");
  const goal=(s.goals||[]).find(g=>g.id===id);if(!goal)throw Error("Meta não encontrada.");
  if(!Number.isSafeInteger(goal.saved+amount))throw Error("Valor muito alto.");
  goal.saved+=amount;record(s,"goal.contribute",goal.id);
  // É acompanhamento de meta, não movimentação bancária.
  return goal;
}
