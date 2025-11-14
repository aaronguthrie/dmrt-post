import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generatePost } from '@/lib/gemini'
import { isBot } from '@/lib/security'
import { validateFeedbackLength } from '@/lib/validation'
import { checkSubmissionAccess } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    // Block bots
    const userAgent = request.headers.get('user-agent')
    if (isBot(userAgent)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    const { submissionId, feedback } = await request.json()

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 })
    }

    // Validate feedback length if provided
    if (feedback) {
      const feedbackValidation = validateFeedbackLength(feedback)
      if (!feedbackValidation.valid) {
        return NextResponse.json({ error: feedbackValidation.error }, { status: 400 })
      }
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
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

    // Get feedback count for version number
    const feedbackCount = await prisma.feedback.count({
      where: { submissionId },
    })

    // Generate new post
    const newPost = await generatePost(
      submission.notes,
      submission.finalPostText || null,
      feedback || null
    )

    // Save feedback if provided
    if (feedback) {
      await prisma.feedback.create({
        data: {
          submissionId,
          feedbackText: feedback,
          versionNumber: feedbackCount + 1,
        },
      })
    }

    // Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        finalPostText: newPost,
      },
    })

    return NextResponse.json({
      finalPostText: updatedSubmission.finalPostText,
    })
  } catch (error) {
    console.error('Error regenerating post:', error)
    return NextResponse.json({ error: 'Failed to regenerate post' }, { status: 500 })
  }
}

