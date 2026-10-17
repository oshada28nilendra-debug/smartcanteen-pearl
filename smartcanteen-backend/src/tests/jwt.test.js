const { signRefreshToken, verifyRefreshToken } = require('../config/jwt');

test('refresh tokens issued in the same second have distinct verified identities', () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(1800000000000);
  try {
    const first = signRefreshToken({ id: 'student-1' });
    const second = signRefreshToken({ id: 'student-1' });
    const firstClaims = verifyRefreshToken(first);
    const secondClaims = verifyRefreshToken(second);

    expect(firstClaims.iat).toBe(secondClaims.iat);
    expect(first).not.toBe(second);
    expect(firstClaims.jti).toEqual(expect.any(String));
    expect(firstClaims.jti).not.toBe(secondClaims.jti);
    expect(secondClaims.id).toBe('student-1');
  } finally {
    clock.mockRestore();
  }
});
