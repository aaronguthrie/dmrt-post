import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { notifyPRO, getBaseUrlFromRequest } from '@/lib/resend'
import { isBot } from '@/lib/security'

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

    const submission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'awaiting_pro',
      },
    })

    const baseUrl = getBaseUrlFromRequest(request)
    await notifyPRO(submissionId, baseUrl)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking submission as ready:', error)
    return NextResponse.json({ error: 'Failed to mark submission as ready' }, { status: 500 })
  }
}

