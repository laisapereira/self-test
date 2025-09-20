
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

Crie um banco PostgreSQL no Railway

Copie a URL de conexão do banco fornecida pelo Railway.

Adicione a URL no arquivo .env:

Renomeie o arquivo .env-example para .env.

Substitua o valor de DATABASE_URL pela URL do banco.

Exemplo:

```bash
DATABASE_URL="postgresql://usuario:senha@dominio:porta/dbname?sslmode=require"
```

###  4) Crie o banco e execute as migrações

Se for a primeira vez que você está rodando o projeto, execute a migração para criar o banco e as tabelas:

```bash

npx prisma migrate dev

```

### 5) Rode o seed para popular o banco

Se o projeto tiver dados iniciais para o banco, execute:

```bash 
npx prisma db seed
```

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

#### Observações

Banco no Railway: Lembre-se de configurar o sslmode=require na URL do banco, como mostrado no exemplo, caso o Railway esteja usando TLS.

Migrações Prisma: Se houver alterações no schema, use npx prisma migrate dev para aplicar as migrações.
