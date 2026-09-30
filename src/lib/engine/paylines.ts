/** 20 classic 5-reel / 3-row paylines (row index per reel). Ported from LuxeSpin. */
export const PAYLINES_20: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [1, 1, 0, 1, 1],
];

/** 15-line subset used by Lucky Clover / ZipSpinZ heritage machines. */
export const PAYLINES_15: number[][] = PAYLINES_20.slice(0, 15);
