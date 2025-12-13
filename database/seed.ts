



import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DISC_PROMPT = `
Você é um professor do curso de Ciência da Computação de uma universidade de grande prestígio, e deve elaborar **questões discursivas** sobre o tema "<tema>", na(s) linguagem(ns) <linguagem>, especificamente sobre <subtopico>.

1. Pense em 15 questões desafiadoras, que estimulem:
   - o raciocínio crítico,
   - explicações conceituais,
   - análise de código,
   - refatoração ou comparação entre abordagens.

2. Em seguida, selecione as **5 questões mais interessantes e completas**.

3. Para cada uma das 5 questões selecionadas, forneça:
- Uma chave "content" contendo o enunciado da questão (em formato Markdown);
- Uma chave "evaluationCriteria" contendo uma lista de critérios de avaliação (de 3 a 5), cada um com:
  - "description": os criterios que serão avaliados, definidos abaixo.
  - "weight": um número natural,
  - "score": valor inicial determinado abaixo.

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

Exemplo de saída esperada (JSON):
{
  "questions": [
    {
      "content": "Explique a diferença entre variáveis declaradas com \`var\`, \`let\` e \`const\` em JavaScript. Apresente exemplos práticos de escopo, hoisting e reatribuição. Comente sobre boas práticas relacionadas ao uso de cada um.",
      "evaluationCriteria": [
        { "description": "Clareza na explicação das diferenças entre var, let e const", "weight": 1, "score": 0 },
        { "description": "Completude nos exemplos práticos sobre escopo e hoisting", "weight": 2, "score": 0 },
        { "description": "Precisão técnica sobre reatribiação e mutabilidade", "weight": 1, "score": 0 }
      ]
    }
  ]
}
`.trim();

const MCQ_PROMPT = `
Você é professor de Ciência da Computação em uma universidade de grande prestígio. Gere questões de MÚLTIPLA ESCOLHA sobre <tema> na linguagem <linguagem>, especificamente sobre <subtopico> (pode ser uma lista separada por vírgulas).

Requisitos:
- Pense em 15 questões variadas e selecione as 5 MAIS INTERESSANTES para a saída final.
- Cada questão deve ter EXATAMENTE 5 alternativas.
- Pode haver questões do tipo “itens I/II/III… verdadeiro ou falso” e alternativas do tipo “quais/quantas afirmativas são verdadeiras”, DESDE QUE haja apenas UMA alternativa correta.
- Inclua trechos de código quando fizer sentido, usando a linguagem <linguagem>.
- Todo o texto de "content" (enunciado) e das alternativas deve estar em **Markdown**.
- Para CADA alternativa, forneça um "feedback" breve explicando por que está correta ou incorreta.
- Indique a alternativa correta via "correctAnswerIndex" (inteiro de 0 a 4).
- Não repita perguntas; evite ambiguidade; varie o nível de dificuldade.
- Responda SOMENTE com JSON válido, sem comentários ou texto extra.

Esquema da saída:
{
  "questions": [
    {
      "content": "<enunciado em Markdown, podendo incluir bloco de código>",
      "alternatives": [
        { "content": "<texto em Markdown>", "feedback": "<por que certo/errado>" },
        { "content": "<...>", "feedback": "<...>" },
        { "content": "<...>", "feedback": "<...>" },
        { "content": "<...>", "feedback": "<...>" },
        { "content": "<...>", "feedback": "<...>" }
      ],
      "correctAnswerIndex": <0..4>
    }
  ]
}
`.trim();


const PARAMS_WEB = [
  { name: "linguagem", values: [{"name":"linguagem","values":["Typescript","Go","PHP"],"multipleSelect":true}] },
  { name: "subtopico", multiple: true, values: [{"name":"subtopico","values":["Desenvolvimento front-end","Desenvolvimento Backend","Observabilidade"],"multipleSelect":false}]},
];
const PARAMS_APLICACOES_DISPOSITIVOS_MOVEIS = [
  { name: "linguagem", multiple: true, values: [
  {
    "name": "subtopico",
    "values": [
      "Conceito de mobilidade",
      "Visão geral sobre dispositivos móveis",
      "Tecnologias e ferramentas para desenvolvimento de aplicações móveis",
      "Persistência e Comunicação de Dados",
      "Arquitetura J2ME: Configurations, CLDC e MIDP",
      "Recursos da linguagem: MIDLETS (aplicação / interface), GCF (comunicação), RMS (registro de dados)"
    ],
    "multipleSelect": true
  },
  {
    "name": "linguagem",
    "values": ["Kotlin", "Swift", "Dart (Flutter)", "TypeScript"],
    "multipleSelect": false
  }
] },
];
const PARAMS_POO = [
  { name: "linguagem", multiple: true, values: [
  {
    "name": "subtopico",
    "values": [
      "Conceitos de Orientação a Objetos",
      "Programação orientada a objetos: Implementação de classes, herança, polimorfismo, comunicação e associação",
      "Conceito de reuso",
      "Exemplos de implementação dos conceitos estudados em mais de uma linguagem orientada a objeto"
    ],
    "multipleSelect": true
  },
  {
    "name": "linguagem",
    "values": ["Java", "C#", "Python", "Golang", "JavaScript"],
    "multipleSelect": true
  }
]
}
];

const PARAMS_BD = [
  { name: "subtopico", values: [{"name":"subtopico","values":["SQL VS NoSQL","Transações","Técnicas de Bakcup e Recuperação"],
        "multipleSelect":false}]},
  { name: "linguagem", values:[{"name":"subtopico","values":["SQL VS NoSQL","Transações","Técnicas de Bakcup e Recuperação"],"multipleSelect":false},{"name":"linguagem","values":["PL/SQL","SQL"],"multipleSelect":true}]},
];

/** --------- TEMPLATES QUE SERÃO CRIADOS --------- **/
const templatesSeed = [
  // Discursivas
  {
    name: "Questões discursivas - Desenvolvimento WEB",
    promptTemplate: DISC_PROMPT,
    parameters: PARAMS_WEB,
  },
  {
    name: "Questões Discursivas - Aplicações para dispositivos móveis",
    promptTemplate: DISC_PROMPT,
    parameters: PARAMS_APLICACOES_DISPOSITIVOS_MOVEIS,
  },
  {
    name: "Questões Discursivas - Programação Orientada a Objetos",
    promptTemplate: DISC_PROMPT,
    parameters: PARAMS_POO,
  },

  // Múltipla escolha
  {
    name: "Questões de múltipla escolha - Banco de Dados",
    promptTemplate: MCQ_PROMPT,
    parameters: PARAMS_BD,
  },
  {
    name: "Questões de múltipla escolha - Aplicações para dispositivos móveis",
    promptTemplate: MCQ_PROMPT,
    parameters: PARAMS_APLICACOES_DISPOSITIVOS_MOVEIS,
  },
  {
    name: "Questões de múltipla escolha - Programação Orientada a Objetos",
    promptTemplate: MCQ_PROMPT,
    parameters: PARAMS_POO,
  },
];

/** --------- SEED --------- **/
async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "laisapereira@ufba.br" },
    update: {},
    create: {
      email: "laisapereira@ufba.br",
      name: "Laisa Pereira",
    },
  });

  for (const t of templatesSeed) {
    const existing = await prisma.questionRequestTemplate.findFirst({
      where: { name: t.name, ownerId: owner.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.questionRequestTemplate.update({
        where: { id: existing.id },
        data: {
          promptTemplate: t.promptTemplate,
          parameters: t.parameters as any, // Json[]
          ownerId: owner.id,
        },
      });
    } else {
      await prisma.questionRequestTemplate.create({
        data: {
          name: t.name,
          promptTemplate: t.promptTemplate,
          parameters: t.parameters as any, // Json[]
          ownerId: owner.id,
        },
      });
    }
  }

  console.log("✅ Templates de geração de questão seedados/atualizados.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
