# Email Manager v2 - Starter Kit

## 📁 Folder Structure

email-manager/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   └── jobs.py
│   │   ├── services/
│   │   │   ├── email_service.py
│   │   │   ├── scheduler_service.py
│   │   ├── utils/
│   │   │   └── config_handler.py
│   │   └── models/
│   │       └── job_model.py
│   ├── config.json
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── JobForm.jsx
│   │   │   └── Logs.jsx
│   │   ├── api/
│   │   │   └── api.js
│   │   └── App.jsx
│   └── package.json
│
└── logs/


---

## ⚙️ Backend Starter Code

### main.py
```python
from fastapi import FastAPI
from app.routes import jobs

app = FastAPI()

app.include_router(jobs.router)

@app.get("/")
def root():
    return {"status": "running"}
```

---

### jobs.py
```python
from fastapi import APIRouter
from app.utils.config_handler import load_config, save_config

router = APIRouter()

@router.get("/jobs")
def get_jobs():
    return load_config()

@router.post("/jobs")
def create_job(job: dict):
    config = load_config()
    config["jobs"].append(job)
    save_config(config)
    return {"message": "Job added"}
```

---

### config_handler.py
```python
import json

CONFIG_FILE = "config.json"

def load_config():
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

def save_config(data):
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=4)
```

---

### scheduler_service.py
```python
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()

def start_scheduler():
    scheduler.start()
```

---

## 🎨 Frontend Starter Code

### api.js
```javascript
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000"
});

export const getJobs = () => API.get("/jobs");
export const createJob = (data) => API.post("/jobs", data);
```

---

### Dashboard.jsx
```javascript
import React, { useEffect, useState } from "react";
import { getJobs } from "../api/api";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    getJobs().then(res => setJobs(res.data.jobs));
  }, []);

  return (
    <div>
      <h2>Jobs</h2>
      {jobs.map(job => (
        <div key={job.id}>{job.process_name}</div>
      ))}
    </div>
  );
}
```

---

## 📄 Sample config.json

```json
{
  "version": "1.0",
  "jobs": []
}
```

---

## 🚀 How to Run

### Backend
```
pip install fastapi uvicorn apscheduler
uvicorn app.main:app --reload
```

### Frontend
```
npm install
npm run dev
```

