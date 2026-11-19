export const LEVELS = Object.freeze({
  beginner: { label: 'Beginner', rows: 9, cols: 9, mines: 10 },
  intermediate: { label: 'Intermediate', rows: 16, cols: 16, mines: 40 },
  expert: { label: 'Expert', rows: 16, cols: 30, mines: 99 },
});

/** A 2D array is the board; each cell stores its own state and adjacent mine count. */
export class Minesweeper {
  constructor(level = 'beginner', random = Math.random) {
    if (!Object.hasOwn(LEVELS, level)) throw new RangeError('Unknown difficulty');
    Object.assign(this, LEVELS[level]);
    this.level = level;
    this.random = random;
    this.status = 'ready';
    this.flags = 0;
    this.revealed = 0;
    this.board = Array.from({ length: this.rows }, (_, row) =>
      Array.from({ length: this.cols }, (_, col) => ({ row, col, mine: false, adjacent: 0, open: false, flagged: false, exploded: false })));
  }

  get safeCells() { return this.rows * this.cols - this.mines; }
  get finished() { return this.status === 'won' || this.status === 'lost'; }
  cell(row, col) { return this.board[row]?.[col]; }

  neighbors(row, col) {
    const cells = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const cell = this.cell(row + dr, col + dc);
        if (cell) cells.push(cell);
      }
    }
    return cells;
  }

  plantMines(row, col) {
    // Keep the first cell AND its eight neighbors clear. Shuffle without replacement.
    const candidates = this.board.flat().filter(cell => Math.abs(cell.row - row) > 1 || Math.abs(cell.col - col) > 1);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const cell of candidates.slice(0, this.mines)) cell.mine = true;
    for (const cell of this.board.flat()) cell.adjacent = this.neighbors(cell.row, cell.col).filter(next => next.mine).length;
    this.status = 'playing';
  }

  reveal(row, col) {
    const cell = this.cell(row, col);
    if (!cell || this.finished || cell.flagged || cell.open) return false;
    if (this.status === 'ready') this.plantMines(row, col);
    this.openCells([cell]);
    return true;
  }

  openCells(cells) {
    // Iterative flood fill avoids call-stack limits on connected empty regions.
    const queue = [...cells];
    for (let head = 0; head < queue.length; head++) {
      const cell = queue[head];
      if (cell.open || cell.flagged) continue;
      cell.open = true;
      if (cell.mine) {
        cell.exploded = true;
        this.status = 'lost';
        return;
      }
      this.revealed++;
      if (cell.adjacent === 0) queue.push(...this.neighbors(cell.row, cell.col).filter(next => !next.open && !next.flagged));
    }
    if (this.revealed === this.safeCells) {
      this.status = 'won';
      for (const cell of this.board.flat()) if (cell.mine) cell.flagged = true;
      this.flags = this.mines;
    }
  }

  toggleFlag(row, col) {
    const cell = this.cell(row, col);
    if (!cell || this.finished || cell.open || (!cell.flagged && this.flags >= this.mines)) return false;
    cell.flagged = !cell.flagged;
    this.flags += cell.flagged ? 1 : -1;
    return true;
  }

  chord(row, col) {
    const cell = this.cell(row, col);
    if (!cell || this.status !== 'playing' || !cell.open || cell.adjacent === 0) return false;
    const neighbors = this.neighbors(row, col);
    if (neighbors.filter(next => next.flagged).length !== cell.adjacent) return false;
    const covered = neighbors.filter(next => !next.flagged && !next.open);
    if (!covered.length) return false;
    this.openCells(covered);
    return true;
  }
}
