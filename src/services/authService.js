// services/authService.js
// Authenticates against Microsoft Graph using ROPC (Resource Owner Password Credentials)
// This requires your Azure App Registration to have ROPC enabled and
// "Allow public client flows" turned ON under Authentication settings.
//
// ⚠ ROPC limitations:
//   - Does NOT work with accounts that have MFA enabled
//   - Does NOT work with personal Microsoft accounts (only org/work accounts)
//   - Microsoft considers ROPC a legacy flow — use only in trusted internal tooling

const TOKEN_ENDPOINT = (tenantId) =>
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

const GRAPH_SCOPES = [
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/Mail.Read",
    "https://graph.microsoft.com/Mail.ReadWrite",
    "https://graph.microsoft.com/MailboxSettings.Read",
].join(" ");

/**
 * Authenticate using username + password via ROPC grant.
 * Returns { accessToken, expiresAt, username }
 *
 * @param {object} credentials
 * @param {string} credentials.username  - UPN e.g. user@company.com
 * @param {string} credentials.password  - plaintext password (decoded from base64 before calling)
 * @param {string} credentials.clientId  - Azure App Registration client ID
 * @param {string} credentials.tenantId  - Azure tenant ID (NOT 'common' — must be specific)
 */
export async function authenticateROPC({ username, password, clientId, tenantId }) {
    const body = new URLSearchParams({
        grant_type: "password",
        client_id: clientId,
        username,
        password,
        scope: `openid profile offline_access ${GRAPH_SCOPES}`,
    });

    const response = await fetch(TOKEN_ENDPOINT(tenantId), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
        const msg = data.error_description || data.error || `Auth failed (${response.status})`;
        throw new Error(msg);
    }

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 60s buffer
        username,
    };
}

/**
 * Refresh an existing access token using the refresh token.
 */
export async function refreshAccessToken({ refreshToken, clientId, tenantId }) {
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token: refreshToken,
        scope: `openid profile offline_access ${GRAPH_SCOPES}`,
    });

    const response = await fetch(TOKEN_ENDPOINT(tenantId), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(data.error_description || "Token refresh failed");
    }

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
}

/**
 * Decode the base64-encoded credentials block from the JSON config.
 * Expected base64 payload (before encoding):
 * {
 *   "username": "user@company.com",
 *   "password": "secret123",
 *   "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
 *   "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 * }
 */
export function decodeCredentials(base64String) {
    try {
        const json = atob(base64String);
        const parsed = JSON.parse(json);
        const required = ["username", "password"];
        for (const key of required) {
            if (!parsed[key]) throw new Error(`Missing field in credentials: ${key}`);
        }
        return parsed;
    } catch (err) {
        throw new Error(`Invalid credentials block: ${err.message}`);
    }
}