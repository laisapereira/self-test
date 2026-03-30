---
name: selftest-design-system
description: >
  Design system e padrões de UI do projeto SelfTest. Use esta skill sempre que
  for criar, editar ou refatorar qualquer componente visual: páginas, tabelas,
  cards, questões, feedback de respostas, blocos de código, formulários e navegação.
---

# SelfTest — Design System

## Stack
- React (Next.js ou Vite)
- Tailwind CSS
- shadcn/ui como base de componentes
- `shiki` ou `react-syntax-highlighter` para blocos de código

---

## Princípios gerais

- **Densidade moderada**: padding interno de cards deve ser `p-4` ou `p-5`, nunca `p-8` ou mais. Evitar espaçamentos excessivos que deixam o layout "cru" e vazio.
- **Hierarquia visual clara**: título > subtítulo > corpo > metadado. Nunca usar o mesmo tamanho e peso para elementos de hierarquias diferentes.
- **Distinção enunciado vs resposta**: sempre diferenciar visualmente o enunciado da questão, a resposta do aluno e o feedback do modelo.
- **Código sempre destacado**: qualquer trecho de código — no enunciado, na resposta ou no feedback — deve usar um componente de syntax highlight, nunca texto corrido ou `<pre>` sem estilo.

---

## Tokens

```css
/* Cores principais */
--color-primary:     #2563eb;   /* azul — ações, links, botões primários */
--color-primary-hover: #1d4ed8;
--color-success:     #16a34a;   /* verde — resposta correta, ativo */
--color-danger:      #dc2626;   /* vermelho — resposta incorreta, erro */
--color-warning:     #d97706;   /* âmbar — cancelado, atenção */
--color-neutral:     #6b7280;   /* cinza — metadados, textos secundários */

/* Superfícies */
--bg-page:           #f9fafb;   /* fundo da página */
--bg-card:           #ffffff;   /* cards e painéis */
--bg-enunciado:      #f8fafc;   /* fundo sutil do enunciado da questão */
--bg-code:           #1e1e2e;   /* fundo dark para blocos de código */

/* Bordas */
--border-default:    #e5e7eb;
--border-strong:     #d1d5db;
```

---

## Tipografia

| Elemento              | Classe Tailwind                          |
|-----------------------|------------------------------------------|
| Título de página      | `text-2xl font-semibold text-gray-900`   |
| Subtítulo / descrição | `text-sm text-gray-500`                  |
| Título de seção       | `text-lg font-semibold text-gray-800`    |
| Título de card        | `text-base font-semibold text-gray-800`  |
| Corpo de texto        | `text-sm text-gray-700 leading-relaxed`  |
| Metadado / label      | `text-xs text-gray-400`                  |
| Texto de código inline| `font-mono text-sm bg-gray-100 px-1 rounded` |

---

## Componentes

### Card base
```tsx
<div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
  {/* conteúdo */}
</div>
```
- Nunca usar `rounded-2xl` ou `p-8` em cards de conteúdo
- `shadow-sm` é o máximo permitido — sem `shadow-lg`

---

### Navbar
```tsx
<nav className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-8">
  <Logo />
  <NavLink>Gerar Questões</NavLink>
  {/* ... */}
</nav>
```
- Links: `text-sm text-gray-600 hover:text-gray-900 font-medium`
- Link ativo: `text-blue-600 font-medium`

---

### Tabela de dados
```tsx
<div className="overflow-hidden border border-gray-200 rounded-xl">
  <table className="w-full text-sm">
    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
      <tr>
        <th className="px-4 py-3 text-left font-medium">Nome</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-gray-800">...</td>
      </tr>
    </tbody>
  </table>
</div>
```
- Linhas com `py-3`, nunca `py-5`
- Cabeçalho sempre `bg-gray-50` com texto `text-xs uppercase`

---

### Badge / pill
```tsx
/* Admin */
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
  ADMIN
</span>

/* Master */
<span className="... bg-purple-100 text-purple-700">MASTER</span>

/* Ativo */
<span className="... bg-green-100 text-green-700">Ativo</span>

/* Cancelado */
<span className="... bg-gray-100 text-gray-500">Cancelado</span>

/* Incorreto */
<span className="... bg-red-100 text-red-600">Incorreto</span>
```

---

### Cards de métricas (stats)
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <p className="text-xs text-gray-500 mb-1">Total de Usuários</p>
    <p className="text-2xl font-semibold text-gray-900">4</p>
  </div>
</div>
```
- Nunca usar `rounded-2xl` ou padding maior que `p-5`

---

### Componente de Questão

Estrutura obrigatória — três zonas visuais distintas:

```tsx
<div className="border border-gray-200 rounded-xl overflow-hidden">

  {/* Zona 1 — Enunciado */}
  <div className="bg-gray-50 border-b border-gray-200 px-5 py-4">
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
      Questão {n}
    </p>
    <p className="text-sm text-gray-800 leading-relaxed">
      {enunciado}
    </p>
  </div>

  {/* Zona 2 — Resposta do aluno */}
  <div className="px-5 py-4 bg-white border-b border-gray-100">
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
      Sua resposta
    </p>
    <p className="text-sm text-gray-700">{resposta}</p>
  </div>

  {/* Zona 3 — Feedback */}
  <div className="px-5 py-4 bg-white">
    <FeedbackSection />
  </div>

</div>
```

---

### Código inline no enunciado
```tsx
<code className="font-mono text-sm bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">
  @Service
</code>
```

---

### Bloco de código (syntax highlight)

Usar `react-syntax-highlighter` com tema `oneDark`:

```tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

<div className="rounded-lg overflow-hidden text-sm my-3">
  <SyntaxHighlighter
    language="java"
    style={oneDark}
    customStyle={{ margin: 0, padding: '1rem', fontSize: '0.8125rem' }}
  >
    {code}
  </SyntaxHighlighter>
</div>
```

**Regras:**
- Todo `<pre>` ou bloco de código sem highlight deve ser substituído por este componente
- Detectar linguagem automaticamente quando possível (`java`, `javascript`, `typescript`, `python`)
- Nunca deixar código como texto corrido no enunciado ou feedback

---

### Feedback de questão (correto/incorreto)

```tsx
/* Status no topo */
<p className={`text-sm font-medium mb-3 ${
  correto ? 'text-green-600' : 'text-red-600'
}`}>
  {correto
    ? '✓ Resposta correta'
    : `✗ Resposta incorreta — nível de confiança: ${confianca}`
  }
</p>

/* Tabela de critérios */
<table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mb-4">
  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
    <tr>
      <th className="px-3 py-2 text-left">Critério</th>
      <th className="px-3 py-2 text-right w-16">Peso</th>
      <th className="px-3 py-2 text-right w-16">Nota</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-100">
    {criterios.map(c => (
      <tr key={c.id}>
        <td className="px-3 py-2 text-gray-700">{c.descricao}</td>
        <td className="px-3 py-2 text-right text-gray-500">{c.peso}</td>
        <td className="px-3 py-2 text-right font-medium text-gray-800">{c.nota}</td>
      </tr>
    ))}
  </tbody>
</table>

/* Feedback textual */
<div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
    Feedback do modelo
  </p>
  <p className="text-sm text-gray-700 leading-relaxed">{feedback}</p>
</div>
```

---

### Alternativas de múltipla escolha

```tsx
{alternativas.map(alt => (
  <div key={alt.letra} className={`flex gap-3 px-4 py-3 rounded-lg border text-sm mb-2 ${
    alt.correta
      ? 'border-green-200 bg-green-50 text-green-800'
      : alt.selecionada
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-gray-100 bg-white text-gray-600'
  }`}>
    <span className="font-medium w-4 shrink-0">{alt.letra}.</span>
    <span>{alt.texto}</span>
  </div>
))}
```
- Nunca usar vermelho/verde apenas em texto corrido — sempre com fundo colorido e borda
- Explicação de cada alternativa em `text-xs` logo abaixo, com a mesma cor da alternativa

---

### Botões

```tsx
/* Primário */
<button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
  + Novo Admin
</button>

/* Secundário / ghost */
<button className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
  Questões
</button>

/* Destrutivo */
<button className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
  Remover
</button>
```

---

### Paginação

```tsx
<div className="flex items-center gap-1 justify-center mt-6">
  <button className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
    ← Anterior
  </button>
  {pages.map(p => (
    <button key={p} className={`w-8 h-8 text-sm rounded-lg ${
      p === current
        ? 'bg-gray-900 text-white'
        : 'hover:bg-gray-100 text-gray-600'
    }`}>
      {p}
    </button>
  ))}
  <button className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
    Próximo →
  </button>
</div>
```

---

## Anti-padrões — nunca fazer

| ❌ Errado | ✅ Correto |
|-----------|-----------|
| `p-8` em cards de conteúdo | `p-4` ou `p-5` |
| `rounded-2xl` ou `rounded-3xl` | `rounded-xl` ou `rounded-lg` |
| Enunciado e resposta com mesmo estilo visual | Zonas separadas com fundo e borda distintos |
| `<pre>` sem highlight para código | `SyntaxHighlighter` com tema `oneDark` |
| Feedback como texto corrido sem destaque | Box `bg-gray-50` com label uppercase |
| Alternativas corretas/incorretas só por cor de texto | Fundo colorido + borda + texto colorido |
| `shadow-lg` em cards | `shadow-sm` no máximo |
| Texto de status (`Cancelado`, `Ativo`) sem badge | Sempre usar pill/badge |

---

## Dependências necessárias

```bash
npm install react-syntax-highlighter
npm install -D @types/react-syntax-highlighter
```

---

## Como usar esta skill

Ao receber qualquer tarefa de UI neste projeto, consulte este arquivo antes de escrever código. Siga os padrões exatos de classes, estrutura de componentes e hierarquia visual definidos aqui. Em caso de dúvida entre duas abordagens, prefira a mais densa e compacta.