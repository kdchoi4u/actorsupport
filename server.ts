import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "data", "schedules_db.json");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface Worker {
  id: string;
  name: string;
  role: string; // "worker" | "admin"
  defaultRecipientName?: string;
  defaultRecipientBirth?: string;
}

interface Recipient {
  id: string;
  name: string;
  birth: string;
}

interface DaySchedule {
  slot1: { start: string; end: string };
  break: { start: string; end: string };
  slot2: { start: string; end: string };
  categories: {
    physical: number;
    social: number;
    household: number;
    other: number;
  };
  totalHours: number;
}

interface MonthlySchedule {
  id: string;
  workerName: string;
  recipientName: string;
  recipientBirth: string;
  year: number;
  month: number;
  days: { [day: string]: DaySchedule };
  totals: {
    totalHours: number;
    physical: number;
    social: number;
    household: number;
    other: number;
  };
  submittedDate?: string;
  recipientSignature?: string;
}

// Initial/Seed Data
const defaultDb = {
  workers: [
    { id: "w1", name: "김철수", role: "worker", defaultRecipientName: "홍길동", defaultRecipientBirth: "1955-08-15" },
    { id: "w2", name: "이영희", "role": "worker", defaultRecipientName: "정우성", defaultRecipientBirth: "1960-03-22" },
    { id: "w3", name: "박민수", "role": "worker", defaultRecipientName: "김희선", defaultRecipientBirth: "1972-11-05" },
    { id: "admin", name: "관리자", "role": "admin" }
  ] as Worker[],
  recipients: [
    { id: "r1", name: "홍길동", birth: "1955-08-15" },
    { id: "r2", name: "정우성", birth: "1960-03-22" },
    { id: "r3", name: "김희선", birth: "1972-11-05" }
  ] as Recipient[],
  schedules: [] as MonthlySchedule[]
};

// Seed some schedules for July 2026 to make the app look robust on load!
const seedSchedules = () => {
  const julySchedules: { [day: string]: DaySchedule } = {};
  
  // Let's seed weekdays of July 2026 (July 1 is Wednesday)
  // Work Mon-Fri, 09:00 ~ 12:00, Break 12:00 ~ 13:00, 13:00 ~ 18:00 (Total 8 hours)
  // Categories: 신체 3, 사회 3, 가사 2, 기타 0
  let totalHours = 0;
  let physical = 0;
  let social = 0;
  let household = 0;
  let other = 0;

  for (let d = 1; d <= 31; d++) {
    // July 2026 calendar days
    // 2026-07-01 is Wednesday. Weekday is (day + 2) % 7. 0 = Sun, 6 = Sat
    const weekday = (d + 2) % 7;
    const isWeekend = weekday === 0 || weekday === 6;
    
    if (!isWeekend && d <= 21) { // seed first 3 weeks of weekdays
      julySchedules[String(d)] = {
        slot1: { start: "09:00", end: "12:00" },
        break: { start: "12:00", end: "13:00" },
        slot2: { start: "13:00", end: "18:00" },
        categories: { physical: 3, social: 3, household: 2, other: 0 },
        totalHours: 8
      };
      totalHours += 8;
      physical += 3;
      social += 3;
      household += 2;
    } else {
      julySchedules[String(d)] = {
        slot1: { start: "", end: "" },
        break: { start: "", end: "" },
        slot2: { start: "", end: "" },
        categories: { physical: 0, social: 0, household: 0, other: 0 },
        totalHours: 0
      };
    }
  }

  defaultDb.schedules.push({
    id: "s_seed_1",
    workerName: "김철수",
    recipientName: "홍길동",
    recipientBirth: "1955-08-15",
    year: 2026,
    month: 7,
    days: julySchedules,
    totals: { totalHours, physical, social, household, other },
    submittedDate: "2026-07-05"
  });
};

// Initialize DB file if not exists
if (!fs.existsSync(DB_PATH)) {
  seedSchedules();
  fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), "utf-8");
}

const readDb = () => {
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return defaultDb;
  }
};

const writeDb = (data: any) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
};

app.use(express.json());

// API Endpoints
app.get("/api/workers", (req, res) => {
  const db = readDb();
  res.json(db.workers);
});

app.post("/api/workers", (req, res) => {
  const db = readDb();
  const newWorker = req.body;
  if (!newWorker.name) {
    return res.status(400).json({ error: "이름이 필요합니다." });
  }
  const id = newWorker.id || "w_" + Date.now();
  const existingIndex = db.workers.findIndex((w: any) => w.id === id || w.name === newWorker.name);
  
  const workerObj = {
    id,
    name: newWorker.name,
    role: newWorker.role || "worker",
    defaultRecipientName: newWorker.defaultRecipientName || "",
    defaultRecipientBirth: newWorker.defaultRecipientBirth || ""
  };

  if (existingIndex > -1) {
    db.workers[existingIndex] = workerObj;
  } else {
    db.workers.push(workerObj);
  }

  // Also add/update in recipients list if valid
  if (workerObj.defaultRecipientName) {
    const rIndex = db.recipients.findIndex((r: any) => r.name === workerObj.defaultRecipientName);
    const recipientObj = {
      id: "r_" + Date.now(),
      name: workerObj.defaultRecipientName,
      birth: workerObj.defaultRecipientBirth || ""
    };
    if (rIndex > -1) {
      db.recipients[rIndex].birth = workerObj.defaultRecipientBirth;
    } else {
      db.recipients.push(recipientObj);
    }
  }

  writeDb(db);
  res.json(workerObj);
});

app.get("/api/recipients", (req, res) => {
  const db = readDb();
  res.json(db.recipients);
});

app.get("/api/schedules", (req, res) => {
  const db = readDb();
  const { workerName, year, month } = req.query;
  let filtered = db.schedules;
  
  if (workerName) {
    filtered = filtered.filter((s: any) => s.workerName === workerName);
  }
  if (year) {
    filtered = filtered.filter((s: any) => s.year === parseInt(year as string));
  }
  if (month) {
    filtered = filtered.filter((s: any) => s.month === parseInt(month as string));
  }
  
  res.json(filtered);
});

app.post("/api/schedules", (req, res) => {
  const db = readDb();
  const scheduleData = req.body;
  
  if (!scheduleData.workerName || !scheduleData.recipientName || !scheduleData.year || !scheduleData.month) {
    return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
  }

  const existingIndex = db.schedules.findIndex((s: any) => 
    s.workerName === scheduleData.workerName &&
    s.year === parseInt(scheduleData.year) &&
    s.month === parseInt(scheduleData.month)
  );

  const scheduleObj = {
    id: scheduleData.id || "s_" + Date.now(),
    workerName: scheduleData.workerName,
    recipientName: scheduleData.recipientName,
    recipientBirth: scheduleData.recipientBirth || "",
    year: parseInt(scheduleData.year),
    month: parseInt(scheduleData.month),
    days: scheduleData.days,
    totals: scheduleData.totals,
    submittedDate: scheduleData.submittedDate || new Date().toISOString().split("T")[0],
    recipientSignature: scheduleData.recipientSignature || ""
  };

  if (existingIndex > -1) {
    db.schedules[existingIndex] = scheduleObj;
  } else {
    db.schedules.push(scheduleObj);
  }

  writeDb(db);
  res.json(scheduleObj);
});

app.delete("/api/schedules", (req, res) => {
  const db = readDb();
  const { workerName, year, month } = req.query;
  
  if (!workerName || !year || !month) {
    return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
  }

  db.schedules = db.schedules.filter((s: any) => 
    !(s.workerName === workerName &&
      s.year === parseInt(year as string) &&
      s.month === parseInt(month as string))
  );

  writeDb(db);
  res.json({ success: true });
});

// Vite middleware or Static files serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
