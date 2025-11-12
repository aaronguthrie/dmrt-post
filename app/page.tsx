'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Wand2, Image as ImageIcon, Send, Loader2, X, Mail, Info } from 'lucide-react'
import PromptModal from './components/PromptModal'

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
  const [showPromptModal, setShowPromptModal] = useState(false)

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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-purple-600 animate-sparkle" />
              <h1 className="text-3xl font-bold text-gradient-purple">DMRT Postal Service</h1>
            </div>
            <p className="text-gray-600">Enter your email to receive a login link</p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  className="input pl-10"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendLoginLink()}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
                {success}
              </div>
            )}

            <button
              className="btn btn-primary w-full"
              onClick={sendLoginLink}
              disabled={loading || !email}
            >
              {loading ? (
                <>
                  <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="inline-block mr-2 h-4 w-4" />
                  Send Login Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-purple-600 animate-sparkle" />
            <h1 className="text-4xl font-bold text-gradient-purple">DMRT Social Media</h1>
          </div>
          <p className="text-gray-600">Transform your notes into polished social media posts</p>
        </div>

        {!submission ? (
          <div className="card">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-2xl font-semibold text-gray-900">Submit Notes</h2>
                <button
                  onClick={() => setShowPromptModal(true)}
                  className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                >
                  <Info className="h-4 w-4" />
                  View AI Prompt
                </button>
              </div>
              <p className="text-gray-600">
                Enter your incident or training notes below. Our AI will transform them into a professional social media post.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  id="notes"
                  className="textarea min-h-[200px]"
                  placeholder="Enter your incident or training notes here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photos (optional)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer bg-purple-50/50"
                >
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                  <p className="text-sm text-gray-600 mb-2">Drag and drop photos here, or</p>
                  <input
                    id="photos"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="max-w-xs mx-auto text-sm"
                  />
                </div>
              </div>

              {photoPreviews.length > 0 && (
                <div className="photo-grid">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="photo-item">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        className="photo-remove"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
                  {success}
                </div>
              )}

              <button
                className="btn btn-ai w-full text-lg"
                onClick={submitNotes}
                disabled={loading || !notes.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="inline-block mr-2 h-5 w-5 animate-spin" />
                    Generating Post...
                  </>
                ) : (
                  <>
                    <Wand2 className="inline-block mr-2 h-5 w-5" />
                    Generate Post with AI
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card card-ai">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600 animate-sparkle" />
                  <h2 className="text-2xl font-semibold text-gray-900">AI-Generated Post</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPromptModal(true)}
                    className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
                  >
                    <Info className="h-3.5 w-3.5" />
                    View Prompt
                  </button>
                  <span className="badge badge-purple">Ready for Review</span>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Review the generated post below. You can provide feedback to refine it.
              </p>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 rounded-lg border border-purple-200 mb-6">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-medium text-gray-900">
                  {submission.finalPostText}
                </pre>
              </div>

              {submission.photoPaths.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
                  <div className="photo-grid">
                    {submission.photoPaths.map((path, index) => (
                      <div key={index} className="photo-item">
                        <img src={path} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-purple-200 pt-6">
                <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback (optional)
                  <span className="text-gray-500 text-xs ml-2">
                    e.g., &quot;soften tone&quot;, &quot;add weather details&quot;
                  </span>
                </label>
                <textarea
                  id="feedback"
                  className="textarea min-h-[100px]"
                  placeholder="Enter feedback to improve the post..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
                  {success}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  className="btn btn-primary flex-1"
                  onClick={regeneratePost}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <>
                      <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="inline-block mr-2 h-4 w-4" />
                      Regenerate
                    </>
                  )}
                </button>
                <button
                  className="btn btn-secondary flex-1"
                  onClick={markAsReady}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="inline-block mr-2 h-4 w-4" />
                      Post is Ready
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <PromptModal 
        isOpen={showPromptModal} 
        onClose={() => setShowPromptModal(false)} 
      />
    </div>
  )
}
