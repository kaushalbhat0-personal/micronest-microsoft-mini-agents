"use client";
import { useState } from "react";

interface SlaStatusProps {
  slaDueAt?: string;
}

export function SlaStatus({ slaDueAt }: SlaStatusProps) {
  const [now] = useState(() => Date.now());
  if (!slaDueAt) return null;
  const due = new Date(slaDueAt).getTime();
  const remaining = due - now;
  if (remaining < 0) return <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">SLA Breached</span>;
  if (remaining < 60 * 60 * 1000) return <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">SLA At Risk</span>;
  return null;
}
