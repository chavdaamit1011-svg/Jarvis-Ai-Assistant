export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length === 0 || vectorB.length === 0 || vectorA.length !== vectorB.length) {
    throw new Error('Cosine similarity requires non-empty vectors with matching dimensions.');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let index = 0; index < vectorA.length; index += 1) {
    const a = vectorA[index];
    const b = vectorB[index];
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('Vectors must contain finite numeric values.');
    dotProduct += a * b;
    magnitudeA += a * a;
    magnitudeB += b * b;
  }

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return Math.max(-1, Math.min(1, dotProduct / Math.sqrt(magnitudeA * magnitudeB)));
}
