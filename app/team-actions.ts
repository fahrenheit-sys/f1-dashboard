'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { adminCreateUser, adminGetUser, adminUpdateUser, adminDeleteUser } from '@/lib/gotrue'
import { TOOL } from '@/lib/access'

export type ActionResult = { ok: true } | { ok: false; error: string }

const SUSPEND_DURATION = '876000h' // ~100 years

export async function createMember(email: string, password: string, role: string): Promise<ActionResult> {
  await requireAdmin()
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail) return { ok: false, error: 'Email is required' }
  if (!password || password.length < 6) return { ok: false, error: 'Password must be at least 6 characters' }
  if (role !== 'admin' && role !== 'member') return { ok: false, error: 'Invalid role' }

  // Grant access to this tool only; other tools are granted separately.
  const res = await adminCreateUser(cleanEmail, password, { apps: { [TOOL]: role } })
  if (!res.ok) return res
  revalidatePath('/')
  return { ok: true }
}

export async function setMemberRole(id: string, role: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (role !== 'admin' && role !== 'member') return { ok: false, error: 'Invalid role' }
  if (id === admin.sub) return { ok: false, error: 'You cannot change your own access' }

  // Merge so grants for other tools are preserved.
  const target = await adminGetUser(id)
  if (!target) return { ok: false, error: 'User not found' }
  const apps = { ...target.apps, [TOOL]: role }
  const res = await adminUpdateUser(id, { app_metadata: { apps } })
  if (!res.ok) return res
  revalidatePath('/')
  return { ok: true }
}

export async function suspendMember(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (id === admin.sub) return { ok: false, error: 'You cannot suspend your own account' }

  const res = await adminUpdateUser(id, { ban_duration: SUSPEND_DURATION })
  if (!res.ok) return res
  revalidatePath('/')
  return { ok: true }
}

export async function reactivateMember(id: string): Promise<ActionResult> {
  await requireAdmin()
  const res = await adminUpdateUser(id, { ban_duration: 'none' })
  if (!res.ok) return res
  revalidatePath('/')
  return { ok: true }
}

export async function deleteMember(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (id === admin.sub) return { ok: false, error: 'You cannot delete your own account' }

  const res = await adminDeleteUser(id)
  if (!res.ok) return res
  revalidatePath('/')
  return { ok: true }
}
