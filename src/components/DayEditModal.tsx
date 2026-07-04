import React from "react";
import { DaySchedule } from "../types";
import { X, Copy, Trash2, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import { getDailyTotalHours } from "../utils/scheduleHelpers";

interface DayEditModalProps {
  dayNum: number;
  weekday: string;
  schedule: DaySchedule;
  onSave: (schedule: DaySchedule) => void;
  onClose: () => void;
  onCopyFromYesterday?: () => void;
  onCopyFromLastWeek?: () => void;
  hasYesterday: boolean;
  hasLastWeek: boolean;
}

export const DayEditModal: React.FC<DayEditModalProps> = ({
  dayNum,
  weekday,
  schedule,
  onSave,
  onClose,
  onCopyFromYesterday,
  onCopyFromLastWeek,
  hasYesterday,
  hasLastWeek,
}) => {
  // Local state for slots
  const [slot1Start, setSlot1Start] = React.useState(schedule.slot1.start);
  const [slot1End, setSlot1End] = React.useState(schedule.slot1.end);
  const [breakStart, setBreakStart] = React.useState(schedule.break.start);
  const [breakEnd, setBreakEnd] = React.useState(schedule.break.end);
  const [slot2Start, setSlot2Start] = React.useState(schedule.slot2.start);
  const [slot2End, setSlot2End] = React.useState(schedule.slot2.end);

  // Local state for categories
  const [physical, setPhysical] = React.useState(schedule.categories.physical);
  const [social, setSocial] = React.useState(schedule.categories.social);
  const [household, setHousehold] = React.useState(schedule.categories.household);
  const [other, setOther] = React.useState(schedule.categories.other);

  // Derived calculation
  const currentDayState: DaySchedule = {
    slot1: { start: slot1Start, end: slot1End },
    break: { start: breakStart, end: breakEnd },
    slot2: { start: slot2Start, end: slot2End },
    categories: { physical, social, household, other },
    totalHours: 0
  };

  const calculatedTotal = getDailyTotalHours(currentDayState);
  const categoriesSum = Number((physical + social + household + other).toFixed(1));
  const isMismatched = calculatedTotal > 0 && Math.abs(calculatedTotal - categoriesSum) > 0.05;

  const handleAutoAdjust = () => {
    // Intelligently distribute total hours to categories
    // Default to putting hours into physical/social depending on some heuristic,
    // or simply set 'social' or 'physical' if they are 0, or match the total.
    // Let's set physical and social to split the calculatedTotal
    if (calculatedTotal === 0) return;
    
    // Split: 50% physical, 50% social or round off
    const half = Number((calculatedTotal / 2).toFixed(1));
    const remainder = Number((calculatedTotal - half).toFixed(1));
    
    setPhysical(half);
    setSocial(remainder);
    setHousehold(0);
    setOther(0);
  };

  const handleSave = () => {
    onSave({
      ...currentDayState,
      totalHours: calculatedTotal
    });
  };

  const handleClear = () => {
    setSlot1Start("");
    setSlot1End("");
    setBreakStart("");
    setBreakEnd("");
    setSlot2Start("");
    setSlot2End("");
    setPhysical(0);
    setSocial(0);
    setHousehold(0);
    setOther(0);
  };

  // When props change (e.g., if copy buttons are clicked and trigger re-render with new schedule)
  React.useEffect(() => {
    setSlot1Start(schedule.slot1.start);
    setSlot1End(schedule.slot1.end);
    setBreakStart(schedule.break.start);
    setBreakEnd(schedule.break.end);
    setSlot2Start(schedule.slot2.start);
    setSlot2End(schedule.slot2.end);
    setPhysical(schedule.categories.physical);
    setSocial(schedule.categories.social);
    setHousehold(schedule.categories.household);
    setOther(schedule.categories.other);
  }, [schedule]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {dayNum}일 ({weekday}요일) 일정 상세 입력
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              제공시간을 기록하고, 동일한 활동 분배 시간을 세부 필드에 대입하세요.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Copies bar */}
        <div className="bg-slate-100/50 px-6 py-2.5 border-b border-slate-100 flex flex-wrap gap-2">
          {hasYesterday && (
            <button
              type="button"
              onClick={onCopyFromYesterday}
              className="flex items-center gap-1.5 text-xs bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-medium shadow-sm transition"
            >
              <Copy className="w-3.5 h-3.5" />
              어제({dayNum - 1}일) 내용 복사
            </button>
          )}
          {hasLastWeek && (
            <button
              type="button"
              onClick={onCopyFromLastWeek}
              className="flex items-center gap-1.5 text-xs bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-medium shadow-sm transition"
            >
              <Copy className="w-3.5 h-3.5" />
              지난주 동일 요일 복사
            </button>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="ml-auto flex items-center gap-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            비우기
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Times section */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <span className="w-1 h-3.5 bg-blue-600 rounded"></span>
              제공 및 휴게 시간 설정
            </h4>
            
            <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {/* Slot 1 */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  급여제공 1 (시작 ~ 종료)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={slot1Start}
                    onChange={(e) => setSlot1Start(e.target.value)}
                    className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="time"
                    value={slot1End}
                    onChange={(e) => setSlot1End(e.target.value)}
                    className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>
              </div>

              {/* Break Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  휴게시간 (시작 ~ 종료)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="time"
                    value={breakEnd}
                    onChange={(e) => setBreakEnd(e.target.value)}
                    className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>
              </div>

              {/* Slot 2 */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  급여제공 2 (시작 ~ 종료)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={slot2Start}
                    onChange={(e) => setSlot2Start(e.target.value)}
                    className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="time"
                    value={slot2End}
                    onChange={(e) => setSlot2End(e.target.value)}
                    className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Categories section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-emerald-600 rounded"></span>
                세부 활동 분류 시간 (시간 단위)
              </h4>
              {isMismatched && (
                <button
                  type="button"
                  onClick={handleAutoAdjust}
                  className="flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition"
                >
                  <Zap className="w-3 h-3" />
                  시간 자동 배분
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  신체활동 제공 (시간)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={physical || ""}
                  onChange={(e) => setPhysical(Number(e.target.value) || 0)}
                  placeholder="0.0"
                  className="w-full bg-white rounded-lg px-3 py-1.5 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  사회활동 제공 (시간)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={social || ""}
                  onChange={(e) => setSocial(Number(e.target.value) || 0)}
                  placeholder="0.0"
                  className="w-full bg-white rounded-lg px-3 py-1.5 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  가사활동 제공 (시간)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={household || ""}
                  onChange={(e) => setHousehold(Number(e.target.value) || 0)}
                  placeholder="0.0"
                  className="w-full bg-white rounded-lg px-3 py-1.5 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  기타 제공 (시간)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={other || ""}
                  onChange={(e) => setOther(Number(e.target.value) || 0)}
                  placeholder="0.0"
                  className="w-full bg-white rounded-lg px-3 py-1.5 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Live comparison summary */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm ${
            isMismatched
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : calculatedTotal === 0
              ? "bg-slate-50 border-slate-200 text-slate-500"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}>
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                {isMismatched ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    시간이 일치하지 않습니다
                  </>
                ) : calculatedTotal > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    활동 배분 일치 완료
                  </>
                ) : (
                  "시간이 입력되지 않았습니다"
                )}
              </div>
              <div className="text-xs opacity-90">
                {isMismatched 
                  ? `총 제공시간은 ${calculatedTotal}시간이지만, 세부 배분의 합은 ${categoriesSum}시간입니다.` 
                  : calculatedTotal > 0 
                  ? `일일 실근무 총 ${calculatedTotal}시간이 세부 항목과 잘 맞아떨어집니다.`
                  : "근무 시간(급여제공 1, 2)을 입력하면 실 근무시간이 계산됩니다."
                }
              </div>
            </div>

            <div className="flex gap-4 text-xs font-semibold self-end md:self-auto">
              <div className="text-center bg-white px-3 py-1 rounded border">
                <span className="block text-slate-400 font-normal">실근무(급여1+2)</span>
                <span className="text-sm font-bold text-slate-700">{calculatedTotal}시간</span>
              </div>
              <div className="text-center bg-white px-3 py-1 rounded border">
                <span className="block text-slate-400 font-normal">세부 합계</span>
                <span className={`text-sm font-bold ${isMismatched ? "text-amber-600" : "text-emerald-700"}`}>
                  {categoriesSum}시간
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm transition"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm shadow transition"
          >
            저장
          </button>
        </div>

      </div>
    </div>
  );
};
