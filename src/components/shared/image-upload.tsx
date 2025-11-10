"use client";

import { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface ImageUploadProps {
  onUploadSuccess: (url: string) => void;
  storagePath: string;
  disabled?: boolean;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function ImageUpload({ onUploadSuccess, storagePath, disabled = false }: ImageUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [downloadURL, setDownloadURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "Error al Cargar Archivo",
          description: `El archivo excede el límite de ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      
      setFile(selectedFile);
      setDownloadURL(null);
      setUploadProgress(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor, selecciona un archivo primero.");
      return;
    }
    if (disabled) {
        setError("La subida de archivos está deshabilitada.");
        return;
    }

    const fileName = `${storagePath}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        setError("La subida falló. Por favor, intenta de nuevo.");
        toast({
            title: "Error en la Subida",
            description: "No se pudo subir el archivo. Revisa tu conexión o intenta más tarde.",
            variant: "destructive",
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          setDownloadURL(url);
          onUploadSuccess(url);
          setUploadProgress(null);
          setFile(null);
          toast({
            title: "Éxito",
            description: "El archivo se ha subido correctamente."
          });
        });
      }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          onChange={handleFileChange}
          accept="image/*,application/pdf"
          className="max-w-xs cursor-pointer"
          disabled={disabled}
        />
        <Button onClick={handleUpload} disabled={disabled || !file || uploadProgress !== null}>
          {uploadProgress !== null ? "Subiendo..." : "Subir"}
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground pt-1">
        Tamaño máximo por archivo: {MAX_FILE_SIZE_MB}MB
      </p>

      {uploadProgress !== null && (
        <Progress value={uploadProgress} className="w-full mt-4" />
      )}
      
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {downloadURL && (
        <div className="mt-4">
          {file?.type.startsWith("image/") ? (
             <Image
                src={downloadURL}
                alt="Vista previa de la imagen subida"
                width={200}
                height={200}
                className="rounded-md object-cover"
              />
          ) : (
            <a href={downloadURL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Ver archivo subido
            </a>
          )}
        </div>
      )}
    </div>
  );
}
