"use client";

import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function WeeklyActivityChart({ 
  totalDeployments = 0, 
  totalRevisions = 0,
  modulesActivity = []
}: { 
  totalDeployments?: number; 
  totalRevisions?: number; 
  modulesActivity?: any[];
}) {
  const [timeRange, setTimeRange] = useState("This Week");

  const chartData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let startDate = new Date(now);
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999); // End of the day

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

    if (timeRange === "This Month") {
      const data = [
        { name: "Week 1", deployments: 0, revisions: 0 },
        { name: "Week 2", deployments: 0, revisions: 0 },
        { name: "Week 3", deployments: 0, revisions: 0 },
        { name: "Week 4", deployments: 0, revisions: 0 },
      ];
      
      modulesActivity.forEach((m) => {
        if (m.deployment_date) {
          const dDate = new Date(m.deployment_date);
          if (dDate >= startDate && dDate <= endDate) {
            const week = Math.min(Math.floor((dDate.getDate() - 1) / 7), 3);
            data[week].deployments++;
          }
        }
        if (m.revision_date) {
          const rDate = new Date(m.revision_date);
          if (rDate >= startDate && rDate <= endDate) {
            const week = Math.min(Math.floor((rDate.getDate() - 1) / 7), 3);
            data[week].revisions++;
          }
        }
      });
      return data;
    } else {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const data = days.map(d => ({ name: d, deployments: 0, revisions: 0 }));
      
      modulesActivity.forEach((m) => {
        if (m.deployment_date) {
          const dDate = new Date(m.deployment_date);
          if (dDate >= startDate && dDate <= endDate) {
            const dayIdx = dDate.getDay() === 0 ? 6 : dDate.getDay() - 1; 
            data[dayIdx].deployments++;
          }
        }
        if (m.revision_date) {
          const rDate = new Date(m.revision_date);
          if (rDate >= startDate && rDate <= endDate) {
             const dayIdx = rDate.getDay() === 0 ? 6 : rDate.getDay() - 1;
             data[dayIdx].revisions++;
          }
        }
      });
      return data;
    }
  }, [timeRange, modulesActivity]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-black text-[var(--sys-primary)] mb-1">Weekly Activity Overview</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Deployed vs Revision across all projects</p>
        </div>
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option>This Week</option>
          <option>Last Week</option>
          <option>This Month</option>
        </select>
      </div>

      {(() => {
        const total = totalDeployments + totalRevisions;
        const rate = total > 0 ? Math.round((totalDeployments / total) * 100) : 0;
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
              <div className="w-12 h-12 shrink-0 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">Deployed</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalDeployments}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
              <div className="w-12 h-12 shrink-0 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">Revisions</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalRevisions}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
              <div className="w-12 h-12 shrink-0 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">Deployment Rate</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{rate}%</p>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDeployments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRevisions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
              itemStyle={{ fontWeight: 'bold' }}
            />
            <Area 
              type="monotone" 
              dataKey="deployments"
              name="Deployed"
              stroke="#6366f1" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorDeployments)" 
              activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
            />
            <Area 
              type="monotone" 
              dataKey="revisions"
              name="Revision"
              stroke="#f59e0b" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevisions)" 
              activeDot={{ r: 6, strokeWidth: 0, fill: '#f59e0b' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
