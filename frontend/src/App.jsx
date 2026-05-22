import React, { useEffect, useRef, useState } from "react";

import { sampleSnippets } from "./data/sampleSnippets";

const initialSnippet = sampleSnippets.javascript;

const buildMarkdownReport = (review) => {
  const suggestions = review.suggestions
    .map((item) => `- ${item.title}: ${item.detail}`)
    .join("\n");

  return `# ${review.title}

- Language: ${review.languageLabel}
- Score: ${review.score}
- Risk: ${review.riskLevel}
- Review mode: ${review.reviewMode}
- AI source: ${review.aiSource}

## Summary
${review.summary}

## Advantages
${review.advantages.map((item) => `- ${item.title}: ${item.detail}`).join("\n")}

## Disadvantages
${review.disadvantages.map((item) => `- ${item.title}: ${item.detail}`).join("\n")}

## Syntax notes
${review.syntaxNotes.map((item) => `- ${item.title}: ${item.detail}`).join("\n")}

## Suggestions
${suggestions}
`;
};

const downloadFile = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};

const formatRelativeTone = (riskLevel) => {
  if (riskLevel === "high") {
    return "Critical attention";
  }

  if (riskLevel === "medium") {
    return "Needs polish";
  }

  return "Looking stable";
};

const computeLiveMetrics = (code) => {
  const lines = code.split("\n");
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const branching = [...code.matchAll(/\b(if|for|while|switch|catch|case)\b/g)].length;

  return {
    lineCount: lines.length,
    nonEmptyLines: nonEmpty.length,
    characterCount: code.length,
    longestLine,
    branching
  };
};

const MetricBar = ({ label, value, max = 100, accent = "var(--accent)" }) => (
  <div className="metric-bar">
    <div className="metric-bar__label-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="metric-bar__track">
      <div
        className="metric-bar__fill"
        style={{
          width: `${Math.min(100, (value / max) * 100)}%`,
          background: accent
        }}
      />
    </div>
  </div>
);

const Tag = ({ active, children, onClick }) => (
  <button type="button" className={`tag ${active ? "tag--active" : ""}`} onClick={onClick}>
    {children}
  </button>
);

const ServicePill = ({ active, label, detail }) => (
  <div className={`service-pill ${active ? "service-pill--active" : ""}`}>
    <strong>{label}</strong>
    <span>{detail}</span>
  </div>
);

const PanelTitle = ({ eyebrow, title, copy }) => (
  <div className="panel-title">
    <span className="eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    <p>{copy}</p>
  </div>
);

function App() {
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState({ items: [], stats: {} });
  const [language, setLanguage] = useState("auto");
  const [reviewMode, setReviewMode] = useState("mentor");
  const [focusAreas, setFocusAreas] = useState(["readability", "security"]);
  const [code, setCode] = useState(initialSnippet.code);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSample, setActiveSample] = useState(initialSnippet.language);
  const resultsRef = useRef(null);

  const liveMetrics = computeLiveMetrics(code);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [configResponse, historyResponse] = await Promise.all([
          fetch("/api/config"),
          fetch("/api/history")
        ]);

        const configPayload = await configResponse.json();
        const historyPayload = await historyResponse.json();

        setConfig(configPayload);
        setHistory(historyPayload);
      } catch (requestError) {
        setError("The app shell loaded, but the API could not be reached.");
      }
    };

    bootstrap();
  }, []);

  const refreshHistory = async () => {
    const response = await fetch("/api/history");
    const payload = await response.json();
    setHistory(payload);
  };

  const toggleFocusArea = (focusId) => {
    setFocusAreas((current) =>
      current.includes(focusId)
        ? current.filter((item) => item !== focusId)
        : [...current, focusId]
    );
  };

  const loadSample = (sampleKey) => {
    const sample = sampleSnippets[sampleKey];

    if (!sample) {
      return;
    }

    setCode(sample.code);
    setLanguage(sample.language);
    setActiveSample(sample.language);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setReview(null);

    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code,
          language,
          reviewMode,
          focusAreas
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Review failed.");
      }

      setReview(payload);
      await refreshHistory();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const exportJson = () => {
    if (!review) {
      return;
    }

    downloadFile(
      `codepulse-review-${review.language}-${review.id}.json`,
      JSON.stringify(review, null, 2),
      "application/json"
    );
  };

  const exportMarkdown = () => {
    if (!review) {
      return;
    }

    downloadFile(
      `codepulse-review-${review.language}-${review.id}.md`,
      buildMarkdownReport(review),
      "text/markdown"
    );
  };

  const serviceState = config?.services || {};
  const options = config?.options || { focusAreas: [], reviewModes: [] };

  return (
    <div className="page-shell">
      <div className="backdrop backdrop--one" />
      <div className="backdrop backdrop--two" />

      <header className="hero card">
        <div className="hero__copy">
          <span className="eyebrow">AI code review platform</span>
          <h1>Sharper Reviews. Stronger Releases.</h1>
          <p>
            This build supports broad language coverage, advantage and disadvantage analysis,
            syntax-aware feedback, suggestions, and persistent review memory. It is designed to
            feel like a serious product, not a demo.
          </p>
          <div className="hero__actions">
            <button type="button" className="button button--primary" onClick={() => loadSample("javascript")}>
              Load sample review
            </button>
            <button type="button" className="button button--secondary" onClick={() => setCode("")}>
              Clear editor
            </button>
          </div>
        </div>

        <div className="hero__snapshot">
          <div className="score-card">
            <span>Live editor stats</span>
            <strong>{liveMetrics.lineCount} lines</strong>
            <p>{liveMetrics.characterCount} characters across your current snippet.</p>
          </div>
          <div className="hero__services">
            <ServicePill
              active={serviceState.aiEnabled}
              label="AI engine"
              detail={serviceState.aiEnabled ? "OpenAI path enabled" : "Heuristic fallback active"}
            />
            <ServicePill
              active={serviceState.chromaEnabled}
              label="Chroma memory"
              detail={serviceState.chromaEnabled ? "Vector memory ready" : "Waiting for real Chroma key"}
            />
          </div>
        </div>
      </header>

      <main className="layout-grid">
        <section className="card workspace">
          <PanelTitle
            eyebrow="Review workspace"
            title="Paste code, choose a mode, and request a deep review."
            copy="The UI supports multi-language review flows, syntax inspection, export actions, and focus-driven critique."
          />

          <form className="workspace__form" onSubmit={handleSubmit}>
            <div className="workspace__controls">
              <label>
                <span>Language</span>
                <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option value="auto">Auto detect</option>
                  {config?.languages?.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Sample vault</span>
                <div className="sample-strip">
                  {Object.values(sampleSnippets).map((sample) => (
                    <button
                      key={sample.language}
                      type="button"
                      className={`sample-strip__button ${activeSample === sample.language ? "sample-strip__button--active" : ""}`}
                      onClick={() => loadSample(sample.language)}
                    >
                      {sample.title}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div className="mode-grid">
              {options.reviewModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`mode-card ${reviewMode === mode.id ? "mode-card--active" : ""}`}
                  onClick={() => setReviewMode(mode.id)}
                >
                  <strong>{mode.label}</strong>
                  <span>{mode.detail}</span>
                </button>
              ))}
            </div>

            <div className="focus-row">
              {options.focusAreas.map((focus) => (
                <Tag
                  key={focus.id}
                  active={focusAreas.includes(focus.id)}
                  onClick={() => toggleFocusArea(focus.id)}
                >
                  {focus.label}
                </Tag>
              ))}
            </div>

            <label className="editor-block">
              <span>Code input</span>
              <textarea
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Paste any supported code snippet here..."
                spellCheck="false"
              />
            </label>

            <div className="workspace__footer">
              <div className="mini-metrics">
                <div>
                  <strong>{liveMetrics.nonEmptyLines}</strong>
                  <span>non-empty lines</span>
                </div>
                <div>
                  <strong>{liveMetrics.longestLine}</strong>
                  <span>longest line</span>
                </div>
                <div>
                  <strong>{liveMetrics.branching}</strong>
                  <span>branch markers</span>
                </div>
              </div>

              <button type="submit" className="button button--primary" disabled={loading}>
                {loading ? "Reviewing..." : "Review code"}
              </button>
            </div>
          </form>

          {error ? <div className="alert">{error}</div> : null}
        </section>

        <aside className="stack">
          <section className="card">
            <PanelTitle
              eyebrow="Standout features"
              title="Five extra features that make the project feel bigger."
              copy="These are product-level improvements layered on top of the core AI code review flow."
            />
            <div className="feature-list">
              {config?.standoutFeatures?.map((feature) => (
                <div key={feature} className="feature-chip">
                  {feature}
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <PanelTitle
              eyebrow="Language coverage"
              title="Broad language support"
              copy="The backend includes detection and review heuristics for many common programming languages."
            />
            <div className="language-grid">
              {config?.languages?.map((languageOption) => (
                <div key={languageOption.id} className="language-chip">
                  <strong>{languageOption.badge}</strong>
                  <span>{languageOption.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <PanelTitle
              eyebrow="Review memory"
              title="History and trend line"
              copy="Recent reviews stay visible so the platform feels like a reusable workflow."
            />
            <div className="history-stats">
              <div>
                <strong>{history.stats.totalReviews || 0}</strong>
                <span>reviews</span>
              </div>
              <div>
                <strong>{history.stats.averageScore || 0}</strong>
                <span>avg score</span>
              </div>
              <div>
                <strong>{history.stats.highRiskCount || 0}</strong>
                <span>high risk</span>
              </div>
              <div>
                <strong>{history.stats.topLanguage || "None yet"}</strong>
                <span>top language</span>
              </div>
            </div>
          </section>
        </aside>

        <section ref={resultsRef} className="card results">
          <PanelTitle
            eyebrow="Review output"
            title={
              loading
                ? "Review in progress..."
                : review
                  ? review.title
                  : "Your review report will appear here."
            }
            copy={
              loading
                ? "The backend is analyzing your code now. Suggestions, roadmap steps, and quality metrics will appear in this section."
                : review
                  ? review.summary
                  : "Submit code to see quality scores, syntax notes, roadmap steps, line highlights, and Chroma memory matches."
            }
          />

          {loading ? (
            <div className="empty-state">
              <p>Reviewing your code...</p>
              <span>
                Stay on this section. Suggestions and the next-step roadmap will appear here as
                soon as the review finishes.
              </span>
            </div>
          ) : review ? (
            <div className="review-report">
              <div className="review-report__hero">
                <div className="result-badge">
                  <span>Quality score</span>
                  <strong>{review.score}</strong>
                  <p>{formatRelativeTone(review.riskLevel)}</p>
                </div>

                <div className="review-meta">
                  <div>
                    <span>Detected language</span>
                    <strong>{review.languageLabel}</strong>
                  </div>
                  <div>
                    <span>Syntax confidence</span>
                    <strong>{Math.round(review.detectionConfidence * 100)}%</strong>
                  </div>
                  <div>
                    <span>AI source</span>
                    <strong>{review.aiSource}</strong>
                  </div>
                  <div>
                    <span>Chroma</span>
                    <strong>{review.chromaStored ? "Saved" : "Skipped"}</strong>
                  </div>
                </div>
              </div>

              <div className="export-row">
                <button type="button" className="button button--secondary" onClick={exportMarkdown}>
                  Export Markdown
                </button>
                <button type="button" className="button button--secondary" onClick={exportJson}>
                  Export JSON
                </button>
              </div>

              <div className="overview-grid">
                <article className="overview-card">
                  <h3>Advantages</h3>
                  <p>{review.overview.advantages}</p>
                </article>
                <article className="overview-card overview-card--warn">
                  <h3>Disadvantages</h3>
                  <p>{review.overview.disadvantages}</p>
                </article>
                <article className="overview-card overview-card--teal">
                  <h3>Syntax</h3>
                  <p>{review.overview.syntax}</p>
                </article>
              </div>

              <div className="metrics-grid">
                <MetricBar label="Maintainability" value={review.metrics.maintainabilityScore} max={100} />
                <MetricBar label="Syntax health" value={review.metrics.syntaxHealth} max={100} accent="var(--teal)" />
                <MetricBar label="Complexity" value={review.metrics.complexityScore} max={100} accent="var(--sun)" />
                <MetricBar label="Risky patterns" value={review.metrics.riskyPatternCount} max={8} accent="var(--ink-soft)" />
              </div>

              <div className="two-column">
                <article className="detail-card">
                  <h3>Strengths</h3>
                  {review.advantages.map((item) => (
                    <div key={item.title} className="detail-item">
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <span>{item.impact}</span>
                    </div>
                  ))}
                </article>

                <article className="detail-card detail-card--warn">
                  <h3>Concerns</h3>
                  {review.disadvantages.map((item) => (
                    <div key={item.title} className="detail-item">
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <span>{item.impact}</span>
                    </div>
                  ))}
                </article>
              </div>

              <div className="two-column">
                <article className="detail-card detail-card--teal">
                  <h3>Syntax notes</h3>
                  {review.syntaxNotes.map((item) => (
                    <div key={item.title} className="detail-item">
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <span>Severity: {item.severity}</span>
                    </div>
                  ))}
                </article>

                <article className="detail-card">
                  <h3>Action roadmap</h3>
                  {review.roadmap.map((item) => (
                    <div key={item.title} className="detail-item">
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <span>{item.benefit}</span>
                    </div>
                  ))}
                </article>
              </div>

              <article className="detail-card">
                <h3>Prioritized suggestions</h3>
                <div className="suggestion-grid">
                  {review.suggestions.map((item) => (
                    <div key={item.title} className="suggestion-card">
                      <span className={`priority priority--${item.priority}`}>{item.priority}</span>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <small>
                        Focus: {item.focus} | Effort: {item.effort}
                      </small>
                    </div>
                  ))}
                </div>
              </article>

              <div className="two-column">
                <article className="detail-card">
                  <h3>Line spotlight</h3>
                  {review.highlightedLines.length ? (
                    review.highlightedLines.map((item, index) => (
                      <div key={`${item.line}-${index}`} className="line-item">
                        <strong>Line {item.line}</strong>
                        <p>{item.label}</p>
                        <span>{item.detail}</span>
                      </div>
                    ))
                  ) : (
                    <p className="empty-copy">No standout line alerts were found in this snippet.</p>
                  )}
                </article>

                <article className="detail-card">
                  <h3>Chroma memory matches</h3>
                  {review.memoryMatches.length ? (
                    review.memoryMatches.map((item) => (
                      <div key={item.id} className="memory-item">
                        <strong>{item.title}</strong>
                        <p>{item.summary}</p>
                        <span>
                          {item.language} | score {item.score} | risk {item.riskLevel}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="empty-copy">No similar past snippets were returned from memory yet.</p>
                  )}
                </article>
              </div>

              {review.usedFallback && review.fallbackReason ? (
                <div className="alert alert--soft">
                  AI fallback note: the heuristic engine completed this review because the model request did
                  not finish cleanly.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">
              <p>The results area is ready for a full review report.</p>
              <span>
                Expected output includes advantages, disadvantages, syntax notes, suggestions,
                complexity metrics, and memory retrieval.
              </span>
            </div>
          )}
        </section>

        <section className="card feature-board">
          <PanelTitle
            eyebrow="Product surface"
            title="This website ships with a larger feature set than the usual code checker."
            copy="The feature board helps the project stand out visually and functionally."
          />
          <div className="feature-board__grid">
            {config?.features?.map((feature) => (
              <article key={feature.title} className="feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card history-panel">
          <PanelTitle
            eyebrow="Session history"
            title="Recent reviews stay visible for repeated iteration."
            copy="This makes the product feel like a working review cockpit instead of a one-off checker."
          />
          <div className="history-list">
            {history.items.length ? (
              history.items.map((item) => (
                <article key={item.id} className="history-card">
                  <div className="history-card__top">
                    <strong>{item.title}</strong>
                    <span className={`risk-badge risk-badge--${item.riskLevel}`}>{item.riskLevel}</span>
                  </div>
                  <p>{item.summary}</p>
                  <div className="history-card__meta">
                    <span>{item.languageLabel}</span>
                    <span>score {item.score}</span>
                    <span>{item.aiSource}</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-copy">No reviews yet. Submit your first snippet to populate the timeline.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
