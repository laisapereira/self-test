# SelfTest — Instruções para o GitHub Copilot

## O que é este projeto

SelfTest é uma plataforma web para geração e resolução de questões de estudo com IA.
Professores criam templates de prompts, alunos respondem questões geradas automaticamente
e recebem feedback detalhado com critérios de avaliação.

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Estilo**: Tailwind CSS + shadcn/ui
- **Estado servidor**: React Query (`@tanstack/react-query`)
- **Formulários**: React Hook Form + Zod
- **Código highlight**: react-syntax-highlighter (tema oneDark)
- **Markdown**: react-markdown + remark-gfm

## Skills disponíveis — leia antes de agir

| Arquivo | Quando usar |
|---------|-------------|
| `.github/skills/design-system.md` | Qualquer componente visual, layout, cor, espaçamento |
| `.github/skills/api-conventions.md` | Chamadas à API, hooks, services, tratamento de erro |
| `.github/skills/component-patterns.md` | Criar ou refatorar componentes React |

**Sempre leia a skill relevante antes de escrever código.**

## Domínio principal

- `QuestionRequest` — solicitação de geração de questões (tem status: pendente, gerado, cancelado)
- `Question` — questão individual com enunciado, alternativas ou campo aberto, critérios e feedback
- `Template` — template de prompt que define como as questões são geradas
- `User` — usuário do sistema com papel ADMIN ou MASTER

## Convenções de código

- TypeScript estrito — sem `any`
- Componentes com exports nomeados (`export function X`, não `export default`)
- Hooks customizados em `src/hooks/`
- Serviços de API em `src/services/`
- Tipos em `src/types/`
- Nunca fazer fetch direto dentro de componente — sempre via hook

## O que NÃO fazer

- Não usar `useEffect` para buscar dados — usar `useQuery`
- Não hardcodar URLs de API — usar `import.meta.env.VITE_API_URL`
- Não criar componentes com mais de 200 linhas — dividir em subcomponentes
- Não usar `p-8` ou `rounded-2xl` em cards — seguir design-system.md
- Não deixar código sem syntax highlight — usar `CodeBlock` de component-patterns.md
- Não misturar enunciado e resposta sem separação visual — ver design-system.md