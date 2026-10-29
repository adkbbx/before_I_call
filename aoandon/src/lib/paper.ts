/** A two-pixel, deterministically irregular paper edge; no raster mask. */
export function deckleMask(): string {
  const points: string[] = [];
  const jitter = (i: number) => 0.4 + ((i * 73 + 19) % 17) / 10;
  for (let x = 0; x <= 1100; x += 10) points.push(`${x},${jitter(x)}`);
  for (let y = 0; y <= 780; y += 10) points.push(`${1100 - jitter(y)},${y}`);
  for (let x = 1100; x >= 0; x -= 10) points.push(`${x},${780 - jitter(x)}`);
  for (let y = 780; y >= 0; y -= 10) points.push(`${jitter(y)},${y}`);
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 780" preserveAspectRatio="none"><polygon fill="white" points="${points.join(' ')}"/></svg>`)}")`;
}
