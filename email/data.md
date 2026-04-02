📄 Product Requirements Document (PRD)
Project: Email Manager v2 (Modernized)
1. 🧭 Overview
Objective

Migrate the existing Email Manager (PyQt + Excel-based mapping) into a modern system with:

React frontend
FastAPI backend
JSON-based configuration (import/export)
Job scheduling (draft, track, download)
Reduced manual effort through automation
2. 🧱 Current System (Reference)
Existing Stack
UI: PyQt5
Config: Excel (3 sheets)
Draft
Track
Download
Draft Sheet Fields (important for migration)
Process Name
Subject Line
Need to Process Y/N
TO / CC stakeholders
Attachment Folder Path
Attachment File Name
Shared Mailbox
Log Output Path
Email Body Excel/Docx
Reminder Email Body Path
Draft/Send
Find_One → Replace_Five
3. 🎯 Goals
Functional Goals
Replace Excel config with JSON
Provide UI to create/edit jobs
Support:
Draft emails
Track responses
Download attachments
Add scheduling (daily/cron-like)
Add logging & monitoring
Non-Goals (for v1)
Multi-user authentication
Cloud deployment
Database (use JSON only)
4. 🏗️ Target Architecture
Frontend
React (with Vite or Next.js)
UI library: Material UI / Ant Design
Backend
FastAPI
APScheduler (job scheduling)
Storage
JSON file (config)
File-based logs
5. 📁 Data Model (JSON आधारित)
File: config.json
{
  "version": "1.0",
  "jobs": [
    {
      "id": "job_001",
      "process_name": "string",
      "subject": "string",

      "recipients": {
        "to": ["string"],
        "cc": ["string"]
      },

      "mailbox": "string",
      "shared_mailbox": "string",

      "attachments": {
        "folder_path": "string",
        "file_name": "string"
      },

      "content": {
        "body_template_path": "string",
        "reminder_template_path": "string"
      },

      "find_replace": [
        {
          "find": "string",
          "replace": "string",
          "order": 1
        }
      ],

      "actions": {
        "draft": true,
        "track": true,
        "download": false,
        "send": false
      },

      "schedule": {
        "enabled": true,
        "type": "daily",
        "time": "10:00"
      },

      "metadata": {
        "created_at": "",
        "last_run": "",
        "status": "idle"
      }
    }
  ]
}
6. ⚙️ Backend Requirements (FastAPI)
6.1 API Endpoints
Config APIs
GET /jobs → list all jobs
POST /jobs → create job
PUT /jobs/{id} → update job
DELETE /jobs/{id} → delete job
Import/Export
POST /import-config → upload JSON
GET /export-config → download JSON
Execution APIs
POST /jobs/{id}/run → run job manually
GET /jobs/{id}/logs → fetch logs
6.2 Scheduler

Use APScheduler

Behavior:
On backend startup:
Load config.json
Register all scheduled jobs
Supported:
Daily run
Future: cron expressions
6.3 Core Logic (Reuse from PyQt code)

Claude should:

Extract logic from existing PyQt code for:
Email drafting
Outlook integration
Attachment handling
Find/Replace logic
Refactor into backend services:
email_service.py
tracking_service.py
download_service.py
7. 🎨 Frontend Requirements (React)
7.1 Pages
1. Dashboard
List all jobs
Status:
Active / Scheduled / Failed
Buttons:
Run
Edit
Delete
2. Create / Edit Job Form

Fields:

Process Name
Subject
TO / CC (multi-input)
Mailbox / Shared Mailbox
Attachment path picker
Template file selector
Find/Replace dynamic rows
Actions (checkboxes)
Schedule (time picker)
3. Logs Viewer
Show execution history
Filter by job
4. Import / Export
Upload JSON
Download JSON
8. 🔁 Functional Flows
8.1 Create Job
User fills form
Frontend sends JSON to backend
Backend validates
Saves to config.json
8.2 Run Job
User clicks "Run"
Backend:
Applies find/replace
Drafts or sends email
Logs result
8.3 Scheduled Run
Scheduler triggers job
Same flow as manual run
8.4 Tracking
Check mailbox
Identify replies
Update logs
8.5 Download
Download attachments from responses
Save to folder
9. 📜 Logging
File-based logging:
logs/{job_id}.log

Each entry:

timestamp | status | message
10. ⚠️ Validation Rules
Process Name required
At least one TO recipient
Valid file paths
Unique job ID
Schedule format valid
11. 🔐 Error Handling
Fail job gracefully
Log errors
Show error in UI
12. 🔄 Migration Requirement (IMPORTANT)

Claude MUST:

Analyze existing PyQt code
Extract reusable logic
DO NOT rewrite email logic from scratch
Convert:
Excel reading → JSON parsing
UI logic → API endpoints
13. 📦 Deliverables Expected from Claude
Backend
FastAPI app
Scheduler integration
JSON config handler
Services (email, tracking, download)
Frontend
React app
Forms + dashboard
API integration
14. 🚀 Future Scope (Do NOT implement now)
Database (PostgreSQL)
User authentication
Role-based access
Email analytics dashboard
15. 🧠 Instructions for Claude (IMPORTANT)
Use existing code as base for logic
Do NOT over-engineer
Keep config JSON-based
Ensure modular structure
Keep UI simple but functional
Focus on maintainability
✅ Summary

This system should:

Remove Excel dependency
Reduce manual operations
Add scheduling
Be extensible in future
