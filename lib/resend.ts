import { Resend } from 'resend'
import { NextRequest } from 'next/server'

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set')
  }
  return new Resend(apiKey)
}

export function getBaseUrlFromRequest(request: NextRequest): string | undefined {
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host')
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  return host ? `${protocol}://${host}` : undefined
}

function getBaseUrl(baseUrlOverride?: string): string {
  // If baseUrl is provided, use it (from request headers)
  if (baseUrlOverride) {
    return baseUrlOverride
  }
  
  // Use NEXT_PUBLIC_APP_URL or APP_URL if set (for custom domains)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL
  }
  // Fall back to VERCEL_URL (Vercel sets this automatically)
  if (process.env.VERCEL_URL) {
    const url = process.env.VERCEL_URL
    return url.startsWith('http') ? url : `https://${url}`
  }
  // Default to localhost for development
  return 'http://localhost:3000'
}

export async function sendMagicLink(
  email: string,
  role: 'team_member' | 'pro' | 'leader',
  code: string,
  submissionId?: string,
  baseUrlOverride?: string
): Promise<void> {
  const baseUrl = getBaseUrl(baseUrlOverride)
  let link = baseUrl

  if (role === 'team_member') {
    link += `?code=${code}`
  } else if (role === 'pro') {
    link += `/pro?code=${code}`
  } else if (role === 'leader') {
    link += `/approve/${submissionId}?code=${code}`
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL is not set')
  }

  const result = await getResend().emails.send({
    from: fromEmail,
    to: email,
    subject: 'DMRT Postal Service - Your login link',
    html: `
      <p>Click the link below to access DMRT Postal Service to get help putting social media posts together in our brand voice.</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 4 hours.</p>
    `,
  })

  if (result.error) {
    throw new Error(`Resend API error: ${JSON.stringify(result.error)}`)
  }
}

export async function notifyPRO(submissionId: string, baseUrlOverride?: string): Promise<void> {
  const baseUrl = getBaseUrl(baseUrlOverride)
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.PRO_EMAIL!,
    subject: 'New DMRT Post Ready for Review',
    html: `
      <p>A new social media post is ready for your review.</p>
      <p><a href="${baseUrl}/pro">View pending posts</a></p>
    `,
  })
}

export async function notifyTeamLeader(submissionId: string, code: string, baseUrlOverride?: string): Promise<void> {
  const baseUrl = getBaseUrl(baseUrlOverride)
  const link = `${baseUrl}/approve/${submissionId}?code=${code}`

  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.TEAM_LEADER_EMAIL!,
    subject: 'DMRT Post Awaiting Your Approval',
    html: `
      <p>A social media post is awaiting your approval.</p>
      <p><a href="${link}">Review and approve</a></p>
      <p>This link expires in 4 hours.</p>
    `,
  })
}

export async function notifyProPostApproved(submissionId: string, baseUrlOverride?: string): Promise<void> {
  const baseUrl = getBaseUrl(baseUrlOverride)
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.PRO_EMAIL!,
    subject: 'Post Approved - Ready to Post',
    html: `
      <p>Your post has been approved by the team leader. You can now post it to social media.</p>
      <p><a href="${baseUrl}/pro">Go to PRO dashboard</a></p>
    `,
  })
}

export async function notifyProPostRejected(submissionId: string, comment: string, baseUrlOverride?: string): Promise<void> {
  const baseUrl = getBaseUrl(baseUrlOverride)
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.PRO_EMAIL!,
    subject: 'Post Rejected',
    html: `
      <p>Your post has been rejected by the team leader.</p>
      <p>Comment: ${comment || 'No comment provided'}</p>
      <p><a href="${baseUrl}/pro">Go to PRO dashboard</a></p>
    `,
  })
}
