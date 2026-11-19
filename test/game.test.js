import test from 'node:test';
import assert from 'node:assert/strict';
import { Minesweeper, LEVELS } from '../src/game.js';

function seeded(seed = 321) {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
}

test('every difficulty has correct dimensions, mine count, adjacency, and safe first move', () => {
  for (const [level, { rows, cols, mines }] of Object.entries(LEVELS)) {
    for (const [row, col] of [[0, 0], [rows - 1, cols - 1], [Math.floor(rows / 2), Math.floor(cols / 2)]]) {
      const game = new Minesweeper(level, seeded(row + col + 1));
      assert.equal(game.board.length, rows);
      assert.equal(game.board[0].length, cols);
      assert.equal(game.board.flat().filter(cell => cell.mine).length, 0);
      game.reveal(row, col);
      assert.equal(game.board.flat().filter(cell => cell.mine).length, mines);
      assert.ok(game.cell(row, col).open);
      assert.equal(game.cell(row, col).adjacent, 0);
      assert.ok(game.neighbors(row, col).every(cell => !cell.mine));
      for (const cell of game.board.flat()) {
        assert.equal(cell.adjacent, game.neighbors(cell.row, cell.col).filter(next => next.mine).length);
      }
    }
  }
});

test('flags protect cells from reveal and flood fill, and are capped at the mine count', () => {
  const game = new Minesweeper('beginner', seeded());
  game.toggleFlag(0, 1);
  assert.equal(game.reveal(0, 1), false);
  assert.equal(game.status, 'ready');
  game.reveal(0, 0);
  assert.equal(game.cell(0, 1).open, false);
  assert.equal(game.toggleFlag(0, 0), false);
  const covered = game.board.flat().filter(cell => !cell.open && !cell.flagged);
  for (const cell of covered) game.toggleFlag(cell.row, cell.col);
  assert.equal(game.flags, game.mines);
  assert.equal(game.toggleFlag(0, 1), true);
  assert.equal(game.flags, game.mines - 1);
});

test('empty regions expand to numbered boundaries without opening mines', () => {
  const game = new Minesweeper('beginner', seeded());
  game.reveal(4, 4);
  assert.ok(game.revealed >= 9);
  for (const cell of game.board.flat().filter(cell => cell.open)) {
    assert.equal(cell.mine, false);
    if (cell.adjacent === 0) assert.ok(game.neighbors(cell.row, cell.col).every(next => next.open));
  }
  assert.equal(game.revealed, game.board.flat().filter(cell => cell.open).length);
});

test('a mine ends the game and further input cannot change it', () => {
  const game = new Minesweeper('beginner', seeded());
  game.reveal(4, 4);
  const mine = game.board.flat().find(cell => cell.mine);
  assert.ok(game.reveal(mine.row, mine.col));
  assert.equal(game.status, 'lost');
  assert.equal(mine.exploded, true);
  const before = JSON.stringify(game.board);
  assert.equal(game.reveal(0, 0), false);
  assert.equal(game.toggleFlag(0, 0), false);
  assert.equal(game.chord(4, 4), false);
  assert.equal(JSON.stringify(game.board), before);
});

test('revealing all safe cells wins without needing flags', () => {
  const game = new Minesweeper('expert', seeded());
  game.reveal(8, 15);
  for (const cell of game.board.flat()) if (!cell.mine) game.reveal(cell.row, cell.col);
  assert.equal(game.status, 'won');
  assert.equal(game.revealed, game.safeCells);
  assert.equal(game.flags, game.mines);
  assert.ok(game.board.flat().filter(cell => cell.mine).every(cell => cell.flagged));
  assert.equal(game.reveal(0, 0), false);
});

test('chording opens neighbors only after the number of flags matches', () => {
  const game = new Minesweeper('beginner', seeded());
  game.reveal(4, 4);
  const clue = game.board.flat().find(cell => cell.open && cell.adjacent > 0 && game.neighbors(cell.row, cell.col).some(next => !next.mine && !next.open));
  assert.ok(clue);
  assert.equal(game.chord(clue.row, clue.col), false);
  for (const cell of game.neighbors(clue.row, clue.col).filter(cell => cell.mine)) game.toggleFlag(cell.row, cell.col);
  const before = game.revealed;
  assert.equal(game.chord(clue.row, clue.col), true);
  assert.ok(game.revealed > before);
  assert.notEqual(game.status, 'lost');
});

test('incorrect flags can make a chord reveal a mine', () => {
  const game = new Minesweeper('beginner', seeded());
  game.reveal(4, 4);
  const clue = game.board.flat().find(cell => cell.open && cell.adjacent > 0 && game.neighbors(cell.row, cell.col).some(next => !next.mine && !next.open));
  const neighbors = game.neighbors(clue.row, clue.col);
  const mines = neighbors.filter(cell => cell.mine);
  for (const cell of mines.slice(1)) game.toggleFlag(cell.row, cell.col);
  const wrong = neighbors.find(cell => !cell.mine && !cell.open);
  game.toggleFlag(wrong.row, wrong.col);
  game.chord(clue.row, clue.col);
  assert.equal(game.status, 'lost');
});

test('invalid inputs and repeated reveals do not alter board state', () => {
  assert.throws(() => new Minesweeper('impossible'), RangeError);
  const game = new Minesweeper('beginner', seeded());
  assert.equal(game.reveal(-1, 0), false);
  assert.equal(game.toggleFlag(0, 99), false);
  game.reveal(4, 4);
  const before = game.revealed;
  assert.equal(game.reveal(4, 4), false);
  assert.equal(game.revealed, before);
  assert.equal(game.neighbors(0, 0).length, 3);
  assert.equal(game.neighbors(0, 4).length, 5);
  assert.equal(game.neighbors(4, 4).length, 8);
});
