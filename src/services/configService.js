// services/configService.js
// Handles reading and writing the JSON config file.
//
// Config file format:
// {
//   "credentials": "<base64-encoded JSON with username/password/clientId/tenantId>",
//   "llmsuite": {
//     "baseUrl": "https://your-llmsuite.com/v1",
//     "apiKey": "sk-...",
//     "model": "gpt-4o"
//   },
//   "rules": [
//     {
//       "id": "rule_1",
//       "name": "Flag urgent emails",
//       "condition": "Subject contains URGENT or ASAP",
//       "action": "Flag the email and set importance to high",
//       "enabled": true
//     }
//   ]
// }

/**
 * Parse and validate a loaded config file.
 * Returns { credentials (raw base64), llmsuite, rules }
 */
export function parseConfig(jsonString) {
    let config;
    try {
        config = JSON.parse(jsonString);
    } catch {
        throw new Error("Invalid JSON — could not parse config file.");
    }

    if (!config.credentials) {
        throw new Error("Config is missing 'credentials' field.");
    }
    if (!config.llmsuite?.baseUrl || !config.llmsuite?.apiKey) {
        throw new Error("Config is missing 'llmsuite.baseUrl' or 'llmsuite.apiKey'.");
    }
    if (!Array.isArray(config.rules)) {
        // Rules are optional on first load — start with empty array
        config.rules = [];
    }

    return {
        credentials: config.credentials,  // base64 string — decoded later by authService
        llmsuite: {
            baseUrl: config.llmsuite.baseUrl,
            apiKey: config.llmsuite.apiKey,
            model: config.llmsuite.model || "gpt-4o",
        },
        rules: config.rules,
    };
}

/**
 * Serialise the current app state back to a config JSON string for download.
 * Credentials are kept as-is (still base64 encoded).
 */
export function serialiseConfig({ credentialsBase64, llmsuite, rules }) {
    const config = {
        credentials: credentialsBase64,
        llmsuite,
        rules,
    };
    return JSON.stringify(config, null, 2);
}

/**
 * Trigger a browser download of the config JSON file.
 */
export function downloadConfigFile(jsonString, filename = "mailmind-config.json") {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Read a File object as text (returns a Promise<string>).
 */
export function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsText(file);
    });
}

/**
 * Generate an example config JSON with placeholder values — useful for first-time setup.
 */
export function generateExampleConfig() {
    const exampleCreds = btoa(JSON.stringify({
        username: "user@yourcompany.com",
        password: "YourPasswordHere",
        clientId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        tenantId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    }));

    return JSON.stringify({
        credentials: exampleCreds,
        llmsuite: {
            baseUrl: "https://your-llmsuite-instance.com/v1",
            apiKey: "your-llmsuite-api-key",
            model: "gpt-4o",
        },
        rules: [
            {
                id: "rule_1",
                name: "Flag Urgent Emails",
                condition: "Subject or body contains URGENT, ASAP, immediately, or critical",
                action: "Flag the email and set importance to high",
                enabled: true,
            },
            {
                id: "rule_2",
                name: "Archive Newsletters",
                condition: "Email looks like a newsletter, marketing or promotional content",
                action: "Move to archive folder and mark as read",
                enabled: true,
            },
        ],
    }, null, 2);
}