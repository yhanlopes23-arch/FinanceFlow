import {balance,money,settle,createGoal,contributeGoal,parseMoney} from "./core.mjs";
const $=id=>document.getElementById(id);
const mk=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e;};
const colors=["#13dca4","#a46afc","#318df5","#ff9c25","#a7b6cd","#fb5c91","#3fe3ea"];
const compact=cent=>money(cent);
let chosenGoal=null;
export function setupDashboard({getState,commit,openTransaction,say}){
 for(const [id,type] of [["quick-income","income"],["quick-expense","expense"],["quick-transfer","transfer"]])$(id).onclick=()=>openTransaction(type);
 $("dock-add").onclick=()=>openTransaction("expense");
 $("quick-goal").onclick=$("open-goal").onclick=()=>{$("goal-form").reset();$("goal-dialog").showModal();};
 $("toggle-balance").onclick=()=>{const hidden=document.body.classList.toggle("hero-hidden");$("toggle-balance").setAttribute("aria-label",hidden?"Mostrar valores":"Ocultar valores");};
 $("goal-form").onsubmit=e=>{e.preventDefault();const f=e.currentTarget,p=Object.fromEntries(new FormData(f));try{const amount=parseMoney(p.target);commit(s=>createGoal(s,{name:p.name,target:amount,deadline:p.deadline}));$("goal-dialog").close();}catch(err){say(err.message,true);}};
 $("contribute-form").onsubmit=e=>{e.preventDefault();try{const amount=parseMoney(e.currentTarget.elements.amount.value);commit(s=>contributeGoal(s,chosenGoal,amount));$("contribute-dialog").close();}catch(err){say(err.message,true);}};
 document.querySelectorAll(".dock-link").forEach(a=>a.addEventListener("click",()=>{document.querySelectorAll(".dock-link").forEach(x=>x.classList.remove("active"));a.classList.add("active");}));
}
export function renderDashboard(s,month,commit){
 const eligible=s.transactions.filter(t=>!t.reversedBy&&t.status==="paid"&&t.date.startsWith(month));
 const income=eligible.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0),expenses=eligible.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);
 $("income").textContent=compact(income);$("expense").textContent=compact(expenses);$("saving").textContent=compact(income-expenses);
 const totals={};for(const t of eligible)if(t.type==="expense")totals[t.category]=(totals[t.category]||0)+t.amount;
 const entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]);const sum=entries.reduce((a,[,v])=>a+v,0);
 $("donut-total").replaceChildren(document.createTextNode(money(sum)),mk("small","Total"));
 let angle=0;const stops=[];for(const [i,[,v]]of entries.entries()){const next=angle+v/sum*100;stops.push(`${colors[i%colors.length]} ${angle}% ${next}%`);angle=next;}
 $("donut").style.background=stops.length?"conic-gradient("+stops.join(",")+")":"conic-gradient(#304159 0 100%)";
 const legend=$("category-legend");legend.replaceChildren();
 if(!entries.length)legend.append(mk("p","Ainda não há despesas neste mês.","muted"));
 for(const [i,[cat,val]]of entries.slice(0,7).entries()){const row=mk("div",undefined,"legend-row"),name=mk("span"),dot=mk("i");dot.style.backgroundColor=colors[i%colors.length];name.append(dot,document.createTextNode(cat));row.append(name,mk("strong",Math.round(val/sum*100)+"%"));legend.append(row);}
 const dues=$("due-items");dues.replaceChildren();const next=s.transactions.filter(t=>t.status==="pending"&&!t.reversedBy&&t.type!=="transfer").sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
 if(!next.length)dues.append(mk("p","Nenhum vencimento pendente. Cadastre uma receita ou despesa com situação Pendente.","empty"));
 for(const t of next){const item=mk("div",undefined,"due-item"),date=mk("div",undefined,"due-date");const [yr,mo,day]=t.date.split("-");date.append(mk("small",new Intl.DateTimeFormat("pt-BR",{month:"short",timeZone:"UTC"}).format(new Date(t.date+"T12:00:00Z")).toUpperCase()),mk("span",day));
 const desc=mk("div",undefined,"due-text"),badge=mk("span",t.type==="income"?"A RECEBER":"A PAGAR","due-badge");desc.append(badge,mk("strong",t.description||t.category),mk("div",t.category+" • "+(s.accounts.find(a=>a.id===t.accountId)?.name||"Conta"),"due-meta"));
 const action=mk("div",undefined,"due-amount");action.append(mk("span",(t.type==="income"?"+ ":"− ")+money(t.amount)));const pay=mk("button",t.type==="income"?"Receber":"Pagar","secondary");pay.onclick=()=>commit(next=>settle(next,t.id));action.append(pay);item.append(date,desc,action);dues.append(item);}
 $("accounts-count").textContent="("+s.accounts.length+")";const accounts=$("account-preview");accounts.replaceChildren();
 for(const a of s.accounts.slice(0,4)){const row=mk("div",undefined,"account-preview-row"),logo=mk("div","▥","bank-mark"),label=mk("div",undefined,"account-label");label.append(mk("strong",a.name),mk("small","Conta financeira"));row.append(logo,label,mk("strong",money(balance(s,a.id)),"money-sensitive"));accounts.append(row);}
 const goalList=$("goals-list"),preview=$("goal-preview");goalList.replaceChildren();preview.replaceChildren();const goals=s.goals||[];
 if(!goals.length){goalList.append(mk("p","Nenhuma meta criada. Adicione um objetivo para acompanhar seu progresso.","empty"));preview.append(mk("p","Crie sua primeira meta para acompanhar o progresso.","empty"));}
 for(const g of goals){const build=()=>{const card=mk("div",undefined,"goal-card");card.append(mk("strong",g.name),mk("div",money(g.saved)+" de "+money(g.target),"muted"));const track=mk("div",undefined,"goal-progress"),fill=mk("span");fill.style.width=Math.min(100,g.saved/g.target*100)+"%";track.append(fill);card.append(track,mk("small",Math.floor(g.saved/g.target*100)+"% concluído"+(g.deadline?" • Prazo: "+g.deadline.split("-").reverse().join("/"):"")));const actions=mk("div",undefined,"goal-actions"),b=mk("button","+ Progresso","secondary");b.onclick=()=>{chosenGoal=g.id;$("contribute-form").reset();$("contribute-dialog").showModal();};actions.append(b);card.append(actions);return card;};goalList.append(build());if(g===goals[0])preview.append(build());}
}
