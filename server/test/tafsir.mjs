// اختبار مقاطع القمي: الآية تأخذ مقطعها أو أقرب مقطع قبلها في السورة نفسها
import assert from 'node:assert/strict';
import { loadQummi, qummiFor } from '../tafsirRoutes.js';
const data = loadQummi();
assert.ok(data.map['2:3']);
assert.equal(qummiFor(data, 2, 3).from, '2:3');
const fill = qummiFor(data, 2, 4);
assert.ok(fill && fill.from.startsWith('2:'));
assert.equal(qummiFor(data, 108, 1), null);
console.log('tafsir ok');
