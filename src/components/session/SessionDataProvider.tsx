"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { statusLabel as registryStatusLabel } from "@/lib/moduleStatuses";

export const MODULE_FIELDS = [
  "id",
  "project_id",
  "name",
  "description",
  "priority",
  "status",
  "deadline",
  "development_date",
  "category",
  "assigned_developer_id",
  "module_document_url",
  "website_link",
  "qa_result_document_url",
  "qa_acknowledged_at",
  "qa_acknowledged_by",
  "qa_result_acknowledged_at",
  "qa_result_acknowledged_by",
  "developer_feedback",
  "created_at",
  "updated_at",
].join(",");

const DAY_MS = 24 * 60 * 60 * 1000;

const isMissingColumnError = (err: any, column: string) =>
  err?.code === "42703" && String(err?.message ?? "").toLowerCase().includes(column.toLowerCase());

export interface CachedProject {
  id: string;
  name: string;
  company_id?: string | null;
  created_by?: string | null;
  status?: string | null;
  description?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  project_modules?: any[];
  [key: string]: any;
}

export interface CachedProfile {
  id: string;
  full_name: string | null;
  role?: string;
}

interface SessionDataValue {
  isLoading: boolean;
  error: string | null;
  projects: CachedProject[];
  profiles: CachedProfile[];
  allModules: any[];
  projectName: (projectId?: string | null) => string;
  profileName: (userId?: string | null) => string | null;
  refresh: () => void;
}

const SessionDataContext = createContext<SessionDataValue | null>(null);

export function useSessionData(): SessionDataValue {
  const ctx = useContext(SessionDataContext);
  if (!ctx) throw new Error("useSessionData must be used inside SessionDataProvider");
  return ctx;
}

interface SessionDataProviderProps {
  userId: string;
  role: string;
  activeCompanyId: string | null;
  children: React.ReactNode;
}

export default function SessionDataProvider({ userId, role, activeCompanyId, children }: SessionDataProviderProps) {
  const [projects, setProjects] = useState<CachedProject[]>([]);
  const [profiles, setProfiles] = useState<CachedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseRef = useRef(createClient());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef(false);
  const wasDisconnectedRef = useRef(false);
  const moduleFieldsRef = useRef<string>(MODULE_FIELDS);
  const identity = `${userId}:${role}:${activeCompanyId ?? "all"}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  // If a selected column doesn't exist yet in the database (e.g. the new
  // developer_feedback column before its migration is applied), drop it and
  // retry once so the whole workspace doesn't fail to load.
  const selectWithRetry = async <T extends { data: any; error: any }>(
    build: (fields: string) => PromiseLike<T>,
  ): Promise<T> => {
    let res = await build(moduleFieldsRef.current);
    if (res.error && isMissingColumnError(res.error, "developer_feedback")) {
      moduleFieldsRef.current = MODULE_FIELDS.replace(", developer_feedback", "");
      res = await build(moduleFieldsRef.current);
    }
    return res;
  };

  const load = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (inflightRef.current) return;
    inflightRef.current = true;
    setError(null);
    try {
      const projectSelect = (fields: string) =>
        `id, name, company_id, created_by, status, description, start_date, target_date, project_modules (${fields})`;

      let rows: any[] | null = null;

      if (role === "project_manager" || role === "super_admin") {
        const res = await selectWithRetry((fields) => {
          let query = supabase.from("projects").select(projectSelect(fields));
          if (activeCompanyId) query = query.eq("company_id", activeCompanyId);
          return query;
        });
        if (res.error) throw res.error;
        rows = res.data as any[];
      } else {
        // Member-based roles (auditor / developer / devops): resolve the
        // projects they belong to via project_members, under RLS.
        let memberQuery = supabase
          .from("project_members")
          .select("project_id")
          .eq("user_id", userId);
        if (activeCompanyId) memberQuery = memberQuery.eq("projects!inner(company_id)", activeCompanyId);
        const memberRes = await memberQuery;
        const projectIds = [...new Set((memberRes.data ?? []).map((m: any) => m.project_id))] as string[];

        if (projectIds.length === 0) {
          rows = [];
        } else {
          const res = await selectWithRetry((fields) =>
            supabase
              .from("projects")
              .select(projectSelect(fields))
              .in("id", projectIds),
          );
          if (res.error || !(res.data as any[])?.length) {
            // RLS may only expose projects through membership joins (the
            // shape every existing page uses) — mirror that shape instead.
            const nestedRes = await selectWithRetry((fields) => {
              let nestedQuery = supabase
                .from("project_members")
                .select(`projects!inner(${projectSelect(fields)})`)
                .eq("user_id", userId);
              if (activeCompanyId) nestedQuery = nestedQuery.eq("projects.company_id", activeCompanyId);
              return nestedQuery;
            });
            if (nestedRes.error) throw nestedRes.error;
            rows = (nestedRes.data ?? []).map((d: any) => d.projects).filter(Boolean);
          } else {
            rows = res.data as any[];
          }
        }
      }

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role");
      if (profileError) throw profileError;

      setProjects(rows ?? []);
      setProfiles((profileRows ?? []) as CachedProfile[]);
      localStorage.setItem(`sessionCacheAt:${identityRef.current}`, String(Date.now()));
    } catch (err: any) {
      setError(err?.message || "Failed to load session data.");
    } finally {
      inflightRef.current = false;
      setIsLoading(false);
    }
  }, [userId, role, activeCompanyId]);

  // Bootstrap: fetch once per login / company switch; skip while the
  // day-fresh cache in another mount of the same session still stands.
  useEffect(() => {
    setIsLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  // Daily expiry: refetch when a tab is used after the cache is a day old.
  useEffect(() => {
    const check = () => {
      const raw = localStorage.getItem(`sessionCacheAt:${identityRef.current}`);
      const at = raw ? Number(raw) : 0;
      if (!at || Date.now() - at > DAY_MS) load();
    };
    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Realtime: any change to the cached tables triggers one debounced refetch.
  useEffect(() => {
    const supabase = supabaseRef.current;
    const scheduleRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => load(), 400);
    };
    const channel = supabase
      .channel("session-data-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "project_modules" }, scheduleRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, scheduleRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, scheduleRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_members" }, scheduleRefetch)
      .subscribe((status) => {
        // Reconnect after a drop (laptop sleep, network blip): the missed
        // events never arrived, so resync once.
        if ((status as string) === "rejoined" || ((status as string) === "SUBSCRIBED" && wasDisconnectedRef.current)) {
          wasDisconnectedRef.current = false;
          scheduleRefetch();
        }
        if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          wasDisconnectedRef.current = true;
        }
      });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [load]);

  const allModules = projects.flatMap((p) =>
    (p.project_modules ?? []).map((m) => ({ ...m, project: { id: p.id, name: p.name, created_by: p.created_by } })),
  );

  const nameMap = useRef(new Map<string, string | null>());
  nameMap.current = new Map(profiles.map((p) => [p.id, p.full_name]));
  const projectMap = useRef(new Map<string, CachedProject>());
  projectMap.current = new Map(projects.map((p) => [p.id, p]));

  const value: SessionDataValue = {
    isLoading,
    error,
    projects,
    profiles,
    allModules,
    projectName: (projectId) => projectMap.current.get(projectId ?? "")?.name ?? "Unknown project",
    profileName: (userIdParam) => (userIdParam ? nameMap.current.get(userIdParam) ?? null : null),
    refresh: () => load(),
  };

  return <SessionDataContext.Provider value={value}>{children}</SessionDataContext.Provider>;
}

export { registryStatusLabel };
