import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SubmissionStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as SubmissionStatus | null

    const where = status ? { status } : {}

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

