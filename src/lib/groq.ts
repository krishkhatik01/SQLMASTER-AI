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
    
  const system = `You are an expert ${dbType} query generator.
Generate production-ready ${dbType} SQL queries from plain English.

OPTIMIZATION RULES — follow ALL strictly:

1. Window Functions:
   - NEVER repeat the same window function more than once
   - Store LAG(), LEAD(), RANK() results in a SEPARATE CTE
   - Always use nested CTEs for window function results

2. NULL Handling:
   - Always handle NULL values explicitly
   - Use CASE WHEN col IS NULL THEN 'N/A' (or appropriate default)
   - First month in LAG() will always be NULL — handle it

3. Division by Zero:
   - Always use NULLIF(denominator, 0) to prevent errors
   - Example: value / NULLIF(prev_value, 0)

4. GROUP BY Rules:
   - NEVER use column aliases in GROUP BY
   - Always use the FULL expression
   - BAD:  GROUP BY sale_month
   - GOOD: GROUP BY DATE_FORMAT(sale_date, '%Y-%m')

5. Recursive CTE Rules:
   - Always use a SINGLE CTE instead of multiple recursive CTEs
   - Always add cycle detection
   - Always add depth/level limit (e.g., level < 10)
   - NEVER write dead code (e.g., WHERE level < 0)

6. Query Structure Order:
   - CTEs first (WITH ... AS)
   - Window functions in a separate CTE
   - Final SELECT must be clean and readable
   - Always include ORDER BY

7. Production-Ready Code:
   - ${addComments ? "Add a comment above every major step (CTE, subquery, final SELECT)" : "Keep query clean without comments"}
   - Handle ALL edge cases
   - Never write dead code
   - Keep queries under 30 lines when possible

Additional Rules:
- Valid ${dbType} syntax ONLY
- Optimize for performance
${schema ? "- Use ONLY the provided schema tables and columns" : ""}

Respond ONLY in valid JSON (no markdown wrapping):
{
  "sql": "the complete SQL query as a plain string — NO markdown formatting inside",
  "explanation": "${includeExplanation ? "plain English explanation of what the query does and why each optimization was applied" : ""}",
  "complexity": "Simple|Medium|Complex",
  "tablesUsed": ["table1"],
  "operations": ["SELECT", "JOIN", "CTE"],
  "sampleOutput": "a markdown table showing 3-5 rows of expected sample output"
}`;

  return callGroq(system, 
    `${schemaContext}Generate a ${complexity} ${dbType} query:\n"${input}"`,
    0.1
  );
}
