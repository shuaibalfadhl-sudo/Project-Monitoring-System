import { getUserProfile } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import HallOfFameClient from '@/components/dashboard/HallOfFameClient'
import { type RevisionModuleRow } from '@/components/dashboard/useRevisionRanking'

export default async function HallOfFamePage() {
  const profile = await getUserProfile()

  if (!profile) {
    redirect('/login')
  }

  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value || null;

  const supabaseServer = await createClient()

  // Fetch leaderboard data for everyone
  let pmLeaderboard: { pmName: string; pmAvatar: string | null; deployedPercentage: number; totalModules: number; deployedModules: number; pmId: string }[] = [];

  // Try to use the RPC which bypasses RLS (if the user has created it)
  const { data: rpcData, error: rpcError } = await supabaseServer.rpc('get_pm_leaderboard', {
    p_company_id: activeCompanyId
  });

  if (rpcError && rpcError.code !== 'PGRST202') {
    console.error("RPC Error:", rpcError);
  }

  if (!rpcError && rpcData) {
    pmLeaderboard = rpcData.map((row: any) => ({
      pmId: row.pm_id,
      pmName: row.pm_name,
      pmAvatar: row.pm_avatar,
      totalModules: Number(row.total_modules),
      deployedModules: Number(row.deployed_modules),
      deployedPercentage: Number(row.deployed_percentage)
    }));
  } else {
    // Fallback to manual fetching if RPC doesn't exist (this is subject to RLS for non-admins)
    const [{ data: allProjectsForLeaderboard }, { data: allProfiles }] = await Promise.all([
      supabaseServer
        .from('projects')
        .select(`
          id,
          created_by,
          company_id,
          project_modules (id, status)
        `),
      supabaseServer
        .from('profiles')
        .select('id, full_name, avatar_path')
    ]);

    const profilesMap = new Map(allProfiles?.map(p => [p.id, { name: p.full_name, avatar: p.avatar_path }]) || []);

    if (allProjectsForLeaderboard) {
      const pmStats: Record<string, { name: string; avatar: string | null; total: number; deployed: number }> = {};

      allProjectsForLeaderboard.forEach((p: any) => {
        if (activeCompanyId && p.company_id !== activeCompanyId) return;

        const pmId = p.created_by;
        const pmProfile = profilesMap.get(pmId) || { name: 'Unknown PM', avatar: null };

        if (!pmStats[pmId]) {
          pmStats[pmId] = { name: pmProfile.name as string, avatar: pmProfile.avatar as string | null, total: 0, deployed: 0 };
        }

        if (p.project_modules) {
          pmStats[pmId].total += p.project_modules.length;
          pmStats[pmId].deployed += p.project_modules.filter((m: any) => m.status === 'deployed').length;
        }
      });

      pmLeaderboard = Object.entries(pmStats)
        .filter(([_, stat]) => stat.total > 0)
        .map(([id, stat]) => ({
          pmId: id,
          pmName: stat.name,
          pmAvatar: stat.avatar,
          totalModules: stat.total,
          deployedModules: stat.deployed,
          deployedPercentage: (stat.deployed / stat.total) * 100
        }))
        .sort((a, b) => a.deployedPercentage - b.deployedPercentage)
        .slice(0, 3);
    }
  }

  // Fetch per-module, date-attributed revision data so the leaderboard can be
  // filtered by the same time window as the Weekly Activity chart. Prefers a
  // SECURITY DEFINER RPC (company-wide for every role); falls back to RLS-scoped reads.
  let revisionModules: RevisionModuleRow[] = [];

  const { data: revRpcData, error: revRpcError } = await supabaseServer.rpc(
    'get_dev_revisions_by_date',
    { p_company_id: activeCompanyId }
  );

  if (revRpcError && revRpcError.code !== 'PGRST202') {
    console.error("Dev revisions RPC Error:", revRpcError);
  }

  if (!revRpcError && revRpcData) {
    revisionModules = revRpcData.map((row: any) => ({
      devId: row.dev_id,
      devName: row.dev_name,
      devAvatar: row.dev_avatar,
      revisionCount: Number(row.revision_count || 0),
      revisionDate: row.revision_date,
    }));
  } else {
    const [{ data: revMods }, { data: revProfiles }] = await Promise.all([
      supabaseServer
        .from('project_modules')
        .select('assigned_developer_id, revision_count, revision_date, projects!inner(company_id)'),
      supabaseServer
        .from('profiles')
        .select('id, full_name, avatar_path')
    ]);

    const revProfilesMap = new Map(revProfiles?.map(p => [p.id, { name: p.full_name, avatar: p.avatar_path }]) || []);

    revMods?.forEach((m: any) => {
      if (activeCompanyId && m.projects?.company_id !== activeCompanyId) return;
      if (!m.assigned_developer_id) return;
      const prof = revProfilesMap.get(m.assigned_developer_id) || { name: 'Unknown Developer', avatar: null };
      revisionModules.push({
        devId: m.assigned_developer_id,
        devName: prof.name as string,
        devAvatar: (prof.avatar as string | null) ?? null,
        revisionCount: Number(m.revision_count || 0),
        revisionDate: m.revision_date ?? null,
      });
    });
  }

  // Company-wide module totals for the executive KPI strip.
  const { data: rpcActivityData, error: activityError } = await supabaseServer
    .rpc('get_all_modules_activity', { p_company_id: activeCompanyId });
  let modulesActivity: { status: string | null }[] = rpcActivityData || [];
  if (activityError) {
    const { data: fallbackActivity } = await supabaseServer
      .from('project_modules')
      .select('status, projects!inner(company_id)');
    modulesActivity = (fallbackActivity || []).filter((m) => {
      const project = m.projects as unknown as { company_id: string } | null;
      return !activeCompanyId || project?.company_id === activeCompanyId;
    });
  }
  const totalModules = modulesActivity.length;
  const deployedModules = modulesActivity.filter((m) => m.status === 'deployed').length;

  // Older leaderboard RPCs may not return avatar columns; fill any gaps from profiles.
  const missingAvatarIds = new Set<string>();
  pmLeaderboard.forEach((pm) => { if (!pm.pmAvatar) missingAvatarIds.add(pm.pmId); });
  revisionModules.forEach((m) => { if (!m.devAvatar) missingAvatarIds.add(m.devId); });
  if (missingAvatarIds.size > 0) {
    const { data: avatarProfiles } = await supabaseServer
      .from('profiles')
      .select('id, avatar_path')
      .in('id', [...missingAvatarIds]);
    const avatarMap = new Map(avatarProfiles?.map((p) => [p.id, p.avatar_path]) || []);
    pmLeaderboard.forEach((pm) => { pm.pmAvatar = pm.pmAvatar || avatarMap.get(pm.pmId) || null; });
    revisionModules.forEach((m) => { m.devAvatar = m.devAvatar || avatarMap.get(m.devId) || null; });
  }

  return (
    <HallOfFameClient
      pmLeaderboard={pmLeaderboard}
      revisionModules={revisionModules}
      totalModules={totalModules}
      deployedModules={deployedModules}
    />
  )
}
