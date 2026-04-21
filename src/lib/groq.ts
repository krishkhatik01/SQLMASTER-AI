const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export async function callGroq(
  systemPrompt: string,
  userMessage: string,
  temperature: number = 0.3
) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "API call failed");
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";
  
  try {
    const cleaned = content.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { raw: content };
  }
}

export async function generateSQL({
  input, schema, dbType, 
  includeExplanation, addComments, complexity
}: {
  input: string;
  schema: string;
  dbType: string;
  includeExplanation: boolean;
  addComments: boolean;
  complexity: string;
}) {
  const schemaContext = schema 
    ? `Database Schema:\n${schema}\n\n` : "";
    
  const system = `You are an expert SQL developer.
Generate ${dbType} SQL queries from plain English.
Rules:
- Valid ${dbType} syntax only
- Optimize for performance  
- Handle NULLs properly
${addComments ? "- Add inline SQL comments" : ""}
${schema ? "- Use ONLY provided schema tables/columns" : ""}

Respond ONLY in JSON (no markdown):
{
  "sql": "complete SQL query string WITHOUT ANY markdown formatting inside the string",
  "explanation": "${includeExplanation ? 'plain English explanation' : ''}",
  "complexity": "Simple|Medium|Complex",
  "tablesUsed": ["table1"],
  "operations": ["SELECT", "JOIN"]
}`;

  return callGroq(system, 
    `${schemaContext}Generate ${complexity} ${dbType} query:\n"${input}"`,
    0.1
  );
}
