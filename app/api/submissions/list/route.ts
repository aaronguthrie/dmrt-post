import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SubmissionStatus } from '@prisma/client'
import { isBot } from '@/lib/security'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  try {
    // Block bots
    const userAgent = request.headers.get('user-agent')
    if (isBot(userAgent)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Require authentication
    const authCheck = await requireAuth(request)
    if (authCheck instanceof NextResponse) {
      return authCheck
    }
    const session = authCheck

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as SubmissionStatus | null

    // Build where clause with IDOR protection
    const where: any = status ? { status } : {}
    
    // Filter by user unless PRO or Leader (they can see all)
    if (session.role === 'team_member') {
      where.submittedByEmail = session.email
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        feedback: {
          orderBy: { createdAt: 'asc' },
        },
        leaderApprovals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}
