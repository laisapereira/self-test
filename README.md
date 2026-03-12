
# SelfTest 

SelfTest é uma ferramenta que permite aos estudantes testar seus conhecimentos por meio de questões geradas por inteligência artificial.

### Stack

 - **Next.js 14+ (React, App Router)**

 - **Prisma ORM**

 - **PostgreSQL (localmente)**

 - **Node 18+ (recomendado 20+)**

### Pré-requisitos

Node 18+ e PNPM (ou NPM/Yarn)

Git e conta no GitHub

## Passos

### 1) Clone o repositório

```bash
git clone https://github.com/laisapereira/self-test.git
cd self-test
```
### 2) Instale as dependências
```bash
npm install
```

### 3) Configure o banco de dados 

Há um arquivo docker-compose.yaml para subir o banco postgres + pgadmin.

Adicione a URL no arquivo .env (renomeie o arquivo .env-example para .env.)

Substitua o valor de DATABASE_URL pela URL do banco, algo como:

```bash
DATABASE_URL="postgresql://usuario:senha@dominio:porta/dbname?sslmode=require"
```

Em seguida, rode:

```bash
docker compose up
```

###  4) Crie o banco e execute as migrações

Se for a primeira vez que você está rodando o projeto, execute a migração para criar o banco e as tabelas:

```bash

npx prisma migrate dev

```

### 4.1 ) Rode o seed para popular o banco

Se o projeto tiver dados iniciais para o banco, execute:

```bash 
npx prisma db seed
```

### 5) Configure suas credenciais Google + NextAuth

Dica: Setup Guide for NextAuth with Google and Credentials Providers in Next.js 13[https://karthickragavendran.medium.com/setup-guide-for-nextauth-with-google-and-credentials-providers-in-next-js-13-8f5f13414c1e]

Para obter sua credencial NextAuth, rode

```bash
npx auth secret
```
Ela aparecerá no seu .env.local

6) Inicie o projeto

Agora, basta rodar o servidor de desenvolvimento:

```bash 

npm run dev

```

A aplicação estará disponível em http://localhost:3000


## Arquivo .env-example

O arquivo .env-example contém as variáveis necessárias para rodar o projeto. Ele já está configurado com um exemplo de DATABASE_URL que você deve substituir pela URL do banco que você criou.

```bash 
DATABASE_URL="postgresql://usuario:senha@dominio:porta/dbname?sslmode=require"
```
