const MAX_ITEMS = 24;
const history = [];

export const addHistoryItem = (item) => {
  history.unshift(item);

  if (history.length > MAX_ITEMS) {
    history.length = MAX_ITEMS;
  }
};

export const listHistoryItems = () => [...history];

export const getHistoryStats = () => {
  if (!history.length) {
    return {
      totalReviews: 0,
      averageScore: 0,
      highRiskCount: 0,
      topLanguage: "None yet"
    };
  }

  const scoreTotal = history.reduce((sum, item) => sum + item.score, 0);
  const languageCounter = history.reduce((counter, item) => {
    counter[item.languageLabel] = (counter[item.languageLabel] || 0) + 1;
    return counter;
  }, {});

  const topLanguageEntry = Object.entries(languageCounter).sort((left, right) => right[1] - left[1])[0];

  return {
    totalReviews: history.length,
    averageScore: Number((scoreTotal / history.length).toFixed(1)),
    highRiskCount: history.filter((item) => item.riskLevel === "high").length,
    topLanguage: topLanguageEntry?.[0] || "Mixed"
  };
};
