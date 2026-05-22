import "dotenv/config";

const normalizeHost = (value) => {
  if (!value) {
    return "";
  }

  return value.startsWith("http://") || value.startsWith("https://")
    ? value.replace(/\/$/, "")
    : `https://${value.replace(/\/$/, "")}`;
};

const isPlaceholder = (value) => {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized.length < 10 ||
    normalized === "your_api_key" ||
    normalized === "your_chroma_api_key" ||
    normalized === "your_openai_api_key" ||
    normalized === "replace_me"
  );
};

export const config = {
  appName: "CodePulse AI",
  port: Number(process.env.PORT || 4000),
  openAiApiKey: process.env.OPENAI_API_KEY?.trim() || "",
  openAiModel: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
  chromaHost: normalizeHost(process.env.CHROMA_HOST?.trim() || ""),
  chromaApiKey: process.env.CHROMA_API_KEY?.trim() || "",
  chromaTenant: process.env.CHROMA_TENANT?.trim() || "",
  chromaDatabase: process.env.CHROMA_DATABASE?.trim() || "developement"
};

export const serviceFlags = {
  aiEnabled: !isPlaceholder(config.openAiApiKey),
  chromaEnabled:
    !isPlaceholder(config.chromaApiKey) &&
    Boolean(config.chromaHost) &&
    Boolean(config.chromaTenant) &&
    Boolean(config.chromaDatabase)
};

export const productFeatures = [
  {
    title: "Universal language reviews",
    detail: "Analyze JavaScript, Python, Java, C-family, Go, Rust, SQL, markup, and more from one workspace."
  },
  {
    title: "Advantage and drawback breakdown",
    detail: "Every review separates strengths, disadvantages, syntax notes, and prioritized improvement advice."
  },
  {
    title: "Chroma review memory",
    detail: "Save review context into Chroma and surface similar past snippets to keep guidance consistent."
  },
  {
    title: "Syntax spotlight",
    detail: "Flag risky lines, delimiter issues, branching pressure, and style drift before a human reviewer steps in."
  },
  {
    title: "Mode-based critique",
    detail: "Switch between mentor, strict, ship-ready, and interview-focused review modes."
  },
  {
    title: "Report export center",
    detail: "Download structured JSON or clean Markdown summaries for team handoff and release notes."
  }
];

export const extraStandoutFeatures = [
  "Focus toggles for security, performance, readability, architecture, and testing.",
  "Review history cards with score trend and risk labels.",
  "Similar-snippet memory retrieval powered by Chroma vectors.",
  "Syntax health metrics with complexity and maintainability scoring.",
  "Action roadmap that turns review findings into next-step tasks."
];
