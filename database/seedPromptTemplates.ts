import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DISCURSIVE_PROMPT = `
Você é um professor do curso de Ciência da Computação de uma universidade de grande prestígio, e deve elaborar **questões discursivas** sobre o tema "<tema>", <parametrosAdicionais>.

1. Pense em 15 questões desafiadoras, que estimulem:
   - o raciocínio crítico,
   - explicações conceituais,
   - análise de código,
   - refatoração ou comparação entre abordagens.

2. Em seguida, selecione as **5 questões mais interessantes e completas**.

3. Para cada uma das 5 questões selecionadas, forneça:
- Uma chave "content" contendo o enunciado da questão (em formato Markdown);
- Uma chave "evaluationCriteria" contendo uma lista de critérios de avaliação (de 3 a 5), cada um com:
  - "description": os critérios que serão avaliados, definidos abaixo.
  - "weight": um número natural,
  - "score": valor inicial 0.

Os critérios são: clareza, completude, precisão técnica, lógica/coesão. Os respectivos pesos são: 1, 2, 1, 2

Assim, critérios utilizados e seus respectivos pesos devem ser sempre baseados em:
[
  { "criterio": "clareza", "peso": 1 },
  { "criterio": "completude", "peso": 2 },
  { "criterio": "precisao tecnica", "peso": 1 },
  { "criterio": "logica/coesao", "peso": 2 }
]

* NÃO INVENTE NOVOS CRITÉRIOS
* NÃO ALTERE ESSES CRITÉRIOS. VOCÊ UTILIZARÁ ESSES QUE ESTÃO DEFINIDOS ACIMA

Responda SOMENTE com JSON válido no formato:
{
  "questions": [
    {
      "content": "Enunciado da questão em Markdown",
      "evaluationCriteria": [
        { "description": "Clareza...", "weight": 1, "score": 0 },
        { "description": "Completude...", "weight": 2, "score": 0 },
        { "description": "Precisão técnica...", "weight": 1, "score": 0 },
        { "description": "Lógica/Coesão...", "weight": 2, "score": 0 }
      ]
    }
  ]
}
`.trim();

const MULTIPLE_CHOICE_PROMPT = `
Você é professor de Ciência da Computação em uma universidade de grande prestígio. Gere questões de MÚLTIPLA ESCOLHA sobre "<tema>", <parametrosAdicionais>.

Requisitos:
- Pense em 15 questões variadas e selecione as 5 MAIS INTERESSANTES para a saída final.
- Cada questão deve ter EXATAMENTE 5 alternativas.
- Pode haver questões do tipo "itens I/II/III… verdadeiro ou falso" e alternativas do tipo "quais/quantas afirmativas são verdadeiras", DESDE QUE haja apenas UMA alternativa correta.
- Inclua trechos de código quando fizer sentido.
- Todo o texto de "content" (enunciado) e das alternativas deve estar em **Markdown**.
- Para CADA alternativa, forneça um "feedback" breve explicando por que está correta ou incorreta.
- Indique a alternativa correta via "correctAnswerIndex" (inteiro de 0 a 4).
- Não repita perguntas; evite ambiguidade; varie o nível de dificuldade.
- Responda SOMENTE com JSON válido, sem comentários ou texto extra.

Esquema da saída:
{
  "questions": [
    {
      "content": "Enunciado em Markdown, podendo incluir bloco de código",
      "alternatives": [
        { "content": "Alternativa em Markdown", "feedback": "Por que certo/errado" },
        { "content": "...", "feedback": "..." },
        { "content": "...", "feedback": "..." },
        { "content": "...", "feedback": "..." },
        { "content": "...", "feedback": "..." }
      ],
      "correctAnswerIndex": 0
    }
  ]
}
`.trim();

const BOTH_PROMPT = `
Você é professor de Ciência da Computação em uma universidade de grande prestígio. Gere questões DISCURSIVAS E DE MÚLTIPLA ESCOLHA sobre "<tema>", <parametrosAdicionais>.

Requisitos:
- Gere 3 questões DISCURSIVAS e 2 questões de MÚLTIPLA ESCOLHA.
- Para questões discursivas, siga as instruções de critérios de avaliação (clareza, completude, precisão técnica, lógica/coesão com pesos 1, 2, 1, 2).
- Para questões de múltipla escolha, cada questão deve ter EXATAMENTE 5 alternativas, com feedback para cada uma.
- Responda SOMENTE com JSON válido.

Esquema da saída:
{
  "questions": [
    {
      "type": "discursive",
      "content": "Enunciado em Markdown",
      "evaluationCriteria": [
        { "description": "Clareza...", "weight": 1, "score": 0 },
        { "description": "Completude...", "weight": 2, "score": 0 },
        { "description": "Precisão técnica...", "weight": 1, "score": 0 },
        { "description": "Lógica/Coesão...", "weight": 2, "score": 0 }
      ]
    },
    {
      "type": "multiple-choice",
      "content": "Enunciado em Markdown",
      "alternatives": [
        { "content": "Alternativa", "feedback": "Feedback" },
        { "content": "...", "feedback": "..." },
        { "content": "...", "feedback": "..." },
        { "content": "...", "feedback": "..." },
        { "content": "...", "feedback": "..." }
      ],
      "correctAnswerIndex": 0
    }
  ]
}
`.trim();

async function seedPromptTemplates() {
  console.log("Seeding Prompt Templates...");

  // Verificar se já existem
  const existing = await prisma.promptTemplate.findMany();
  if (existing.length > 0) {
    console.log("Prompt Templates já existem. Pulando seed.");
    return;
  }

  await prisma.promptTemplate.createMany({
    data: [
      {
        name: "Template Genérico - Discursiva",
        questionType: "discursive",
        promptTemplate: DISCURSIVE_PROMPT,
      },
      {
        name: "Template Genérico - Múltipla Escolha",
        questionType: "multiple-choice",
        promptTemplate: MULTIPLE_CHOICE_PROMPT,
      },
      {
        name: "Template Genérico - Ambas",
        questionType: "both",
        promptTemplate: BOTH_PROMPT,
      },
    ],
  });

  console.log("✅ Prompt Templates criados com sucesso!");
}

seedPromptTemplates()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
