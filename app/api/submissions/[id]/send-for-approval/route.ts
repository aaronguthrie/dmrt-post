import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuthCode } from '@/lib/auth'
import { notifyTeamLeader } from '@/lib/resend'
import { SubmissionStatus } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { editedPostText } = await request.json()

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Update with PRO's edits if provided
    const updateData: { status: SubmissionStatus; editedByPro?: string } = {
      status: 'awaiting_leader',
    }

    if (editedPostText) {
      updateData.editedByPro = editedPostText
    }

    await prisma.submission.update({
      where: { id: params.id },
      data: updateData,
    })

    // Create auth code for team leader
    const leaderEmail = process.env.TEAM_LEADER_EMAIL!
    const code = await createAuthCode(leaderEmail, 'leader', params.id)
    await notifyTeamLeader(params.id, code)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending for approval:', error)
    return NextResponse.json({ error: 'Failed to send for approval' }, { status: 500 })
  }
}

