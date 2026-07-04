import React from "react";
import { Worker } from "../types";
import { User, ShieldAlert, Sparkles } from "lucide-react";

interface RoleSelectorProps {
  currentRole: "worker" | "admin";
  onRoleChange: (role: "worker" | "admin") => void;
  workers: Worker[];
  selectedWorkerId: string;
  onWorkerChange: (id: string) => void;
  onAddWorker: (name: string, recipientName: string, recipientBirth: string) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  currentRole,
  onRoleChange,
  workers,
  selectedWorkerId,
  onWorkerChange,
  onAddWorker,
}) => {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newWorkerName, setNewWorkerName] = React.useState("");
  const [defaultRec, setDefaultRec] = React.useState("");
  const [defaultBirth, setDefaultBirth] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;
    onAddWorker(newWorkerName.trim(), defaultRec.trim(), defaultBirth.trim());
    setNewWorkerName("");
    setDefaultRec("");
    setDefaultBirth("");
    setShowAddForm(false);
  };

  const activeWorker = workers.find((w) => w.id === selectedWorkerId);

  return (
    <div className="bg-white text-slate-800 rounded-xl p-4 shadow-sm mb-6 border border-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[9px] font-black tracking-wider text-blue-600 uppercase block">쌍촌장애인활동지원센터 일정관리시스템</span>
          <h2 className="text-sm font-bold flex items-center gap-1.5 mt-0.5 text-slate-900 font-sans">
            <Sparkles className="w-4 h-4 text-amber-500" />
            활동지원 급여제공일정표 등록 및 전자제출
          </h2>
        </div>

        {/* Role Toggle Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => onRoleChange("worker")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              currentRole === "worker"
                ? "bg-[#1E293B] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            활동지원사용
          </button>
          <button
            onClick={() => onRoleChange("admin")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              currentRole === "admin"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-500 hover:text-rose-600"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            관리자용 (통합조회)
          </button>
        </div>
      </div>

      {currentRole === "worker" && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-end gap-4">
          <div className="w-full md:w-80">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              SELECTED CAREGIVER / 활동지원사 본인 이름 선택
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => onWorkerChange(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 text-xs border border-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">-- 활동지원사를 선택하세요 --</option>
              {workers
                .filter((w) => w.role !== "admin")
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.defaultRecipientName ? ` (수급자: ${w.defaultRecipientName})` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-2">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="text-[11px] bg-slate-50 border border-slate-200 hover:bg-slate-100 text-blue-600 font-bold px-3.5 py-2 rounded-lg transition"
              >
                + 신규 활동지원사 등록
              </button>
            ) : (
              <button
                onClick={() => setShowAddForm(false)}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3.5 py-2 rounded-lg transition border"
              >
                닫기
              </button>
            )}
          </div>
        </div>
      )}

      {/* Popover Add Form */}
      {showAddForm && currentRole === "worker" && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">지원사 성명 *</label>
            <input
              type="text"
              required
              value={newWorkerName}
              onChange={(e) => setNewWorkerName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full bg-white text-slate-800 rounded-md px-3 py-1.5 text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">담당 수급자 성명</label>
            <input
              type="text"
              value={defaultRec}
              onChange={(e) => setDefaultRec(e.target.value)}
              placeholder="예: 김수급"
              className="w-full bg-white text-slate-800 rounded-md px-3 py-1.5 text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">수급자 생년월일</label>
            <input
              type="text"
              value={defaultBirth}
              onChange={(e) => setDefaultBirth(e.target.value)}
              placeholder="예: 1955-08-15"
              className="w-full bg-white text-slate-800 rounded-md px-3 py-1.5 text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 rounded-md transition shadow-sm"
          >
            등록 완료
          </button>
        </form>
      )}

      {currentRole === "admin" && (
        <div className="mt-3 p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          <span>현재 <strong className="font-bold">관리자 조회 모드</strong>입니다. 센터에 제출된 모든 지원사의 급여제공일정표 목록을 확인 및 수정, 삭제하고 통합 다운로드할 수 있습니다.</span>
        </div>
      )}
    </div>
  );
};
