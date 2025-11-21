import { useRef } from "react";
import type { ChangeEvent } from "react";

interface ImageUploadProps {
  onImageSelected: (imageDataUrl: string) => void;
  accept?: string;
}

export default function ImageUpload({ 
  onImageSelected, 
  accept = "image/*"
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageSelected(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid gap-3 p-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
        aria-label="Escolher ficheiro"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={accept}
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        id="camera-upload"
        aria-label="Tirar foto com câmara"
      />
      
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 px-4 py-6 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition"
        >
          <span className="text-4xl">📷</span>
          <span className="text-sm font-medium text-gray-700">Tirar foto</span>
        </button>
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 px-4 py-6 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition"
        >
          <span className="text-4xl">🖼️</span>
          <span className="text-sm font-medium text-gray-700">Escolher ficheiro</span>
        </button>
      </div>
    </div>
  );
}

