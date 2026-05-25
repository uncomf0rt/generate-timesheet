'use client';
import { Pen, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SignatureData } from '@/lib/types';

interface SignatureInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signature: SignatureData) => void;
  existingSignature?: SignatureData;
}

export function SignatureInput({
  isOpen,
  onClose,
  onSave,
  existingSignature,
}: SignatureInputProps) {
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingSignature?.imageData || null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && existingSignature?.imageData) {
      setPreviewUrl(existingSignature.imageData);
      setMode(existingSignature.type);
    }
  }, [isOpen, existingSignature]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 150;

    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isOpen]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      isDrawingRef.current = true;
      lastPosRef.current = getMousePos(e);
    },
    [getMousePos]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      const currentPos = getMousePos(e);
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
      lastPosRef.current = currentPos;
    },
    [getMousePos]
  );

  const stopDrawing = useCallback(() => {
    if (isDrawingRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        setPreviewUrl(canvas.toDataURL('image/png'));
      }
    }
    isDrawingRef.current = false;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPreviewUrl(null);
  }, []);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSave = useCallback(() => {
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      onSave({ imageData: dataUrl, type: 'draw' });
    } else {
      if (!previewUrl) return;
      onSave({ imageData: previewUrl, type: 'upload' });
    }
    onClose();
  }, [mode, previewUrl, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif italic text-[#3E3D39]">Signature</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('draw')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              mode === 'draw'
                ? 'bg-[#5A6355] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Pen className="w-4 h-4" />
            Draw
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              mode === 'upload'
                ? 'bg-[#5A6355] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Image
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          {mode === 'draw' ? (
            <div className="space-y-3">
              <canvas
                ref={canvasRef}
                className="w-full border border-gray-300 rounded-xl cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <button
                onClick={clearCanvas}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#5A6355] transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click to upload signature image</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleUpload}
                />
              </label>
              {uploadedFile && (
                <p className="text-sm text-gray-600">Selected: {uploadedFile.name}</p>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Preview</p>
            <div className="border border-gray-200 rounded-xl p-2 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Signature preview" className="max-h-24 mx-auto" />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-sm font-bold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!previewUrl}
            className="px-6 py-2.5 rounded-full text-sm font-bold bg-[#5A6355] text-white hover:bg-[#4A5246] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}
