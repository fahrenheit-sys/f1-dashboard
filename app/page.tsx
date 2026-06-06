import { redirect } from 'next/navigation'
import { getLiveSessionUser } from '@/lib/auth'
import { getDashboardStats } from '@/lib/data'
import { getDashboardConfig } from '@/lib/config'
import { listTeam, type TeamMember } from '@/lib/team'
import Dashboard from './dashboard-client'

// Always read fresh stats from Supabase on each request.
export const dynamic = 'force-dynamic'

export default async function Page() {
  // Live check so suspended/deleted accounts lose access immediately.
  const user = await getLiveSessionUser()
  if (!user) redirect('/logout')

  const config = await getDashboardConfig()
  const stats = await getDashboardStats({ targets: config.targets, openingDate: config.openingDate })
  const team: TeamMember[] = user.role === 'admin' ? await listTeam() : []

  return <Dashboard stats={stats} user={user} initialTeam={team} config={config} />
}
