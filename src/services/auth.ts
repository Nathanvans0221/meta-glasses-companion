import { useSettingsStore } from '../stores/settingsStore';

const FUSIONAUTH_URL = 'https://auth.silverfern.app';
const APPLICATION_ID = '4f8a80bc-8d41-48dd-81cd-9580a6b7c610';
const API_KEY = 'Wqbx4M_8N1LycUVmOxGU9AS2Xu3lFbzr4E8oYIYqO1bK2w6yAjmaM26a';

interface FusionAuthLoginResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    data?: Record<string, any>;
  };
}

/**
 * Decode a JWT payload without verification (for extracting claims client-side).
 */
function decodeJwtPayload(token: string): Record<string, any> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(payload));
}

/**
 * Authenticate with FusionAuth and return token + user info.
 */
export async function login(
  email: string,
  password: string,
): Promise<{
  token: string;
  refreshToken?: string;
  user: FusionAuthLoginResponse['user'];
  tenantId?: string;
}> {
  const response = await fetch(`${FUSIONAUTH_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: API_KEY,
    },
    body: JSON.stringify({
      loginId: email,
      password,
      applicationId: APPLICATION_ID,
    }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Invalid email or password.');
    }
    if (response.status === 423) {
      throw new Error('Account is locked. Contact your administrator.');
    }
    if (response.status === 409) {
      throw new Error('Account not active. Please verify your email.');
    }
    if (response.status === 412) {
      throw new Error('Two-factor authentication required.');
    }

    const body = await response.json().catch(() => null);
    const msg =
      body?.generalErrors?.[0]?.message || `Login failed (${response.status})`;
    throw new Error(msg);
  }

  const data: FusionAuthLoginResponse = await response.json();

  // Extract tenant ID from JWT claims
  let tenantId: string | undefined;
  try {
    const claims = decodeJwtPayload(data.token);
    tenantId = claims.wsTenantId || claims.tenantId;
  } catch {
    // Tenant ID is optional — will fall back to settings default
  }

  return {
    token: data.token,
    refreshToken: data.refreshToken,
    user: data.user,
    tenantId,
  };
}

/**
 * Check if a JWT is expired (with 60s buffer).
 */
export function isTokenExpired(token: string): boolean {
  try {
    const claims = decodeJwtPayload(token);
    if (!claims.exp) return false;
    return Date.now() / 1000 > claims.exp - 60;
  } catch {
    return true;
  }
}
