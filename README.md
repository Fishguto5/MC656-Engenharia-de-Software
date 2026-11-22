# Urna Eletrônica — MC656 Engenharia de Software

## Integrantes do grupo (nome — RA)

1. Gustavo Fernandes de Carvalho — 205854
2. Guilherme Henrique da Silva — 281217
3. Felipe Costa Silva — 204706
4. João Pedro Melo Campos — 237668
5. Vitor de Mello Pfeiffer — 281393

## Sobre o projeto

Aplicação web de votação desenvolvida para a disciplina MC656. O objetivo é reunir em um único sistema a criação e o acompanhamento de eleições e consultas públicas, a identificação do eleitor, o registro de votos e a visualização de resultados conforme as regras de divulgação de cada votação.

O eleitor informa CPF, nome e UF do domicílio eleitoral, visualiza as votações disponíveis para a UF escolhida e acessa as votações abertas. Consultas públicas podem divulgar contagens parciais durante a votação quando essa opção estiver autorizada. Resultados de eleições encerradas aparecem após a publicação pelo fluxo administrativo. A área administrativa permite gerenciar eleições e executar as operações de publicação e auditoria previstas no projeto.

## Tecnologias utilizadas

| Área | Tecnologias e uso |
| --- | --- |
| Interface | Next.js, React, TypeScript e Tailwind CSS; estilos adicionais em CSS Modules. |
| Backend | Typecsript. |
| Banco de dados | Cloud Firestore, acessado pelo SDK do Firebase; Firebase Admin SDK em operações do servidor. |
| Testes | Vitest, Testing Library, jsdom e cobertura V8. O projeto também inclui Stryker para testes de mutação. |
| Qualidade e automação | ESLint e GitHub Actions para análise estática, testes com cobertura e build. |

## Requisitos mínimos

- Node.js **24.13.0** e npm compatível.
- Acesso a um projeto Firebase com Cloud Firestore configurado e às respectivas configurações da aplicação web.

## Instalação e inicialização

1. Na raiz do repositório, instale as dependências registradas no lockfile:

   ```bash
   npm ci
   ```

2. Crie um arquivo `.env.local` na raiz do projeto e substitua os valores de exemplo pelos dados do seu Firebase:

   ```dotenv
   NEXT_PUBLIC_FIREBASE_API_KEY=sua_chave_do_firebase
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=seu_measurement_id
   ADMIN_SESSION_SECRET=substitua_por_um_segredo_aleatorio_com_pelo_menos_32_caracteres
   ```

   Gere o valor de `ADMIN_SESSION_SECRET` com `openssl rand -hex 32`. Ele assina e valida o cookie da sessão administrativa, que dura até oito horas. Sem esse segredo, o login administrativo não funciona; trocá-lo invalida as sessões existentes. O fluxo do eleitor comum não usa essa variável. Após, a criação da credencial insira a mesma dentro do `.env.local`.

3. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

4. Abra [http://localhost:3000](http://localhost:3000). A página inicial direciona para `/sign-up`; a entrada administrativa fica em `/admin/login`.

Para verificar a versão de produção localmente, execute `npm run build` e depois `npm run start`.

## Como rodar os testes

Execute os comandos na raiz do projeto, após `npm ci`:

```bash
npm run test:run       # executa a suíte uma vez
npm run test:coverage  # executa a suíte e gera cobertura em coverage/
npm run lint           # verifica a análise estática
```

`npm test` inicia o Vitest em modo de observação para desenvolvimento. `npm run mutation` executa os testes de mutação com Stryker; essa etapa não faz parte do workflow de CI atual.

## Integração e entrega contínuas

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda no GitHub Actions em `push` para `main` e `develop` e em pull requests destinados a `main`, `develop` ou `release/**`. Ele usa Ubuntu e Node.js 24.13.0, instala as dependências com `npm ci` e executa três jobs independentes:

1. **Análise estática:** `npm run lint`.
2. **Testes automatizados:** `npm run test:coverage`, com envio do relatório de cobertura como artefato retido por sete dias.
3. **Build:** `npm run build`.
