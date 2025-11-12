import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { notifyProPostApproved, notifyProPostRejected } from '@/lib/resend'
import { isBot } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Block bots
    const userAgent = request.headers.get('user-agent')
    if (isBot(userAgent)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    const { approved, comment } = await request.json()

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Create leader approval record
    await prisma.leaderApproval.create({
      data: {
        submissionId: params.id,
        approved,
        comment: comment || null,
      },
    })

    if (approved) {
      // Update status and notify PRO
      await prisma.submission.update({
        where: { id: params.id },
        data: {
          status: 'awaiting_pro_to_post',
        },
      })
      await notifyProPostApproved(params.id)
    } else {
      // Reject and notify PRO
      await prisma.submission.update({
        where: { id: params.id },
        data: {
          status: 'rejected',
        },
      })
      await notifyProPostRejected(params.id, comment || '')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing approval:', error)
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 })
  }
}

