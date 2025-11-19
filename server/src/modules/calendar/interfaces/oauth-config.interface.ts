export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthUrlConfig {
  provider: string;
  authorizationRedirectUri: string;
  tokenExchangeRedirectUri: string;
  match: boolean;
  details: string;
}

export interface OAuthUrlConfig {
  provider: string;
  authorizationRedirectUri: string;
  tokenExchangeRedirectUri: string;
  match: boolean;
  details: string;
}
