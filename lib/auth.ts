import { prisma } from './db'
import { Role } from '@prisma/client'

export function generateAuthCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 32; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function validateEmailForRole(email: string, role: Role): boolean {
  if (role === 'pro') {
    return email === process.env.PRO_EMAIL
  }
  if (role === 'leader') {
    return email === process.env.TEAM_LEADER_EMAIL
  }
  if (role === 'team_member') {
    const approvedEmails = process.env.APPROVED_TEAM_EMAILS?.split(',') || []
    return approvedEmails.includes(email.trim())
  }
  return false
}

export async function createAuthCode(
  email: string,
  role: Role,
  submissionId?: string
): Promise<string> {
  const code = generateAuthCode()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 4)

  await prisma.authCode.create({
    data: {
      code,
      email,
      role,
      submissionId,
      expiresAt,
    },
  })

  return code
}

export async function validateAuthCode(
  code: string,
  role?: Role
): Promise<{ valid: boolean; email?: string; role?: Role; submissionId?: string }> {
  const authCode = await prisma.authCode.findUnique({
    where: { code },
  })

  if (!authCode) {
    return { valid: false }
  }

  if (authCode.used) {
    return { valid: false }
  }

  if (authCode.expiresAt < new Date()) {
    return { valid: false }
  }

  if (role && authCode.role !== role) {
    return { valid: false }
  }

  // Mark as used
  await prisma.authCode.update({
    where: { code },
    data: { used: true },
  })

  return {
    valid: true,
    email: authCode.email,
    role: authCode.role,
    submissionId: authCode.submissionId || undefined,
  }
}
