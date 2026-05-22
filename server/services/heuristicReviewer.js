import { getLanguageById } from "../constants/languages.js";

const HOTSPOT_RULES = [
  { pattern: /\beval\s*\(/g, label: "Dynamic execution", detail: "Runtime evaluation increases security and debugging risk.", type: "security", weight: 12 },
  { pattern: /\b(exec|system|spawn)\s*\(/g, label: "Shell execution", detail: "Spawning shell commands needs strict validation and isolation.", type: "security", weight: 12 },
  { pattern: /\binnerHTML\s*=/g, label: "Raw HTML injection", detail: "Direct HTML writes can create XSS exposure in web apps.", type: "security", weight: 11 },
  { pattern: /\bSELECT\s+\*/gi, label: "Broad SQL selection", detail: "Selecting every column can increase payload size and hide schema drift.", type: "performance", weight: 6 },
  { pattern: /\bconsole\.log\b|\bprint\s*\(/g, label: "Debug output", detail: "Shipping debug logs makes output noisy and can leak internals.", type: "readability", weight: 4 },
  { pattern: /\bTODO\b|\bFIXME\b/g, label: "Pending work marker", detail: "Open TODO markers usually signal incomplete logic or deferred cleanup.", type: "maintainability", weight: 3 },
  { pattern: /\bany\b/g, label: "Loose typing", detail: "Broad types reduce compiler help and make regressions easier to miss.", type: "readability", weight: 5 },
  { pattern: /\bpassword\b|\bapi[_-]?key\b/gi, label: "Possible secret handling", detail: "Secrets should stay out of source and be loaded from secure config.", type: "security", weight: 10 },
  { pattern: /\bwhile\s*\(\s*true\s*\)|\bfor\s*\(\s*;\s*;\s*\)/g, label: "Open-ended loop", detail: "Infinite loops need careful exit conditions and monitoring.", type: "performance", weight: 6 },
  { pattern: /\bunsafe\s*\{/g, label: "Unsafe block", detail: "Unsafe sections need extra reasoning and containment.", type: "security", weight: 10 }
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const createLineMap = (code) => code.replace(/\r\n/g, "\n").split("\n");

const getBalanceHealth = (code) => {
  const pairs = {
    "{": "}",
    "(": ")",
    "[": "]"
  };
  const closers = new Set(Object.values(pairs));
  const stack = [];
  const issues = [];
  const lines = createLineMap(code);

  lines.forEach((line, lineIndex) => {
    for (const char of line) {
      if (pairs[char]) {
        stack.push({ char, line: lineIndex + 1 });
      } else if (closers.has(char)) {
        const previous = stack.pop();

        if (!previous || pairs[previous.char] !== char) {
          issues.push({
            line: lineIndex + 1,
            label: "Delimiter mismatch",
            detail: `Unexpected closing token "${char}" detected.`
          });
        }
      }
    }
  });

  stack.forEach((item) => {
    issues.push({
      line: item.line,
      label: "Unclosed delimiter",
      detail: `Opening token "${item.char}" is not closed.`
    });
  });

  return {
    issues,
    score: clamp(100 - issues.length * 18, 35, 100)
  };
};

const getIndentationState = (lines) => {
  const tabIndented = lines.filter((line) => /^\t+/.test(line)).length;
  const spaceIndented = lines.filter((line) => /^ {2,}/.test(line)).length;
  const mixed = tabIndented > 0 && spaceIndented > 0;

  return {
    tabIndented,
    spaceIndented,
    mixed
  };
};

const findHotspots = (lines) => {
  const hotspots = [];

  lines.forEach((line, index) => {
    HOTSPOT_RULES.forEach((rule) => {
      rule.pattern.lastIndex = 0;

      if (rule.pattern.test(line)) {
        hotspots.push({
          line: index + 1,
          label: rule.label,
          detail: rule.detail,
          type: rule.type,
          weight: rule.weight
        });
      }
    });
  });

  return hotspots;
};

const countMatches = (code, regex) => {
  regex.lastIndex = 0;
  return [...code.matchAll(regex)].length;
};

const buildMetrics = (code, languageId) => {
  const lines = createLineMap(code);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const commentLines = lines.filter((line) => /^\s*(\/\/|#|\/\*|\*|--)/.test(line)).length;
  const longLineCount = lines.filter((line) => line.length > 110).length;
  const duplicateLineCount = Object.values(
    nonEmptyLines.reduce((counter, line) => {
      const normalized = line.trim();
      counter[normalized] = (counter[normalized] || 0) + 1;
      return counter;
    }, {})
  ).filter((count) => count > 1).length;

  const indentation = getIndentationState(lines);
  const hotspots = findHotspots(lines);
  const balance = getBalanceHealth(code);

  const controlFlowCount = countMatches(code, /\b(if|else if|else|for|while|switch|case|catch|try|match)\b/g);
  const functionCount = countMatches(code, /\b(function|def|func|fn)\b/g) + countMatches(code, /=>/g);
  const classCount = countMatches(code, /\b(class|struct|interface|enum)\b/g);
  const importCount = countMatches(code, /\b(import|require|using|include|from)\b/g);
  const errorHandlingCount = countMatches(code, /\b(try|catch|except|rescue|throws|Result<|Option<)\b/g);
  const maxNestingDepth = (() => {
    let currentDepth = 0;
    let maxDepth = 0;

    for (const char of code) {
      if (char === "{" || char === "(" || char === "[") {
        currentDepth += 1;
        maxDepth = Math.max(maxDepth, currentDepth);
      }

      if (char === "}" || char === ")" || char === "]") {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  })();

  const complexityScore = clamp(controlFlowCount * 7 + maxNestingDepth * 5 + longLineCount * 3, 8, 100);
  const maintainabilityScore = clamp(
    100 -
      complexityScore * 0.42 -
      hotspots.length * 5 -
      duplicateLineCount * 3 -
      (indentation.mixed ? 10 : 0) +
      Math.min(commentLines * 1.4, 10) +
      Math.min(errorHandlingCount * 3, 12),
    22,
    98
  );

  const language = getLanguageById(languageId);
  const semicolonFriendly = new Set(["javascript", "typescript", "java", "csharp", "c", "cpp", "php", "sql"]);
  const semicolonLines = lines.filter((line) => /;\s*$/.test(line.trim())).length;
  const statementLikeLines = nonEmptyLines.filter((line) => /[)\]"'\w]$/.test(line.trim())).length || 1;
  const semicolonConsistency = semicolonFriendly.has(languageId)
    ? clamp((semicolonLines / statementLikeLines) * 100, 25, 100)
    : 100;

  return {
    languageLabel: language?.label || "Mixed",
    lineCount: lines.length,
    nonEmptyLines: nonEmptyLines.length,
    characterCount: code.length,
    commentLines,
    commentDensity: Number((commentLines / Math.max(nonEmptyLines.length, 1)).toFixed(2)),
    functionCount,
    classCount,
    importCount,
    controlFlowCount,
    errorHandlingCount,
    longLineCount,
    duplicateLineCount,
    maxNestingDepth,
    semicolonConsistency: Number(semicolonConsistency.toFixed(1)),
    complexityScore,
    maintainabilityScore: Number(maintainabilityScore.toFixed(1)),
    syntaxHealth: balance.score,
    riskyPatternCount: hotspots.length,
    indentationMixed: indentation.mixed,
    hotspots,
    balance
  };
};

const toneByMode = {
  mentor: "supportive",
  strict: "hard-nosed",
  ship: "release-focused",
  interview: "teaching"
};

const buildAdvantages = (metrics, language) => {
  const advantages = [];

  if (metrics.functionCount >= 2) {
    advantages.push({
      title: "Function-based structure",
      detail: "The snippet is broken into callable units instead of being one large procedural block.",
      impact: "Improves reuse and makes review boundaries clearer."
    });
  }

  if (metrics.commentDensity >= 0.05 && metrics.commentDensity <= 0.25) {
    advantages.push({
      title: "Reasonable inline context",
      detail: "Comment density is present without overwhelming the source.",
      impact: "Helps other developers understand intent faster."
    });
  }

  if (metrics.syntaxHealth >= 88) {
    advantages.push({
      title: "Stable syntax scaffold",
      detail: `${language} delimiters and structural markers look balanced.`,
      impact: "Reduces the chance of parser-level failures and noisy bugs."
    });
  }

  if (metrics.controlFlowCount <= 6 && metrics.maxNestingDepth <= 6) {
    advantages.push({
      title: "Contained branching pressure",
      detail: "Control flow stays relatively compact for the amount of code shown.",
      impact: "Makes the logic easier to test and refactor."
    });
  }

  if (metrics.importCount > 0) {
    advantages.push({
      title: "Dependency signaling",
      detail: "Imports or includes are explicit, which gives the reader context about the module boundary.",
      impact: "Improves maintainability and dependency tracing."
    });
  }

  if (!advantages.length) {
    advantages.push({
      title: "Clear review starting point",
      detail: "The snippet is scoped enough to evaluate quickly and iterate on.",
      impact: "Makes it practical to tighten quality in small, fast cycles."
    });
  }

  return advantages.slice(0, 4);
};

const buildDisadvantages = (metrics) => {
  const disadvantages = [];

  if (metrics.complexityScore >= 62) {
    disadvantages.push({
      title: "Branching complexity is climbing",
      detail: "Control flow and nesting are starting to pile up, which makes the logic harder to reason about.",
      impact: "Increases regression risk and slows future edits."
    });
  }

  if (metrics.longLineCount >= 3) {
    disadvantages.push({
      title: "Readability drops on long lines",
      detail: "Several lines exceed a comfortable scan length.",
      impact: "Reviewers miss intent faster when statements stretch horizontally."
    });
  }

  if (metrics.errorHandlingCount === 0 && metrics.nonEmptyLines >= 18) {
    disadvantages.push({
      title: "Failure paths are not obvious",
      detail: "There is little visible guarding around external calls or fragile logic.",
      impact: "Unexpected inputs may create brittle runtime behavior."
    });
  }

  if (metrics.duplicateLineCount >= 2) {
    disadvantages.push({
      title: "Possible duplication",
      detail: "Repeated lines suggest shared behavior could be extracted.",
      impact: "Copy-paste logic tends to drift over time."
    });
  }

  if (metrics.indentationMixed) {
    disadvantages.push({
      title: "Indentation style is mixed",
      detail: "Tabs and spaces both appear at the left margin.",
      impact: "Formatting inconsistency creates unnecessary review noise."
    });
  }

  if (metrics.riskyPatternCount >= 1) {
    disadvantages.push({
      title: "Risky patterns were detected",
      detail: "The code includes APIs or idioms that deserve a second security or maintainability pass.",
      impact: "Can raise operational risk even if the code is syntactically valid."
    });
  }

  if (!disadvantages.length) {
    disadvantages.push({
      title: "Main risk is missing deeper context",
      detail: "The snippet looks healthy, but integration concerns may exist outside the pasted block.",
      impact: "Unit boundaries and runtime data still need system-level review."
    });
  }

  return disadvantages.slice(0, 4);
};

const buildSyntaxNotes = (language, metrics) => {
  const notes = [
    {
      title: "Delimiter balance",
      severity: metrics.syntaxHealth >= 90 ? "low" : "high",
      detail:
        metrics.syntaxHealth >= 90
          ? `${language} structural tokens appear balanced.`
          : "There are delimiter issues or mismatched closers that should be fixed first."
    }
  ];

  if (metrics.semicolonConsistency < 55) {
    notes.push({
      title: "Statement ending consistency",
      severity: "medium",
      detail: "Semicolon usage looks uneven for a language family that usually benefits from consistent line endings."
    });
  } else {
    notes.push({
      title: "Statement rhythm",
      severity: "low",
      detail: "Line endings and statement breaks look consistent for the selected language."
    });
  }

  if (metrics.indentationMixed) {
    notes.push({
      title: "Indentation drift",
      severity: "medium",
      detail: "Mixed indentation makes the block feel less predictable to scan."
    });
  } else {
    notes.push({
      title: "Indentation discipline",
      severity: "low",
      detail: "Indentation style appears uniform across the snippet."
    });
  }

  return notes;
};

const buildSuggestions = (metrics, hotspots, focusAreas) => {
  const suggestions = [];

  if (hotspots.some((item) => item.type === "security")) {
    suggestions.push({
      title: "Replace or isolate risky runtime calls",
      priority: "high",
      focus: "security",
      effort: "medium",
      detail: "Wrap dynamic execution, raw HTML insertion, or shell access behind stricter validation boundaries."
    });
  }

  if (metrics.complexityScore >= 55) {
    suggestions.push({
      title: "Flatten the busiest control-flow branch",
      priority: "high",
      focus: "readability",
      effort: "medium",
      detail: "Split nested logic into smaller helpers or early-return paths to reduce reviewer load."
    });
  }

  if (metrics.errorHandlingCount === 0) {
    suggestions.push({
      title: "Introduce explicit failure handling",
      priority: "high",
      focus: "architecture",
      effort: "small",
      detail: "Add guard clauses, typed errors, or recoverable return paths around fragile operations."
    });
  }

  if (metrics.longLineCount >= 3 || metrics.duplicateLineCount >= 2) {
    suggestions.push({
      title: "Refactor for scanability",
      priority: "medium",
      focus: "readability",
      effort: "small",
      detail: "Break long statements apart and extract repeated sequences into a shared helper."
    });
  }

  if (focusAreas.includes("testing")) {
    suggestions.push({
      title: "Lock risky branches with tests",
      priority: "medium",
      focus: "testing",
      effort: "medium",
      detail: "Target branches with nesting, external calls, or mutation-heavy logic first."
    });
  }

  if (focusAreas.includes("performance")) {
    suggestions.push({
      title: "Benchmark the hottest path",
      priority: "medium",
      focus: "performance",
      effort: "medium",
      detail: "Measure loop-heavy or broad-fetch code before optimizing so changes are evidence-driven."
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      title: "Add one focused polish pass",
      priority: "medium",
      focus: "readability",
      effort: "small",
      detail: "A short naming and formatting review would likely improve the snippet without large rewrites."
    });
  }

  const focusPriority = new Set(focusAreas);

  return suggestions
    .sort((left, right) => {
      const leftFocused = focusPriority.has(left.focus) ? 1 : 0;
      const rightFocused = focusPriority.has(right.focus) ? 1 : 0;

      if (leftFocused !== rightFocused) {
        return rightFocused - leftFocused;
      }

      return left.priority === "high" && right.priority !== "high" ? -1 : 0;
    })
    .slice(0, 5);
};

const buildRoadmap = (suggestions) =>
  suggestions.slice(0, 3).map((suggestion, index) => ({
    title: `Step ${index + 1}: ${suggestion.title}`,
    detail: suggestion.detail,
    benefit:
      suggestion.priority === "high"
        ? "This removes the highest review friction first."
        : "This is a focused polish step that compounds maintainability."
  }));

const buildSummary = (language, metrics, tone) => {
  const riskDescriptor =
    metrics.riskyPatternCount >= 2 || metrics.syntaxHealth < 75
      ? "high-risk"
      : metrics.complexityScore >= 58
        ? "mixed-quality"
        : "solid-baseline";

  return `This ${tone} ${language} review reads as a ${riskDescriptor} snippet: syntax health is ${metrics.syntaxHealth}/100, maintainability is ${metrics.maintainabilityScore}/100, and the biggest pressure point is ${
    metrics.riskyPatternCount ? "risky API usage" : metrics.complexityScore >= 58 ? "dense control flow" : "follow-through polish"
  }.`;
};

export const generateHeuristicReview = ({
  code,
  languageId,
  focusAreas = [],
  reviewMode = "mentor",
  memoryMatches = []
}) => {
  const language = getLanguageById(languageId)?.label || "Mixed";
  const metrics = buildMetrics(code, languageId);
  const advantages = buildAdvantages(metrics, language);
  const disadvantages = buildDisadvantages(metrics);
  const syntaxNotes = buildSyntaxNotes(language, metrics);
  const suggestions = buildSuggestions(metrics, metrics.hotspots, focusAreas);
  const roadmap = buildRoadmap(suggestions);

  const qualityScore = clamp(
    Math.round(
      metrics.maintainabilityScore * 0.55 +
        metrics.syntaxHealth * 0.25 +
        clamp(100 - metrics.complexityScore, 0, 100) * 0.2
    ),
    28,
    98
  );

  const riskLevel =
    metrics.hotspots.some((item) => item.type === "security") || metrics.syntaxHealth < 72
      ? "high"
      : metrics.complexityScore > 60 || metrics.hotspots.length >= 2
        ? "medium"
        : "low";

  return {
    title: `${language} review with ${riskLevel} risk pressure`,
    summary: buildSummary(language, metrics, toneByMode[reviewMode] || "balanced"),
    score: qualityScore,
    riskLevel,
    confidence: 0.66,
    overview: {
      advantages: advantages[0]?.detail || "The snippet has some positive structure to build on.",
      disadvantages: disadvantages[0]?.detail || "The biggest concern is consistency under change.",
      syntax: syntaxNotes[0]?.detail || "Syntax looks serviceable overall."
    },
    metrics: {
      lineCount: metrics.lineCount,
      nonEmptyLines: metrics.nonEmptyLines,
      characterCount: metrics.characterCount,
      functionCount: metrics.functionCount,
      classCount: metrics.classCount,
      commentDensity: metrics.commentDensity,
      complexityScore: metrics.complexityScore,
      maintainabilityScore: metrics.maintainabilityScore,
      syntaxHealth: metrics.syntaxHealth,
      maxNestingDepth: metrics.maxNestingDepth,
      riskyPatternCount: metrics.riskyPatternCount
    },
    advantages,
    disadvantages,
    syntaxNotes,
    suggestions,
    roadmap,
    highlightedLines: [...metrics.balance.issues, ...metrics.hotspots].slice(0, 8),
    nextExperiments: [
      {
        title: "Run one boundary-case test",
        detail: "Probe the weirdest input or failure state around the highest-risk branch."
      },
      {
        title: "Review naming after refactor",
        detail: "Once the main logic is flatter, tighten names so the structure reads even faster."
      }
    ],
    memoryMatches
  };
};
