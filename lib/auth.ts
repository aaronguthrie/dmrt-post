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
  const trimmedEmail = email.trim()
  
  if (role === 'pro') {
    const isValid = email === process.env.PRO_EMAIL
    console.log('PRO validation:', { email: trimmedEmail, proEmail: process.env.PRO_EMAIL, isValid })
    return isValid
  }
  if (role === 'leader') {
    // Support multiple team leader emails (comma-separated)
    const leaderEmailsRaw = process.env.TEAM_LEADER_EMAIL || ''
    const leaderEmails = leaderEmailsRaw.split(',').map(e => e.trim()).filter(Boolean)
    const isValid = leaderEmails.includes(trimmedEmail)
    console.log('Leader validation:', { 
      email: trimmedEmail, 
      teamLeaderEmail: process.env.TEAM_LEADER_EMAIL,
      parsedEmails: leaderEmails,
      isValid 
    })
    return isValid
  }
  if (role === 'team_member') {
    const approvedEmailsRaw = process.env.APPROVED_TEAM_EMAILS || ''
    const approvedEmails = approvedEmailsRaw.split(',').map(e => e.trim()).filter(Boolean)
    const isValid = approvedEmails.includes(trimmedEmail)
    console.log('Team member validation:', { 
      email: trimmedEmail, 
      approvedEmailsRaw: process.env.APPROVED_TEAM_EMAILS,
      parsedEmails: approvedEmails.slice(0, 3), // Log first 3 to avoid spam
      isValid 
    })
    return isValid
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
