import { Resend } from 'resend'

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set')
  }
  return new Resend(apiKey)
}

function getBaseUrl(): string {
  // Priority: APP_URL > NEXT_PUBLIC_APP_URL > VERCEL_URL
  // APP_URL is preferred for server-side code (no NEXT_PUBLIC_ prefix needed)
  if (process.env.APP_URL) {
    return process.env.APP_URL
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
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
  submissionId?: string
): Promise<void> {
  const baseUrl = getBaseUrl()
  // Log for debugging (remove in production if needed)
  console.log('Magic link base URL:', baseUrl, {
    hasAppUrl: !!process.env.APP_URL,
    hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    vercelUrl: process.env.VERCEL_URL,
  })
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
      <p>Please use the link below to securely access the DMRT Postal Service. This link will expire in 4 hours.</p>
      <p>Do not share this link with anyone else.</p>
      <p><a href="${link}">${link}</a></p>
    `,
  })

  if (result.error) {
    throw new Error(`Resend API error: ${JSON.stringify(result.error)}`)
  }
}

export async function notifyPRO(submissionId: string, code: string): Promise<void> {
  const baseUrl = getBaseUrl()
  const link = `${baseUrl}/pro?code=${code}`
  
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.PRO_EMAIL!,
    subject: 'New DMRT Post - Awaiting your review',
    html: `
      <p>A social media post is awaiting your review. Please use the link below to securely access the DMRT Postal Service. This link will expire in 4 hours.</p>
      <p><a href="${link}">Review pending posts</a></p>
    `,
  })
}

export async function notifyTeamLeader(submissionId: string, code: string): Promise<void> {
  const baseUrl = getBaseUrl()
  const link = `${baseUrl}/approve/${submissionId}?code=${code}`

  // Support multiple team leader emails (comma-separated)
  const leaderEmails = process.env.TEAM_LEADER_EMAIL?.split(',').map(e => e.trim()).filter(Boolean) || []
  
  if (leaderEmails.length === 0) {
    throw new Error('TEAM_LEADER_EMAIL is not set')
  }

  // Send to all team leader emails
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: leaderEmails,
    subject: 'New DMRT Post - Awaiting your approval',
    html: `
      <p>A social media post is awaiting your approval. Please use the link below to securely access the DMRT Postal Service. This link will expire in 4 hours.</p>
      <p><a href="${link}">Review and approve</a></p>
    `,
  })
}

export async function notifyProPostApproved(submissionId: string, code: string): Promise<void> {
  const baseUrl = getBaseUrl()
  const link = `${baseUrl}/pro?code=${code}`
  
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.PRO_EMAIL!,
    subject: 'Post Approved - Ready to Post',
    html: `
      <p>Your post has been approved by the team leader. You can now post it to social media.</p>
      <p><a href="${link}">Go to PRO dashboard</a></p>
    `,
  })
}

export async function notifyProPostRejected(submissionId: string, comment: string, code: string): Promise<void> {
  const baseUrl = getBaseUrl()
  const link = `${baseUrl}/pro?code=${code}`
  
  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.PRO_EMAIL!,
    subject: 'Post Rejected',
    html: `
      <p>Your post has been rejected by the team leader.</p>
      <p>Comment: ${comment || 'No comment provided'}</p>
      <p><a href="${link}">Go to PRO dashboard</a></p>
    `,
  })
}
