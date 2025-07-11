import Clix from '../index';

describe('Clix SDK', () => {
  it('should export Clix module', () => {
    expect(Clix).toBeDefined();
  });

  it('should have initialize method', () => {
    expect(typeof Clix.initialize).toBe('function');
  });
});
