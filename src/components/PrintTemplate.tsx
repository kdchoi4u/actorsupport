import React from "react";
import { MonthlySchedule } from "../types";
import { getKoreanWeekday } from "../utils/scheduleHelpers";

interface PrintTemplateProps {
  schedule: MonthlySchedule;
  id?: string;
}

export const PrintTemplate: React.FC<PrintTemplateProps> = ({ schedule, id = "print-document-container" }) => {
  const { year, month, workerName, recipientName, recipientBirth, days, totals, recipientSignature } = schedule;

  // Calendar calculations
  const startDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const grid: (number | null)[] = [];
  // Add leading padding for days of previous month
  for (let i = 0; i < startDay; i++) {
    grid.push(null);
  }
  // Add days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(d);
  }
  // Pad the remaining slots to fill standard 5 or 6 rows of 7 days
  while (grid.length < 35) {
    grid.push(null);
  }
  if (grid.length > 35) {
    while (grid.length < 42) {
      grid.push(null);
    }
  }

  // Split into weeks (rows of 7 days)
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7));
  }

  // Format the date for the signatures block
  // E.g., if there's a submittedDate, use it, otherwise use current date formatted
  const getSubmittedDateParts = () => {
    const dStr = schedule.submittedDate || new Date().toISOString().split("T")[0];
    const [y, m, d] = dStr.split("-");
    return {
      y: y || String(year),
      m: m || String(month),
      d: d || "05"
    };
  };

  const dateParts = getSubmittedDateParts();

  return (
    <div 
      id={id} 
      className="bg-white text-black p-5 font-sans border border-gray-300 shadow-lg mx-auto flex flex-col justify-between"
      style={{ width: "210mm", minHeight: "297mm", maxHeight: "297mm", boxSizing: "border-box", overflow: "hidden" }}
    >
      <div>
        {/* Title */}
        <h1 className="text-center text-2xl font-bold tracking-widest border-b-2 border-black pb-1 mb-3.5 font-sans">
          급여제공 일정표(<span className="underline px-2">{year}</span>년 <span className="underline px-2">{month}</span>월)
        </h1>

        {/* Top Metadata Table */}
        <table className="w-full border-collapse border-2 border-black text-center text-xs mb-3">
          <tbody>
            <tr className="h-8 border-b-2 border-black">
              <td className="w-24 bg-gray-100 border-r-2 border-black">
                <div className="flex h-full w-full items-center justify-center font-bold text-[11px]">수급자 성명</div>
              </td>
              <td className="border-r-2 border-black">
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold">{recipientName || ""}</div>
              </td>
              <td className="w-32 bg-gray-100 border-r-2 border-black">
                <div className="flex h-full w-full items-center justify-center font-bold text-[11px]">수급자 생년월일</div>
              </td>
              <td className="border-r-2 border-black">
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold">{recipientBirth || ""}</div>
              </td>
            </tr>
            <tr className="h-8">
              <td className="bg-gray-100 border-r-2 border-black">
                <div className="flex h-full w-full items-center justify-center font-bold text-[11px]">급여종류</div>
              </td>
              <td className="border-r-2 border-black">
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold">활동보조</div>
              </td>
              <td className="bg-gray-100 border-r-2 border-black">
                <div className="flex h-full w-full items-center justify-center font-bold text-[11px]">활동지원인력명</div>
              </td>
              <td className="border-r-2 border-black">
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold">{workerName || ""}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Calendar Grid Header & Body */}
        <table className="w-full border-collapse border-2 border-black text-center text-xs mb-3">
          <thead>
            <tr className="bg-yellow-200 border-b-2 border-black h-8 text-xs font-bold">
              <th className="border-r border-black w-[14.28%] p-0">
                <div className="flex h-full w-full items-center justify-center text-red-600">일</div>
              </th>
              <th className="border-r border-black w-[14.28%] p-0">
                <div className="flex h-full w-full items-center justify-center">월</div>
              </th>
              <th className="border-r border-black w-[14.28%] p-0">
                <div className="flex h-full w-full items-center justify-center">화</div>
              </th>
              <th className="border-r border-black w-[14.28%] p-0">
                <div className="flex h-full w-full items-center justify-center">수</div>
              </th>
              <th className="border-r border-black w-[14.28%] p-0">
                <div className="flex h-full w-full items-center justify-center">목</div>
              </th>
              <th className="border-r border-black w-[14.28%] p-0">
                <div className="flex h-full w-full items-center justify-center">금</div>
              </th>
              <th className="w-[14.28%] p-0">
                <div className="flex h-full w-full items-center justify-center text-blue-600">토</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wIdx) => (
              <tr key={wIdx} className="border-b border-black h-[85px]">
                {week.map((dayNum, dIdx) => {
                  const dayStr = dayNum ? String(dayNum) : "";
                  const dayData = dayNum ? days[dayStr] : null;

                  // Color weekend dates
                  const dayColor = dIdx === 0 ? "text-red-600" : dIdx === 6 ? "text-blue-600" : "text-black";

                  return (
                    <td 
                      key={dIdx} 
                      className={`border-r border-black relative h-[95px] p-0 ${dIdx === 6 ? "border-r-0" : ""}`}
                    >
                      {/* Day number block */}
                      {dayNum && (
                        <div className={`absolute top-0 left-0 w-8 h-[22px] border-r border-b border-black flex justify-center items-center font-bold text-[12px] bg-gray-100/50 ${dayColor}`}>
                          {dayNum}
                        </div>
                      )}
                      
                      {dayNum && dayData && dayData.totalHours > 0 && (
                        <div className="absolute top-0 right-0 h-[22px] flex items-center pr-1 text-[9px] text-blue-700 font-extrabold">
                          {dayData.totalHours}시간
                        </div>
                      )}

                      <div className="absolute inset-0 top-[22px] w-full flex flex-col items-center justify-center text-[10px] text-gray-800 leading-tight pb-1">
                        {/* Service Slot 1 */}
                        <div className="h-4 flex items-center justify-center w-full">
                          {dayData && dayData.slot1.start && dayData.slot1.end ? (
                            <span className="font-semibold">
                              ({dayData.slot1.start} ~ {dayData.slot1.end})
                            </span>
                          ) : (
                            <span>( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ~ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; )</span>
                          )}
                        </div>

                        {/* Break Time */}
                        <div className="h-[26px] flex flex-col items-center justify-center w-full mt-1">
                          <span className="text-[9px] text-black">휴게시간</span>
                          {dayData && dayData.break.start && dayData.break.end ? (
                            <span className="font-semibold mt-0.5">
                              ({dayData.break.start} ~ {dayData.break.end})
                            </span>
                          ) : (
                            <span className="mt-0.5">( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ~ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; )</span>
                          )}
                        </div>

                        {/* Service Slot 2 */}
                        <div className="h-4 flex items-center justify-center w-full mt-1">
                          {dayData && dayData.slot2.start && dayData.slot2.end ? (
                            <span className="font-semibold">
                              ({dayData.slot2.start} ~ {dayData.slot2.end})
                            </span>
                          ) : (
                            <span>( &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ~ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; )</span>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Bottom Totals Section */}
        <table className="w-full border-collapse border-2 border-black text-center text-xs mb-3">
          <tbody>
            <tr className="h-10">
              <td className="w-[18%] bg-gray-100 font-bold border-r border-black text-center align-middle h-10">
                <span className="text-[11px] font-bold whitespace-nowrap">총 제공 시간</span>
              </td>
              <td className="w-[18%] border-r-2 border-black text-center align-middle h-10 px-2">
                <div className="text-sm font-bold text-blue-800 whitespace-nowrap">
                  ( {totals.totalHours} )시간
                </div>
              </td>
              <td className="w-[64%] p-0 h-10">
                <table className="w-full h-full border-collapse">
                  <tbody>
                    <tr className="h-10">
                      <td className="w-1/4 border-r border-black bg-gray-50 font-bold text-[10px] px-1 text-center align-middle leading-tight whitespace-nowrap">
                        사회활동<br />
                        <span className="text-[11px] text-blue-700 font-bold">({totals.social} 시간)</span>
                      </td>
                      <td className="w-1/4 border-r border-black bg-gray-50 font-bold text-[10px] px-1 text-center align-middle leading-tight whitespace-nowrap">
                        가사활동<br />
                        <span className="text-[11px] text-blue-700 font-bold">({totals.household} 시간)</span>
                      </td>
                      <td className="w-1/4 border-r border-black bg-gray-50 font-bold text-[10px] px-1 text-center align-middle leading-tight whitespace-nowrap">
                        신체활동<br />
                        <span className="text-[11px] text-blue-700 font-bold">({totals.physical} 시간)</span>
                      </td>
                      <td className="w-1/4 bg-gray-50 font-bold text-[10px] px-1 text-center align-middle leading-tight whitespace-nowrap">
                        기타<br />
                        <span className="text-[11px] text-blue-700 font-bold">({totals.other} 시간)</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        {/* Footer Signatures Block */}
        <div className="text-right text-xs mb-3 mr-4 font-semibold text-gray-700">
          <span className="underline px-2">{dateParts.y}</span>년 &nbsp;
          <span className="underline px-2">{dateParts.m}</span>월 &nbsp;
          <span className="underline px-2">{dateParts.d}</span>일
        </div>

        <div className="flex flex-col space-y-2 text-sm font-medium mb-3 pl-4 pr-4">
          <div className="flex justify-between items-center h-8">
            <div>기관장 : <span className="font-bold">쌍촌장애인활동지원센터</span></div>
            <div className="text-xs text-gray-400 border border-dashed border-gray-300 rounded px-3 py-0.5">
              (서명 또는 인)
            </div>
          </div>
          <div className="flex justify-between items-center h-10">
            <div>수급자 : <span className="font-semibold underline underline-offset-4">{recipientName || "            "}</span></div>
            {recipientSignature ? (
              <div className="flex items-center gap-1.5 border border-blue-200 rounded px-2 py-0.5 bg-blue-50/25">
                <span className="text-[10px] text-blue-800 font-bold">수급자 서명</span>
                <img 
                  src={recipientSignature} 
                  alt="수급자 서명" 
                  className="h-8 w-20 object-contain bg-white border border-gray-200 rounded"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="text-xs text-gray-400 border border-dashed border-gray-300 rounded px-3 py-0.5">
                (서명 또는 인)
              </div>
            )}
          </div>
        </div>

        {/* Terms and conditions / Footnotes */}
        <div className="border-t border-gray-300 pt-2 text-[10px] text-gray-400 leading-relaxed space-y-0.5">
          <p>※ 매월 작성하여 기관 보관. (보관기간: 작성일로부터 3년)</p>
          <p>※ 활동지원기관 및 활동지원사와 수급자 및 보호자(가족)이 협의하여 매월 5일 이전까지 작성</p>
        </div>
      </div>
    </div>
  );
};
