import { describe, it, expect } from 'vitest';
import { base64UrlEncode, sanitizeRedirect, mapLoginMethodParamsForUrl, generateAuthUrl, Scopes, IssuerRouteTypes } from './index';
import type { LoginMethodParams, LoginOptions } from './index';

describe('base64UrlEncode', () => {
  it('should encode a string to base64 URL safe format', () => {
    const input = 'test string';
    const expectedOutput = 'dGVzdCBzdHJpbmc';
    expect(base64UrlEncode(input)).toBe(expectedOutput);
  });
});

describe('sanitizeRedirect', () => {
  it('should remove trailing slash from URL', () => {
    const input = 'https://example.com/';
    const expectedOutput = 'https://example.com';
    expect(sanitizeRedirect(input)).toBe(expectedOutput);
  });

  it('should return the same URL if no trailing slash', () => {
    const input = 'https://example.com';
    const expectedOutput = 'https://example.com';
    expect(sanitizeRedirect(input)).toBe(expectedOutput);
  });
});

describe('mapLoginMethodParamsForUrl', () => {
  it('should map login method params to URL params', () => {
    const options: Partial<LoginMethodParams> = {
      loginHint: 'user@example.com',
      isCreateOrg: true,
      connectionId: 'conn123',
      redirectURL: 'https://example.com/',
      audience: 'audience123',
      showCompleteScreen: true,
    };
    const expectedOutput = {
      login_hint: 'user@example.com',
      is_create_org: 'true',
      connection_id: 'conn123',
      redirect_uri: 'https://example.com',
      audience: 'audience123',
      scope: "email profile openid offline",
      show_complete_screen: 'true',

    };
    expect(mapLoginMethodParamsForUrl(options)).toEqual(expectedOutput);
  });

  it('should handle undefined values in options', () => {
    const options: Partial<LoginMethodParams> = {};
    const expectedOutput = {
        scope: "email profile openid offline"
    };
    expect(mapLoginMethodParamsForUrl(options)).toEqual(expectedOutput);
  });
});

describe('generateAuthUrl', () => {
    it('should generate the correct auth URL with required parameters', () => {
      const domain = 'https://auth.example.com';
      const options: LoginOptions = {
        clientId: 'client123',
        responseType: 'code',
        scope: [Scopes.openid, Scopes.profile],
        loginHint: 'user@example.com',
        isCreateOrg: true,
        connectionId: 'conn123',
        redirectURL: 'https://example.com',
        audience: 'audience123',
        prompt: 'login',
      };
      const expectedUrl = 'https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&start_page=login&login_hint=user%40example.com&is_create_org=true&connection_id=conn123&redirect_uri=https%3A%2F%2Fexample.com&audience=audience123&scope=openid+profile&prompt=login';
  
      const result = generateAuthUrl(domain, IssuerRouteTypes.login, options);
      expect(result.toString()).toBe(expectedUrl);
    });
  
    it('should include optional parameters if provided', () => {
      const domain = 'https://auth.example.com';
      const options: LoginOptions = {
        clientId: 'client123',
        responseType: 'code',
        scope: [Scopes.openid, Scopes.profile],
        state: 'state123',
        codeChallenge: 'challenge123',
        codeChallengeMethod: 'S256',
        redirectURL: 'https://example2.com',
        prompt: 'create',
      };
      const expectedUrl = 'https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&start_page=login&redirect_uri=https%3A%2F%2Fexample2.com&scope=openid+profile&prompt=create&state=state123&code_challenge=challenge123&code_challenge_method=S256';
  
      const result = generateAuthUrl(domain, IssuerRouteTypes.login, options);
      expect(result.toString()).toBe(expectedUrl);
    });
  
    it('should handle default responseType if not provided', () => {
      const domain = 'https://auth.example.com';
      const options: LoginOptions = {
        clientId: 'client123',
        scope: [Scopes.openid, Scopes.profile, Scopes.offline_access],
        redirectURL: 'https://example2.com',
        prompt: 'create',
      };
      const expectedUrl = 'https://auth.example.com/oauth2/auth?client_id=client123&response_type=code&start_page=login&redirect_uri=https%3A%2F%2Fexample2.com&scope=openid+profile+offline_access&prompt=create';
  
      const result = generateAuthUrl(domain, IssuerRouteTypes.login, options);
      expect(result.toString()).toBe(expectedUrl);
    });
  });