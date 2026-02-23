# MailMind — Intelligent Email Classifier

A React application that connects to Microsoft Outlook via the Graph API, classifies emails using your LLMSuite instance, and automatically moves/flags/marks them based on natural-language rules you define.

---

## Architecture Overview

```
Outlook (Graph API)
      │
      ▼
  fetchNewMails()         ← Only fetches: subject, from, bodyPreview (500 chars), metadata
      │
      ▼
  sanitizeMailForLLM()    ← Strips sensitive content, limits payload size
      │
      ▼
  LLMSuite API            ← Receives sanitized mail + your rules → returns JSON actions
      │
      ▼
  applyClassificationActions()  ← Calls Graph API to flag/move/mark/categorise
      │
      ▼
  Outlook (updated)
```

---

## Setup

### 1. Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **App Registrations** → **New Registration**
2. Name: `MailMind` | Supported account types: choose based on your org
3. Redirect URI: `Single-page application (SPA)` → `http://localhost:5173`
4. Under **Authentication**, enable **Access tokens** and **ID tokens**
5. Under **API Permissions**, add Microsoft Graph delegated permissions:
   - `User.Read`
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `MailboxSettings.Read`
6. Grant admin consent (if required by your tenant)
7. Copy the **Application (client) ID** and **Tenant ID**

### 2. Environment Variables

```bash
cp .env .env
# Edit .env with your values:
#   VITE_AZURE_CLIENT_ID=...
#   VITE_AZURE_TENANT_ID=...
#   VITE_LLMSUITE_BASE_URL=...
#   VITE_LLMSUITE_API_KEY=...
#   VITE_LLMSUITE_MODEL=...
```

### 3. Install & Run

```bash
npm install
npm run dev
```

---

## LLMSuite Integration

The app expects LLMSuite to expose an **OpenAI-compatible `/chat/completions` endpoint**. The app sends:

- A **system prompt** containing all enabled rules
- A **user message** with sanitized email data (JSON)
- `response_format: { type: "json_object" }` to enforce structured output

**Expected LLMSuite response format:**

```json
{
  "classifications": [
    {
      "messageId": "AAMkAGI...",
      "matchedRule": "Flag Urgent Emails",
      "reasoning": "Subject contains 'ASAP' and tone is demanding",
      "confidence": 0.95,
      "actions": [
        { "action": "flag", "flagStatus": "flagged" },
        { "action": "setImportance", "importance": "high" },
        { "action": "categorise", "categories": ["Urgent"] }
      ]
    }
  ]
}
```

If your LLMSuite uses a different base path (e.g. `/api/v1`), update `VITE_LLMSUITE_BASE_URL` accordingly.

---

## Privacy & Security

| Data sent to LLM | Data NOT sent |
|---|---|
| Email subject | Full email body |
| Sender email address | Attachments |
| Body preview (first 500 chars) | Recipient list |
| Metadata (importance, flag, date) | HTML content |

All Graph API calls are made from the **browser** using the user's own delegated OAuth token — no server-side proxy required.

---

## Available Actions

| Action | Parameters | Effect |
|---|---|---|
| `move` | `folderId` (string) | Move to folder (inbox, archive, junk, deleteditems, or custom ID) |
| `flag` | `flagStatus` | `flagged`, `notFlagged`, or `complete` |
| `markRead` | `isRead` (bool) | Mark as read/unread |
| `categorise` | `categories` (string[]) | Apply Outlook colour categories |
| `setImportance` | `importance` | `low`, `normal`, or `high` |
| `delete` | — | Move to Deleted Items |

---

## Project Structure

```
src/
├── authConfig.js           # MSAL + Graph API configuration
├── App.jsx                 # Main shell with tabs and auth flow
├── App.css                 # Global styles
├── main.jsx                # React entry point
├── context/
│   └── AppContext.jsx      # Global state (useReducer) + persistence
├── hooks/
│   └── useMailClassifier.js # Full pipeline orchestration hook
├── services/
│   ├── graphService.js     # All Graph API calls (fetch, move, flag, etc.)
│   └── llmService.js       # LLMSuite API integration
└── components/
    ├── MailList.jsx         # Email list with selection + inline classification badges
    ├── RulesEditor.jsx      # CRUD for classification rules (persisted to localStorage)
    ├── ClassificationPanel.jsx # Results view with confidence + action status
    └── Notifications.jsx   # Toast notification system
```
