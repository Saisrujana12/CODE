const supportedLanguages = [
  {
    id: "javascript",
    label: "JavaScript",
    badge: "JS",
    family: "Web",
    signals: [
      { regex: /\b(const|let|var|function|import|export|console\.log)\b/g, weight: 3 },
      { regex: /=>/g, weight: 2 },
      { regex: /\b(document|window|Promise)\b/g, weight: 1 }
    ]
  },
  {
    id: "typescript",
    label: "TypeScript",
    badge: "TS",
    family: "Web",
    signals: [
      { regex: /\b(interface|implements|readonly|enum)\b/g, weight: 3 },
      { regex: /:\s*(string|number|boolean|Record|Promise|Array)/g, weight: 3 },
      { regex: /\bas const\b/g, weight: 2 }
    ]
  },
  {
    id: "python",
    label: "Python",
    badge: "PY",
    family: "Scripting",
    signals: [
      { regex: /^\s*def\s+\w+/gm, weight: 4 },
      { regex: /\b(import|from|self|elif|None|True|False)\b/g, weight: 2 },
      { regex: /:\s*(#.*)?$/gm, weight: 1 }
    ]
  },
  {
    id: "java",
    label: "Java",
    badge: "JV",
    family: "JVM",
    signals: [
      { regex: /\bpublic\s+class\b/g, weight: 4 },
      { regex: /\bpublic\s+static\s+void\s+main\b/g, weight: 4 },
      { regex: /\bSystem\.out\.println\b/g, weight: 2 }
    ]
  },
  {
    id: "csharp",
    label: "C#",
    badge: "C#",
    family: ".NET",
    signals: [
      { regex: /\busing\s+System\b/g, weight: 4 },
      { regex: /\bnamespace\b/g, weight: 2 },
      { regex: /\bConsole\.WriteLine\b/g, weight: 3 }
    ]
  },
  {
    id: "c",
    label: "C",
    badge: "C",
    family: "Systems",
    signals: [
      { regex: /#include\s+<\w+\.h>/g, weight: 3 },
      { regex: /\b(printf|scanf|malloc|free)\b/g, weight: 2 }
    ]
  },
  {
    id: "cpp",
    label: "C++",
    badge: "C++",
    family: "Systems",
    signals: [
      { regex: /#include\s+<\w+>/g, weight: 2 },
      { regex: /\b(std::|cout|cin|vector<|string\b)/g, weight: 4 }
    ]
  },
  {
    id: "go",
    label: "Go",
    badge: "GO",
    family: "Backend",
    signals: [
      { regex: /\bpackage\s+main\b/g, weight: 4 },
      { regex: /\bfunc\s+\w+/g, weight: 3 },
      { regex: /\bfmt\.(Println|Printf)\b/g, weight: 2 }
    ]
  },
  {
    id: "rust",
    label: "Rust",
    badge: "RS",
    family: "Systems",
    signals: [
      { regex: /\bfn\s+\w+/g, weight: 3 },
      { regex: /\b(let\s+mut|println!|match|impl)\b/g, weight: 3 },
      { regex: /\bResult<|Option</g, weight: 2 }
    ]
  },
  {
    id: "php",
    label: "PHP",
    badge: "PHP",
    family: "Backend",
    signals: [
      { regex: /<\?php/g, weight: 4 },
      { regex: /\$\w+/g, weight: 2 },
      { regex: /\b(echo|namespace|use)\b/g, weight: 2 }
    ]
  },
  {
    id: "ruby",
    label: "Ruby",
    badge: "RB",
    family: "Backend",
    signals: [
      { regex: /^\s*def\s+\w+/gm, weight: 3 },
      { regex: /\b(end|puts|module|unless)\b/g, weight: 2 }
    ]
  },
  {
    id: "swift",
    label: "Swift",
    badge: "SW",
    family: "Mobile",
    signals: [
      { regex: /\bimport\s+(SwiftUI|Foundation|UIKit)\b/g, weight: 3 },
      { regex: /\b(struct|func|let|var)\b/g, weight: 1 },
      { regex: /\b@State\b/g, weight: 2 }
    ]
  },
  {
    id: "kotlin",
    label: "Kotlin",
    badge: "KT",
    family: "Mobile",
    signals: [
      { regex: /\bfun\s+\w+/g, weight: 3 },
      { regex: /\b(val|var|data class|when)\b/g, weight: 2 }
    ]
  },
  {
    id: "sql",
    label: "SQL",
    badge: "SQL",
    family: "Data",
    signals: [
      { regex: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|JOIN|WHERE)\b/gi, weight: 3 },
      { regex: /;\s*$/gm, weight: 1 }
    ]
  },
  {
    id: "html",
    label: "HTML",
    badge: "HTML",
    family: "Markup",
    signals: [
      { regex: /<!DOCTYPE html>|<html|<body|<div|<section|<\/\w+>/gi, weight: 3 }
    ]
  },
  {
    id: "css",
    label: "CSS",
    badge: "CSS",
    family: "Design",
    signals: [
      { regex: /[.#]?[a-z0-9_-]+\s*\{[^}]*\}/gim, weight: 3 },
      { regex: /\b(color|display|grid|flex|margin|padding)\s*:/g, weight: 2 }
    ]
  },
  {
    id: "json",
    label: "JSON",
    badge: "JSON",
    family: "Data",
    signals: [
      { regex: /^\s*[{[][\s\S]*[}\]]\s*$/g, weight: 2 },
      { regex: /"\w+"\s*:/g, weight: 2 }
    ]
  },
  {
    id: "yaml",
    label: "YAML",
    badge: "YAML",
    family: "Config",
    signals: [
      { regex: /^\s*\w[\w-]*:\s.+$/gm, weight: 2 },
      { regex: /^\s*-\s+\w+/gm, weight: 1 }
    ]
  },
  {
    id: "bash",
    label: "Bash",
    badge: "SH",
    family: "Ops",
    signals: [
      { regex: /^#!\/bin\/(bash|sh)/gm, weight: 4 },
      { regex: /\b(fi|then|echo|grep|awk|sed)\b/g, weight: 2 },
      { regex: /\$\d/g, weight: 2 }
    ]
  }
];

const unknownLanguage = {
  id: "unknown",
  label: "Auto detect",
  badge: "AI",
  family: "Mixed"
};

const resetRegex = (regex) => {
  regex.lastIndex = 0;
};

export const listSupportedLanguages = () =>
  supportedLanguages.map(({ signals, ...language }) => language);

export const getLanguageById = (languageId) =>
  supportedLanguages.find((language) => language.id === languageId) || null;

export const detectLanguage = (code, preferredLanguage = "auto") => {
  if (preferredLanguage && preferredLanguage !== "auto") {
    const preferred = getLanguageById(preferredLanguage);
    if (preferred) {
      return { ...preferred, confidence: 0.99 };
    }
  }

  const sample = code.slice(0, 8000);
  const scores = supportedLanguages.map((language) => {
    let score = 0;

    for (const signal of language.signals) {
      resetRegex(signal.regex);
      const matchCount = [...sample.matchAll(signal.regex)].length;
      score += matchCount * signal.weight;
    }

    return { language, score };
  });

  scores.sort((left, right) => right.score - left.score);

  const [best, second] = scores;

  if (!best || best.score < 2) {
    return { ...unknownLanguage, confidence: 0.3 };
  }

  const runnerUp = second?.score || 0;
  const confidence = Math.max(0.45, Math.min(0.97, 0.55 + (best.score - runnerUp) / Math.max(best.score, 1)));

  return {
    ...best.language,
    confidence: Number(confidence.toFixed(2))
  };
};
