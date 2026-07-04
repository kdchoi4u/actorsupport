import { DaySchedule, MonthlySchedule } from "../types";
import * as XLSX from "xlsx";

// Helper to convert time "HH:MM" to minutes
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

// Helper to calculate hours between two times
export function calculateHours(start: string, end: string): number {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (endMin <= startMin) return 0;
  return Number(((endMin - startMin) / 60).toFixed(1));
}

// Check if a time interval (s2, e2) is inside (s1, e1)
export function isOverlapping(s1: string, e1: string, s2: string, e2: string): boolean {
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  
  if (end1 <= start1 || end2 <= start2) return false;
  // Overlap exists if start2 < end1 and end2 > start1
  return start2 < end1 && end2 > start1;
}

// Calculate actual worked hours for a day
export function getDailyTotalHours(day: DaySchedule): number {
  const slot1Hours = calculateHours(day.slot1.start, day.slot1.end);
  const slot2Hours = calculateHours(day.slot2.start, day.slot2.end);
  const breakHours = calculateHours(day.break.start, day.break.end);
  
  let total = slot1Hours + slot2Hours;
  
  // If break is defined, check if it falls inside slot1 or slot2 to subtract
  if (breakHours > 0) {
    let subtract = 0;
    
    // Check overlap with slot1
    if (day.slot1.start && day.slot1.end) {
      const bStart = timeToMinutes(day.break.start);
      const bEnd = timeToMinutes(day.break.end);
      const s1Start = timeToMinutes(day.slot1.start);
      const s1End = timeToMinutes(day.slot1.end);
      
      // Calculate intersection minutes
      const overlapStart = Math.max(bStart, s1Start);
      const overlapEnd = Math.min(bEnd, s1End);
      if (overlapEnd > overlapStart) {
        subtract += (overlapEnd - overlapStart);
      }
    }
    
    // Check overlap with slot2
    if (day.slot2.start && day.slot2.end) {
      const bStart = timeToMinutes(day.break.start);
      const bEnd = timeToMinutes(day.break.end);
      const s2Start = timeToMinutes(day.slot2.start);
      const s2End = timeToMinutes(day.slot2.end);
      
      // Calculate intersection minutes
      const overlapStart = Math.max(bStart, s2Start);
      const overlapEnd = Math.min(bEnd, s2End);
      if (overlapEnd > overlapStart) {
        subtract += (overlapEnd - overlapStart);
      }
    }
    
    total -= Number((subtract / 60).toFixed(1));
  }
  
  return Number(Math.max(0, total).toFixed(1));
}

// Generate empty schedule for a specific year/month
export function generateEmptyMonthlySchedule(
  workerName: string,
  recipientName: string,
  recipientBirth: string,
  year: number,
  month: number
): MonthlySchedule {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: { [day: string]: DaySchedule } = {};
  
  for (let d = 1; d <= daysInMonth; d++) {
    days[String(d)] = {
      slot1: { start: "", end: "" },
      break: { start: "", end: "" },
      slot2: { start: "", end: "" },
      categories: {
        physical: 0,
        social: 0,
        household: 0,
        other: 0
      },
      totalHours: 0
    };
  }
  
  return {
    workerName,
    recipientName,
    recipientBirth,
    year,
    month,
    days,
    totals: {
      totalHours: 0,
      physical: 0,
      social: 0,
      household: 0,
      other: 0
    }
  };
}

// Calculate the monthly totals from daily records
export function calculateMonthlyTotals(schedule: MonthlySchedule): MonthlySchedule {
  const updatedDays = { ...schedule.days };
  let totalHours = 0;
  let physical = 0;
  let social = 0;
  let household = 0;
  let other = 0;
  
  Object.keys(updatedDays).forEach((dayKey) => {
    const day = updatedDays[dayKey];
    const dailyTotal = getDailyTotalHours(day);
    day.totalHours = dailyTotal;
    
    totalHours += dailyTotal;
    physical += Number(day.categories.physical || 0);
    social += Number(day.categories.social || 0);
    household += Number(day.categories.household || 0);
    other += Number(day.categories.other || 0);
  });
  
  return {
    ...schedule,
    days: updatedDays,
    totals: {
      totalHours: Number(totalHours.toFixed(1)),
      physical: Number(physical.toFixed(1)),
      social: Number(social.toFixed(1)),
      household: Number(household.toFixed(1)),
      other: Number(other.toFixed(1))
    }
  };
}

// Validate category sum vs total hours for the month
export function validateScheduleTotals(schedule: MonthlySchedule): {
  isValid: boolean;
  mismatchDays: number[];
  monthlyMismatch: boolean;
} {
  const mismatchDays: number[] = [];
  
  Object.keys(schedule.days).forEach((dayKey) => {
    const day = schedule.days[dayKey];
    if (day.totalHours > 0) {
      const categorySum = Number((
        (day.categories.physical || 0) +
        (day.categories.social || 0) +
        (day.categories.household || 0) +
        (day.categories.other || 0)
      ).toFixed(1));
      
      if (Math.abs(day.totalHours - categorySum) > 0.05) {
        mismatchDays.push(parseInt(dayKey));
      }
    }
  });
  
  const categoryMonthlySum = Number((
    schedule.totals.physical +
    schedule.totals.social +
    schedule.totals.household +
    schedule.totals.other
  ).toFixed(1));
  
  const monthlyMismatch = Math.abs(schedule.totals.totalHours - categoryMonthlySum) > 0.05;
  
  return {
    isValid: mismatchDays.length === 0 && !monthlyMismatch,
    mismatchDays,
    monthlyMismatch
  };
}

// Export Monthly Schedule to Spreadsheet (Excel)
export function exportToExcel(schedule: MonthlySchedule) {
  const daysInMonth = Object.keys(schedule.days).length;
  const rows: any[] = [];
  
  // Headers/Metadata
  rows.push(["급여제공 일정표", "", "", "", "", "", ""]);
  rows.push([`대상월: ${schedule.year}년 ${schedule.month}월`, "", "", "", "", "", ""]);
  rows.push([]);
  rows.push(["수급자 성명", schedule.recipientName, "", "수급자 생년월일", schedule.recipientBirth, "", ""]);
  rows.push(["급여종류", "활동보조", "", "활동지원인력명", schedule.workerName, "", ""]);
  rows.push([]);
  
  // Daily records headers
  rows.push([
    "일자",
    "제공시간 1",
    "휴게시간",
    "제공시간 2",
    "신체활동",
    "사회활동",
    "가사활동",
    "기타",
    "총 제공 시간"
  ]);
  
  // Sort days numerically
  const sortedDayKeys = Object.keys(schedule.days).sort((a, b) => parseInt(a) - parseInt(b));
  
  sortedDayKeys.forEach((dayKey) => {
    const d = schedule.days[dayKey];
    
    // 제공시간 1이 공백이면 그날은 기록하지 않음
    if (!d.slot1.start || !d.slot1.end) {
      return;
    }

    const weekdayName = getKoreanWeekday(schedule.year, schedule.month, parseInt(dayKey));
    
    rows.push([
      `${dayKey}일 (${weekdayName})`,
      `${d.slot1.start}~${d.slot1.end}`,
      d.break.start && d.break.end ? `${d.break.start}~${d.break.end}` : "",
      d.slot2.start && d.slot2.end ? `${d.slot2.start}~${d.slot2.end}` : "",
      d.categories.physical || 0,
      d.categories.social || 0,
      d.categories.household || 0,
      d.categories.other || 0,
      d.totalHours
    ]);
  });
  
  rows.push([]);
  
  // Monthly Summary Row
  rows.push([
    "총 합계",
    "",
    "",
    "",
    schedule.totals.physical,
    schedule.totals.social,
    schedule.totals.household,
    schedule.totals.other,
    schedule.totals.totalHours
  ]);
  
  rows.push([]);
  rows.push(["기관명: 쌍촌장애인활동지원센터"]);
  rows.push([`작성일자: ${schedule.submittedDate || new Date().toISOString().split("T")[0]}`]);
  
  // Create Worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${schedule.month}월_일정표`);
  
  // Save as Excel file
  const fileName = `급여제공일정표_${schedule.workerName}_${schedule.recipientName}_${schedule.year}년${schedule.month}월.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// Get Korean weekday name
export function getKoreanWeekday(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return weekdays[date.getDay()];
}
