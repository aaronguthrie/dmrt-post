import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendMagicLink(
  email: string,
  role: 'team_member' | 'pro' | 'leader',
  code: string,
  submissionId?: string
): Promise<void> {
  let baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
  // Ensure https in production
  if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  let link = baseUrl

  if (role === 'team_member') {
    link += `?code=${code}`
  } else if (role === 'pro') {
    link += `/pro?code=${code}`
  } else if (role === 'leader') {
    link += `/approve/${submissionId}?code=${code}`
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: 'DMRT Social Media - Your Login Link',
    html: `
      <p>Click the link below to access DMRT Social Media:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 4 hours.</p>
    `,
  })
}

export async function notifyPRO(submissionId: string): Promise<void> {
  let baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
  if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.PRO_EMAIL!,
    subject: 'New DMRT Post Ready for Review',
    html: `
      <p>A new social media post is ready for your review.</p>
      <p><a href="${baseUrl}/pro">View pending posts</a></p>
    `,
  })
}

export async function notifyTeamLeader(submissionId: string, code: string): Promise<void> {
  let baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
  if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  const link = `${baseUrl}/approve/${submissionId}?code=${code}`

  await resend.emails.send({
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

export async function notifyProPostApproved(submissionId: string): Promise<void> {
  let baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
  if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.PRO_EMAIL!,
    subject: 'Post Approved - Ready to Post',
    html: `
      <p>Your post has been approved by the team leader. You can now post it to social media.</p>
      <p><a href="${baseUrl}/pro">Go to PRO dashboard</a></p>
    `,
  })
}

export async function notifyProPostRejected(submissionId: string, comment: string): Promise<void> {
  let baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
  if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  await resend.emails.send({
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
