"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthState {
  whatsappConnected: boolean;
  extensionConnected: boolean;
  hasActiveSession: boolean;
  sessionState: string;
}

export function RuntimeHealthMonitor() {
  const [health, setHealth] = useState<HealthState>({
    whatsappConnected: false,
    extensionConnected: false,
    hasActiveSession: false,
    sessionState: "",
  });

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "MICRONEST_SEQUENCE_STATUS") {
        setHealth((prev) => ({
          ...prev,
          hasActiveSession: true,
          sessionState: event.data.state as string,
        }));
      }
    }

    window.addEventListener("message", handleMessage);

    const interval = setInterval(() => {
      window.postMessage(
        {
          type: "MICRONEST_SEQUENCE",
          payload: {
            type: "GET_RECOVERY_STATUS",
            payload: {},
          },
        },
        "*"
      );
    }, 10000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(interval);
    };
  }, []);

  const indicators = [
    {
      label: "Extension",
      connected: health.extensionConnected,
      icon: health.extensionConnected ? Wifi : WifiOff,
    },
    {
      label: "WhatsApp",
      connected: health.whatsappConnected,
      icon: health.whatsappConnected ? Wifi : WifiOff,
    },
  ];

  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
      {indicators.map((ind) => (
        <div key={ind.label} className="flex items-center gap-1">
          <ind.icon className={cn("size-3", ind.connected ? "text-green-500" : "text-muted-foreground")} />
          <span>{ind.label}</span>
          <span className={cn("size-1.5 rounded-full", ind.connected ? "bg-green-500" : "bg-muted-foreground")} />
        </div>
      ))}
      {health.hasActiveSession && (
        <div className="flex items-center gap-1">
          <Play className="size-3 text-blue-500" />
          <span>{health.sessionState}</span>
        </div>
      )}
    </div>
  );
}
