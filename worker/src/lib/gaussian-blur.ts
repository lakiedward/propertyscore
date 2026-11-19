function gaussianKernel(sigma: number): Float64Array {
  const radius = Math.ceil(3 * sigma);
  const kernel = new Float64Array(2 * radius + 1);
  let total = 0;
  for (let index = 0; index < kernel.length; index += 1) {
    const offset = index - radius;
    const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
    kernel[index] = weight;
    total += weight;
  }
  return kernel.map((weight) => weight / total);
}

export function gaussianBlur(
  values: ArrayLike<number>,
  columns: number,
  rows: number,
  sigma: number,
): Float64Array {
  if (sigma <= 0) return Float64Array.from(values);
  const kernel = gaussianKernel(sigma);
  const radius = (kernel.length - 1) / 2;
  const clamp = (value: number, upper: number) => Math.min(upper, Math.max(0, value));
  const horizontal = new Float64Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        sum +=
          (kernel[k + radius] ?? 0) * (values[row * columns + clamp(column + k, columns - 1)] ?? 0);
      }
      horizontal[row * columns + column] = sum;
    }
  }
  const result = new Float64Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        sum +=
          (kernel[k + radius] ?? 0) *
          (horizontal[clamp(row + k, rows - 1) * columns + column] ?? 0);
      }
      result[row * columns + column] = sum;
    }
  }
  return result;
}
