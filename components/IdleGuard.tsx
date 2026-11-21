"use client";

import { useEffect } from "react";

const IDLE_MS = 15 * 60 * 1000;

export function IdleGuard() {
  useEffect(() => {
    let timer = 0;
    let lastPing = 0;
    const ping = () => {
      const now = Date.now();
      if (now - lastPing < 30_000) return;
      lastPing = now;
      void fetch("/api/touch", { method: "POST" });
    };
    const arm = () => {
      window.clearTimeout(timer);
      ping();
      timer = window.setTimeout(() => {
        document.body.replaceChildren();
        void fetch("/api/sign-out", { method: "POST" }).finally(() => {
          window.location.replace("/login");
        });
      }, IDLE_MS);
    };
    const events = ["pointerdown", "keydown"] as const;
    events.forEach((event) => window.addEventListener(event, arm));
    arm();
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, arm));
    };
  }, []);
  return null;
}
