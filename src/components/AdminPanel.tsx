import React from "react";
import { MonthlySchedule, Worker } from "../types";
import { exportToExcel } from "../utils/scheduleHelpers";
import { 
  Users, 
  Search, 
  FileText, 
  FileSpreadsheet, 
  Trash2, 
  Settings, 
  CheckCircle2, 
  Eye, 
  Calendar,
  AlertCircle,
  FilePlus,
  RefreshCw
} from "lucide-react";

interface AdminPanelProps {
  schedules: MonthlySchedule[];
  workers: Worker[];
  onSelectSchedule: (schedule: MonthlySchedule) => void;
  onDeleteSchedule: (workerName: string, year: number, month: number) => Promise<void>;
  onRefresh: () => void;
  onAddWorker: (name: string, recName: string, recBirth: string) => Promise<void>;
  onDownloadPDFOfSchedule: (schedule: MonthlySchedule) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  schedules,
  workers,
  onSelectSchedule,
  onDeleteSchedule,
  onRefresh,
  onAddWorker,
  onDownloadPDFOfSchedule
}) => {
  // Search and Filter local state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterYear, setFilterYear] = React.useState("2026");
  const [filterMonth, setFilterMonth] = React.useState("7");

  // Roster Management state
  const [showRosterForm, setShowRosterForm] = React.useState(false);
  const [newWorkerName, setNewWorkerName] = React.useState("");
  const [newRecName, setNewRecName] = React.useState("");
  const [newRecBirth, setNewRecBirth] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [scheduleToDelete, setScheduleToDelete] = React.useState<MonthlySchedule | null>(null);

  const handleRegisterWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;
    setIsAdding(true);
    try {
      await onAddWorker(newWorkerName.trim(), newRecName.trim(), newRecBirth.trim());
      setNewWorkerName("");
      setNewRecName("");
      setNewRecBirth("");
      setShowRosterForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const filteredSchedules = schedules.filter((s) => {
    const matchesSearch = s.workerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.recipientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = filterYear === "all" || s.year === parseInt(filterYear);
    const matchesMonth = filterMonth === "all" || s.month === parseInt(filterMonth);
    return matchesSearch && matchesYear && matchesMonth;
  });

  // Calculate high-level aggregates
  const totalHours = filteredSchedules.reduce((acc, curr) => acc + curr.totals.totalHours, 0);
  const physicalHours = filteredSchedules.reduce((acc, curr) => acc + curr.totals.physical, 0);
  const socialHours = filteredSchedules.reduce((acc, curr) => acc + curr.totals.social, 0);
  const householdHours = filteredSchedules.reduce((acc, curr) => acc + curr.totals.household, 0);

  return (
    <div className="space-y-4">
      
      {/* Roster & Submit Management toolbar */}
      <div className="flex flex-col md:flex-row justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        
        {/* Search & Filters */}
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="지원사 또는 수급자 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium"
            />
          </div>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">모든 년도</option>
            <option value="2026">2026년</option>
            <option value="2027">2027년</option>
            <option value="2025">2025년</option>
          </select>

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">모든 월</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={String(m)}>{m}월</option>
            ))}
          </select>

          <button
            onClick={onRefresh}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition border border-slate-200 shadow-none cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Worker Register tab */}
        <div>
          {!showRosterForm ? (
            <button
              onClick={() => setShowRosterForm(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
              신규 활동지원사 등록
            </button>
          ) : (
            <button
              onClick={() => setShowRosterForm(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-3.5 py-2 rounded-lg transition border cursor-pointer"
            >
              등록창 닫기
            </button>
          )}
        </div>
      </div>

      {/* Roster form */}
      {showRosterForm && (
        <form
          onSubmit={handleRegisterWorker}
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3.5 max-w-2xl"
        >
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pb-2 border-b uppercase tracking-wider">
            <Users className="w-4 h-4 text-rose-500" />
            REGISTER NEW CAREGIVER / 지원사 신규 등록
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">지원사 성명 *</label>
              <input
                type="text"
                required
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                placeholder="홍길동"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">매칭 수급자 성명</label>
              <input
                type="text"
                value={newRecName}
                onChange={(e) => setNewRecName(e.target.value)}
                placeholder="김수급"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">수급자 생년월일</label>
              <input
                type="text"
                value={newRecBirth}
                onChange={(e) => setNewRecBirth(e.target.value)}
                placeholder="1955-08-15"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={isAdding}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm cursor-pointer"
            >
              {isAdding ? "등록 중..." : "활동지원사 등록 완료"}
            </button>
          </div>
        </form>
      )}

      {/* Main Table for Schedule Lists */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">SCHEDULES SUBMISSION LOG / 급여제공 일정표 제출 내역 ({filteredSchedules.length}건)</h3>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-xs font-semibold">제출된 일정표가 없습니다.</div>
            <p className="text-[11px] leading-relaxed">상단 검색 또는 필터를 조정하거나, 활동지원사 계정에서 일정을 작성하여 저장해 주세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                  <th className="p-3 pl-4">대상월</th>
                  <th className="p-3">활동지원사</th>
                  <th className="p-3">수급자 (생년월일)</th>
                  <th className="p-3">총 근무시간</th>
                  <th className="p-3">세부 활동량 (신체/사회/가사)</th>
                  <th className="p-3">제출/수정일</th>
                  <th className="p-3 pr-4 text-right">관리 작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredSchedules.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3 pl-4 font-bold font-sans text-slate-900">
                      {s.year}년 {s.month}월
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-900">{s.workerName}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{s.recipientName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.recipientBirth || "-"}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-extrabold text-blue-600 font-sans">{s.totals.totalHours}시간</span>
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      <span className="text-rose-600 font-bold">신체 {s.totals.physical}h</span> · <span className="text-purple-600 font-bold">사회 {s.totals.social}h</span> · <span className="text-amber-600 font-bold">가사 {s.totals.household}h</span>
                    </td>
                    <td className="p-3 text-slate-500 font-mono">
                      {s.submittedDate || "-"}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => onSelectSchedule(s)}
                          className="flex items-center gap-1 text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-md font-bold transition cursor-pointer"
                          title="상세 열람 및 일정 편집"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          조회/편집
                        </button>
                        <button
                          onClick={() => exportToExcel(s)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md transition border border-emerald-200 cursor-pointer"
                          title="엑셀 다운로드"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDownloadPDFOfSchedule(s)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-md transition border border-slate-200 cursor-pointer"
                          title="PDF 일정표 다운로드"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setScheduleToDelete(s)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition border border-red-200 cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {scheduleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">일정표 삭제 확인</h3>
                <p className="text-xs text-slate-500 mt-0.5">이 작업은 취소할 수 없습니다.</p>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong className="text-slate-800">{scheduleToDelete.workerName}</strong> 지원사의 <strong className="text-slate-800">{scheduleToDelete.year}년 {scheduleToDelete.month}월</strong> 일정표를 데이터베이스에서 삭제하시겠습니까?
              </p>
            </div>
            <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setScheduleToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSchedule(scheduleToDelete.workerName, scheduleToDelete.year, scheduleToDelete.month);
                  setScheduleToDelete(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition shadow-sm"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
