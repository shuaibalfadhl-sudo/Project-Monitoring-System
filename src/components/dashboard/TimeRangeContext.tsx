"use client";

import React, { createContext, useContext, useState, useMemo } from "react";

export type TimeRange = "This Week" | "Last Week" | "This Month" | string;

// Single source of truth for converting a filter label into a concrete date window,
// so the Weekly Activity chart and the revision leaderboard always agree.
export function getRangeBounds(timeRange: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const startDate = new Date(now);
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  if (timeRange === "This Week") {
    const day = now.getDay() || 7;
    startDate.setDate(now.getDate() - day + 1);
    endDate.setDate(startDate.getDate() + 6);
  } else if (timeRange === "Last Week") {
    const day = now.getDay() || 7;
    startDate.setDate(now.getDate() - day - 6);
    endDate.setDate(startDate.getDate() + 6);
  } else if (timeRange === "This Month") {
    startDate.setDate(1);
    endDate.setMonth(startDate.getMonth() + 1);
    endDate.setDate(0);
  }

  return { startDate, endDate };
}

interface TimeRangeContextValue {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  bounds: { startDate: Date; endDate: Date };
}

const TimeRangeContext = createContext<TimeRangeContextValue | null>(null);

export function TimeRangeProvider({ children }: { children: React.ReactNode }) {
  const [timeRange, setTimeRange] = useState<TimeRange>("This Week");
  const bounds = useMemo(() => getRangeBounds(timeRange), [timeRange]);

  return (
    <TimeRangeContext.Provider value={{ timeRange, setTimeRange, bounds }}>
      {children}
    </TimeRangeContext.Provider>
  );
}

export function useTimeRange() {
  return useContext(TimeRangeContext);
}
