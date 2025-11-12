import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { postToFacebook, postToInstagram } from '@/lib/meta'
import { isBot } from '@/lib/security'

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
    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (!submission.finalPostText) {
      return NextResponse.json({ error: 'No post text available' }, { status: 400 })
    }

    const postText = submission.editedByPro || submission.finalPostText
    const photoUrls = submission.photoPaths

    // Post to Facebook
    let facebookPostId: string | null = null
    try {
      const facebookResult = await postToFacebook(postText, photoUrls)
      facebookPostId = facebookResult.id
    } catch (error) {
      console.error('Error posting to Facebook:', error)
    }

    // Post to Instagram (requires at least one photo)
    let instagramPostId: string | null = null
    if (photoUrls.length > 0) {
      try {
        const instagramResult = await postToInstagram(postText, photoUrls[0])
        instagramPostId = instagramResult.id
      } catch (error) {
        console.error('Error posting to Instagram:', error)
      }
    }

    // Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id: params.id },
      data: {
        status: 'posted',
        postedToFacebook: !!facebookPostId,
        postedToInstagram: !!instagramPostId,
        facebookPostId,
        instagramPostId,
        postedAt: new Date(),
      },
    })

    return NextResponse.json({
      submission: updatedSubmission,
      facebookPostId,
      instagramPostId,
    })
  } catch (error) {
    console.error('Error posting to social media:', error)
    return NextResponse.json({ error: 'Failed to post to social media' }, { status: 500 })
  }
}

