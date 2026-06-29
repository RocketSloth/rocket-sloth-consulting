"use client";

import { useRef, useState } from "react";
import { CameraIcon, CheckIcon, ReceiptIcon } from "@/components/icons";
import { EVIDENCE_SPEC, REQUIRED_EVIDENCE_KINDS } from "@/lib/constants";
import { cn } from "@/lib/format";
import type { EvidenceKind } from "@/lib/types";

function FileSlot({ kind }: { kind: EvidenceKind }) {
  const spec = EVIDENCE_SPEC[kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName(null);
      setPreview(null);
      return;
    }
    setFileName(file.name);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  }

  const Icon = kind === "receipt_invoice" ? ReceiptIcon : CameraIcon;

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={cn(
        "relative flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-center transition-colors",
        fileName ? "border-brand/60 bg-brand/5" : "border-line-strong hover:border-brand/40"
      )}
    >
      {preview ? (
        <img src={preview} alt="" className="absolute inset-0 h-full w-full rounded-[10px] object-cover" />
      ) : null}
      <span
        className={cn(
          "relative flex flex-col items-center gap-1",
          preview && "rounded-lg bg-bg-deep/70 px-2 py-1"
        )}
      >
        <Icon className="text-2xl text-brand" />
        <span className="text-sm font-semibold text-ink">{spec.label}</span>
        <span className="text-[11px] leading-tight text-ink-faint">
          {fileName ? (
            <span className="inline-flex items-center gap-1 text-brand">
              <CheckIcon /> {fileName.length > 22 ? fileName.slice(0, 20) + "…" : fileName}
            </span>
          ) : (
            spec.help
          )}
        </span>
      </span>
      <input
        ref={inputRef}
        type="file"
        name={kind}
        accept={spec.accept}
        required
        onChange={onChange}
        className="sr-only"
      />
    </button>
  );
}

export function EvidenceUploader() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {REQUIRED_EVIDENCE_KINDS.map((kind) => (
          <FileSlot key={kind} kind={kind} />
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        All three are required. Your receipt stays private and is only used to verify the
        job really happened — before/after photos may appear on your published review.
      </p>
    </div>
  );
}
