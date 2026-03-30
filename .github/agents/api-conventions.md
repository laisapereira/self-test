---
name: api-conventions
description: >
  Padrões de comunicação com a API no projeto SelfTest. Use esta skill ao criar
  serviços, hooks, chamadas fetch/axios, tratamento de erros, loading states e
  qualquer integração entre frontend e backend.
---

# SelfTest — Convenções de API

## Stack
- React Query (`@tanstack/react-query`) para cache e estado de servidor
- Axios como cliente HTTP
- Zod para validação de resposta

---

## Estrutura de pastas

```
src/
  services/        ← funções puras que chamam a API (sem hooks)
    questions.ts
    users.ts
    templates.ts
  hooks/           ← useQuery / useMutation encapsulados
    useQuestions.ts
    useUsers.ts
  types/           ← interfaces e schemas Zod
    question.ts
    user.ts
```

---

## Padrão de service

```ts
// src/services/questions.ts
import api from '@/lib/axios'

export const questionsService = {
  list: (params?: { templateId?: string; page?: number }) =>
    api.get('/question-requests', { params }).then(r => r.data),

  getById: (id: string) =>
    api.get(`/question-requests/${id}`).then(r => r.data),

  cancel: (id: string) =>
    api.patch(`/question-requests/${id}/cancel`).then(r => r.data),
}
```

**Regras:**
- Services nunca lidam com estado React
- Sempre retornar `r.data`, não o response completo
- Nunca usar `any` — sempre tipar o retorno

---

## Padrão de hook

```ts
// src/hooks/useQuestions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { questionsService } from '@/services/questions'

export const QUESTIONS_KEY = ['questions'] as const

export function useQuestions(params?: { templateId?: string; page?: number }) {
  return useQuery({
    queryKey: [...QUESTIONS_KEY, params],
    queryFn: () => questionsService.list(params),
  })
}

export function useCancelQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => questionsService.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUESTIONS_KEY }),
  })
}
```

---

## Configuração do Axios

```ts
// src/lib/axios.ts
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
```

---

## Tratamento de loading e erro nos componentes

```tsx
const { data, isLoading, isError } = useQuestions()

if (isLoading) return <TableSkeleton rows={5} />
if (isError) return <ErrorMessage message="Não foi possível carregar as questões." />
```

- Nunca renderizar conteúdo parcial sem tratar loading
- Skeleton sempre preferível a spinner solto no meio da página
- Mensagem de erro sempre com texto descritivo, nunca só "Erro"

---

## Query keys — convenção

```ts
['questions']                          // lista geral
['questions', { templateId, page }]   // lista filtrada
['questions', id]                      // item único
['users']
['users', id]
['templates']
['templates', id]
```

---

## Paginação

A API retorna:
```ts
{
  data: T[]
  page: number
  totalPages: number
  total: number
}
```

No hook:
```ts
export function useQuestions(page = 1, templateId?: string) {
  return useQuery({
    queryKey: ['questions', { page, templateId }],
    queryFn: () => questionsService.list({ page, templateId }),
    placeholderData: keepPreviousData,
  })
}
```

---

## Anti-padrões — nunca fazer

| ❌ Errado | ✅ Correto |
|-----------|-----------|
| `fetch` direto no componente | Usar service + hook |
| `useState` + `useEffect` para dados do servidor | `useQuery` |
| `catch(console.log)` | Tratar erro e exibir feedback ao usuário |
| Hardcode de URL (`http://localhost:3000/...`) | `import.meta.env.VITE_API_URL` |
| Retornar `response` inteiro do axios | Retornar `response.data` |
| Query key como string literal repetida | Constante exportada `QUESTIONS_KEY` |