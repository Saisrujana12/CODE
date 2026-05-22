const DIMENSION = 192;

const hashToken = (token) => {
  let hash = 0;

  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }

  return hash;
};

export const embedText = (input) => {
  const text = `${input || ""}`.toLowerCase().replace(/\r\n/g, "\n");
  const vector = Array.from({ length: DIMENSION }, () => 0);
  const tokens = text.match(/[a-z0-9_#@$]+|[^\s]/g) || [];

  tokens.slice(0, 4000).forEach((token, tokenIndex) => {
    const baseHash = hashToken(token);
    const primaryIndex = baseHash % DIMENSION;
    const secondaryIndex = (baseHash * 17 + tokenIndex * 13) % DIMENSION;
    const weight = token.length > 1 ? 1.2 : 0.45;

    vector[primaryIndex] += weight;
    vector[secondaryIndex] += weight * 0.35;
  });

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
};
