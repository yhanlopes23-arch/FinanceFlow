# FinanceFlow

Aplicativo de controle financeiro com interface **Glassy** (cartões translúcidos, tema escuro, gradientes e layout responsivo).

## MVP implementado — modo local

Acesse `index.html` a partir de um servidor HTTP local ou publique o diretório em uma hospedagem estática HTTPS (por exemplo, GitHub Pages). Como a aplicação usa módulos ES, **não** abra via `file://`.

### Funcionalidades disponíveis

- Dashboard com saldo efetivo, receitas e despesas previstas (liquidadas + pendentes), valores realizados, resultado do mês e saldo projetado.
- Contas com saldo inicial e cálculo de saldo derivado dos lançamentos.
- Lançamentos de receitas, despesas e transferências entre contas.
- Separação de liquidações e pendências, com ação de liquidar.
- Estorno auditável, sem apagar a operação original.
- Dinheiro representado em **centavos inteiros** e formato brasileiro.
- Histórico de lançamentos, pesquisa, filtros por tipo e situação.
- Despesas por categoria e resultado financeiro do mês.
- Orçamentos mensais por categoria e barras de progresso.
- Persistência `localStorage`; exportação CSV e backup/restauração JSON.
- Limpeza local com confirmação, histórico de auditoria no navegador.
- Interface com contraste, estados vazios, navegação por teclado e suporte a movimento reduzido.
- Testes de domínio e GitHub Actions com Node.js 24.

### Execução

Com Python 3 disponível:

```bash
python -m http.server 8000
```

Abra `http://localhost:8000`.

Para testar as regras financeiras (Node.js 24):

```bash
node --test tests/*.test.mjs
node --check src/core.mjs
node --check src/app.mjs
```

### Limitações e segurança

**Atenção:** Este é um MVP **local, não uma aplicação bancária**, e não deve ser utilizado para dados sensíveis ou escrituração oficial. O `localStorage` **não tem autenticação, segregação de usuários, criptografia de dados em repouso, controle de acesso no servidor, sincronização, backup automático nem transações de banco de dados**. Não abra em computadores compartilhados. Exporte cópias de segurança regularmente. Um backup JSON é um arquivo não criptografado.

O CSV é **somente exportação**, não importação. O registro de estorno é um indicador vinculado ao evento, ainda não um razão contábil imutável em partidas dobradas. Lançamentos não estornados podem ser editados diretamente, e as diferenças são registradas na auditoria local. O histórico não é imutável nem adequado para escrituração oficial. Não há cartões, parcelas, recorrências, anexos, notificações, multiempresa nem integração bancária nesta entrega. Métricas resumem todo o histórico liquidado, enquanto o gráfico e resultado mensal respeitam o mês selecionado. As funcionalidades posteriores de autenticação e colaboração exigem API, banco transacional e autorização no servidor.

## Histórico do projeto e documentação

- [Requisitos completos](docs/REQUISITOS.md)
- [Arquitetura e decisões pendentes](docs/ARQUITETURA.md)
- [Invariantes financeiras](docs/REGRAS_FINANCEIRAS.md)
- [Roadmap](docs/ROADMAP.md)
- [Plano de testes](docs/TESTES.md)
- [Política de segurança](SECURITY.md)

O objetivo é evoluir para autenticação real, controles de isolamento por organização, razão financeiro reconciliável, importações validadas, cartões, relatórios e integrações — sem declarar módulos futuros como concluídos.

## Publicação no Cloudflare

O arquivo `wrangler.toml` aponta para `[assets] directory = "./public"`. Por isso, **tudo que aparecer no site hospedado deve existir dentro de `public/`**. Os arquivos `index.html`, `styles.css` e `src/` na raiz também permanecem como fonte de desenvolvimento.

Para publicar manualmente com o Wrangler, autentique-se no Cloudflare e, na raiz do repositório, execute:

```bash
npx wrangler deploy
```

O Worker continua identificado como `controle-financeiro-360` no `wrangler.toml` para **não trocar o endereço de produção inadvertidamente**. Renomear o projeto no GitHub não renomeia o Worker da Cloudflare.

**Importante:** o workflow `.github/workflows/check.yml` apenas valida os testes e a sintaxe; ele **não implanta** o aplicativo. Se não houver uma integração de publicação automática já configurada no painel Cloudflare, é necessário fazer o deploy manualmente ou configurar um pipeline com credenciais protegidas. Não há garantia de publicação ao executar apenas os testes.

## Navegação por abas e previsões (novembro de 2026)

A tela inicial é o **Dashboard**. As outras áreas (**Vencimentos, Movimentações, Contas, Metas, Orçamentos, Relatórios, Cartões e Dados**) aparecem em **abas distintas**, via navegação lateral no desktop ou barra inferior no celular; somente a aba selecionada fica visível.

O seletor de mês no cabeçalho controla os indicadores mensais. Os cartões mostram:

- **Receitas previstas** = receitas efetivamente recebidas + receitas pendentes no mês.
- **Despesas previstas** = despesas efetivamente pagas + despesas pendentes no mês.
- **Resultado previsto** = receitas previstas − despesas previstas; o resultado efetivo também aparece separadamente.
- **Saldo disponível (efetivo)** = soma dos saldos das contas com operações liquidadas.
- **Saldo projetado** = saldo disponível atual + receitas ainda pendentes − despesas ainda pendentes **com data até o fim do mês selecionado**, incluindo obrigações atrasadas.
- O gráfico de despesas por categoria apresenta **despesas previstas** (liquidadas + pendentes), enquanto os orçamentos permanecem comparados aos **gastos liquidados**.
- A aba **Vencimentos** lista receitas a receber e despesas a pagar, ordenadas por data; os botões Pagar e Receber liquidam a operação e mudam automaticamente a composição dos cartões, sem contabilizar o valor duas vezes.

A data de um lançamento pendente funciona como sua data prevista. A versão atual ainda não registra uma segunda data independente para liquidação: ao liquidar, a data original continua associada ao lançamento. O saldo projetado é uma **simulação**, não dinheiro disponível nem previsão garantida. Transferências internas e operações estornadas não afetam receita/despesa nos indicadores.

### Verificação automática

`node --test tests/*.test.mjs` inclui testes de projeção, prevenção de duplicidade após liquidar, navegação por abas, indicadores necessários e sincronização dos arquivos da raiz com `public/`.

## Categorização inteligente sugestiva (local)

Ao registrar uma receita ou despesa, digite uma **descrição**. O FinanceFlow sugere até três categorias disponíveis no cadastro, combinando:

- Palavras-chave de estabelecimentos, despesas e receitas comuns (por exemplo, supermercado, farmácia, combustível, Spotify, aluguel e salário).
- Descrições idênticas ou muito semelhantes que você **já classificou** nos seus lançamentos anteriores, respeitando o tipo (receita/despesa).
- Uma indicação heurística de confiança e a origem da sugestão.

**A sugestão nunca substitui a escolha do usuário automaticamente.** Toque na opção desejada ou selecione uma categoria manualmente. Quando não houver correspondência confiável, o aplicativo não inventa uma classificação. As categorias padrão incluem Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Assinaturas, Compras, Serviços, Impostos e taxas, Salário, Vendas, Rendimentos e Outros. Categorias novas são disponibilizadas também a quem já usa o armazenamento local.

**Privacidade:** nenhum texto financeiro é enviado a uma API de IA, banco externo ou serviço de terceiros. O mecanismo atual é de regras e aproveitamento do histórico **no próprio navegador**, não um modelo de IA generativa ou uma integração bancária. O histórico pode conter erros: confira a sugestão antes de salvá-la.

### Semântica da data

- **Receita**: recebimento efetivo, quando marcada como liquidada, ou data prevista de recebimento, quando pendente.
- **Despesa**: vencimento — o último dia para pagar sem atraso. Atraso começa **no dia seguinte** ao vencimento se continuar pendente.
- **Transferência**: data da transferência, sem impacto nas receitas ou despesas do painel.

No MVP, um lançamento pendente marcado como recebido/pago mantém a data originalmente cadastrada; ainda não há um segundo campo independente de data real de liquidação. Para manter relatórios precisos, confira esse comportamento ao liquidar recebimentos fora da previsão.


## Edição de lançamentos e vencimentos

Nas abas **Movimentações** e **Vencimentos**, selecione **Editar** para abrir o lançamento com dados já preenchidos. É possível corrigir tipo, descrição, valor, data, situação, categoria e contas. Ao salvar, o mesmo identificador é preservado e os indicadores, saldos e previsões são recalculados sem duplicar valores. A auditoria local mantém os valores anteriores e posteriores, com controle de revisão para evitar sobrescrita de formulários desatualizados. Lançamentos estornados não podem ser editados.

## Dashboard visual e sugestão de quitação proporcional

O dashboard usa o tema Glassy da referência: cartões azul-marinho translúcidos, verde para receitas, rosa para despesas, gráfico circular, atalhos, próximos vencimentos, contas, metas e navegação inferior no celular. **Todos os valores vêm dos dados locais; não há números fictícios.**

Na aba **Vencimentos**, o cartão **Sugestão de quitação inteligente** usa o saldo efetivo da conta selecionada nesta ordem:

1. **Reservar as despesas em dia** — considere as despesas pendentes da conta escolhida, com vencimento hoje ou no futuro. A reserva utiliza o saldo em aberto (descontando pagamentos parciais já registrados). Inclui também os vencimentos de meses posteriores. Trata-se de **reserva virtual**: nenhum pagamento antecipado é registrado.
2. **Calcular a sobra segura** — saldo disponível da conta menos o total das despesas em dia. O sistema jamais sugere usar nas atrasadas um valor necessário para proteger as despesas em dia. Se não houver saldo suficiente, informa o déficit e não sugere quitação de atrasadas. Receitas futuras pendentes não aumentam o saldo disponível.
3. **Priorizar quitações integrais** — entre todas as despesas vencidas ainda pendentes (vencimento anterior ao dia atual), a sugestão quita integralmente o máximo possível, começando pelas dívidas com menor saldo em aberto, com desempate por data de vencimento.
4. **Ratear a sobra** — após as quitações integrais, qualquer recurso ainda disponível é distribuído proporcionalmente ao valor em aberto das demais dívidas atrasadas, em centavos inteiros, usando os maiores restos para o arredondamento.
5. **Conferir e registrar** — o campo de valor máximo vem preenchido com a sobra segura, mas pode ser reduzido. O botão **Registrar quitação sugerida** pede confirmação e grava apenas os pagamentos de despesas vencidas. A reserva das despesas em dia permanece uma simulação e não altera lançamentos.

Os valores informados são calculados sobre a **conta bancária selecionada**. Despesas futuras vinculadas a outra conta não comprometem automaticamente o saldo desta. O sistema não presume transferências entre contas nem efetiva pagamentos externos.

Um pagamento parcial reduz imediatamente o saldo da conta pagadora e diminui o valor pendente da despesa original, mantendo a obrigação aberta até a quitação total. O valor já pago entra no realizado, e o valor restante permanece na previsão, sem contagem duplicada. O histórico de pagamentos fica dentro do lançamento para exportação JSON e a operação é documentada na auditoria local. Se o valor disponível for insuficiente para distribuir um centavo a cada despesa, algumas podem receber R$ 0,00 nessa sugestão, pois a menor unidade monetária é um centavo.

**Importante:** não há integração com credores ou bancos. Confirme por conta própria se pagamentos parciais são aceitos e como juros, multas, encargos e acordos serão tratados. O cálculo usa somente o principal cadastrado no FinanceFlow e não substitui orientação financeira ou jurídica.


## Publicar a interface atualizada — Glassy V3

**Compilação/testes não publicam o site.** A publicação é feita pelo workflow `.github/workflows/deploy.yml` (**Publicar FinanceFlow no Cloudflare**) em cada push na `main`, ou manualmente na aba Actions. Esse workflow executa testes, confere que os arquivos da raiz e de `public/` são idênticos, verifica as credenciais e só então executa `wrangler deploy`.

**Configuração necessária uma única vez:** no GitHub abra **Settings → Secrets and variables → Actions**, e crie dois *repository secrets*:
- `CLOUDFLARE_API_TOKEN`: token de API com permissões para publicar Workers na conta.
- `CLOUDFLARE_ACCOUNT_ID`: ID da conta Cloudflare onde está o Worker.

Depois abra **Actions → Publicar FinanceFlow no Cloudflare → Run workflow**, se necessário. Se as credenciais estiverem ausentes, o workflow **falhará com uma mensagem explícita**, evitando confundir testes bem-sucedidos com publicação. O nome do Worker continua `controle-financeiro-360`, conforme `wrangler.toml`, para manter o destino de produção.

**Como reconhecer a versão correta:** o HTML contém `data-layout="financeflow-glassy-v3"`, o rodapé exibe `Interface 2026.11` e o deploy Cloudflare envia o cabeçalho HTTP `X-FinanceFlow-Layout: glassy-v3`. O `public/_headers` solicita revalidação de HTML, CSS e JavaScript, e o HTML usa URLs de assets versionadas, reduzindo problemas de cache.

**Se você estiver usando o Preview do Google AI Studio ou outro ambiente independente:** ele não lê automaticamente os arquivos deste repositório. Abra o **endereço do Worker realmente publicado** após o deploy ou configure o outro ambiente para carregar esse código. Uma atualização de GitHub não altera uma cópia independente em um Preview.


## Reprodução da imagem de referência — Reference V4

A tela **Início** foi reconstruída para corresponder à organização do print de referência: barra de marca FinanceFlow com sino e avatar genérico (sem fotografia pessoal inventada), saudação, saldo total com curva verde, três cartões (receitas do mês, despesas do mês, economia), gráfico de categorias ao lado de quatro atalhos, dois próximos vencimentos, contas bancárias e uma meta destacados lado a lado no celular, e menu inferior de cinco ícones com segunda linha de abas. Uma paisagem SVG local foi adicionada ao cartão de metas.

O dashboard usa **exclusivamente dados cadastrados no próprio aplicativo**. Os valores fictícios da imagem de referência (saldo, bancos, faturas e metas) não são adicionados aos dados. Os totais de receitas e despesas exibidos nas três caixas incluem os lançamentos pendentes; a separação entre previsto e efetivo continua disponível nos **Relatórios** (onde também está o seletor do mês de referência).

A **Sugestão de quitação inteligente** permanece funcional, mas foi deslocada para **Vencimentos**, pois não está na imagem solicitada. As demais abas não foram removidas.

Arquivos desta versão: `index.html`, `dashboard-v4.css`, `assets/goal-mountain.svg`, `src/app.mjs`, com espelhos idênticos na pasta `public/` de publicação. O workflow de deploy verifica essa correspondência antes do Wrangler.

**Atenção:** commitar no GitHub não publica o site automaticamente se `CLOUDFLARE_API_TOKEN` ou `CLOUDFLARE_ACCOUNT_ID` estiverem ausentes. Verifique a execução **Publicar FinanceFlow no Cloudflare** em GitHub Actions antes de esperar que um Preview externo ou o Worker mostre o novo layout. O Preview do Google AI Studio, se estiver sendo usado, é uma aplicação independente.
