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
