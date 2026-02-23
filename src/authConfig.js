// authConfig.js - Microsoft Azure AD / MSAL Configuration
export const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "YOUR_AZURE_CLIENT_ID",
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || "common"}`,
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
};

// Graph API scopes required
export const graphScopes = {
    scopes: [
        "User.Read",
        "Mail.Read",
        "Mail.ReadWrite",    // for move/mark/flag
        "MailboxSettings.Read",
    ],
};

export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";