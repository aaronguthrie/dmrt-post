import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isBot } from '@/lib/security'
import { checkSubmissionAccess } from '@/lib/auth-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Block bots
    const userAgent = request.headers.get('user-agent')
    if (isBot(userAgent)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      include: {
        feedback: {
          orderBy: { createdAt: 'asc' },
        },
        leaderApprovals: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check authorization - user must own submission or be PRO/leader
    const authCheck = await checkSubmissionAccess(
      request,
      submission.submittedByEmail,
      true, // Allow PRO
      true  // Allow leader
    )
    
    if (authCheck instanceof NextResponse) {
      return authCheck
    }

    return NextResponse.json({ submission })
  } catch (error) {
    console.error('Error fetching submission:', error)
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Block bots
    const userAgent = request.headers.get('user-agent')
    if (isBot(userAgent)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // First check if submission exists and get owner
    const existingSubmission = await prisma.submission.findUnique({
      where: { id: params.id },
    })

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check authorization - only owner, PRO, or leader can modify
    const authCheck = await checkSubmissionAccess(
      request,
      existingSubmission.submittedByEmail,
      true, // Allow PRO
      true  // Allow leader
    )
    
    if (authCheck instanceof NextResponse) {
      return authCheck
    }

    const data = await request.json()

    // Prevent direct status manipulation - status should only change via workflow endpoints
    // Allow PRO/leader to modify status, but restrict team members
    const session = authCheck
    if (session.role === 'team_member' && 'status' in data) {
      return NextResponse.json(
        { error: 'Status can only be changed through workflow endpoints' },
        { status: 403 }
      )
    }

    const submission = await prisma.submission.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ submission })
  } catch (error) {
    console.error('Error updating submission:', error)
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
  }
}
