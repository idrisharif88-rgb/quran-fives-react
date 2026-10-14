import { describe, it, expect } from 'vitest';
import { quizNotice } from './quizUtils';

// pointer = عدد ما قُدّم من أسئلة الدورة عند طلب السؤال التالي
describe('quizNotice', () => {
  it('announces the result after the last question instead of restarting', () => {
    expect(quizNotice({ orderLength: 114, pointer: 114 })).toEqual({ kind: 'finished', completed: 114, total: 114 });
    expect(quizNotice({ orderLength: 5, pointer: 5 })).toMatchObject({ kind: 'finished', total: 5 });
  });

  it('congratulates at every hundred on the way', () => {
    expect(quizNotice({ orderLength: 1202, pointer: 100 })).toEqual({ kind: 'milestone', completed: 100, total: 1202 });
    expect(quizNotice({ orderLength: 1202, pointer: 200 })).toMatchObject({ kind: 'milestone', completed: 200 });
    expect(quizNotice({ orderLength: 1202, pointer: 150 })).toBeNull();
    expect(quizNotice({ orderLength: 1202, pointer: 1 })).toBeNull();
  });

  it('the end wins over a milestone that falls on it', () => {
    expect(quizNotice({ orderLength: 200, pointer: 200 })).toMatchObject({ kind: 'finished' });
  });

  it('says nothing when a new cycle is asked for or the range changed', () => {
    expect(quizNotice({ forced: true, orderLength: 114, pointer: 114 })).toBeNull();
    expect(quizNotice({ rangeChanged: true, orderLength: 114, pointer: 114 })).toBeNull();
    expect(quizNotice({ orderLength: 0, pointer: 0 })).toBeNull();
  });
});
