import { getUserProfile } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import DashboardRealtime from '@/components/dashboard/DashboardRealtime'
import WeeklyActivityChart from '@/components/dashboard/WeeklyActivityChart'
import FullscreenButton from '@/components/dashboard/FullscreenButton'
import AnimatedProgress from '@/components/dashboard/AnimatedProgress'

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

  // Fetch Developer Revision Leaderboard
  let devRevisionLeaderboard: { devId: string; devName: string; devAvatar: string | null; totalRevisions: number; totalModules: number }[] = [];

  const { data: devRpcData, error: devRpcError } = await supabaseServer.rpc('get_dev_revision_leaderboard', {
    p_company_id: activeCompanyId
  });

  if (devRpcError && devRpcError.code !== 'PGRST202') {
    console.error("Dev RPC Error:", devRpcError);
  }

  if (!devRpcError && devRpcData) {
    devRevisionLeaderboard = devRpcData.map((row: any) => ({
      devId: row.dev_id,
      devName: row.dev_name,
      devAvatar: row.dev_avatar,
      totalRevisions: Number(row.total_revisions),
      totalModules: Number(row.total_modules)
    }));
  } else {
    // Fallback logic for Developer Revisions
    const [{ data: allModulesForLeaderboard }, { data: allProfiles }] = await Promise.all([
      supabaseServer
        .from('project_modules')
        .select('id, assigned_developer_id, revision_count, projects!inner(company_id)'),
      supabaseServer
        .from('profiles')
        .select('id, full_name, avatar_path')
    ]);

    if (allModulesForLeaderboard && allProfiles) {
      const profilesMap = new Map(allProfiles.map(p => [p.id, { name: p.full_name, avatar: p.avatar_path }]));
      const devStats: Record<string, { name: string; avatar: string | null; totalRevisions: number; totalModules: number }> = {};

      allModulesForLeaderboard.forEach((m: any) => {
        if (activeCompanyId && m.projects?.company_id !== activeCompanyId) return;

        if (m.assigned_developer_id) {
          const devId = m.assigned_developer_id;
          const devProfile = profilesMap.get(devId) || { name: 'Unknown Developer', avatar: null };

          if (!devStats[devId]) {
            devStats[devId] = { name: devProfile.name as string, avatar: devProfile.avatar as string | null, totalRevisions: 0, totalModules: 0 };
          }

          devStats[devId].totalModules += 1;
          devStats[devId].totalRevisions += (m.revision_count || 0);
        }
      });

      devRevisionLeaderboard = Object.entries(devStats)
        .filter(([_, stat]) => stat.totalRevisions > 0)
        .map(([id, stat]) => ({
          devId: id,
          devName: stat.name,
          devAvatar: stat.avatar,
          totalRevisions: stat.totalRevisions,
          totalModules: stat.totalModules
        }))
        .sort((a, b) => b.totalRevisions - a.totalRevisions)
        .slice(0, 3);
    }
  }

  // Fetch total deployments and revisions across ALL projects for Weekly Activity
  // We use an RPC to bypass RLS so all users can see company-wide progress
  const { data: rpcActivityData, error: activityError } = await supabaseServer
    .rpc('get_all_modules_activity', { p_company_id: activeCompanyId });

  let modulesActivity = rpcActivityData || [];

  if (activityError) {
    // Fallback if the user hasn't created the RPC yet
    const { data: fallbackActivity } = await supabaseServer
      .from('project_modules')
      .select('status, deployment_date:deployed_date, revision_date, projects!inner(company_id)');
    modulesActivity = fallbackActivity?.filter((m: any) => !activeCompanyId || m.projects?.company_id === activeCompanyId) || [];
  }

  let totalDeployments = 0;
  let totalRevisions = 0;

  if (modulesActivity.length > 0) {
    modulesActivity.forEach((m: any) => {
      if (m.status === 'deployed') totalDeployments++;
      if (m.status === 'revision') totalRevisions++;
    });
  }

  return (
    <div id="hall-of-fame-container" className="w-full h-full min-h-screen bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-transparent dark:border-slate-800 transition-colors duration-300 overflow-y-auto">
      <DashboardRealtime />
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Hall of Fame</h1>
          <p className="text-slate-500 font-medium"></p>
        </div>
        <FullscreenButton />
      </div>

      {(pmLeaderboard.length > 0 || devRevisionLeaderboard.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

          <div className="lg:col-span-1 flex flex-col gap-6 h-full">
            {pmLeaderboard.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex-1 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 shrink-0 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-black text-gray-900 dark:text-gray-100 leading-tight">Lowest Deployment Rates</h2>
                      <p className="text-xs font-medium text-gray-500 mt-1">Developers with the lowest deployment rates.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0 mt-1">Top 3 PMs</span>
                </div>

                <div className="flex flex-col gap-6">
                  {pmLeaderboard.map((pm, idx) => (
                    <div key={pm.pmId} className="flex items-center gap-4">
                      <div className="w-8 h-8 shrink-0 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center text-xs font-black text-red-500">
                        {idx + 1}
                      </div>
                      <div className="w-10 h-10 shrink-0 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-sm font-black text-indigo-500 dark:text-indigo-400 overflow-hidden border-2 border-indigo-100 dark:border-indigo-800/50">
                        {pm.pmAvatar ? (
                          <img src={pm.pmAvatar} alt={pm.pmName} className="w-full h-full object-cover" />
                        ) : (
                          pm.pmName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-none mb-1">{pm.pmName}</h3>
                        <p className="text-xs mb-2">
                          <span className="text-lg font-black text-red-500">{Math.round(pm.deployedPercentage)}%</span> <span className="text-gray-500 font-medium">deployment rate</span>
                        </p>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <AnimatedProgress percentage={pm.deployedPercentage} className="bg-red-500" />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                          {pm.deployedModules} <span className="text-gray-400 font-medium">/ {pm.totalModules}</span>
                        </p>
                        <p className="text-[10px] font-medium text-gray-400 mt-1">deployed</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {devRevisionLeaderboard.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex-1 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 shrink-0 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-black text-gray-900 dark:text-gray-100 leading-tight">Highest Revision Counts</h2>
                      <p className="text-xs font-medium text-gray-500 mt-1">Developers with the highest number of revisions.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0 mt-1">Top 3 Devs</span>
                </div>

                <div className="flex flex-col gap-6">
                  {devRevisionLeaderboard.map((dev, idx) => (
                    <div key={dev.devId} className="flex items-center gap-4">
                      <div className="w-8 h-8 shrink-0 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-xs font-black text-orange-500">
                        {idx + 1}
                      </div>
                      <div className="w-10 h-10 shrink-0 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-sm font-black text-amber-500 dark:text-amber-400 overflow-hidden border-2 border-amber-100 dark:border-amber-800/50">
                        {dev.devAvatar ? (
                          <img src={dev.devAvatar} alt={dev.devName} className="w-full h-full object-cover" />
                        ) : (
                          dev.devName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-none mb-1">{dev.devName}</h3>
                        <p className="text-xs mb-1">
                          <span className="text-lg font-black text-orange-500">{dev.totalRevisions}</span> <span className="text-gray-500 font-medium">revisions</span>
                        </p>
                        <p className="text-[10px] font-medium text-gray-400">
                          Revisions across {dev.totalModules} modules
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-2 h-full animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <WeeklyActivityChart
              totalDeployments={totalDeployments}
              totalRevisions={totalRevisions}
              modulesActivity={modulesActivity}
            />
          </div>

        </div>
      )}
    </div>
  )
}
