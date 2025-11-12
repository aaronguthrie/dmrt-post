import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { notifyPRO } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
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

    await notifyPRO(submissionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking submission as ready:', error)
    return NextResponse.json({ error: 'Failed to mark submission as ready' }, { status: 500 })
  }
}

