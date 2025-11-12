'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Mail, Loader2, Send, CheckCircle2 } from 'lucide-react'

interface Submission {
  id: string
  notes: string
  photoPaths: string[]
  status: string
  finalPostText: string | null
  editedByPro: string | null
  createdAt: string
  submittedByEmail: string
  postedToFacebook: boolean
  postedToInstagram: boolean
  facebookPostId: string | null
  instagramPostId: string | null
}

export default function ProPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({})

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlCode = params.get('code')
    if (urlCode) {
      validateCode(urlCode, 'pro')
    }
  }, [])

  useEffect(() => {
    if (authenticated) {
      loadSubmissions()
    }
  }, [authenticated])

  const loadSubmissions = async () => {
    try {
      // Load both statuses separately and combine
      const [awaitingProRes, awaitingPostRes] = await Promise.all([
        fetch('/api/submissions/list?status=awaiting_pro'),
        fetch('/api/submissions/list?status=awaiting_pro_to_post'),
      ])
      
      const awaitingPro = await awaitingProRes.json()
      const awaitingPost = await awaitingPostRes.json()
      
      const allSubmissions = [
        ...(awaitingPro.submissions || []),
        ...(awaitingPost.submissions || []),
      ]
      
      setSubmissions(allSubmissions)
    } catch (err) {
      console.error('Error loading submissions:', err)
    }
  }

  const sendLoginLink = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: 'pro' }),
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
      setCode(codeToValidate)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (submission: Submission) => {
    setEditingId(submission.id)
    setEditedTexts({
      ...editedTexts,
      [submission.id]: submission.editedByPro || submission.finalPostText || '',
    })
  }

  const handlePostNow = async (submissionId: string) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/submissions/${submissionId}/post`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post')
      }

      setSuccess('Posted successfully!')
      await loadSubmissions()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendForApproval = async (submissionId: string) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const editedText = editedTexts[submissionId]
      const response = await fetch(`/api/submissions/${submissionId}/send-for-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedPostText: editedText || null }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send for approval')
      }

      setSuccess('Sent to team leader for approval!')
      setEditingId(null)
      await loadSubmissions()
    } catch (err: any) {
      setError(err.message)
    } finally {
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
              <h1 className="text-3xl font-bold text-gradient-purple">DMRT Social Media</h1>
            </div>
            <p className="text-gray-600">PRO Dashboard</p>
          </div>
          <p className="text-gray-600 mb-6 text-center">
            Enter your email to receive a login link.
          </p>

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
                  placeholder="pro@donegalmrt.ie"
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
      <div className="max-w-6xl mx-auto">
        <div className="card mb-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-purple-600 animate-sparkle" />
              <h1 className="text-4xl font-bold text-gradient-purple">DMRT Social Media</h1>
            </div>
            <p className="text-gray-600 text-lg">PRO Dashboard</p>
            <p className="text-gray-500 mt-2">Review and post submissions</p>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 rounded-lg bg-green-50 text-green-700 border border-green-200 mb-4">
              {success}
            </div>
          )}
        </div>

        {submissions.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No submissions pending review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="card"
              >
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Status</span>
                      <p className="font-semibold text-gray-900">{submission.status}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Submitted by</span>
                      <p className="font-medium text-gray-700">{submission.submittedByEmail}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Date</span>
                      <p className="font-medium text-gray-700">
                        {new Date(submission.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Post Text</label>
                  {editingId === submission.id ? (
                    <textarea
                      className="textarea min-h-[200px]"
                      value={editedTexts[submission.id] || ''}
                      onChange={(e) =>
                        setEditedTexts({
                          ...editedTexts,
                          [submission.id]: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 rounded-lg border border-purple-200">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-medium text-gray-900">
                        {submission.editedByPro || submission.finalPostText}
                      </pre>
                    </div>
                  )}
                </div>

                {submission.photoPaths.length > 0 && (
                  <div className="mb-4">
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

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {editingId === submission.id ? (
                    <>
                      <button
                        className="btn btn-primary flex-1"
                        onClick={() => handlePostNow(submission.id)}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                            Posting...
                          </>
                        ) : (
                          <>
                            <Send className="inline-block mr-2 h-4 w-4" />
                            Post Now
                          </>
                        )}
                      </button>
                      <button
                        className="btn btn-secondary flex-1"
                        onClick={() => handleSendForApproval(submission.id)}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Send to Team Leader'
                        )}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleEdit(submission)}
                    >
                      Edit & Post
                    </button>
                  )}
                </div>

                {(submission.postedToFacebook || submission.postedToInstagram) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Posted to:</p>
                    <div className="flex gap-4">
                      {submission.postedToFacebook && submission.facebookPostId && (
                        <a
                          href={`https://facebook.com/${submission.facebookPostId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                        >
                          View on Facebook →
                        </a>
                      )}
                      {submission.postedToInstagram && submission.instagramPostId && (
                        <a
                          href={`https://instagram.com/p/${submission.instagramPostId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                        >
                          View on Instagram →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
