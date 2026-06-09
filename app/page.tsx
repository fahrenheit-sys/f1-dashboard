import { redirect } from 'next/navigation'
import { getLiveSessionUser } from '@/lib/auth'
import { accessFor, TOOL } from '@/lib/access'
import { getDashboardStats } from '@/lib/data'
import { getDashboardConfig } from '@/lib/config'
import Dashboard from './dashboard-client'

// Always read fresh stats from Supabase on each request.
export const dynamic = 'force-dynamic'

export default async function Page() {
  // Live check so suspended/deleted accounts lose access immediately.
  const live = await getLiveSessionUser()
  if (!live) redirect('/logout')

  // Per-tool authorization. (Becomes a redirect to the hub once it exists.)
  const access = accessFor(live, TOOL)
  if (!access) redirect('/logout')

  const config = await getDashboardConfig()
  const stats = await getDashboardStats({ targets: config.targets, openingDate: config.openingDate })

  const user = { sub: live.sub, email: live.email, role: access }
  return <Dashboard stats={stats} user={user} config={config} />
}
