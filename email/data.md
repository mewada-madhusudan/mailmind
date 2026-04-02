You are a senior full-stack engineer.

I have an existing Python PyQt5-based desktop tool called "Email Manager" which:
- Uses Excel as a config (3 sheets: Draft, Track, Download)
- Performs:
  - Email drafting/sending via Outlook
  - Tracking responses
  - Downloading attachments
  - Find/Replace dynamic content in emails

I want you to MODERNIZE this system using:

Frontend:
- React (simple, clean UI)

Backend:
- FastAPI (Python)

Storage:
- JSON file (NO database)

Scheduler:
- APScheduler

---

IMPORTANT INSTRUCTIONS:

1. You MUST reuse existing logic from my old PyQt code:
   - Email sending
   - Outlook integration
   - Attachment handling
   - Find/Replace logic

2. DO NOT rewrite business logic from scratch if it exists.

3. Replace:
   - Excel config → JSON config
   - UI logic → API endpoints

---

SYSTEM REQUIREMENTS:

### Features:
- Create/Edit/Delete Jobs
- Run job manually
- Schedule jobs (daily)
- Track responses
- Download attachments
- Logging per job

---

### JSON Structure:

Use this format:
{
  "version": "1.0",
  "jobs": [
    {
      "id": "job_001",
      "process_name": "",
      "subject": "",
      "recipients": {
        "to": [],
        "cc": []
      },
      "attachments": {
        "folder_path": "",
        "file_name": ""
      },
      "content": {
        "body_template_path": "",
        "reminder_template_path": ""
      },
      "find_replace": [],
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
      }
    }
  ]
}

---

### Backend Requirements:
- FastAPI app
- APIs:
  - GET /jobs
  - POST /jobs
  - PUT /jobs/{id}
  - DELETE /jobs/{id}
  - POST /jobs/{id}/run
- APScheduler integration
- JSON read/write handler
- Services:
  - email_service
  - tracking_service
  - download_service

---

### Frontend Requirements:
- Dashboard (list jobs)
- Job Form (create/edit)
- Logs Viewer
- Import/Export JSON

---

### Folder Structure:
Follow the structure in the attached markdown file.

---

### Deliverables:
1. Complete backend code (modular)
2. Complete React frontend
3. Integration between frontend and backend
4. Scheduler working
5. Logging system

---

### Constraints:
- Keep it simple (no overengineering)
- No database
- Code should be clean and modular
- Easy to extend later

---

Now I will provide my existing PyQt code.
Analyze it and start building the new system accordingly.
