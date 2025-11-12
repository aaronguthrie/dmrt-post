import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadPhotos } from '@/lib/blob'
import { generatePost } from '@/lib/gemini'
import { isBot } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Block bots
    const userAgent = request.headers.get('user-agent')
    if (isBot(userAgent)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    const formData = await request.formData()
    const notes = formData.get('notes') as string
    const email = formData.get('email') as string
    const files = formData.getAll('photos') as File[]

    if (!notes || !email) {
      return NextResponse.json({ error: 'Notes and email required' }, { status: 400 })
    }

    // Upload photos
    const photoPaths: string[] = []
    if (files.length > 0) {
      const uploadedUrls = await uploadPhotos(files.filter((f) => f.size > 0))
      photoPaths.push(...uploadedUrls)
    }

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        notes,
        photoPaths,
        submittedByEmail: email,
        status: 'draft',
      },
    })

    // Generate initial post
    const generatedPost = await generatePost(notes)

    // Update submission with generated post
    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        finalPostText: generatedPost,
      },
    })

    return NextResponse.json({
      submission: {
        id: updatedSubmission.id,
        finalPostText: updatedSubmission.finalPostText,
        photoPaths: updatedSubmission.photoPaths,
      },
    })
  } catch (error) {
    console.error('Error creating submission:', error)
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
  }
}

