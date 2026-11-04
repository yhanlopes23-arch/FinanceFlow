// Categorização sugestiva 100% local; não há chamada a IA ou serviço externo.
export const SMART_CATEGORIES=[
 "Alimentação","Moradia","Transporte","Saúde","Educação","Lazer",
 "Assinaturas","Compras","Serviços","Impostos e taxas",
 "Salário","Vendas","Rendimentos","Outros"
];
export function normalizeDescription(value){
 return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
}
const rules={
 expense:{
  "Alimentação":["supermercado","mercadinho","mercado","feira","padaria","restaurante","lanchonete","ifood","uber eats","acougue","hortifruti","delivery de comida","refeicao","almoco","jantar","pizzaria","lanche","sushi","carne","compras do mes"],
  "Moradia":["aluguel","condominio","energia eletrica","enel","equatorial","cemig","conta de luz","conta de agua","saneatins","sabesp","esgoto","iptu","gas residencial","material de construcao","reforma residencial","taxa condominial"],
  "Transporte":["uber","99pop","corrida de aplicativo","combustivel","gasolina","etanol","diesel","posto de gasolina","estacionamento","pedagio","onibus","passagem rodoviaria","metro","oficina mecanica","revisao do carro","troca de oleo","ipva"],
  "Saúde":["farmacia","drogaria","plano de saude","unimed","medico","hospital","consulta medica","exame","dentista","odontologia","laboratorio","remedio","medicamento","psicologo","terapia","vacina"],
  "Educação":["faculdade","universidade","escola","curso","livro didatico","material escolar","mensalidade escolar","aula","unopar","colegio","educacao"],
  "Lazer":["spotify","netflix","disney plus","hbo max","max streaming","prime video","cinema","ingresso","show","viagem","hotel","passeio","playstation","game pass","steam","youtube premium","lazer"],
  "Assinaturas":["assinatura","mensalidade de software","icloud","google one","chatgpt","openai","notion","canva","adobe","software"],
  "Compras":["mercado livre","shopee","aliexpress","shein","amazon","magalu","magazine luiza","roupa","calcado","tenis","eletronico","eletrodomestico","loja online","loja de roupas"],
  "Serviços":["internet","telefone","vivo","claro","tim celular","oi fibra","plano celular","manutencao","prestador de servico","encanador","eletricista","servico tecnico"],
  "Impostos e taxas":["imposto","tributo","darf","das mei","inss","taxa bancaria","tarifa bancaria","iof","multa","taxa de cartorio","licenciamento"]
 },
 income:{
  "Salário":["salario","decimo terceiro","13 salario","pro labore","pagamento de salario","ferias remuneradas","folha salarial"],
  "Vendas":["venda","faturamento","comissao","servicos prestados","honorarios","recebimento de cliente","recebimento de venda","pedido faturado","prestacao de servico"],
  "Rendimentos":["rendimento","juros recebidos","dividendos","aluguel recebido","renda de aluguel","cashback","lucro distribuido","cdb","aplicacao financeira","tesouro direto"]
 }
};
const specialWords=new Set(["mercado livre","uber eats","plano de saude","conta de luz","conta de agua","energia eletrica","aluguel recebido","spotify","netflix","ifood","shopee","amazon","unimed","salario","combustivel","gasolina","faculdade","venda","comissao"]);
const ignored=new Set(["de","da","do","das","dos","o","a","os","as","e","em","no","na","para","por","com","pix","pagamento","recebimento","compra","conta","mensal","parcela","transferencia","valor","numero"]);
function tokens(value){return [...new Set(normalizeDescription(value).split(" ").filter(x=>x.length>2&&!ignored.has(x)))];}
function phraseFound(haystack,needle){return (" "+haystack+" ").includes(" "+needle+" ");}
function dictionaryMatches(desc,type,available){
 const matches=new Map();
 for(const [category,phrases]of Object.entries(rules[type]||{})){
  if(!available.has(category))continue;
  let score=0;
  for(const phrase of phrases){
   if(phraseFound(desc,phrase)){
    score+=specialWords.has(phrase)?63:phrase.includes(" ")?42:32;
   }
  }
  if(score>0)matches.set(category,{category,score:Math.min(92,score),reason:"Palavras-chave da descrição"});
 }
 return matches;
}
/**
 * Retorna até três sugestões, em ordem decrescente de evidência.
 * As categorias só são sugeridas, nunca gravadas automaticamente.
 * O histórico é limitado ao próprio tipo (receita/despesa).
 */
export function suggestCategories(description,type,categories,history=[]){
 if(!["income","expense"].includes(type))return [];
 const desc=normalizeDescription(description);
 if(desc.length<3)return [];
 const available=new Set(Array.isArray(categories)?categories:[]);
 const scores=dictionaryMatches(desc,type,available);
 const words=tokens(desc);
 const seen=new Set();
 for(const tx of Array.isArray(history)?history:[]){
  if(tx?.type!==type||tx.reversedBy||!available.has(tx.category)||tx.category==="Outros")continue;
  const prior=normalizeDescription(tx.description);
  if(prior.length<3||prior===desc && seen.has(tx.category))continue;
  const same=prior===desc;
  let score=0;
  if(same)score=125;
  else if(words.length>=2){
   const pastWords=tokens(prior);
   const common=words.filter(x=>pastWords.includes(x)).length;
   const similarity=common/Math.max(words.length,pastWords.length,1);
   if(common>=2&&similarity>=0.7)score=94;
  }
  if(!score)continue;
  const old=scores.get(tx.category);
  if(!old||score>old.score)scores.set(tx.category,{category:tx.category,score,reason:same?"Descrição já categorizada":"Descrição semelhante no histórico"});
  seen.add(tx.category);
 }
 return [...scores.values()].sort((a,b)=>b.score-a.score||a.category.localeCompare(b.category,"pt-BR"))
  .slice(0,3).map(({category,score,reason})=>({category,confidence:score>=63?"Alta":"Média",reason}));
}
