import { config } from "../config.js";

const extractOutputText = (payload) => {
  if (payload.output_text) {
    return payload.output_text;
  }

  const content = payload.output
    ?.flatMap((item) => item.content || [])
    ?.filter((item) => item.type === "output_text")
    ?.map((item) => item.text)
    ?.join("\n");

  return content || "";
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

export const generateAiReview = async ({
  code,
  language,
  reviewMode,
  focusAreas,
  memoryMatches,
  baseline
}) => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.openAiModel,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are a senior AI code reviewer. Return JSON only. Keep the same top-level keys as the provided starter object. Strengthen the reasoning, keep arrays concise, and focus on actionable suggestions."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Language: ${language}`,
                `Review mode: ${reviewMode}`,
                `Focus areas: ${focusAreas.join(", ") || "general quality"}`,
                `Past memory matches: ${JSON.stringify(memoryMatches.slice(0, 3))}`,
                `Starter object: ${JSON.stringify(baseline)}`,
                "Review this code and improve the starter object where needed:",
                code
              ].join("\n\n")
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_object"
        }
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${message}`);
  }

  const payload = await response.json();
  const parsed = safeJsonParse(extractOutputText(payload));

  if (!parsed || typeof parsed !== "object") {
    throw new Error("OpenAI response did not contain valid JSON output.");
  }

  return parsed;
};
