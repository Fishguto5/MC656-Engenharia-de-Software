# MC656: Engenharia de Software

## Integrantes do grupo (Nome - RA)

1. Gustavo Fernandes de Carvalho - 20585
2. Guilherme Henrique da Silva - 281217
3. Felipe Costa Silva - 204706
4. João Pedro Melo Campos - 237668
5. Vitor de Mello Pfeiffer - 281393

## Tema do Projeto

# Next.js

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Acesso administrativo

Configure `ADMIN_SESSION_SECRET` no ambiente do servidor com uma string aleatória de pelo menos 32 caracteres, além das variáveis `NEXT_PUBLIC_FIREBASE_*` já usadas pelo projeto. Cadastre administradores na coleção Firestore `users`, usando o CPF sem pontuação como ID do documento e `isAdmin: true` como campo booleano.

Acesse `/admin/login` e informe o CPF cadastrado. O painel fica em `/admin`; as páginas de gerenciamento exigem uma sessão assinada e consultam novamente a permissão no Firestore. A sessão expira após oito horas. O botão **Sair** encerra a sessão.

Um administrador autenticado pode acessar `/admin/cadastrar` para registrar outro CPF como administrador. O servidor grava `isAdmin: true` em `users/{CPF}`; se o documento já existir, os demais campos são preservados.

Para habilitar essa gravação localmente, gere uma chave privada em **Firebase Console → Configurações do projeto → Contas de serviço**, salve o JSON fora do repositório e adicione ao `.env` uma linha `GOOGLE_APPLICATION_CREDENTIALS=/caminho/absoluto/para/a-chave.json`. Reinicie o servidor de desenvolvimento após alterar o `.env`. No ambiente de implantação, configure uma conta de serviço com acesso ao mesmo projeto Firestore. As regras do Firestore devem impedir que clientes gravem diretamente na coleção `users`.

O mecanismo atual identifica a pessoa apenas pelo CPF. Como CPF pode ser conhecido por terceiros, é necessário acrescentar um segundo fator de autenticação e regras de segurança do Firestore antes de tratar esse fluxo como proteção de dados ou de operações em produção.

## Apuração e publicação

Ao criar uma eleição, informe data e horário de início e término. A votação pelo aplicativo é aceita somente dentro desse intervalo, com verificação pelo servidor. Depois do término, o administrador consulta a apuração em `/eleicao/{id}/resultados` a partir da lista `/eleicao` e autoriza a publicação. A publicação usa o SDK comum do Firestore e grava um documento consolidado em `eleicoes/{id}/resultados/consolidado`, além de `publishedAllow: true` e `resultsPublishedAt` na eleição, sem alterar os contadores de votos. A publicação pelo aplicativo é permitida uma única vez. Usuários consultam os resultados publicados em `/resultados`. Se `publishedAllow: true` for colocado manualmente no documento de uma eleição encerrada, a consulta pública calcula o resultado diretamente dos votos, mesmo sem o documento consolidado. Para ocultar novamente uma eleição, use `publishedAllow: false`.

A publicação e o registro de votos não precisam de `GOOGLE_APPLICATION_CREDENTIALS`. Para permitir leituras e gravações sem autenticação do Firebase neste protótipo, copie o conteúdo de [`firestore.rules`](firestore.rules) para **Firebase Console → Firestore Database → Regras** e clique em **Publicar**. O arquivo local por si só não altera as regras do banco remoto. O cadastro de novos administradores ainda usa o Firebase Admin SDK e exige as credenciais de servidor descritas acima.

## Histórico administrativo das eleições

Na lista `/eleicao`, o link **Relatório e histórico** abre `/eleicao/{id}/relatorio`. O relatório mostra os dados básicos da eleição e as ações de criação, edição, encerramento e publicação, com responsável e horário de Brasília. Cada ação fica em `eleicoes/{id}/historicoAdministrativo/{evento}` com apenas `action`, `actor` e `occurredAt`; não são gravados dados de votos nesse histórico. O responsável por ações manuais é o CPF da sessão administrativa, obtido pelo servidor. O encerramento é registrado como ação do **Sistema**, com o horário configurado para o fim da eleição, na primeira consulta administrativa após esse horário. Eleições anteriores à implantação do histórico não têm eventos retroativos de criação ou edição.

O histórico oferece rastreabilidade no aplicativo, mas as regras temporárias abaixo permitem alterar ou apagar seus registros diretamente no Firestore. Para uma auditoria resistente a adulterações, será necessário restringir as regras e usar autenticação e gravações confiáveis no servidor.

## Segundo turno presidencial

Após o encerramento da primeira votação presidencial, a apuração em `/eleicao/{id}/resultados` apresenta **Criar votação de segundo turno** quando nenhum candidato obteve mais da metade dos votos válidos. O administrador configura início, término e confirma os dois candidatos mais votados. O servidor valida novamente a apuração e cria a votação com `turno: 2` e `originalElectionId`; a eleição original recebe `secondRoundElectionId`. Só é permitido um segundo turno por eleição original. Se houver empate na segunda colocação, a criação fica bloqueada até que exista uma regra para definir os habilitados.

Os documentos da segunda votação têm contadores próprios, todos iniciados em zero. Depois do encerramento, o administrador publica o resultado final pelo mesmo botão de publicação. A lista de resultados identifica cada turno; o resultado do segundo mostra apenas os votos registrados nele. A criação também aparece no histórico administrativo das duas eleições.

As regras temporárias permitem que qualquer pessoa na Internet leia, altere e exclua **qualquer documento**, inclusive votos, usuários administradores e a marca de publicação. O login por CPF limita apenas as telas do aplicativo; não limita o acesso direto ao Firestore. Use esta configuração somente no protótipo e substitua-a por Firebase Authentication e regras restritivas antes de expor dados reais.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.