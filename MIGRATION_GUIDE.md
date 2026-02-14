# Migração: Desacoplamento de Temas e Tipos de Questão

## Resumo da Mudança

Esta migração separa o conceito de **Tema** (assunto/conteúdo) do **Tipo de Questão** (discursiva, múltipla escolha, ou ambas).

### Antes
- Templates misturavam tema + tipo de questão + parâmetros
- Para cada tema, era necessário criar templates separados para discursiva e múltipla escolha
- Duplicação de configuração

### Depois
- **Topics (Temas)**: Define o assunto e seus parâmetros específicos
- **PromptTemplates (Genéricos)**: 3 templates fixos (discursiva, múltipla escolha, ambas)
- **Fluxo do usuário**: Escolhe tema → tipo de questão → parâmetros → gera questões

---

## Passos para Migração

### 1. Rodar a migração do Prisma

```bash
npx prisma migrate dev --name separate_topic_from_template
```

### 2. Popular os PromptTemplates genéricos

```bash
npx ts-node database/seedPromptTemplates.ts
```

Isso criará 3 templates genéricos:
- Template Genérico - Discursiva
- Template Genérico - Múltipla Escolha
- Template Genérico - Ambas

### 3. Migrar templates existentes para Topics (opcional)

Se você tiver templates antigos, pode migrar manualmente:
1. Acesse `/topics/create`
2. Crie um novo Topic com:
   - Nome do tema (ex: "Programação Mobile")
   - Parâmetros (ex: linguagem, subtópico)
3. Os PromptTemplates genéricos já estarão disponíveis automaticamente

---

## Estrutura Atual

### Topics (Temas)
- **Campos:**
  - `name`: Nome do tema
  - `parameters`: Lista de parâmetros configuráveis (JSON)
  - `evaluationCriteria`: Critérios de avaliação pré-definidos (JSON, opcional)
  - `ownerId`: ID do usuário que criou o tema

### PromptTemplates (Genéricos)
- **Campos:**
  - `name`: Nome do template
  - `questionType`: "discursive", "multiple-choice" ou "both"
  - `promptTemplate`: Template do prompt com placeholders

### QuestionRequest
- **Campos atualizados:**
  - `topicId`: Referência ao tema (novo)
  - `templateId`: Referência ao template antigo (mantido para compatibilidade)
  - `questionType`: Tipo de questão escolhido pelo usuário
  - `parameterValues`: Valores dos parâmetros preenchidos
  - `generatedPrompt`: Prompt final gerado (opcional)

---

## Fluxo de Criação de Questões

### Para Administradores

1. **Criar Temas:**
   - Acesse `/topics/create`
   - Defina nome do tema (ex: "Estruturas de Dados")
   - Adicione parâmetros (ex: linguagem, subtópico, nível)
   - Salve

2. **PromptTemplates genéricos já existem:**
   - São criados automaticamente no seed
   - Não precisa criar novos (a menos que queira customizar)

### Para Usuários

1. Acesse `/questionRequests/create`
2. Selecione um **tema** (ex: "Programação Mobile")
3. Selecione o **tipo de questão** (discursiva, múltipla escolha, ou ambas)
4. Preencha os **parâmetros** do tema (ex: linguagem: JavaScript, subtópico: React Native)
5. Clique em "Gerar minhas questões"

O sistema:
- Busca o PromptTemplate genérico correto baseado no tipo
- Substitui `<tema>` e `<parametrosAdicionais>` no prompt
- Envia para a LLM
- Cria as questões no banco

---

## API Endpoints

### Topics
- `GET /api/topics` - Listar todos os temas
- `POST /api/topics` - Criar novo tema
- `GET /api/topics/[id]` - Buscar tema por ID
- `PUT /api/topics/[id]` - Atualizar tema
- `DELETE /api/topics/[id]` - Deletar tema

### PromptTemplates
- `GET /api/promptTemplates` - Listar todos os templates genéricos
- `GET /api/promptTemplates?questionType=discursive` - Filtrar por tipo
- `POST /api/promptTemplates` - Criar novo template (admin)
- `GET /api/promptTemplates/[id]` - Buscar template por ID
- `PUT /api/promptTemplates/[id]` - Atualizar template
- `DELETE /api/promptTemplates/[id]` - Deletar template

### QuestionRequests
- Agora aceita `topicId` ou `templateId` (compatibilidade)
- Requer `questionType` ("discursive", "multiple-choice", "both")

---

## Exemplo de Uso

### Criar um Topic via UI

1. Nome: "Algoritmos de Ordenação"
2. Parâmetros:
   - `linguagem` (valores: Python, Java, C++, JavaScript - seleção única)
   - `nivel` (valores: Básico, Intermediário, Avançado - seleção única)
   - `algoritmos` (valores: Bubble Sort, Quick Sort, Merge Sort - seleção múltipla)

### Gerar Questões

Usuário seleciona:
- Tema: "Algoritmos de Ordenação"
- Tipo: "Múltipla escolha"
- Parâmetros:
  - linguagem: Python
  - nivel: Intermediário
  - algoritmos: Quick Sort, Merge Sort

Sistema gera prompt:
```
Você é professor de Ciência da Computação... Gere questões de MÚLTIPLA ESCOLHA sobre "Algoritmos de Ordenação", linguagem: Python, nivel: Intermediário, algoritmos: Quick Sort, Merge Sort.
```

---

## Compatibilidade com Sistema Antigo

O sistema mantém compatibilidade com o modelo antigo:
- `QuestionRequestTemplate` ainda existe
- Se `templateId` for enviado, usa o fluxo antigo
- Se `topicId` for enviado, usa o novo fluxo

Isso permite migração gradual sem quebrar o sistema existente.

---

## Benefícios

✅ **Sem duplicação**: Um tema para múltiplos tipos de questão  
✅ **Flexibilidade**: Usuário escolhe o tipo na hora  
✅ **Manutenção simples**: Ajustar um tema afeta todos os tipos  
✅ **Escalável**: Fácil adicionar novos tipos de questão  
✅ **Templates genéricos reutilizáveis**: Menos configuração para admins

---

## Próximos Passos

1. Migrar templates antigos para Topics (se necessário)
2. Testar geração de questões com o novo fluxo
3. Ajustar PromptTemplates genéricos conforme feedback
4. Considerar remover `QuestionRequestTemplate` após confirmação de que tudo funciona
