import {SMART_CATEGORIES,suggestCategories} from "./categorizer.mjs";
import {initial,validateState,parseMoney,money,today,balance,summary,addAccount,addTransaction,editTransaction,reverse,settle,monthRows,categoryTotals,record,exportData,importData,addGoal,contributeGoal,monthlyForecast,projectedBalance,dateFieldLabel,dateFieldHint,paymentDateStatus,partialPaid,remainingDue,overdueExpenses,proportionalPaymentPlan,applyProportionalPayments} from "./core.mjs";
const KEY="financeflow-local-v1";
const $=id=>document.getElementById(id);
let state;
try {const raw=localStorage.getItem(KEY);state=raw?validateState(JSON.parse(raw)):initial();} catch(e){state=initial();alert("Não foi possível ler os dados salvos. Faça uma cópia do armazenamento antes de registrar novos lançamentos. "+e.message);}
function ensureCategories(data){data.categories=[...new Set([...data.categories,...SMART_CATEGORIES])];}
ensureCategories(state);
const monthDefault=today().slice(0,7);$("month").value=monthDefault;
function say(message,error=false){const n=$("notice");n.textContent=message;n.classList.toggle("error",error);}
function commit(fn){const clone=structuredClone(state);try{fn(clone);validateState(clone);localStorage.setItem(KEY,JSON.stringify(clone));state=clone;render();say("Alterações salvas neste navegador.");return true;}catch(e){say(e.message,true);return false;}}
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(cls)node.className=cls;return node;}
function opt(select,value,label){const o=new Option(label,value);select.add(o);}
function accountName(id){return state.accounts.find(a=>a.id===id)?.name??"Conta removida";}
function fillOptions(){for(const id of ["tx-account","tx-to"]){const s=$(id),v=s.value;s.replaceChildren();state.accounts.forEach(a=>opt(s,a.id,a.name));if([...s.options].some(o=>o.value===v))s.value=v;}for(const id of ["tx-category","budget-category"]){
 const s=$(id),v=s.value;s.replaceChildren();
 if(id==="tx-category")opt(s,"","Escolha uma categoria");
 state.categories.forEach(c=>opt(s,c,c));
 if([...s.options].some(o=>o.value===v))s.value=v;
 else if(id==="tx-category")s.value="";
}}
function render(){
 ensureCategories(state);
 fillOptions();const sum=summary(state);$("balance").textContent=money(sum.balance);const pendingElement=$("pending");if(pendingElement)pendingElement.textContent=sum.pending;
 const month=$("month").value||monthDefault;
 const forecast=monthlyForecast(state,month);
 const inc=forecast.paidIncome,exp=forecast.paidExpense,net=forecast.actualResult;
 $("income").textContent=money(forecast.expectedIncome);
 $("income-paid").textContent=money(forecast.paidIncome);
 $("income-pending").textContent=money(forecast.pendingIncome);
 $("expense").textContent=money(forecast.expectedExpense);
 $("expense-paid").textContent=money(forecast.paidExpense);
 $("expense-pending").textContent=money(forecast.pendingExpense);
 const result=$("month-result");result.textContent=money(forecast.expectedResult);result.className=forecast.expectedResult>=0?"positive":"negative";
 $("actual-result").textContent=money(forecast.actualResult);
 $("forecast-balance").textContent=balanceHidden?"R$ ••••":money(projectedBalance(state,month));
 const totals=forecast.expenseCategories, paidTotals=categoryTotals(state,month);
 const entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]),bars=$("bars");bars.replaceChildren();
 if(!entries.length)bars.append(el("p","Nenhuma despesa prevista para este mês.","empty"));
 else {const top=entries[0][1];for(const [name,value] of entries){const row=el("div",undefined,"barrow"),lab=el("div",undefined,"barlabel"),a=el("span",name),b=el("strong",money(value)),track=el("div",undefined,"bartrack"),fill=el("div",undefined,"barfill");fill.style.width=(value/top*100)+"%";track.append(fill);lab.append(a,b);row.append(lab,track);bars.append(row);}}
 renderDashboard(month,forecast,totals,entries);
 renderSettlement();
 const q=$("search").value.toLocaleLowerCase("pt-BR"),type=$("filter-type").value,status=$("filter-status").value,body=$("transactions");body.replaceChildren();const visible=state.transactions.filter(t=>!t.reversedBy&&(!type||t.type===type)&&(!status||t.status===status)&&(!q||[t.description,t.category,accountName(t.accountId)].some(v=>v.toLocaleLowerCase("pt-BR").includes(q))));
 if(!visible.length){const tr=el("tr"),td=el("td","Nenhum lançamento corresponde aos filtros.","empty");td.colSpan=6;tr.append(td);body.append(tr);}
 for(const t of visible){const tr=el("tr");tr.append(el("td",t.date.split("-").reverse().join("/")));const title=el("td");title.append(el("strong",t.description||({income:"Receita",expense:"Despesa",transfer:"Transferência"}[t.type])),el("div",t.category,"muted"));tr.append(title,el("td",accountName(t.accountId)+(t.type==="transfer"?" → "+accountName(t.toAccountId):"")));const stateCell=el("td");const info=paymentDateStatus(t);stateCell.append(el("span",info.label,"pill "+info.kind));tr.append(stateCell);const amount=el("td",(t.type==="expense"?"−":t.type==="income"?"+":"⇄ ")+money(t.type==="expense"&&t.status==="pending"?remainingDue(t):t.amount));if(t.type==="expense"&&partialPaid(t)>0&&t.status==="pending")amount.append(el("small"," • pago "+money(partialPaid(t)),"muted"));amount.className=t.type==="expense"?"negative":t.type==="income"?"positive":"";tr.append(amount);const action=el("td");
 if(t.status==="pending"){const b=el("button","Liquidar","secondary rowaction");b.onclick=()=>commit(s=>settle(s,t.id));action.append(b);}
 const edit=el("button","Editar","secondary rowaction");edit.type="button";edit.onclick=()=>openEditTransaction(t.id);action.append(edit);
 const rev=el("button","Estornar","danger rowaction");rev.onclick=()=>{if(confirm("Estornar este lançamento? A operação ficará registrada na auditoria."))commit(s=>reverse(s,t.id));};action.append(rev);tr.append(action);body.append(tr);}
 const accounts=$("accounts");accounts.replaceChildren();for(const a of state.accounts){const card=el("article",undefined,"accountcard");card.append(el("span",a.name),el("strong",money(balance(state,a.id))),el("p","Saldo inicial: "+money(a.opening),"muted"));accounts.append(card);}
 const budgets=$("budgets");budgets.replaceChildren();const monthBudgets=Object.entries(state.budgets).filter(([key])=>key.startsWith(month+"|"));if(!monthBudgets.length)budgets.append(el("p","Nenhum orçamento definido para este mês.","empty"));
 for(const [key,limit] of monthBudgets){const category=key.split("|").slice(1).join("|"),spent=paidTotals[category]||0,row=el("div",undefined,"budgetrow"),lab=el("div",undefined,"barlabel"),track=el("div",undefined,"bartrack"),fill=el("div",undefined,"barfill");lab.append(el("span",category),el("strong",money(spent)+" / "+money(limit)));fill.style.width=(limit?Math.min(100,spent/limit*100):100)+"%";if(spent>limit)fill.style.background="#ff869a";track.append(fill);row.append(lab,track);budgets.append(row);}
 const audit=$("audit");audit.replaceChildren();if(!state.audit.length)audit.append(el("p","Sem eventos."));
for(const event of state.audit.slice(0,60))audit.append(el("p",new Date(event.date).toLocaleString("pt-BR")+" — "+event.action+" — "+describeAudit(event)));
}

const colors=["#12df9a","#a456f5","#298df2","#ffab2a","#a5b8cc","#f46e9a"];
let balanceHidden=false;
function renderDashboard(month,forecast,totals,entries){
 const total=entries.reduce((n,e)=>n+e[1],0);
 $("donut-total").textContent=money(total);
 if(total){
  let from=0;const stops=[];
  entries.forEach(([_,value],i)=>{const to=from+value/total*100;stops.push(colors[i%colors.length]+" "+from+"% "+to+"%");from=to;});
  $("donut").style.background="conic-gradient("+stops.join(",")+")";
 } else $("donut").style.background="conic-gradient(#263b56 0 100%)";
 $("donut").setAttribute("aria-label",total?"Despesas por categoria: "+entries.map(([n,v])=>n+" "+money(v)).join(", "):"Sem despesas previstas no mês");
 const pending=state.transactions.filter(t=>!t.reversedBy&&t.status==="pending"&&t.type!=="transfer").sort((a,b)=>a.date.localeCompare(b.date));
 function buildDueRow(t){
  const row=el("div",undefined,"due-row"),day=el("div",undefined,"due-date");
  const [y,m,d]=t.date.split("-").map(Number);
  day.append(el("small",new Intl.DateTimeFormat("pt-BR",{month:"short",timeZone:"UTC"}).format(new Date(Date.UTC(y,m-1,d))).replace(".","").toUpperCase()),el("strong",String(d).padStart(2,"0")));
  const details=el("div");
  const info=paymentDateStatus(t);details.append(el("span",info.label,"pill "+info.kind),el("div",t.description||t.category,"due-name"),el("div",(t.type==="income"?"Receber em ":"Pagar até ")+t.date.split("-").reverse().join("/")+" • "+t.category+" • "+accountName(t.accountId),"due-sub"));
  const amount=el("span",(t.type==="expense"?"−":"+")+money(t.type==="expense"?remainingDue(t):t.amount),"due-amount");
  if(t.type==="expense"&&partialPaid(t)>0)amount.append(el("small","Já pago: "+money(partialPaid(t)),"muted"));
  const btn=el("button",t.type==="expense"?"Pagar":"Receber","secondary rowaction");
  btn.addEventListener("click",()=>{if(confirm("Confirmar quitação do saldo restante de "+money(remainingDue(t))+"? Registro local, sem transferência bancária."))commit(s=>settle(s,t.id));});
  const edit=el("button","Editar","secondary rowaction");edit.type="button";edit.onclick=()=>openEditTransaction(t.id);
  const actions=el("div",undefined,"due-actions");actions.append(btn,edit);
  row.append(day,details,amount,actions);return row;
 }
 const upcoming=$("upcoming"),agenda=$("all-upcoming");
 upcoming.replaceChildren();agenda.replaceChildren();
 if(!pending.length){upcoming.append(el("p","Nenhum vencimento pendente cadastrado.","empty"));agenda.append(el("p","Nenhuma receita a receber ou despesa a pagar.","empty"));}
 for(const t of pending.slice(0,4))upcoming.append(buildDueRow(t));
 for(const t of pending)agenda.append(buildDueRow(t));
 $("pending-caption").textContent=pending.length>4?"Mostrando 4 de "+pending.length+" pendências. Abra Vencimentos para consultar todas.":"Data exibida: data prevista informada no lançamento.";
 $("agenda-caption").textContent=pending.length+" pendência(s), ordenadas por data. Vencimentos atrasados permanecem na lista até serem liquidados ou estornados.";
 $("account-count").textContent="("+state.accounts.length+")";
 const accounts=$("home-accounts");accounts.replaceChildren();
 state.accounts.slice(0,4).forEach(acc=>{const row=el("div",undefined,"home-account"),ico=el("span","▤","bank-icon"),name=el("div",undefined,"account-title");name.append(el("strong",acc.name),el("small","Conta local"));row.append(ico,name,el("div",balanceHidden?"R$ ••••":money(balance(state,acc.id)),"amount"));accounts.append(row);});
 const targets=$("home-goals"),list=$("goals-list");targets.replaceChildren();list.replaceChildren();
 const goals=state.goals||[];if(!goals.length){targets.append(el("p","Nenhuma meta criada. Use Nova meta para começar.","empty"));list.append(el("p","Suas metas aparecerão aqui.","empty"));}
 for(const goal of goals){targets.append(buildGoalCard(goal,false));list.append(buildGoalCard(goal,true));}
 const report=$("monthly-report");report.replaceChildren();
 for(const [label,value] of [["Receitas previstas no mês (liquidadas + pendentes)",forecast.expectedIncome],["Receitas recebidas",forecast.paidIncome],["Receitas a receber",forecast.pendingIncome],["Despesas previstas no mês (liquidadas + pendentes)",forecast.expectedExpense],["Despesas pagas",forecast.paidExpense],["Despesas a pagar",forecast.pendingExpense],["Resultado efetivo do mês",forecast.actualResult],["Resultado previsto do mês",forecast.expectedResult],["Saldo projetado até o fim do mês (pendências vencidas incluídas)",projectedBalance(state,month)]]){
   const row=el("div",undefined,"barlabel");row.append(el("span",label),el("strong",balanceHidden?"R$ ••••":money(value)));report.append(row);
 }
 $("balance").textContent=balanceHidden?"R$ ••••":money(summary(state).balance);
}
function buildGoalCard(goal,showActions){
 const card=el("article",undefined,"goal-card"),head=el("div",undefined,"goal-head"),percent=Math.min(100,goal.saved/goal.target*100);
 head.append(el("span",goal.name),el("span",Math.round(goal.saved/goal.target*100)+"%"));
 card.append(head,el("div",money(goal.saved)+" de "+money(goal.target),"goal-meta"));
 const track=el("div",undefined,"bartrack"),fill=el("div",undefined,"barfill");fill.style.width=percent+"%";track.append(fill);card.append(track);
 if(showActions){const actions=el("div",undefined,"goal-actions"),input=el("input");input.placeholder="Aporte (R$)";input.setAttribute("aria-label","Valor para a meta "+goal.name);input.inputMode="decimal";const button=el("button","Registrar aporte","secondary");button.onclick=()=>{try{commit(s=>contributeGoal(s,goal.id,parseMoney(input.value)));}catch(e){say(e.message,true);}};actions.append(input,button);card.append(actions);}
 return card;
}

function describeAudit(event){
 if(event.action!=="transaction.edit")return String(event.details??"");
 try{
  const change=JSON.parse(event.details),labels={type:"Tipo",amount:"Valor",date:"Data",status:"Situação",accountId:"Conta origem",toAccountId:"Conta destino",category:"Categoria",description:"Descrição"};
  const value=(k,v)=>k==="amount"&&typeof v==="number"?money(v):v===null?"(sem conta)":String(v);
  const parts=Object.keys(change.after).filter(k=>change.before[k]!==change.after[k]).map(k=>labels[k]+": "+value(k,change.before[k])+" → "+value(k,change.after[k]));
  return "Lançamento "+change.id+" — "+parts.join("; ");
 }catch{return "Alteração registrada no histórico.";}
}
let editingId=null;
let editingRevision=null;
function openEditTransaction(id){
 const tx=state.transactions.find(t=>t.id===id);
 if(!tx||tx.reversedBy){say("Lançamento inexistente ou estornado não pode ser editado.",true);return;}
 editingId=id;editingRevision=tx.revision??0;
 const form=$("tx-form");form.reset();
 fillOptions();
 form.elements.type.value=tx.type;
 form.elements.description.value=tx.description??"";
 form.elements.amount.value=new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(tx.amount/100);
 form.elements.date.value=tx.date;
 form.elements.status.value=tx.status;
 form.elements.accountId.value=tx.accountId;
 form.elements.toAccountId.value=tx.toAccountId||"";
 if(tx.category&&!state.categories.includes(tx.category))opt($("tx-category"),tx.category,tx.category);
 $("tx-category").value=tx.category||"";
 syncType();
 $("tx-title").textContent="Editar lançamento";
 $("tx-save").textContent="Salvar alterações";
 $("tx-edit-hint").hidden=false;
 dialog("tx-dialog");
}
function dialog(id){const d=$(id);d.showModal();d.querySelector("input:not([type=hidden])")?.focus();}

function showCategorySuggestion(){
 const area=$("category-suggestion"),type=$("tx-type").value,description=$("tx-description").value;
 area.replaceChildren();
 if(type==="transfer"||description.trim().length<3){area.hidden=true;return;}
 area.hidden=false;
 const suggested=suggestCategories(description,type,state.categories,state.transactions);
 const heading=el("strong","Sugestões de categoria (análise local)","suggestion-heading");
 area.append(heading);
 if(!suggested.length){
  area.append(el("p","Nenhuma correspondência confiável. Selecione a categoria manualmente.","suggestion-empty"));
  return;
 }
 const group=el("div",undefined,"suggestion-buttons");
 for(const suggestion of suggested){
  const button=el("button",undefined,"suggestion-button");
  button.type="button";
  button.title=suggestion.reason;
  button.append(el("span",suggestion.category),el("small",suggestion.confidence+" • "+suggestion.reason));
  button.addEventListener("click",()=>{
   $("tx-category").value=suggestion.category;
   area.querySelectorAll(".suggestion-button").forEach(b=>b.classList.remove("chosen"));
   button.classList.add("chosen");
   const message=area.querySelector(".suggestion-feedback");
   if(message)message.textContent="Categoria selecionada: "+suggestion.category+". Você pode alterar manualmente.";
   else area.append(el("p","Categoria selecionada: "+suggestion.category+". Você pode alterar manualmente.","suggestion-feedback"));
  });
  group.append(button);
 }
 area.append(group);
 area.append(el("p","Sugestões, não classificações automáticas. A descrição não é enviada a servidores externos.","suggestion-note"));
}
$("tx-description").addEventListener("input",showCategorySuggestion);
$("tx-category").addEventListener("change",()=>{
 const feedback=$("category-suggestion").querySelector(".suggestion-feedback");
 if(feedback)feedback.textContent="Categoria escolhida manualmente: "+$("tx-category").value;
 $("category-suggestion").querySelectorAll(".suggestion-button").forEach(b=>b.classList.remove("chosen"));
});
function syncType(){
 const type=$("tx-type").value,status=$("tx-form").elements.status.value,transfer=type==="transfer";
 $("tx-to-wrap").hidden=!transfer;$("tx-category-wrap").hidden=transfer;
 $("tx-category").required=!transfer;
 $("tx-date-label").textContent=dateFieldLabel(type,status);
 $("tx-date-hint").textContent=dateFieldHint(type,status);
 showCategorySuggestion();
}
$("tx-type").addEventListener("change",syncType);$("tx-form").elements.status.addEventListener("change",syncType);$("new-transaction").onclick=$("open-tx").onclick=()=>openTx();
$("open-account").onclick=()=>{$("account-form").reset();dialog("account-dialog");};
document.querySelectorAll(".cancel").forEach(b=>b.onclick=()=>b.closest("dialog").close());
$("tx-dialog").addEventListener("close",()=>{editingId=null;editingRevision=null;});
$("tx-form").onsubmit=e=>{
 e.preventDefault();const form=e.currentTarget,p=Object.fromEntries(new FormData(form));
 try{
  const amount=parseMoney(p.amount);
  const changes={...p,amount};
  const isEdit=editingId!==null;
  if(commit(s=>{if(isEdit)editTransaction(s,editingId,changes,editingRevision);else addTransaction(s,changes);})){
   $("tx-dialog").close();
  }
 }catch(err){say(err.message,true);}
};
$("account-form").onsubmit=e=>{e.preventDefault();const f=e.currentTarget;try{const amount=String(f.elements.opening.value).trim();const opening=amount==="0"||amount==="0,00"?0:parseMoney(amount);let done=false;commit(s=>{addAccount(s,f.elements.name.value,opening);done=true;});if(done&&$("notice").className!=="error")$("account-dialog").close();}catch(err){say(err.message,true);}};
$("budget-form").onsubmit=e=>{e.preventDefault();try{const cents=parseMoney($("budget-amount").value);commit(s=>{const key=$("month").value+"|"+$("budget-category").value;s.budgets[key]=cents;record(s,"budget.set",key);});$("budget-amount").value="";}catch(err){say(err.message,true);}};
for(const id of ["month","search","filter-type","filter-status"])$(id).addEventListener(id==="search"?"input":"change",render);
function download(name,content,mime){const blob=new Blob([content],{type:mime});const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$("export-json").onclick=()=>download("financeflow-backup-"+today()+".json",exportData(state),"application/json");
function csvCell(value){return '"'+String(value??"").replaceAll('"','""').replace(/^[=+\-@]/,"'$&")+'"';}
$("export-csv").onclick=()=>{const rows=[["ID","Tipo","Descrição","Categoria","Valor (BRL)","Data de recebimento ou vencimento","Status","Conta origem","Conta destino","Estornado"],...state.transactions.map(t=>[t.id,t.type,t.description,t.category,(t.amount/100).toFixed(2).replace(".",","),t.date,t.status,accountName(t.accountId),t.toAccountId?accountName(t.toAccountId):"",t.reversedBy?"Sim":"Não"])];download("financeflow-lancamentos-"+today()+".csv","\uFEFF"+rows.map(r=>r.map(csvCell).join(";")).join("\r\n"),"text/csv;charset=utf-8");};
$("import-json").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>5_000_000)throw Error("Backup maior que 5 MB.");const next=importData(await file.text());if(!confirm("Substituir TODOS os dados deste navegador pelo backup selecionado?"))return;localStorage.setItem(KEY,JSON.stringify(next));state=next;render();say("Backup restaurado.");}catch(err){say("Não foi possível restaurar: "+err.message,true);}finally{e.target.value="";}};
$("clear-data").onclick=()=>{if(prompt('Digite APAGAR para excluir definitivamente os dados deste navegador:')!=="APAGAR")return;const fresh=initial();try{localStorage.setItem(KEY,JSON.stringify(fresh));state=fresh;render();say("Dados locais apagados.");}catch(e){say(e.message,true);}};

$("toggle-balance").onclick=()=>{balanceHidden=!balanceHidden;render();};
function openTx(type="expense",status="paid"){
 if(!state.accounts.length)return say("Cadastre uma conta primeiro.",true);
 editingId=null;editingRevision=null;
 $("tx-title").textContent="Novo lançamento";$("tx-save").textContent="Salvar lançamento";$("tx-edit-hint").hidden=true;
 $("tx-form").reset();$("tx-type").value=type;$("tx-form").elements.status.value=status;$("tx-form").elements.date.value=today();syncType();dialog("tx-dialog");
}
$("new-transaction").onclick=$("open-tx").onclick=$("bottom-add").onclick=()=>openTx();
document.querySelectorAll("[data-quick]").forEach(button=>button.addEventListener("click",()=>{
 const kind=button.dataset.quick;
 if(kind==="goal")dialog("goal-dialog");else openTx(kind);
}));
$("open-goal").onclick=()=>dialog("goal-dialog");
$("goal-form").onsubmit=e=>{e.preventDefault();const f=e.currentTarget;try{let ok=false;commit(s=>{addGoal(s,f.elements.name.value,parseMoney(f.elements.target.value));ok=true;});if(ok&&$("notice").className!=="error")$("goal-dialog").close();}catch(err){say(err.message,true);}};
$("new-due").onclick=()=>openTx("expense","pending");
const pages=[...document.querySelectorAll(".main > section[data-page]")];
const allowed=new Set(pages.map(page=>page.id));
const navLinks=[...document.querySelectorAll(".bottom-item, .bottom-secondary a, .sidebar .nav")];
const pageTitles={dashboard:["Olá! 👋","Aqui está um resumo das suas finanças."],agenda:["Vencimentos","Receitas e despesas previstas, ainda não liquidadas."],movimentos:["Movimentações","Consulte e gerencie seus lançamentos."],contas:["Contas","Saldos e contas financeiras."],metas:["Metas","Acompanhe seus objetivos."],planejamento:["Orçamentos","Planeje seus limites por categoria."],relatorios:["Relatórios","Compare o previsto e o realizado."],cartoes:["Cartões","Módulo de cartões em desenvolvimento."],dados:["Dados e segurança","Exportação, restauração e privacidade."]};
function updateNavigation(){
 const requested=(location.hash||"#dashboard").slice(1);
 const selected=requested==="vencimentos"?"agenda":allowed.has(requested)?requested:"dashboard";
 for(const page of pages){const active=page.id===selected;page.hidden=!active;page.setAttribute("aria-hidden",String(!active));}
 for(const link of navLinks){const active=link.getAttribute("href")==="#"+selected;link.classList.toggle("active",active);if(active)link.setAttribute("aria-current","page");else link.removeAttribute("aria-current");}
 const [heading,subtitle]=pageTitles[selected];document.querySelector(".top h1").textContent=heading;document.querySelector(".top .muted").textContent=subtitle;
 window.scrollTo(0,0);
}
window.addEventListener("hashchange",updateNavigation);
updateNavigation();
render();
