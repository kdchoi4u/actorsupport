import React from "react";
import { MonthlySchedule, DaySchedule, Worker } from "../types";
import { getKoreanWeekday, calculateMonthlyTotals, validateScheduleTotals, exportToExcel, getDailyTotalHours } from "../utils/scheduleHelpers";
import { DayEditModal } from "./DayEditModal";
import { PrintTemplate } from "./PrintTemplate";
import { SignaturePad } from "./SignaturePad";
import { 
  Calendar, 
  User, 
  Clock, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Save, 
  Trash2, 
  Zap, 
  AlertCircle, 
  CheckCircle2,
  CalendarDays
} from "lucide-react";
import { html2canvasSafe } from "../utils/html2canvasSafe";
import jsPDF from "jspdf";

interface ScheduleEditorProps {
  schedule: MonthlySchedule;
  onUpdateSchedule: (updated: MonthlySchedule) => void;
  onSaveToServer: () => Promise<void>;
  isSaving: boolean;
  worker: Worker | undefined;
}

export const ScheduleEditor: React.FC<ScheduleEditorProps> = ({
  schedule,
  onUpdateSchedule,
  onSaveToServer,
  isSaving,
  worker
}) => {
  const [editingDay, setEditingDay] = React.useState<number | null>(null);

  // Template state for bulk apply
  const [bulkSlot1Start, setBulkSlot1Start] = React.useState("09:00");
  const [bulkSlot1End, setBulkSlot1End] = React.useState("12:00");
  const [bulkBreakStart, setBulkBreakStart] = React.useState("12:00");
  const [bulkBreakEnd, setBulkBreakEnd] = React.useState("13:00");
  const [bulkSlot2Start, setBulkSlot2Start] = React.useState("13:00");
  const [bulkSlot2End, setBulkSlot2End] = React.useState("18:00");
  
  const [bulkPhysical, setBulkPhysical] = React.useState(3);
  const [bulkSocial, setBulkSocial] = React.useState(3);
  const [bulkHousehold, setBulkHousehold] = React.useState(2);
  const [bulkOther, setBulkOther] = React.useState(0);

  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  // Dynamic calculated bulk hours
  const calculatedBulkHours = React.useMemo(() => {
    const dummyDay: DaySchedule = {
      slot1: { start: bulkSlot1Start, end: bulkSlot1End },
      break: { start: bulkBreakStart, end: bulkBreakEnd },
      slot2: { start: bulkSlot2Start, end: bulkSlot2End },
      categories: { physical: 0, social: 0, household: 0, other: 0 },
      totalHours: 0
    };
    return getDailyTotalHours(dummyDay);
  }, [bulkSlot1Start, bulkSlot1End, bulkBreakStart, bulkBreakEnd, bulkSlot2Start, bulkSlot2End]);

  // Recipient input handlings
  const handleRecipientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSchedule({ ...schedule, recipientName: e.target.value });
  };

  const handleRecipientBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSchedule({ ...schedule, recipientBirth: e.target.value });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const y = parseInt(e.target.value);
    onUpdateSchedule(calculateMonthlyTotals({
      ...schedule,
      year: y,
      days: reinitDaysForNewMonth(y, schedule.month)
    }));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const m = parseInt(e.target.value);
    onUpdateSchedule(calculateMonthlyTotals({
      ...schedule,
      month: m,
      days: reinitDaysForNewMonth(schedule.year, m)
    }));
  };

  const reinitDaysForNewMonth = (y: number, m: number) => {
    const daysInMonth = new Date(y, m, 0).getDate();
    const days: { [day: string]: DaySchedule } = {};
    for (let d = 1; d <= daysInMonth; d++) {
      days[String(d)] = {
        slot1: { start: "", end: "" },
        break: { start: "", end: "" },
        slot2: { start: "", end: "" },
        categories: { physical: 0, social: 0, household: 0, other: 0 },
        totalHours: 0
      };
    }
    return days;
  };

  const handleSubmittedDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSchedule({ ...schedule, submittedDate: e.target.value });
  };

  const handleSignatureChange = (signature: string) => {
    onUpdateSchedule({ ...schedule, recipientSignature: signature });
  };

  // Single day save from Modal
  const handleSaveDay = (dayKey: string, daySchedule: DaySchedule) => {
    const updatedDays = {
      ...schedule.days,
      [dayKey]: daySchedule
    };
    onUpdateSchedule(calculateMonthlyTotals({
      ...schedule,
      days: updatedDays
    }));
    setEditingDay(null);
  };

  // Easy bulk helpers: copy from yesterday/last week inside modal
  const handleCopyFromYesterday = (dayNum: number) => {
    if (dayNum > 1) {
      const yesterdayData = schedule.days[String(dayNum - 1)];
      if (yesterdayData) {
        handleSaveDay(String(dayNum), { ...yesterdayData });
      }
    }
  };

  const handleCopyFromLastWeek = (dayNum: number) => {
    if (dayNum > 7) {
      const lastWeekData = schedule.days[String(dayNum - 7)];
      if (lastWeekData) {
        handleSaveDay(String(dayNum), { ...lastWeekData });
      }
    }
  };

  // Bulk Apply logic
  const handleBulkApply = (target: "weekdays" | "all") => {
    const updatedDays = { ...schedule.days };
    
    Object.keys(updatedDays).forEach((dayKey) => {
      const dNum = parseInt(dayKey);
      const date = new Date(schedule.year, schedule.month - 1, dNum);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      if (target === "all" || (target === "weekdays" && !isWeekend)) {
        updatedDays[dayKey] = {
          slot1: { start: bulkSlot1Start, end: bulkSlot1End },
          break: { start: bulkBreakStart, end: bulkBreakEnd },
          slot2: { start: bulkSlot2Start, end: bulkSlot2End },
          categories: {
            physical: bulkPhysical,
            social: bulkSocial,
            household: bulkHousehold,
            other: bulkOther
          },
          totalHours: 0 // Will be calculated by calculateMonthlyTotals
        };
      }
    });

    onUpdateSchedule(calculateMonthlyTotals({
      ...schedule,
      days: updatedDays
    }));
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const performClearAll = () => {
    const updatedDays = { ...schedule.days };
    Object.keys(updatedDays).forEach((dayKey) => {
      updatedDays[dayKey] = {
        slot1: { start: "", end: "" },
        break: { start: "", end: "" },
        slot2: { start: "", end: "" },
        categories: { physical: 0, social: 0, household: 0, other: 0 },
        totalHours: 0
      };
    });
    onUpdateSchedule(calculateMonthlyTotals({
      ...schedule,
      days: updatedDays
    }));
    setShowClearConfirm(false);
  };

  // Automatically adjust all mismatched days
  const handleAutoAdjustAll = () => {
    const updatedDays = { ...schedule.days };
    
    Object.keys(updatedDays).forEach((dayKey) => {
      const d = updatedDays[dayKey];
      // If we have total worked hours but they don't match the categories sum
      if (d.totalHours > 0) {
        const catSum = d.categories.physical + d.categories.social + d.categories.household + d.categories.other;
        if (Math.abs(d.totalHours - catSum) > 0.05) {
          // Adjust categories: 50% physical, 50% social
          const half = Number((d.totalHours / 2).toFixed(1));
          const remainder = Number((d.totalHours - half).toFixed(1));
          d.categories = {
            physical: half,
            social: remainder,
            household: 0,
            other: 0
          };
        }
      }
    });

    onUpdateSchedule(calculateMonthlyTotals({
      ...schedule,
      days: updatedDays
    }));
  };

  // PDF Generation with html2canvas and jsPDF
  const handleDownloadPDF = async () => {
    const element = document.getElementById("print-document-container");
    if (!element) return;

    try {
      // Ensure all images (including base64 signatures) are fully loaded and decoded in the DOM
      const images = element.querySelectorAll("img");
      const imagePromises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });
      await Promise.all(imagePromises);

      // Temporarily style container precisely to match exactly 1 A4 page (210mm x 297mm)
      const originalStyle = element.getAttribute("style") || "";
      element.setAttribute(
        "style",
        "width: 210mm; height: 297mm; max-height: 297mm; padding: 10mm; background: white; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;"
      );
      
      const canvas = await html2canvasSafe(element, {
        scale: 2, // high quality
        useCORS: true,
        logging: false
      });
      
      element.setAttribute("style", originalStyle); // restore
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      
      // Since container has exactly 210mm x 297mm aspect ratio, draw it on exactly 1 page
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);

      const fileName = `급여제공일정표_${schedule.workerName}_${schedule.recipientName}_${schedule.year}년${schedule.month}월.pdf`;
      pdf.save(fileName);
    } catch (e) {
      console.error("PDF 생성 에러:", e);
      alert("PDF 생성 중 오류가 발생했습니다.");
    }
  };

  // Native Print style trigger
  const handlePrint = () => {
    window.print();
  };

  // Schedule Validations
  const validationResult = validateScheduleTotals(schedule);

  // Calendar structures
  const daysInMonth = Object.keys(schedule.days).length;
  const startDay = new Date(schedule.year, schedule.month - 1, 1).getDay();
  const calendarCells: (number | null)[] = [];
  
  for (let i = 0; i < startDay; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Input panel & Bulk Tool (Left Side - 4 Columns) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Recipient & Period settings */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3.5">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b pb-2 border-slate-100 uppercase tracking-wider">
            <User className="w-3.5 h-3.5 text-blue-600" />
            TARGET RECIPIENT & PERIOD / 수급자 및 기간
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">RECIPIENT NAME / 수급자 성명</label>
              <input
                type="text"
                value={schedule.recipientName}
                onChange={handleRecipientNameChange}
                placeholder="홍길동"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">DATE OF BIRTH / 생년월일</label>
              <input
                type="text"
                value={schedule.recipientBirth}
                onChange={handleRecipientBirthChange}
                placeholder="1955-08-15"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">YEAR / 제공년도</label>
              <select
                value={schedule.year}
                onChange={handleYearChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value={2026}>2026년</option>
                <option value={2027}>2027년</option>
                <option value={2025}>2025년</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">MONTH / 제공월</label>
              <select
                value={schedule.month}
                onChange={handleMonthChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">REPORTING DATE / 서명 및 작성일자</label>
            <input
              type="date"
              value={schedule.submittedDate || ""}
              onChange={handleSubmittedDateChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <SignaturePad
            value={schedule.recipientSignature}
            onChange={handleSignatureChange}
            recipientName={schedule.recipientName}
          />
        </div>

        {/* Bulk Pattern tool */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3.5">
          <div className="flex justify-between items-center border-b pb-2 border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              BULK PATTERN ENGINE / 일괄 입력
            </h3>
            <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">FAST ENTRY</span>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            반복되는 표준 서비스 패턴을 선택한 일자 범주에 원클릭으로 일괄 주입합니다.
          </p>

          <div className="bg-slate-50 p-3 rounded-lg space-y-2.5 border border-slate-200/60">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">STANDARD WORKING TIME / 기본 시간 패턴</div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">PART 1 / 오전(급여1)</label>
                <div className="flex gap-1 items-center">
                  <input type="text" value={bulkSlot1Start} onChange={e => setBulkSlot1Start(e.target.value)} className="w-full bg-white border border-slate-200 text-center text-xs p-1 rounded font-semibold font-mono" />
                  <span className="text-slate-400 text-xs">~</span>
                  <input type="text" value={bulkSlot1End} onChange={e => setBulkSlot1End(e.target.value)} className="w-full bg-white border border-slate-200 text-center text-xs p-1 rounded font-semibold font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">BREAK / 휴게 시간</label>
                <div className="flex gap-1 items-center">
                  <input type="text" value={bulkBreakStart} onChange={e => setBulkBreakStart(e.target.value)} className="w-full bg-white border border-slate-200 text-center text-xs p-1 rounded font-semibold font-mono" />
                  <span className="text-slate-400 text-xs">~</span>
                  <input type="text" value={bulkBreakEnd} onChange={e => setBulkBreakEnd(e.target.value)} className="w-full bg-white border border-slate-200 text-center text-xs p-1 rounded font-semibold font-mono" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">PART 2 / 오후(급여2)</label>
                <div className="flex gap-1 items-center">
                  <input type="text" value={bulkSlot2Start} onChange={e => setBulkSlot2Start(e.target.value)} className="w-full bg-white border border-slate-200 text-center text-xs p-1 rounded font-semibold font-mono" />
                  <span className="text-slate-400 text-xs">~</span>
                  <input type="text" value={bulkSlot2End} onChange={e => setBulkSlot2End(e.target.value)} className="w-full bg-white border border-slate-200 text-center text-xs p-1 rounded font-semibold font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">CALCULATED / 실근무 계산</label>
                <div className={`text-center font-bold text-xs p-1 rounded border font-mono ${calculatedBulkHours === (bulkPhysical + bulkSocial + bulkHousehold + bulkOther) ? "bg-slate-200 border-slate-300 text-slate-800" : "bg-amber-100 border-amber-300 text-amber-800"}`}>
                  {calculatedBulkHours.toFixed(1)} HOURS
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-200/80 my-1"></div>

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">HOURS ALLOCATION / 서비스 시간 분류 (시간)</div>
            <div className="grid grid-cols-4 gap-1">
              <div>
                <label className="block text-[9px] font-medium text-slate-500 text-center mb-0.5">신체</label>
                <input type="number" step="0.5" value={bulkPhysical} onChange={e => setBulkPhysical(Number(e.target.value) || 0)} className="w-full bg-white border border-slate-200 text-center text-xs py-1 rounded font-bold font-mono" />
              </div>
              <div>
                <label className="block text-[9px] font-medium text-slate-500 text-center mb-0.5">사회</label>
                <input type="number" step="0.5" value={bulkSocial} onChange={e => setBulkSocial(Number(e.target.value) || 0)} className="w-full bg-white border border-slate-200 text-center text-xs py-1 rounded font-bold font-mono" />
              </div>
              <div>
                <label className="block text-[9px] font-medium text-slate-500 text-center mb-0.5">가사</label>
                <input type="number" step="0.5" value={bulkHousehold} onChange={e => setBulkHousehold(Number(e.target.value) || 0)} className="w-full bg-white border border-slate-200 text-center text-xs py-1 rounded font-bold font-mono" />
              </div>
              <div>
                <label className="block text-[9px] font-medium text-slate-500 text-center mb-0.5">기타</label>
                <input type="number" step="0.5" value={bulkOther} onChange={e => setBulkOther(Number(e.target.value) || 0)} className="w-full bg-white border border-slate-200 text-center text-xs py-1 rounded font-bold font-mono" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => handleBulkApply("weekdays")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] py-2 rounded-lg transition shadow-sm cursor-pointer"
            >
              평일(월~금요일) 전체 일괄 입력 적용
            </button>
            <button
              type="button"
              onClick={() => handleBulkApply("all")}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] py-2 rounded-lg transition cursor-pointer"
            >
              토/일 포함 전체 날짜 일괄 입력 적용
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-red-200/50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              이번 달 전체 작성일정 비우기
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid & Summaries (Right Side - 8 Columns) */}
      <div className="lg:col-span-8 space-y-4">
        
        {/* Validation Banner */}
        {validationResult.mismatchDays.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs">일부 날짜의 실근무 계산과 서비스 항목의 합이 불일치합니다</div>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  불일치 일자: <span className="font-bold">{validationResult.mismatchDays.join(", ")}일</span>. 
                  해당 일자의 총 근무 시간과 신체/사회/가사/기타의 합을 맞추어 주시기 바랍니다.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoAdjustAll}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-md shrink-0 shadow-sm transition flex items-center gap-1 cursor-pointer"
            >
              <Zap className="w-3 h-3" />
              자동 불일치 조정
            </button>
          </div>
        )}

        {/* Weekly Calendar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
            <h2 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5 tracking-wide">
              <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
              {schedule.year}년 {schedule.month}월 급여제공 일정표 세부 현황
            </h2>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">일자 눌러 수정 가능</span>
          </div>

          <div className="p-3 overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Calendar Days grid */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                <div className="text-red-500">SUN / 일</div>
                <div>MON / 월</div>
                <div>TUE / 화</div>
                <div>WED / 수</div>
                <div>THU / 목</div>
                <div>FRI / 금</div>
                <div className="text-blue-500">SAT / 토</div>
              </div>

              {/* Weekly blocks */}
              <div className="grid grid-cols-7 gap-1 mt-1">
                {calendarCells.map((dayNum, idx) => {
                  if (dayNum === null) {
                    return (
                      <div 
                        key={`empty-${idx}`} 
                        className="bg-slate-50/40 rounded-lg h-20 border border-dashed border-slate-100"
                      />
                    );
                  }

                  const dayStr = String(dayNum);
                  const d = schedule.days[dayStr];
                  const dIdx = idx % 7;
                  const isWeekend = dIdx === 0 || dIdx === 6;
                  
                  // Verification for cell background
                  const catSum = d.categories.physical + d.categories.social + d.categories.household + d.categories.other;
                  const isCellMismatched = d.totalHours > 0 && Math.abs(d.totalHours - catSum) > 0.05;
                  
                  let cellBg = "bg-white hover:bg-slate-50 border-slate-200";
                  if (isCellMismatched) cellBg = "bg-amber-50/70 border-amber-300 hover:bg-amber-100/50";
                  else if (d.totalHours > 0) cellBg = "bg-blue-50/25 border-blue-100 hover:bg-blue-50/50";

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      onClick={() => setEditingDay(dayNum)}
                      className={`rounded-lg h-20 p-2 text-left border flex flex-col justify-between transition focus:outline-none focus:ring-1 focus:ring-blue-500 relative group overflow-hidden cursor-pointer shadow-none ${cellBg}`}
                    >
                      {/* Day count */}
                      <div className="flex justify-between items-start w-full">
                        <span className={`text-xs font-extrabold font-mono ${
                          dIdx === 0 ? "text-red-500" : dIdx === 6 ? "text-blue-500" : "text-slate-700"
                        }`}>
                          {String(dayNum).padStart(2, "0")}
                        </span>
                        
                        {d.totalHours > 0 && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded font-mono ${
                            isCellMismatched ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {d.totalHours}h
                          </span>
                        )}
                      </div>

                      {/* Main display inside calendar cell */}
                      <div className="text-[9px] text-slate-500 leading-tight space-y-0.5 w-full font-mono">
                        {d.slot1.start && d.slot1.end ? (
                          <div className="font-semibold text-slate-700 truncate">1부: {d.slot1.start}~{d.slot1.end}</div>
                        ) : null}
                        {d.break.start && d.break.end ? (
                          <div className="font-medium text-slate-500 truncate text-[8.5px]">휴게: {d.break.start}~{d.break.end}</div>
                        ) : null}
                        {d.slot2.start && d.slot2.end ? (
                          <div className="font-semibold text-slate-700 truncate">2부: {d.slot2.start}~{d.slot2.end}</div>
                        ) : null}
                        
                        {!d.slot1.start && !d.slot2.start && (
                          <div className="text-slate-300 italic py-1 text-center group-hover:text-slate-400">일정 없음</div>
                        )}
                      </div>

                      {/* Categories mini bar */}
                      {d.totalHours > 0 && (
                        <div className="flex h-1 w-full rounded-full overflow-hidden bg-slate-100 mt-1">
                          {d.categories.physical > 0 && <div className="bg-rose-400" style={{ width: `${(d.categories.physical / d.totalHours) * 100}%` }} />}
                          {d.categories.social > 0 && <div className="bg-purple-400" style={{ width: `${(d.categories.social / d.totalHours) * 100}%` }} />}
                          {d.categories.household > 0 && <div className="bg-yellow-400" style={{ width: `${(d.categories.household / d.totalHours) * 100}%` }} />}
                          {d.categories.other > 0 && <div className="bg-slate-400" style={{ width: `${(d.categories.other / d.totalHours) * 100}%` }} />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Calculation & Validation Footer (High Density style bottom aggregates) */}
          <div className="p-3 bg-[#F1F5F9] border-t-2 border-slate-200 grid grid-cols-6 gap-3 shrink-0">
            <div className="col-span-2 md:col-span-1.5 flex flex-col justify-center pl-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Monthly 총 제공 시간</span>
              <p className="text-xl font-extrabold text-slate-900 leading-none mt-1 font-sans">
                {schedule.totals.totalHours} <span className="text-[10px] font-normal text-slate-500 uppercase font-mono">Hours</span>
              </p>
            </div>

            <div className="col-span-4 md:col-span-3.5 grid grid-cols-4 gap-1.5 bg-white p-2 rounded-lg border border-slate-200 text-center font-mono">
              <div className="border-r border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 block">신체활동</span>
                <span className="text-xs font-bold text-rose-600">{schedule.totals.physical}</span>
              </div>
              <div className="border-r border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 block">사회활동</span>
                <span className="text-xs font-bold text-purple-600">{schedule.totals.social}</span>
              </div>
              <div className="border-r border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 block">가사활동</span>
                <span className="text-xs font-bold text-amber-600">{schedule.totals.household}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block">기타</span>
                <span className="text-xs font-bold text-slate-600">{schedule.totals.other}</span>
              </div>
            </div>

            <div className="col-span-6 md:col-span-1 flex flex-col items-center justify-center">
              {validationResult.mismatchDays.length === 0 && schedule.totals.totalHours > 0 ? (
                <>
                  <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full border border-emerald-200 text-[9px] font-black uppercase font-mono">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>SUM VERIFIED</span>
                  </div>
                  <p className="text-[8px] text-slate-400 mt-0.5 italic font-medium leading-none text-center">Cross-check passed</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-1 rounded-full border border-amber-200 text-[9px] font-black uppercase font-mono">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>MISMATCH</span>
                  </div>
                  <p className="text-[8px] text-amber-600 mt-0.5 italic font-bold leading-none text-center">Check required</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Save & Print & Download actions */}
        <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <button
              type="button"
              onClick={onSaveToServer}
              disabled={isSaving || !schedule.workerName || !schedule.recipientName}
              className={`flex items-center gap-1.5 px-4.5 py-2.5 font-bold text-xs rounded-lg transition shadow-sm cursor-pointer ${
                isSaving 
                  ? "bg-slate-100 text-slate-400 border border-slate-200" 
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              <Save className="w-4 h-4" />
              {isSaving ? "데이터베이스 저장 중..." : "데이터베이스에 저장"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => exportToExcel(schedule)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg transition shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              스프레드시트 (엑셀)
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg transition shadow-sm cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF 다운로드
            </button>
          </div>
        </div>

      </div>

      {/* Editing Day Dialog / Modal */}
      {editingDay !== null && (
        <DayEditModal
          dayNum={editingDay}
          weekday={getKoreanWeekday(schedule.year, schedule.month, editingDay)}
          schedule={schedule.days[String(editingDay)]}
          onSave={(daySchedule) => handleSaveDay(String(editingDay), daySchedule)}
          onClose={() => setEditingDay(null)}
          onCopyFromYesterday={() => handleCopyFromYesterday(editingDay)}
          onCopyFromLastWeek={() => handleCopyFromLastWeek(editingDay)}
          hasYesterday={editingDay > 1}
          hasLastWeek={editingDay > 7}
        />
      )}

      {/* Clear Schedule Confirm Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">일정 전체 비우기 확인</h3>
                <p className="text-xs text-slate-500 mt-0.5">이 작업은 취소할 수 없습니다.</p>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                정말로 이번 달의 모든 일정을 비우시겠습니까? 입력된 모든 스케줄 정보가 초기화됩니다.
              </p>
            </div>
            <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={performClearAll}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition shadow-sm"
              >
                비우기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded High Fidelity Template solely used for printing/capturing */}
      <div 
        style={{ 
          position: "absolute", 
          left: "-9999px", 
          top: "-9999px", 
          width: "210mm", 
          height: "297mm", 
          overflow: "hidden" 
        }}
      >
        <div id="print-zone">
          <PrintTemplate schedule={schedule} id="print-document-container" />
        </div>
      </div>
    </div>
  );
};
