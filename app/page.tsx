'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Mail, FileText, Image as ImageIcon, Wand2, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Image from 'next/image'

interface Submission {
  id: string
  finalPostText: string | null
  photoPaths: string[]
}

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [authenticatedEmail, setAuthenticatedEmail] = useState('')
  const [code, setCode] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlCode = params.get('code')
    if (urlCode) {
      validateCode(urlCode, 'team_member')
    }
  }, [])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files)
      setPhotos([...photos, ...newPhotos])
      
      newPhotos.forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPhotoPreviews((prev) => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    )
    setPhotos([...photos, ...files])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const sendLoginLink = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: 'team_member' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send login link')
      }

      setSuccess('Login link sent! Check your email.')
      setEmail('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const validateCode = async (codeToValidate: string, role: string) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToValidate, role }),
      })

      const data = await response.json()

      if (!response.ok || !data.valid) {
        throw new Error('Invalid or expired code')
      }

      setAuthenticated(true)
      setAuthenticatedEmail(data.email || '')
      setCode(codeToValidate)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitNotes = async () => {
    if (!notes.trim()) {
      setError('Please enter your notes')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('notes', notes)
      formData.append('email', authenticatedEmail)
      photos.forEach((photo) => {
        formData.append('photos', photo)
      })

      const response = await fetch('/api/submissions/create', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create submission')
      }

      setSubmission(data.submission)
      setSuccess('Post generated! Review it below and provide feedback if needed.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const regeneratePost = async () => {
    if (!submission) return

    setRegenerating(true)
    setError('')

    try {
      const response = await fetch('/api/submissions/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          feedback: feedback || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate post')
      }

      setSubmission({ ...submission, finalPostText: data.finalPostText })
      setFeedback('')
      setSuccess('Post regenerated!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRegenerating(false)
    }
  }

  const markAsReady = async () => {
    if (!submission) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/submissions/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark as ready')
      }

      window.location.href = `/thank-you?id=${submission.id}`
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50/50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-purple-200">
            <CardHeader className="space-y-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-8 w-8 text-purple-600 animate-sparkle" />
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                  DMRT Postal Service
                </CardTitle>
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl">Welcome back</CardTitle>
                <CardDescription className="text-base">
                  Enter your email to receive a magic link and access your account
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !loading && email && sendLoginLink()}
                    className="pl-10 h-11"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
                  <span className="font-semibold">Error:</span>
                  <span>{error}</span>
                </div>
              )}
              
              {success && (
                <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <Button
                onClick={sendLoginLink}
                disabled={loading || !email}
                className="w-full bg-purple-600 hover:bg-purple-700 h-11 text-base font-medium"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending magic link...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Magic Link
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Secure Authentication
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  We'll send you a secure link to sign in. No password required.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Protected by DMRT authentication system
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50/50">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-purple-600 animate-sparkle" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              DMRT Postal Service
            </h1>
          </div>
          <p className="text-muted-foreground">Transform your notes into polished social media posts</p>
        </div>

        {!submission ? (
          <Card className="shadow-xl border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Submit Notes
              </CardTitle>
              <CardDescription>
                Enter your incident or training notes below. Our AI will transform them into a professional social media post.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter your incident or training notes here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[200px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Photos (optional)</Label>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer bg-purple-50/50"
                >
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop photos here, or
                  </p>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="max-w-xs mx-auto"
                  />
                </div>
              </div>

              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-purple-200">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">
                  {success}
                </div>
              )}

              <Button
                onClick={submitNotes}
                disabled={loading || !notes.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Post...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Post with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="shadow-xl border-purple-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600 animate-sparkle" />
                    AI-Generated Post
                  </CardTitle>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    Ready for Review
                  </Badge>
                </div>
                <CardDescription>
                  Review the generated post below. You can provide feedback to refine it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 rounded-lg border border-purple-200">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed font-medium">
                    {submission.finalPostText}
                  </pre>
                </div>

                {submission.photoPaths.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Photos</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {submission.photoPaths.map((path, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-purple-200">
                          <img src={path} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="feedback">
                    Feedback (optional)
                    <span className="text-muted-foreground text-xs ml-2">
                      e.g., &quot;soften tone&quot;, &quot;add weather details&quot;
                    </span>
                  </Label>
                  <Textarea
                    id="feedback"
                    placeholder="Enter feedback to improve the post..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">
                    {success}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={regeneratePost}
                    disabled={regenerating}
                    variant="outline"
                    className="flex-1 border-purple-300 hover:bg-purple-50"
                  >
                    {regenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Regenerate
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={markAsReady}
                    disabled={loading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Post is Ready
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
