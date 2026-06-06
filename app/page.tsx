import { redirect } from 'next/navigation'
import { getLiveSessionUser } from '@/lib/auth'
import { getDashboardStats } from '@/lib/data'
import { listTeam, type TeamMember } from '@/lib/team'
import Dashboard from './dashboard-client'

// Always read fresh stats from Supabase on each request.
export const dynamic = 'force-dynamic'

export default async function Page() {
  // Live check so suspended/deleted accounts lose access immediately.
  const user = await getLiveSessionUser()
  if (!user) redirect('/logout')

  const stats = await getDashboardStats()
  const team: TeamMember[] = user.role === 'admin' ? await listTeam() : []

  return <Dashboard stats={stats} user={user} initialTeam={team} />
}
