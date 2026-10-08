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

      <div className="flex gap-10 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Deployed</span>
          </div>
          <span className="text-3xl font-black text-[var(--sys-primary)]">{totalDeployments}</span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Revision</span>
          </div>
          <span className="text-3xl font-black text-[var(--sys-primary)]">{totalRevisions}</span>
        </div>
      </div>

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
