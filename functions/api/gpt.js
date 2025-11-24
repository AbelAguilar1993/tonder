/**
 * GPT API Handler
 * Handles AI-powered cover letter generation using OpenAI GPT API
 */

import { createResponse } from "../utils/cors.js";

// System prompt for cover letter generation (English; forces Spanish output)
const SYSTEM_PROMPT = `You are an expert assistant that writes SHORT, UNIQUE Spanish cover letters for job applicants in Latin America. 

Output policy: 
- Language: Spanish only. 
- Address the recruiter by name if provided; otherwise "Estimado/a Responsable de RR. HH." 
- Base the letter strictly on provided candidate data (experience, skills, strengths) and company/role; do not invent facts. 
- Keep it brief: max 2 short paragraphs, total ≤ 10 lines. No bullet points, no lists, no emojis. 
- Vary style, word choice, and sentence flow so NO two letters look the same, even for similar inputs. Do not use fixed templates. 
- Formality: use "usted" by default; use "tú" only if explicitly requested. 
- If a LinkedIn or CV link is provided, add exactly one final line: "Puede revisar mi perfil aquí: <link>". 
- Always end with ONE short opt-out sentence in Spanish (see OPT-OUT VARIATION BANK below). 
- If the candidate's name is provided, add a professional signature at the very end in Spanish format: "Saludos cordiales," or "Un saludo," or similar variations, followed by the candidate's name on a new line.
- Do not include the bank, rules, or any metadata in the final letter. 

Uniqueness controls: 
- If "style_variant" (1–5) is provided, subtly reflect it in cadence and phrasing. 
- OPT-OUT selection MUST vary deterministically using the following method unless "opt_out_variant" is explicitly provided: 
  1) Let N = number of lines in the OPT-OUT VARIATION BANK (N=12). 
  2) Compute L = len(<Company>) + len(<Role>) + len(<Recruiter or empty>). 
  3) Let S = <opt_out_seed> if provided (integer), else 0. 
  4) Index = ((L + S) mod N) + 1. 
  5) Select that line from the bank and then paraphrase it lightly (10–20%) while preserving meaning and the chosen formality. 
- If "opt_out_variant" (1..N) is provided, use that bank line index (still paraphrase lightly). 

OPT-OUT VARIATION BANK (N=12): 
1) Si no es usted la persona indicada, le agradecería canalizar mi solicitud con el área correspondiente. 
2) En caso de no ser el contacto adecuado, ¿sería tan amable de redirigir este mensaje al responsable? 
3) Si este mensaje no corresponde a su área, agradecería su apoyo para derivarlo al equipo correcto. 
4) Si no gestiona este proceso, le pido por favor orientarme con el contacto pertinente. 
5) Si no es el canal apropiado, agradeceré cualquier indicación para contactar a la persona responsable. 
6) Si no es usted quien coordina estas vacantes, agradecería remitir mi postulación al equipo adecuado. 
7) En caso de no llevar este proceso, le agradecería ayudarme a encaminar el mensaje al área de RR. HH. 
8) Si no corresponde a su función, muchas gracias por indicar el contacto correcto. 
9) Si no es el contacto indicado, le agradecería derivar esta solicitud al responsable del proceso. 
10) Si esta consulta no cae bajo su gestión, agradeceré su apoyo para direccionarla correctamente. 
11) Si no es usted la persona encargada, le pido por favor redirigir mi mensaje al área pertinente. 
12) Si no es el área adecuada, agradecería orientarme con el responsable correspondiente. 

Output format:
Return your response as a JSON object with exactly two fields:
{
  "subject": "<concise, professional email subject line in Spanish (max 60 characters) that references the role and/or company>",
  "body": "<the full cover letter in plain Spanish text>"
}

The subject line should be unique, professional, and vary in style. Do NOT use a fixed template like "Role — Company (City)". Instead, vary the format and wording to make each subject line unique and engaging. Examples of varied styles:
- "Solicitud: [Role] en [Company]"
- "Postulación para [Role]"
- "Interés en [Role] — [Company]"
- "[Role]: Candidato disponible"
- "Aplicación a [Role] ([City])"
And many other creative variations.`;

// Opt-out variation bank
const OPT_OUT_VARIATIONS = [
  "Si no es usted la persona indicada, le agradecería canalizar mi solicitud con el área correspondiente.",
  "En caso de no ser el contacto adecuado, ¿sería tan amable de redirigir este mensaje al responsable?",
  "Si este mensaje no corresponde a su área, agradecería su apoyo para derivarlo al equipo correcto.",
  "Si no gestiona este proceso, le pido por favor orientarme con el contacto pertinente.",
  "Si no es el canal apropiado, agradeceré cualquier indicación para contactar a la persona responsable.",
  "Si no es usted quien coordina estas vacantes, agradecería remitir mi postulación al equipo adecuado.",
  "En caso de no llevar este proceso, le agradecería ayudarme a encaminar el mensaje al área de RR. HH.",
  "Si no corresponde a su función, muchas gracias por indicar el contacto correcto.",
  "Si no es el contacto indicado, le agradecería derivar esta solicitud al responsable del proceso.",
  "Si esta consulta no cae bajo su gestión, agradeceré su apoyo para direccionarla correctamente.",
  "Si no es usted la persona encargada, le pido por favor redirigir mi mensaje al área pertinente.",
  "Si no es el área adecuada, agradecería orientarme con el responsable correspondiente.",
];

/**
 * Generate a deterministic opt-out variation
 */
function generateOptOutVariation(
  company,
  role,
  recruiter,
  optOutSeed = 0,
  optOutVariant = null,
) {
  const N = OPT_OUT_VARIATIONS.length;

  if (optOutVariant !== null && optOutVariant >= 1 && optOutVariant <= N) {
    // Use explicit variant
    return OPT_OUT_VARIATIONS[optOutVariant - 1];
  }

  // Calculate deterministic variant
  const L =
    (company?.length || 0) + (role?.length || 0) + (recruiter?.length || 0);
  const index = (L + optOutSeed) % N;
  return OPT_OUT_VARIATIONS[index];
}

/**
 * Generate user prompt from template data
 */
function generateUserPrompt(data) {
  const {
    company,
    role,
    recruiter,
    formality = "usted",
    styleVariant,
    linkedin,
    optOutSeed,
    optOutVariant,
    candidateData,
    userName,
  } = data;

  const optOut = generateOptOutVariation(
    company,
    role,
    recruiter,
    optOutSeed,
    optOutVariant,
  );

  let prompt = `Company: ${company}\nRole: ${role}\n`;

  if (recruiter) {
    prompt += `Recruiter: ${recruiter}\n`;
  }

  prompt += `Formality: ${formality}\n`;

  if (styleVariant) {
    prompt += `Style variant: ${styleVariant}\n`;
  }

  if (linkedin) {
    prompt += `LinkedIn: ${linkedin}\n`;
  }

  if (userName) {
    prompt += `Candidate name: ${userName}\n`;
  }

  if (optOutSeed !== undefined) {
    prompt += `opt_out_seed: ${optOutSeed}\n`;
  }

  if (optOutVariant !== undefined) {
    prompt += `opt_out_variant: ${optOutVariant}\n`;
  }

  prompt += `\nCandidate data:\n`;
  candidateData.forEach((item) => {
    prompt += `- ${item}\n`;
  });

  return prompt;
}

/**
 * Handle GPT cover letter generation
 */
export async function handleGptRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Test endpoint
    if (path === "/api/gpt/test" && request.method === "GET") {
      return createResponse({
        success: true,
        message: "GPT API is working",
        timestamp: new Date().toISOString(),
      });
    }

    // Cover letter generation endpoint
    if (path === "/api/gpt/cover-letter" && request.method === "POST") {
      const data = await request.json();

      // Validate required fields
      if (!data.company || !data.role || !data.candidateData) {
        return createResponse(
          { error: "Missing required fields: company, role, candidateData" },
          400,
        );
      }

      // Check if OpenAI API key is configured
      if (!env.OPENAI_API_KEY) {
        return createResponse({ error: "OpenAI API key not configured" }, 500);
      }

      // Generate user prompt
      const userPrompt = generateUserPrompt(data);

      // Call OpenAI API
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini", // Using gpt-4o-mini as recommended (gpt-5-mini not available yet)
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.8,
            top_p: 0.9,
            max_tokens: 250,
            stream: false,
          }),
        },
      );

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        return createResponse(
          {
            error: "OpenAI API error",
            details: errorData,
            status: openaiResponse.status,
          },
          500,
        );
      }

      const openaiData = await openaiResponse.json();

      const rawContent = openaiData.choices[0]?.message?.content;
      const role = openaiData.choices[0]?.message?.role;

      if (!rawContent) {
        return createResponse({ error: "No cover letter generated" }, 500);
      }

      // Parse the JSON response from GPT
      let subject = "";
      let coverLetter = "";

      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(rawContent);
        subject = parsed.subject || "";
        coverLetter = parsed.body || "";
      } catch (parseError) {
        // If JSON parsing fails, treat the entire content as the cover letter body
        // and generate a fallback subject
        console.warn("GPT response is not valid JSON, using fallback subject");
        coverLetter = rawContent;
        const jobRole = data.role || "la posición";
        const companyName = data.company || "la empresa";
        subject = `Solicitud: ${jobRole} en ${companyName}`;
      }

      return createResponse({
        success: true,
        subject,
        coverLetter,
        role,
        usage: openaiData.usage,
        model: openaiData.model,
      });
    }

    return createResponse({ error: "GPT endpoint not found" }, 404);
  } catch (error) {
    console.error("GPT API error:", error);
    return createResponse(
      {
        error: "Internal server error",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
}
