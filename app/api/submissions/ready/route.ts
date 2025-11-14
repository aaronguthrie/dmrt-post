import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuthCode } from '@/lib/auth'
import { notifyPRO } from '@/lib/resend'
import { isBot } from '@/lib/security'
import { checkSubmissionAccess } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    // Block bots
    const userAgent = request.headers.get('user-agent')
    if (isBot(userAgent)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    const { submissionId } = await request.json()

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 })
    }

    // First check if submission exists and get owner
    const existingSubmission = await prisma.submission.findUnique({
      where: { id: submissionId },
    })

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check authorization - only owner can mark as ready
    const authCheck = await checkSubmissionAccess(
      request,
      existingSubmission.submittedByEmail,
      false, // PRO cannot mark as ready
      false  // Leader cannot mark as ready
    )
    
    if (authCheck instanceof NextResponse) {
      return authCheck
    }

    const submission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'awaiting_pro',
      },
    })

    // Create auth code for PRO (use first email for the code, but notify all)
    const proEmail = process.env.PRO_EMAIL!
    const code = await createAuthCode(proEmail, 'pro')
    await notifyPRO(submissionId, code)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking submission as ready:', error)
    return NextResponse.json({ error: 'Failed to mark submission as ready' }, { status: 500 })
  }
}

