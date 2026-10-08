'use client';
import DocumentUploadCard from './DocumentUploadCard';

export default function ScreenshotUpload({ onUpload, disabled }) {
  return <DocumentUploadCard onUpload={onUpload} disabled={disabled} />;
}
