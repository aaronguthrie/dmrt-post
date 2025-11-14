import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadPhotos } from '@/lib/blob'
import { generatePost } from '@/lib/gemini'
import { isBot } from '@/lib/security'
import { validateFile, validateNotesLength, validateEmail, sanitizePromptInput } from '@/lib/validation'

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

    // Validate inputs
    if (!notes || !email) {
      return NextResponse.json({ error: 'Notes and email required' }, { status: 400 })
    }

    // Validate email format and prevent header injection
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 })
    }

    // Validate notes length
    const notesValidation = validateNotesLength(notes)
    if (!notesValidation.valid) {
      return NextResponse.json({ error: notesValidation.error }, { status: 400 })
    }

    // Sanitize notes to prevent prompt injection
    const sanitizedNotes = sanitizePromptInput(notes)

    // Validate and upload photos
    const photoPaths: string[] = []
    if (files.length > 0) {
      const validFiles: File[] = []
      for (const file of files) {
        if (file.size === 0) continue // Skip empty files
        
        const fileValidation = validateFile(file)
        if (!fileValidation.valid) {
          return NextResponse.json({ error: `File validation failed: ${fileValidation.error}` }, { status: 400 })
        }
        validFiles.push(file)
      }
      
      if (validFiles.length > 0) {
        const uploadedUrls = await uploadPhotos(validFiles)
      photoPaths.push(...uploadedUrls)
      }
    }

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        notes: sanitizedNotes,
        photoPaths,
        submittedByEmail: email.trim(),
        status: 'draft',
      },
    })

    // Generate initial post with sanitized notes
    const generatedPost = await generatePost(sanitizedNotes)

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

