import React, { useRef, useState, useEffect } from "react";
import { Trash2, PenTool } from "lucide-react";

interface SignaturePadProps {
  value?: string;
  onChange: (signature: string) => void;
  recipientName: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ value, onChange, recipientName }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);

  // Initialize or load existing signature on canvas if available (optional)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution match display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Line styles
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b"; // slate-800
    ctx.lineWidth = 2.5;

    // If there is an existing value, we don't necessarily draw it on the editable canvas,
    // but we can show it. For simplicity, we can load it if it matches, or just keep the state.
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = value;
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
      setHasSignature(false);
    }
  }, [value]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Check if touch event or mouse event
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent scrolling on touch devices when drawing
    if (e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e.cancelable) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Save signature
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    onChange("");
  };

  return (
    <div className="border border-slate-200 bg-slate-50/50 rounded-xl p-3.5 space-y-2.5">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <PenTool className="w-3 h-3 text-blue-500" />
          RECIPIENT SIGNATURE / 수급자(보호자) 서명
        </label>
        {hasSignature && (
          <button
            type="button"
            onClick={clearCanvas}
            className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100/80 px-2 py-0.5 rounded-md transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            지우기
          </button>
        )}
      </div>

      <div className="relative border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm hover:border-blue-300 transition-colors">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-24 cursor-crosshair touch-none"
          id="recipient-signature-canvas"
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 select-none">
            <span className="text-xs font-semibold text-slate-400">
              {recipientName ? `"${recipientName}" 님의 서명을 그리세요` : "여기에 서명해 주세요"}
            </span>
            <span className="text-[9px] text-slate-300 mt-0.5">마우스나 터치로 서명할 수 있습니다</span>
          </div>
        )}
      </div>
    </div>
  );
};
