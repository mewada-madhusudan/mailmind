// services/llmService.js
// Integration with LLMSuite API for email classification

const LLMSUITE_BASE = import.meta.env.VITE_LLMSUITE_BASE_URL || "https://your-llmsuite-instance.com/api";
const LLMSUITE_API_KEY = import.meta.env.VITE_LLMSUITE_API_KEY || "";

/**
 * Classify a batch of emails using LLMSuite
 *
 * @param {Array} sanitizedMails - Array of sanitized mail objects (from sanitizeMailForLLM)
 * @param {Array} rules - User-defined classification rules
 * @param {Object} options - Additional options (model, temperature, etc.)
 * @returns {Promise<Array>} - Array of classification results with actions
 */
export async function classifyMails(sanitizedMails, rules, options = {}) {
  const {
    model = import.meta.env.VITE_LLMSUITE_MODEL || "gpt-4o",
    batchSize = 10,
    onProgress = null,
  } = options;

  const allResults = [];

  // Process in batches to avoid token limits
  for (let i = 0; i < sanitizedMails.length; i += batchSize) {
    const batch = sanitizedMails.slice(i, i + batchSize);
    const results = await classifyBatch(batch, rules, model);
    allResults.push(...results);

    if (onProgress) {
      onProgress({
        processed: Math.min(i + batchSize, sanitizedMails.length),
        total: sanitizedMails.length,
        results: allResults,
      });
    }
  }

  return allResults;
}

async function classifyBatch(mails, rules, model) {
  const systemPrompt = buildSystemPrompt(rules);
  const userPrompt = buildUserPrompt(mails);

  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1, // Low temp for deterministic classification
  };

  const response = await fetch(`${LLMSUITE_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLMSUITE_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `LLMSuite API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  try {
    const parsed = JSON.parse(content);
    return parsed.classifications || [];
  } catch {
    console.error("Failed to parse LLMSuite response:", content);
    throw new Error("LLMSuite returned invalid JSON response");
  }
}

/**
 * Build the system prompt with classification rules
 */
function buildSystemPrompt(rules) {
  const rulesText = rules.length
    ? rules.map((r, i) => `Rule ${i + 1}: ${r.name}\n  Condition: ${r.condition}\n  Action: ${r.action}`).join("\n\n")
    : "No specific rules defined. Use general best practices to classify emails.";

  return `You are an intelligent email classification assistant. Your job is to analyze emails and determine what actions should be taken on each one based on the user's rules.

## User's Classification Rules
${rulesText}

## Your Task
For each email provided, return a JSON classification with the appropriate actions.

## Available Actions
- "move": Move to a folder (provide folderId: inbox/junk/deleteditems/archive or a custom folder name)
- "flag": Flag the email (flagStatus: "flagged" | "notFlagged" | "complete")
- "markRead": Mark as read/unread (isRead: true | false)
- "categorise": Set Outlook categories (categories: string[])
- "setImportance": Set importance (importance: "low" | "normal" | "high")
- "delete": Delete the email

## Response Format
Always respond with valid JSON in this exact format:
{
  "classifications": [
    {
      "messageId": "the email id",
      "matchedRule": "Rule name or 'No rule matched'",
      "reasoning": "Brief explanation of why this classification was chosen",
      "confidence": 0.0-1.0,
      "actions": [
        { "action": "flag", "flagStatus": "flagged" },
        { "action": "categorise", "categories": ["Important"] }
      ]
    }
  ]
}

If no action is needed, return an empty actions array. Be conservative — only act when confident.`;
}

/**
 * Build the user prompt with email data
 */
function buildUserPrompt(mails) {
  return `Please classify the following ${mails.length} email(s):

${JSON.stringify(mails, null, 2)}

Return your classifications as JSON.`;
}

/**
 * Test LLMSuite API connectivity
 */
export async function testLLMSuiteConnection() {
  try {
    const response = await fetch(`${LLMSUITE_BASE}/models`, {
      headers: { Authorization: `Bearer ${LLMSUITE_API_KEY}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}
