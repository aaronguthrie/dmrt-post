import { prisma } from './db'
import { Role } from '@prisma/client'
import { randomBytes } from 'crypto'

export function generateAuthCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  // Use cryptographically secure random number generator
  const randomBytesBuffer = randomBytes(32)
  let code = ''
  for (let i = 0; i < 32; i++) {
    code += chars[randomBytesBuffer[i] % chars.length]
  }
  return code
}

export function validateEmailForRole(email: string, role: Role): boolean {
  const trimmedEmail = email.trim()
  
  if (role === 'pro') {
    const isValid = email === process.env.PRO_EMAIL
    // Only log non-sensitive info in development
    if (process.env.NODE_ENV === 'development') {
      console.log('PRO validation:', { email: trimmedEmail, isValid })
    }
    return isValid
  }
  if (role === 'leader') {
    // Support multiple team leader emails (comma-separated)
    const leaderEmailsRaw = process.env.TEAM_LEADER_EMAIL || ''
    const leaderEmails = leaderEmailsRaw.split(',').map(e => e.trim()).filter(Boolean)
    const isValid = leaderEmails.includes(trimmedEmail)
    // Only log non-sensitive info in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Leader validation:', { email: trimmedEmail, isValid })
    }
    return isValid
  }
  if (role === 'team_member') {
    const approvedEmailsRaw = process.env.APPROVED_TEAM_EMAILS || ''
    const approvedEmails = approvedEmailsRaw.split(',').map(e => e.trim()).filter(Boolean)
    const isValid = approvedEmails.includes(trimmedEmail)
    // Only log non-sensitive info in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Team member validation:', { email: trimmedEmail, isValid })
    }
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
  // Use atomic transaction to prevent race conditions
  const result = await prisma.$transaction(async (tx) => {
    const authCode = await tx.authCode.findUnique({
    where: { code },
  })

  if (!authCode) {
      return null
  }

  if (authCode.used) {
      return null
  }

  if (authCode.expiresAt < new Date()) {
      return null
  }

  if (role && authCode.role !== role) {
      return null
    }

    // Atomic update - only one request can succeed
    // This prevents race conditions where multiple requests use the same code
    const updated = await tx.authCode.updateMany({
      where: {
        code,
        used: false, // Only update if not already used
      },
      data: { used: true },
    })

    // If count is 0, another request already used this code
    if (updated.count === 0) {
      return null
    }

    return authCode
  })

  if (!result) {
    return { valid: false }
  }

  return {
    valid: true,
    email: result.email,
    role: result.role,
    submissionId: result.submissionId || undefined,
  }
}
