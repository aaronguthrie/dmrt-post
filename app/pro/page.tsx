'use client'

import { useState, useEffect } from 'react'

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
      <div className="container">
        <div className="card">
          <h1>PRO Dashboard</h1>
          <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
            Enter your email to receive a login link.
          </p>
          <input
            type="email"
            className="input"
            placeholder="PRO email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendLoginLink()}
          />
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
          <button
            className="button"
            onClick={sendLoginLink}
            disabled={loading || !email}
          >
            {loading ? 'Sending...' : 'Send Login Link'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <h1>PRO Dashboard</h1>
        <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
          Review and post submissions
        </p>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {submissions.length === 0 ? (
          <p>No submissions pending review.</p>
        ) : (
          <div>
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="card"
                style={{ marginBottom: '2rem' }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Status:</strong> {submission.status}
                  <br />
                  <strong>Submitted by:</strong> {submission.submittedByEmail}
                  <br />
                  <strong>Date:</strong>{' '}
                  {new Date(submission.createdAt).toLocaleString()}
                </div>

                <label className="label">Post Text</label>
                {editingId === submission.id ? (
                  <textarea
                    className="textarea"
                    value={editedTexts[submission.id] || ''}
                    onChange={(e) =>
                      setEditedTexts({
                        ...editedTexts,
                        [submission.id]: e.target.value,
                      })
                    }
                    style={{ minHeight: '200px' }}
                  />
                ) : (
                  <div
                    style={{
                      background: '#f9fafb',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      whiteSpace: 'pre-wrap',
                      marginBottom: '1rem',
                      lineHeight: '1.6',
                    }}
                  >
                    {submission.editedByPro || submission.finalPostText}
                  </div>
                )}

                {submission.photoPaths.length > 0 && (
                  <div className="photo-grid" style={{ marginBottom: '1rem' }}>
                    {submission.photoPaths.map((path, index) => (
                      <div key={index} className="photo-item">
                        <img src={path} alt={`Photo ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                  {editingId === submission.id ? (
                    <>
                      <button
                        className="button"
                        onClick={() => handlePostNow(submission.id)}
                        disabled={loading}
                      >
                        Post Now
                      </button>
                      <button
                        className="button button-secondary"
                        onClick={() => handleSendForApproval(submission.id)}
                        disabled={loading}
                      >
                        Send to Team Leader
                      </button>
                      <button
                        className="button button-secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="button"
                      onClick={() => handleEdit(submission)}
                    >
                      Edit & Post
                    </button>
                  )}
                </div>

                {(submission.postedToFacebook || submission.postedToInstagram) && (
                  <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                    {submission.postedToFacebook && submission.facebookPostId && (
                      <div>
                        <a
                          href={`https://facebook.com/${submission.facebookPostId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View on Facebook
                        </a>
                      </div>
                    )}
                    {submission.postedToInstagram && submission.instagramPostId && (
                      <div>
                        <a
                          href={`https://instagram.com/p/${submission.instagramPostId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View on Instagram
                        </a>
                      </div>
                    )}
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
