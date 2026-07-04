import React from "react";
import { Worker, MonthlySchedule } from "./types";
import { RoleSelector } from "./components/RoleSelector";
import { ScheduleEditor } from "./components/ScheduleEditor";
import { AdminPanel } from "./components/AdminPanel";
import { PrintTemplate } from "./components/PrintTemplate";
import { generateEmptyMonthlySchedule, calculateMonthlyTotals } from "./utils/scheduleHelpers";
import { CalendarDays, ShieldAlert, Sparkles, LogOut, ArrowLeft, Heart, RefreshCw, Users } from "lucide-react";
import { html2canvasSafe } from "./utils/html2canvasSafe";
import jsPDF from "jspdf";

export default function App() {
  const [role, setRole] = React.useState<"worker" | "admin">("worker");
  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string>("");
  const [schedules, setSchedules] = React.useState<MonthlySchedule[]>([]);

  // Selection states for active editing
  const [selectedYear, setSelectedYear] = React.useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = React.useState<number>(7);
  const [currentSchedule, setCurrentSchedule] = React.useState<MonthlySchedule | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [toastMessage, setToastMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Admin view edit mode override
  const [adminEditingSchedule, setAdminEditingSchedule] = React.useState<MonthlySchedule | null>(null);
  const [adminPdfSchedule, setAdminPdfSchedule] = React.useState<MonthlySchedule | null>(null);

  // Load initial roster and schedules on mount
  React.useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const workersRes = await fetch("/api/workers");
      if (workersRes.ok) {
        const workersData = await workersRes.json();
        setWorkers(workersData);
        // Default to first non-admin worker
        const firstWorker = workersData.find((w: Worker) => w.role !== "admin");
        if (firstWorker) {
          setSelectedWorkerId(firstWorker.id);
        }
      }

      const schedulesRes = await fetch("/api/schedules");
      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchedules(schedulesData);
      }
    } catch (e) {
      console.error("데이터 로딩 에러:", e);
      showToast("error", "서버와 통신하는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Synchronize or initialize schedule for selected worker, year, and month
  React.useEffect(() => {
    if (role === "admin") return; // admin has their own selection
    
    const activeWorker = workers.find((w) => w.id === selectedWorkerId);
    if (!activeWorker) {
      setCurrentSchedule(null);
      return;
    }

    // Try finding existing schedule
    const existing = schedules.find(
      (s) => s.workerName === activeWorker.name && s.year === selectedYear && s.month === selectedMonth
    );

    if (existing) {
      setCurrentSchedule(existing);
    } else {
      // Create empty template with defaults
      const empty = generateEmptyMonthlySchedule(
        activeWorker.name,
        activeWorker.defaultRecipientName || "",
        activeWorker.defaultRecipientBirth || "",
        selectedYear,
        selectedMonth
      );
      setCurrentSchedule(empty);
    }
  }, [selectedWorkerId, selectedYear, selectedMonth, schedules, workers, role]);

  const handleUpdateSchedule = (updated: MonthlySchedule) => {
    if (adminEditingSchedule) {
      setAdminEditingSchedule(updated);
    } else {
      setCurrentSchedule(updated);
    }
  };

  const handleSaveSchedule = async () => {
    const scheduleToSave = adminEditingSchedule || currentSchedule;
    if (!scheduleToSave) return;

    if (!scheduleToSave.workerName) {
      showToast("error", "활동지원사 성명이 필요합니다.");
      return;
    }
    if (!scheduleToSave.recipientName) {
      showToast("error", "수급자 성명이 필요합니다.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scheduleToSave),
      });

      if (res.ok) {
        const savedData = await res.json();
        showToast("success", `${scheduleToSave.workerName} 지원사의 일정표가 안전하게 저장되었습니다.`);
        
        // Refresh schedules from server
        const schedulesRes = await fetch("/api/schedules");
        if (schedulesRes.ok) {
          const schedulesData = await schedulesRes.json();
          setSchedules(schedulesData);
        }

        if (adminEditingSchedule) {
          setAdminEditingSchedule(null); // exit edit mode
        }
      } else {
        showToast("error", "일정표 저장에 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
      showToast("error", "서버 저장 실패. 네트워크 상태를 확인하세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSchedule = async (workerName: string, year: number, month: number) => {
    try {
      const res = await fetch(`/api/schedules?workerName=${encodeURIComponent(workerName)}&year=${year}&month=${month}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast("success", "일정표가 정상적으로 삭제되었습니다.");
        // Refresh schedules
        const schedulesRes = await fetch("/api/schedules");
        if (schedulesRes.ok) {
          const schedulesData = await schedulesRes.json();
          setSchedules(schedulesData);
        }
      } else {
        showToast("error", "일정표 삭제에 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
      showToast("error", "삭제 중 오류가 발생했습니다.");
    }
  };

  const handleAddWorker = async (name: string, recName: string, recBirth: string) => {
    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, defaultRecipientName: recName, defaultRecipientBirth: recBirth }),
      });

      if (res.ok) {
        showToast("success", `활동지원사 [${name}] 님이 성공적으로 등록되었습니다.`);
        
        // Refresh workers
        const workersRes = await fetch("/api/workers");
        if (workersRes.ok) {
          const workersData = await workersRes.json();
          setWorkers(workersData);
          const newlyAdded = workersData.find((w: Worker) => w.name === name);
          if (newlyAdded && role === "worker") {
            setSelectedWorkerId(newlyAdded.id);
          }
        }
      } else {
        showToast("error", "지원사 등록에 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
      showToast("error", "네트워크 통신 오류가 발생했습니다.");
    }
  };

  // Helper for admin PDF download direct trigger
  const handleDownloadPDFOfSchedule = async (schedule: MonthlySchedule) => {
    setAdminPdfSchedule(schedule);
    // Wait for the offscreen div to render in the DOM
    setTimeout(async () => {
      const element = document.getElementById("print-document-container-admin");
      if (!element) {
        showToast("error", "PDF 템플릿을 찾을 수 없습니다.");
        setAdminPdfSchedule(null);
        return;
      }
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

        const originalStyle = element.getAttribute("style") || "";
        element.setAttribute(
          "style",
          "width: 210mm; height: 297mm; max-height: 297mm; padding: 10mm; background: white; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;"
        );
        const canvas = await html2canvasSafe(element, { scale: 2, useCORS: true, logging: false });
        element.setAttribute("style", originalStyle);
        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const pdf = new jsPDF("p", "mm", "a4");
        
        // Fit exactly on 1 page
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
        pdf.save(`급여제공일정표_${schedule.workerName}_${schedule.recipientName}_${schedule.year}년${schedule.month}월.pdf`);
        showToast("success", "PDF 다운로드가 완료되었습니다.");
      } catch (err) {
        console.error(err);
        showToast("error", "PDF 다운로드에 실패했습니다.");
      } finally {
        setAdminPdfSchedule(null);
      }
    }, 200);
  };

  const activeWorker = workers.find((w) => w.id === selectedWorkerId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 font-sans antialiased text-slate-800">
      
      {/* Top Main Navigation Bar */}
      <header className="h-14 bg-[#1E293B] text-white flex items-center justify-between px-6 shadow-md sticky top-0 z-40 shrink-0 print:hidden font-sans">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center shadow-sm">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-sm font-bold tracking-tight uppercase flex items-center gap-2">
              LogiCare <span className="font-normal text-slate-400 font-mono text-[11px]">v2.6</span>
              <span className="text-slate-600 font-normal hidden sm:inline">|</span>
              <span className="text-xs font-semibold text-slate-300 hidden sm:inline">쌍촌장애인활동지원센터 일정표 시스템</span>
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 rounded-lg text-[11px]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-slate-300 font-mono font-bold uppercase tracking-wider text-[9px]">DB Synced</span>
            </div>

            <div className="flex flex-col items-end text-right">
              <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider leading-none">
                {role === "admin" ? "ADMINISTRATOR MODE" : "CAREGIVER ACCESS"}
              </span>
              <span className="text-xs font-semibold text-slate-100 mt-0.5">
                {role === "admin" ? "최고 관리자" : (activeWorker?.name || "활동지원사")}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-bounce print:hidden">
          <div className={`rounded-xl px-5 py-3 shadow-lg border text-sm font-bold flex items-center gap-2 ${
            toastMessage.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
            {toastMessage.text}
          </div>
        </div>
      )}

      {/* Main Workspace content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 print:p-0">
        
        {/* Role and worker select widget (print hidden) */}
        <div className="print:hidden">
          <RoleSelector
            currentRole={role}
            onRoleChange={(newRole) => {
              setRole(newRole);
              setAdminEditingSchedule(null); // reset overrides
            }}
            workers={workers}
            selectedWorkerId={selectedWorkerId}
            onWorkerChange={setSelectedWorkerId}
            onAddWorker={handleAddWorker}
          />
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">데이터베이스 정보를 조회하고 있습니다...</p>
          </div>
        ) : (
          <div className="print:block">
            
            {/* WORKER ROUTE */}
            {role === "worker" && (
              <>
                {selectedWorkerId ? (
                  currentSchedule ? (
                    <ScheduleEditor
                      schedule={currentSchedule}
                      onUpdateSchedule={handleUpdateSchedule}
                      onSaveToServer={handleSaveSchedule}
                      isSaving={isSaving}
                      worker={activeWorker}
                    />
                  ) : (
                    <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border shadow-sm">
                      <p className="text-sm font-medium">일정표 정보를 구성하고 있습니다...</p>
                    </div>
                  )
                ) : (
                  <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border shadow-sm max-w-lg mx-auto space-y-4">
                    <Users className="w-12 h-12 text-slate-300 mx-auto" />
                    <div className="text-base font-bold text-slate-700">등록된 활동지원사 이름이 없거나 선택되지 않았습니다</div>
                    <p className="text-xs text-slate-500">
                      상단의 드롭다운 메뉴에서 본인의 이름을 선택하거나, [신규 활동지원사 등록] 버튼을 눌러 새로 생성해 보세요.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ADMIN ROUTE */}
            {role === "admin" && (
              <>
                {adminEditingSchedule ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-rose-50 border border-rose-100 p-4 rounded-2xl print:hidden">
                      <div className="flex items-center gap-2 text-rose-800">
                        <ShieldAlert className="w-5 h-5" />
                        <div>
                          <span className="font-bold text-sm">[수정 모드] {adminEditingSchedule.workerName} 지원사 일정표</span>
                          <p className="text-xs opacity-90">관리자 권한으로 본 일정표를 편집하거나 저장할 수 있습니다.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAdminEditingSchedule(null)}
                        className="flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs px-3 py-1.5 rounded-lg transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        목록으로 돌아가기
                      </button>
                    </div>

                    <ScheduleEditor
                      schedule={adminEditingSchedule}
                      onUpdateSchedule={handleUpdateSchedule}
                      onSaveToServer={handleSaveSchedule}
                      isSaving={isSaving}
                      worker={workers.find(w => w.name === adminEditingSchedule.workerName)}
                    />
                  </div>
                ) : (
                  <AdminPanel
                    schedules={schedules}
                    workers={workers}
                    onSelectSchedule={(s) => setAdminEditingSchedule(s)}
                    onDeleteSchedule={handleDeleteSchedule}
                    onRefresh={fetchInitialData}
                    onAddWorker={handleAddWorker}
                    onDownloadPDFOfSchedule={handleDownloadPDFOfSchedule}
                  />
                )}
              </>
            )}

          </div>
        )}

      </main>

      {/* Offscreen template for Admin PDF downloads */}
      {adminPdfSchedule && (
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
          <PrintTemplate schedule={adminPdfSchedule} id="print-document-container-admin" />
        </div>
      )}

      {/* Footer (print hidden) */}
      <footer className="mt-24 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 쌍촌장애인활동지원센터. All rights reserved.</p>
          <p className="flex items-center gap-1">
            활동지원 급여제공 일정표 자동 계산 및 인쇄 솔루션 <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </footer>
    </div>
  );
}
