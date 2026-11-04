# FinanceFlow

> Plataforma de controle financeiro modular para pessoas, famílias, autônomos e empresas.

**Estado atual:** especificação e organização inicial. **O aplicativo ainda não foi implementado.**

## Visão

Criar um sistema de gestão financeira rastreável, seguro e escalável, capaz de acompanhar contas, cartões, receitas, despesas, obrigações, orçamentos, metas, dívidas, patrimônio, investimentos, relatórios, múltiplos usuários e integrações autorizadas.

### Princípios inegociáveis

1. Integridade monetária com cálculos exatos e regras de arredondamento explícitas.
2. Registros financeiros rastreáveis; saldos sempre reconciliáveis.
3. Separação de competência, vencimento e liquidação.
4. Transferências internas não são receitas ou despesas.
5. Não contabilizar duas vezes parcelas, faturas, liquidações ou importações.
6. Isolamento entre organizações e autorização verificada no servidor.
7. Histórico de estornos, auditoria e proteção contra concorrência.
8. Nenhuma integração declarada funcional sem testes reais.
9. Segurança, privacidade e modularidade desde o início.
10. Funcionalidades entregues apenas com testes e critérios de aceite.

## Primeira entrega (MVP)

- Autenticação e isolamento de dados
- Contas, categorias e lançamentos financeiros
- Receitas, despesas e transferências
- Cartões e compras parceladas
- Dashboard e relatórios essenciais
- Regras de acesso, trilha de auditoria e testes do núcleo financeiro

## Módulos planejados

| Área | Exemplos |
| --- | --- |
| Finanças pessoais | orçamento, contas, cartões, metas, dívidas |
| Gestão empresarial | centros de custo, clientes, fornecedores, projetos, DRE gerencial |
| Planejamento | fluxo de caixa, cenários, previsões, alertas |
| Patrimônio | bens, passivos, investimentos e rentabilidade |
| Colaboração | organizações, papéis, permissões, presença e edição em tempo real |
| Integrações | importação CSV/OFX/XLSX; bancos/Open Finance e Pix via parceiros habilitados |
| Inteligência | categorização assistida, relatórios explicáveis, detecção de anomalias |

## Documentação

- [Requisitos de produto](docs/REQUISITOS.md)
- [Arquitetura proposta e escolhas em aberto](docs/ARQUITETURA.md)
- [Invariantes do núcleo financeiro](docs/REGRAS_FINANCEIRAS.md)
- [Plano de desenvolvimento](docs/ROADMAP.md)
- [Plano de testes](docs/TESTES.md)

## Tecnologias

A stack definitiva está **em avaliação**. Nenhuma dependência deve ser escolhida apenas por conveniência: serão considerados precisão transacional, custo, segurança, facilidade de manutenção, colaboração e integração.

## Como iniciar

1. Revisar os requisitos e decisões de arquitetura.
2. Escolher stack após comparação formal de alternativas.
3. Implementar o núcleo financeiro e seus testes primeiro.
4. Entregar interfaces reais por incrementos, mantendo o sistema consistente.

## Segurança

Nunca versionar segredos, chaves privadas, senhas, tokens ou dados financeiros reais. Consulte [SECURITY.md](SECURITY.md).

## Situação do repositório

Este repositório começa com documentação e planejamento, **não com um aplicativo pronto**. O desenvolvimento será feito em etapas verificáveis.
