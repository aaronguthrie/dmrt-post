import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const submissions = await prisma.submission.findMany({
      include: {
        feedback: true,
        leaderApprovals: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Convert to CSV
    const headers = [
      'ID',
      'Date Submitted',
      'Submitted By',
      'Status',
      'Original Notes',
      'AI Generated Post',
      'PRO Edits',
      'Feedback Count',
      'Leader Approval',
      'Posted to Facebook',
      'Posted to Instagram',
      'Facebook Post ID',
      'Instagram Post ID',
      'Posted At',
    ]

    const rows = submissions.map((sub) => [
      sub.id,
      sub.createdAt.toISOString(),
      sub.submittedByEmail,
      sub.status,
      sub.notes.replace(/"/g, '""'),
      (sub.finalPostText || '').replace(/"/g, '""'),
      (sub.editedByPro || '').replace(/"/g, '""'),
      sub.feedback.length,
      sub.leaderApprovals.length > 0
        ? sub.leaderApprovals[0].approved
          ? 'Approved'
          : 'Rejected'
        : 'N/A',
      sub.postedToFacebook ? 'Yes' : 'No',
      sub.postedToInstagram ? 'Yes' : 'No',
      sub.facebookPostId || '',
      sub.instagramPostId || '',
      sub.postedAt?.toISOString() || '',
    ])

    const csv = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="dmrt-submissions.csv"',
      },
    })
  } catch (error) {
    console.error('Error exporting submissions:', error)
    return NextResponse.json({ error: 'Failed to export submissions' }, { status: 500 })
  }
}

