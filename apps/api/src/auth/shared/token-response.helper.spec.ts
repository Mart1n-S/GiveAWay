import { buildAuthResponse } from './token-response.helper';

describe('buildAuthResponse', () => {
  const user = { id: 1, email: 'test@test.com' };
  const accessToken = 'my_access_token';
  const refreshToken = 'my_refresh_token';
  const message = 'Connexion réussie';

  describe('client web (clientType undefined ou non-mobile)', () => {
    it('✅ Doit retourner message + user sans backendTokens', () => {
      const result = buildAuthResponse(
        undefined,
        user,
        accessToken,
        refreshToken,
        message,
      );

      expect(result.message).toBe(message);
      expect(result.user).toEqual(user);
      expect(result).not.toHaveProperty('backendTokens');
    });

    it('✅ Doit retourner message + user pour clientType "web"', () => {
      const result = buildAuthResponse(
        'web',
        user,
        accessToken,
        refreshToken,
        message,
      );

      expect(result.message).toBe(message);
      expect(result).not.toHaveProperty('backendTokens');
    });

    it('✅ Doit retourner message + user pour clientType quelconque non-mobile', () => {
      const result = buildAuthResponse(
        'desktop',
        user,
        accessToken,
        refreshToken,
        message,
      );

      expect(result).not.toHaveProperty('backendTokens');
    });
  });

  describe('client mobile (clientType === "mobile")', () => {
    it('✅ Doit inclure backendTokens avec accessToken, refreshToken et expiresIn', () => {
      const result = buildAuthResponse(
        'mobile',
        user,
        accessToken,
        refreshToken,
        message,
      );

      expect(result.message).toBe(message);
      expect(result.user).toEqual(user);
      expect(result.backendTokens).toBeDefined();
      expect(result.backendTokens?.accessToken).toBe(accessToken);
      expect(result.backendTokens?.refreshToken).toBe(refreshToken);
      expect(result.backendTokens?.expiresIn).toBe(15 * 60 * 1000);
    });
  });

  describe('cas limites', () => {
    it('✅ Doit fonctionner avec un user undefined (cas refresh)', () => {
      const result = buildAuthResponse(
        undefined,
        undefined,
        accessToken,
        refreshToken,
        'Session rafraîchie',
      );

      expect(result.message).toBe('Session rafraîchie');
      expect(result.user).toBeUndefined();
    });

    it('✅ Doit fonctionner avec un user undefined en mobile', () => {
      const result = buildAuthResponse(
        'mobile',
        undefined,
        accessToken,
        refreshToken,
        'Session rafraîchie',
      );

      expect(result.backendTokens?.accessToken).toBe(accessToken);
      expect(result.user).toBeUndefined();
    });
  });
});
