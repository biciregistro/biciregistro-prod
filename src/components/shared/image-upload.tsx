"use client";

import { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";

interface ImageUploadProps {
  onUploadSuccess: (url: string) => void;
  storagePath: string; // e.g., "bike-images", "user-profiles"
}

export function ImageUpload({ onUploadSuccess, storagePath }: ImageUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [downloadURL, setDownloadURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setDownloadURL(null);
      setUploadProgress(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    // Create a unique file name to prevent overwrites
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
        setError("Upload failed. Please try again.");
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          setDownloadURL(url);
          onUploadSuccess(url); // Pass the URL to the parent component
          setUploadProgress(null);
          setFile(null);
        });
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          onChange={handleFileChange}
          accept="image/*,application/pdf"
          className="max-w-xs"
        />
        <Button onClick={handleUpload} disabled={!file || uploadProgress !== null}>
          {uploadProgress !== null ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {uploadProgress !== null && (
        <Progress value={uploadProgress} className="w-full" />
      )}
      
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {downloadURL && (
        <div className="mt-4">
          <p className="text-green-600 text-sm font-medium mb-2">File uploaded successfully!</p>
          {/* Basic preview for images */}
          {file?.type.startsWith("image/") ? (
             <Image
                src={downloadURL}
                alt="Uploaded image preview"
                width={200}
                height={200}
                className="rounded-md object-cover"
              />
          ) : (
            <a href={downloadURL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              View Uploaded File
            </a>
          )}
        </div>
      )}
    </div>
  );
}
