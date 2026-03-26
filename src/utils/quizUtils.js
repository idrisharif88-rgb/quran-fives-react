export function getSecureRandomIntInclusive(min, max) {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  const span = upper - lower + 1;
  if (span <= 0) return lower;

  if (window.crypto && window.crypto.getRandomValues) {
    const uint32Max = 0x100000000;
    const limit = uint32Max - (uint32Max % span);
    const randomBuffer = new Uint32Array(1);
    let randomValue = 0;
    do {
      window.crypto.getRandomValues(randomBuffer);
      randomValue = randomBuffer[0];
    } while (randomValue >= limit);
    return lower + (randomValue % span);
  }

  return lower + Math.floor(Math.random() * span);
}

export function buildShuffledIndices(start, end) {
  const indices = [];
  for (let n = start; n <= end; n++) {
    indices.push(n - 1);
  }
  for (let i = indices.length - 1; i > 0; i--) {
    const j = getSecureRandomIntInclusive(0, i);
    const temp = indices[i];
    indices[i] = indices[j];
    indices[j] = temp;
  }
  return indices;
}