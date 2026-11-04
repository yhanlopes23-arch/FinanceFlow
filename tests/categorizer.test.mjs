import test from "node:test";
import assert from "node:assert/strict";
import {SMART_CATEGORIES,normalizeDescription,suggestCategories} from "../src/categorizer.mjs";
const suggest=(description,type="expense",history=[],categories=SMART_CATEGORIES)=>suggestCategories(description,type,categories,history);
const first=(description,type="expense",history=[],categories=SMART_CATEGORIES)=>suggest(description,type,history,categories)[0]?.category;
test("descrições comuns levam a categorias plausíveis sem rede",()=>{
 assert.equal(first("Supermercado Central"),"Alimentação");
 assert.equal(first("Farmácia Drogasil"),"Saúde");
 assert.equal(first("Plano de Saúde UNIMED"),"Saúde");
 assert.equal(first("Gasolina no posto"),"Transporte");
 assert.equal(first("Energia elétrica ENEL"),"Moradia");
 assert.equal(first("Spotify Família mensal"),"Lazer");
 assert.equal(first("Mercado Livre - fone de ouvido"),"Compras");
 assert.equal(first("Salário de novembro","income"),"Salário");
 assert.equal(first("Comissão de vendas","income"),"Vendas");
 assert.equal(first("Aluguel recebido","income"),"Rendimentos");
});
test("não força classificação sem indícios ou quando há transferência",()=>{
 assert.deepEqual(suggest("Pix"),[]);
 assert.deepEqual(suggest("ABC"),[]);
 assert.deepEqual(suggest("Supermercado","transfer"),[]);
 assert.equal(first("Supermercado","income"),undefined);
});
test("histórico específico adapta sugestão com segurança",()=>{
 const tx={type:"expense",description:"Pagamento oficina do João",category:"Transporte",status:"paid",reversedBy:null};
 const result=suggest("Pagamento oficina do João","expense",[tx]);
 assert.equal(result[0].category,"Transporte");
 assert.equal(result[0].confidence,"Alta");
 assert.match(result[0].reason,/Descrição já categorizada/);
 assert.equal(first("Pagamento oficina do João","income",[tx]),undefined);
});
test("não sugere categoria inexistente ou lançamentos estornados",()=>{
 const old={type:"expense",description:"Lançamento hipotético",category:"Educação",reversedBy:"rev-1"};
 assert.deepEqual(suggest("Lançamento hipotético","expense",[old]),[]);
 assert.equal(first("Netflix","expense",[],["Moradia","Outros"]),undefined);
});
test("normalização trata acentos e caracteres especiais",()=>{
 assert.equal(normalizeDescription("  FARMÁCIA / São João! "),"farmacia sao joao");
});
