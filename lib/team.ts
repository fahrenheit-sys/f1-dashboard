import { adminListUsers, isBanned } from './gotrue'

export type TeamMember = {
  id: string
  email: string
  role: string
  status: 'active' | 'suspended'
  created_at: string
  last_sign_in_at: string | null
}

// Loaded server-side for admins and passed to the dashboard.
export async function listTeam(): Promise<TeamMember[]> {
  const users = await adminListUsers()
  return users
    .map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: (isBanned(u) ? 'suspended' : 'active') as 'active' | 'suspended',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }))
    .sort((a, b) => a.email.localeCompare(b.email))
}
