# Outlook Automation Reference (Microsoft Graph API)

Base URL
outlook proxy

Authentication
All requests require an OAuth access token in header:

Authorization: Bearer ACCESS_TOKEN

Content-Type: application/json

---

1. Move Email to Another Folder

---

Endpoint
POST /me/messages/{message-id}/move

Body
{
"destinationId": "folder-id"
}

Notes

* destinationId is the ID of the target folder.
* Returns the moved message.

---

2. Copy Email to Another Folder

---

Endpoint
POST /me/messages/{message-id}/copy

Body
{
"destinationId": "folder-id"
}

Notes

* Keeps the original email and creates a copy in the destination folder.

---

3. Create a New Folder

---

Endpoint
POST /me/mailFolders

Body
{
"displayName": "Finance"
}

---

4. Add Categories (Labels) to Email

---

Endpoint
PATCH /me/messages/{message-id}

Body
{
"categories": ["Finance", "Invoice"]
}

---

5. Mark Email as Read / Unread

---

Endpoint
PATCH /me/messages/{message-id}

Mark as Read
{
"isRead": true
}

Mark as Unread
{
"isRead": false
}


8. Create Task from Email

---

Endpoint
POST /me/todo/lists/{list-id}/tasks

Body
{
"title": "Reply to customer email",
"body": {
"content": "Follow up regarding invoice email",
"contentType": "text"
},
"dueDateTime": {
"dateTime": "2026-03-10T17:00:00",
"timeZone": "UTC"
}
}

Notes
Tasks are created in Microsoft To Do.

---

9. Create Calendar Event from Email

---

Endpoint
POST /me/events

Body
{
"subject": "Meeting from Email Request",
"start": {
"dateTime": "2026-03-10T15:00:00",
"timeZone": "UTC"
},
"end": {
"dateTime": "2026-03-10T16:00:00",
"timeZone": "UTC"
},
"body": {
"contentType": "HTML",
"content": "Created automatically from email"
}
}

---

10. Set Reminder (via Task or Event)

---

Example Event Reminder

POST /me/events

{
"subject": "Reminder: respond to email",
"start": {
"dateTime": "2026-03-10T12:00:00",
"timeZone": "UTC"
},
"end": {
"dateTime": "2026-03-10T12:30:00",
"timeZone": "UTC"
},
"isReminderOn": true,
"reminderMinutesBeforeStart": 15
}

