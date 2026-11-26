// 1.49: one way to write numbers (src/shared/number-format.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { NBSP, MINUS, num, percent, share, points, euros, millions, moneyParts, moneyWords } from '../src/shared/number-format.js';

const s = text => text.replaceAll(NBSP, ' ');

test('numbers: decimal comma, points from five digits, the real minus sign, no signed zero', () => {
  assert.equal(num(1690012), '1.690.012');
  assert.equal(num(7036), '7036', 'four digits without a point, as the RAE asks');
  assert.equal(num(22.24, 1), '22,2');
  assert.equal(num(-9.81, 1), `${MINUS}9,8`);
  assert.equal(num(-0.04, 1), '0', 'rounds to zero: no sign');
  assert.equal(num(0.8, 1, { sign: true }), '+0,8');
  assert.equal(num(2, 2, { fixed: true }), '2,00');
  assert.equal(num(NaN), '—');
  assert.equal(num(Infinity, 1), '—');
  assert.doesNotMatch(num(-1234.5, 1), /-/, 'never the hyphen');
});

test('units: a non-breaking space before every unit', () => {
  assert.equal(percent(22.2), `22,2${NBSP}%`);
  assert.equal(s(share(0.16, 0)), '16 %');
  assert.equal(s(percent(-9.81)), `${MINUS}9,8 %`);
  assert.equal(s(points(0.81, 2, { sign: true })), '+0,81 puntos');
  assert.equal(s(points(1, 0)), '1 punto');
  assert.equal(s(points(0.5, 1, { short: true, sign: true })), '+0,5 p. p.');
  assert.equal(s(euros(1502)), '1502 €');
  assert.equal(percent(null), '—');
});

test('money: M€ in figures, «millones de euros» in sentences, billones from 10^12, never «mil M€»', () => {
  assert.equal(s(millions(7036e6)), '7036 M€');
  assert.equal(s(millions(166693e6)), '166.693 M€');
  assert.equal(s(millions(-55220e6)), `${MINUS}55.220 M€`);
  assert.equal(s(millions(5348e9)), '5,3 billones €');
  assert.equal(s(moneyWords(3400e6)), '3400 millones de euros');
  assert.equal(s(moneyWords(1.78e12)), '1,8 billones de euros');
  for (const text of [millions(5348e9), millions(614e9), moneyWords(614e9)]) assert.doesNotMatch(text, /mil M€/);
  assert.deepEqual(moneyParts(166693e6), { number: '166.693', unit: 'M€' });
  assert.deepEqual(moneyParts(5348e9), { number: '5,3', unit: `billones${NBSP}€` });
});
