process.env.NODE_ENV='test';
process.env.JWT_SECRET ||= 'test-only-access-secret-123456789';
process.env.JWT_REFRESH_SECRET ||= 'test-only-refresh-secret-123456789';
process.env.BCRYPT_ROUNDS='4';
