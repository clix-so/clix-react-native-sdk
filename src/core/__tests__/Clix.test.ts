import { Clix } from '../Clix';

describe('Clix Core', () => {
  it('should be defined', () => {
    expect(Clix).toBeDefined();
  });

  it('should have initialize method', () => {
    expect(typeof Clix.initialize).toBe('function');
  });

  it('should have setUserId method', () => {
    expect(typeof Clix.setUserId).toBe('function');
  });

  it('should have setUserProperty method', () => {
    expect(typeof Clix.setUserProperty).toBe('function');
  });

  it('should have getDeviceId method', () => {
    expect(typeof Clix.getDeviceId).toBe('function');
  });

  it('should have getPushToken method', () => {
    expect(typeof Clix.getPushToken).toBe('function');
  });
}); 