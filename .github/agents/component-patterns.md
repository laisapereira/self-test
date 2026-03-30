---
name: component-patterns
description: >
  Padrões de criação e organização de componentes React no projeto SelfTest.
  Use esta skill ao criar novos componentes, refatorar existentes, decidir onde
  colocar lógica, como nomear arquivos e como estruturar props.
---

# SelfTest — Padrões de Componentes

## Stack

- React 18 + TypeScript
- Tailwind CSS para estilo
- shadcn/ui para componentes base (Dialog, Select, Tooltip, etc.)
- Zod + React Hook Form para formulários

---

## Estrutura de pastas

```
src/
  components/
    ui/              ← componentes genéricos reutilizáveis (sem lógica de domínio)
      Button.tsx
      Badge.tsx
      TableSkeleton.tsx
      CodeBlock.tsx
      EmptyState.tsx
      ErrorMessage.tsx
    questions/       ← componentes específicos de questões
      QuestionCard.tsx
      QuestionFeedback.tsx
      AlternativesList.tsx
      CriteriaTable.tsx
    users/
      UserTable.tsx
      UserBadge.tsx
    templates/
      TemplateCard.tsx
  pages/             ← apenas composição, sem lógica pesada
    QuestionsPage.tsx
    UsersPage.tsx
```

---

## Anatomia de um componente

```tsx
// components/questions/QuestionCard.tsx

import { CodeBlock } from "@/components/ui/CodeBlock";
import { CriteriaTable } from "./CriteriaTable";
import type { Question } from "@/types/question";

interface QuestionCardProps {
  question: Question;
  index: number;
}

export function QuestionCard({ question, index }: QuestionCardProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* enunciado */}
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
          Questão {index + 1}
        </p>
        <QuestionBody content={question.content} />
      </div>
      {/* resposta + feedback */}
      <div className="px-5 py-4">
        <QuestionFeedback feedback={question.feedback} />
      </div>
    </div>
  );
}
```

**Regras:**

- Um componente por arquivo
- Nome do arquivo = nome do componente (PascalCase)
- Props sempre tipadas com `interface`, nunca `type Props = any`
- Nunca passar mais de 6 props — se precisar de mais, agrupe em um objeto

---

## Componente CodeBlock (obrigatório para código)

```tsx
// components/ui/CodeBlock.tsx
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = "java" }: CodeBlockProps) {
  return (
    <div className="rounded-lg overflow-hidden my-3 text-sm">
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          fontSize: "0.8125rem",
          lineHeight: "1.6",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
```

Usar sempre que houver bloco de código — no enunciado, na resposta ou no feedback.

---

## Componente QuestionBody — detecta código automaticamente

````tsx
// Detecta blocos ```java ... ``` no markdown e renderiza com CodeBlock
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "@/components/ui/CodeBlock";

export function QuestionBody({ content }: { content: string }) {
  return (
    <ReactMarkdown
      className="text-sm text-gray-800 leading-relaxed"
      components={{
        code({ node, inline, className, children, ...props }) {
          const language =
            /language-(\w+)/.exec(className || "")?.[1] ?? "java";
          return inline ? (
            <code className="font-mono text-sm bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">
              {children}
            </code>
          ) : (
            <CodeBlock code={String(children)} language={language} />
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
````

---

## Componente AlternativesList

```tsx
interface Alternative {
  letra: string;
  texto: string;
  correta: boolean;
  selecionada: boolean;
  explicacao?: string;
}

export function AlternativesList({
  alternatives,
}: {
  alternatives: Alternative[];
}) {
  return (
    <div className="space-y-2 mt-3">
      {alternatives.map((alt) => (
        <div key={alt.letra}>
          <div
            className={`flex gap-3 px-4 py-3 rounded-lg border text-sm ${
              alt.correta
                ? "border-green-200 bg-green-50 text-green-800"
                : alt.selecionada
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-gray-100 bg-white text-gray-600"
            }`}
          >
            <span className="font-medium w-4 shrink-0">{alt.letra}.</span>
            <span>{alt.texto}</span>
          </div>
          {alt.explicacao && (
            <p
              className={`text-xs mt-1 px-4 ${
                alt.correta
                  ? "text-green-600"
                  : alt.selecionada
                    ? "text-red-500"
                    : "text-gray-400"
              }`}
            >
              {alt.explicacao}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Skeleton de carregamento

```tsx
// components/ui/TableSkeleton.tsx
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
```

Usar sempre em lugar de spinners soltos.

---

## Estado vazio (EmptyState)

```tsx
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
```

---

## Formulários com React Hook Form + Zod

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["ADMIN", "MASTER"]),
});

type FormData = z.infer<typeof schema>;

export function NewUserForm({
  onSubmit,
}: {
  onSubmit: (data: FormData) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          E-mail
        </label>
        <input
          {...register("email")}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.email && (
          <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Salvar
      </button>
    </form>
  );
}
```

---

## Regras gerais

| Regra                                   | Detalhe                                        |
| --------------------------------------- | ---------------------------------------------- |
| Componente = responsabilidade única     | `QuestionCard` não busca dados — só exibe      |
| Lógica de negócio fora do JSX           | Extrair para hooks ou utils                    |
| Nunca `useEffect` para derivar estado   | Usar `useMemo` ou calcular inline              |
| Nunca manipular DOM diretamente         | Sem `document.querySelector`                   |
| Exports nomeados sempre                 | Sem `export default` em componentes de domínio |
| Código nos componentes deve ser legível | Sem ternário aninhado com mais de 2 níveis     |

---

## Dependências necessárias

```bash
npm install react-syntax-highlighter react-markdown remark-gfm
npm install react-hook-form @hookform/resolvers zod
npm install -D @types/react-syntax-highlighter
```
