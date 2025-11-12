import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isBot } from '@/lib/security'

export async function GET(request: NextRequest) {
  try {
    // Block bots
    const userAgent = request.headers.get('user-agent')
    if (isBot(userAgent)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}
    if (status) {
      where.status = status
    }
    if (search) {
      where.OR = [
        { notes: { contains: search, mode: 'insensitive' } },
        { finalPostText: { contains: search, mode: 'insensitive' } },
        { submittedByEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        feedback: true,
        leaderApprovals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('Error fetching dashboard submissions:', error)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}
