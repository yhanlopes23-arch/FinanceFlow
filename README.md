# FinanceFlow

Aplicativo de controle financeiro com interface **Glassy** (cartões translúcidos, tema escuro, gradientes e layout responsivo).

## MVP implementado — modo local

Acesse `index.html` a partir de um servidor HTTP local ou publique o diretório em uma hospedagem estática HTTPS (por exemplo, GitHub Pages). Como a aplicação usa módulos ES, **não** abra via `file://`.

### Funcionalidades disponíveis

- Dashboard de saldos consolidados, receitas e despesas liquidadas e pendências.
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

O CSV é **somente exportação**, não importação. O registro de estorno é um indicador vinculado ao evento, ainda não um razão contábil imutável em partidas dobradas. Não há edição direta de lançamentos: para corrigir valor já gravado, estorne e registre novamente. Não há cartões, parcelas, recorrências, anexos, notificações, multiempresa nem integração bancária nesta entrega. Métricas resumem todo o histórico liquidado, enquanto o gráfico e resultado mensal respeitam o mês selecionado. As funcionalidades posteriores de autenticação e colaboração exigem API, banco transacional e autorização no servidor.

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
