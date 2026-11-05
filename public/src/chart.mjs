/**
 * Fatias de despesas do mês: liquidado + pendente, sem duplicação.
 * Agrupa categorias além da quinta em "Outros" para manter a legenda legível.
 * Divide os percentuais pelo método dos maiores restos, em décimos de %:
 * a soma de todos os percentuais apresentados é sempre 100%.
 */
export const CHART_COLORS=["#0be3a4","#a854f5","#288bff","#ffa126","#b5c2d6"];

export function categoryBreakdown(totals,maxSlices=5){
 if(!totals||typeof totals!=="object"||Array.isArray(totals))return [];
 if(!Number.isInteger(maxSlices)||maxSlices<2||maxSlices>12)throw Error("Quantidade inválida de categorias.");
 const raw=Object.entries(totals)
  .filter(([name,amount])=>typeof name==="string"&&name.trim()&&Number.isSafeInteger(amount)&&amount>0)
  .map(([name,amount])=>({name,amount}))
  .sort((a,b)=>b.amount-a.amount||a.name.localeCompare(b.name,"pt-BR"));
 if(!raw.length)return [];
 const aggregate=raw.length>maxSlices;
 let grouped=raw;
 if(aggregate){
  const primary=raw.filter(x=>x.name!=="Outros").slice(0,maxSlices-1);
  const keys=new Set(primary.map(x=>x.name));
  const rest=raw.filter(x=>!keys.has(x.name)).reduce((sum,x)=>sum+x.amount,0);
  grouped=[...primary,{name:"Outros",amount:rest}];
 }
 const total=grouped.reduce((sum,x)=>sum+x.amount,0);
 if(!Number.isSafeInteger(total)||total<=0)throw Error("Total de despesas inválido.");
 const exact=grouped.map(x=>x.amount/total*1000);
 const tenths=exact.map(x=>Math.floor(x));
 let remainder=1000-tenths.reduce((sum,x)=>sum+x,0);
 const priorities=grouped.map((x,i)=>({i,fraction:exact[i]-tenths[i],amount:x.amount}))
  .sort((a,b)=>b.fraction-a.fraction||b.amount-a.amount||a.i-b.i);
 for(let i=0;i<remainder;i++)tenths[priorities[i%priorities.length].i]++;
 const format=tenth=>tenth%10===0?`${tenth/10}%`:`${(tenth/10).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})}%`;
 return grouped.map((x,i)=>({
  ...x,
  color:x.name==="Outros"?"#b5c2d6":CHART_COLORS[i%CHART_COLORS.length],
  proportion:x.amount/total,
  percentageTenths:tenths[i],
  percentageLabel:format(tenths[i])
 }));
}
