import { useSettingsStore } from '../stores/settingsStore';

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Lightweight GraphQL client for the WorkSuite API (WSAPI).
 * Reads connection config from the settings store.
 */
class WsapiService {
  /**
   * Execute a GraphQL query against the WorkSuite API.
   * Throws if not configured or request fails.
   */
  async query<T = any>(
    queryString: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const { wsapiUrl, wsapiToken, wsapiTenantId } = useSettingsStore.getState();

    if (!wsapiUrl || !wsapiToken) {
      throw new Error('WorkSuite API not configured — add URL and token in Settings.');
    }

    const endpoint = wsapiUrl.endsWith('/graphql')
      ? wsapiUrl
      : `${wsapiUrl}/graphql`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wsapiToken}`,
      },
      body: JSON.stringify({
        query: queryString,
        variables: { ...variables, tenantId: wsapiTenantId },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`WSAPI ${response.status}: ${text.slice(0, 200)}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors?.length) {
      throw new Error(`WSAPI: ${result.errors.map((e) => e.message).join('; ')}`);
    }

    if (!result.data) {
      throw new Error('WSAPI returned empty data');
    }

    return result.data;
  }

  /**
   * Check if WSAPI is configured (has URL and token).
   */
  isConfigured(): boolean {
    const { wsapiUrl, wsapiToken } = useSettingsStore.getState();
    return Boolean(wsapiUrl && wsapiToken);
  }
}

export const wsapiService = new WsapiService();
