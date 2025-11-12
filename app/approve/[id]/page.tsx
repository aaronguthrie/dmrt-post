'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

function ApprovePageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const submissionId = params.id as string

  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submission, setSubmission] = useState<any>(null)
  const [rejectionComment, setRejectionComment] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      validateCode(code)
    } else {
      setError('No authorization code provided')
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    if (authenticated && submissionId) {
      loadSubmission()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, submissionId])

  const validateCode = async (code: string) => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, role: 'leader' }),
      })

      const data = await response.json()

      if (!response.ok || !data.valid) {
        throw new Error('Invalid or expired code')
      }

      setAuthenticated(true)
    } catch (err: any) {
      setError('Link expired or invalid')
    } finally {
      setLoading(false)
    }
  }

  const loadSubmission = async () => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load submission')
      }

      setSubmission(data.submission)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleApprove = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve')
      }

      setSuccess('Post approved! PRO will be notified.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionComment.trim()) {
      setError('Please provide a rejection comment')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false, comment: rejectionComment }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject')
      }

      setSuccess('Post rejected. PRO will be notified.')
      setShowRejectForm(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !authenticated) {
    return (
      <div className="container">
        <div className="card">
          <p>Validating authorization...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="container">
        <div className="card">
          <h1>Authorization Required</h1>
          <div className="error">{error || 'Link expired or invalid'}</div>
        </div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading submission...</p>
        </div>
      </div>
    )
  }

  const postText = submission.editedByPro || submission.finalPostText

  return (
    <div className="container">
      <div className="card">
        <h1>Review Post for Approval</h1>

        <div style={{ marginBottom: '1rem' }}>
          <strong>Submitted by:</strong> {submission.submittedByEmail}
          <br />
          <strong>Date:</strong> {new Date(submission.createdAt).toLocaleString()}
        </div>

        <label className="label">Post Text (read-only)</label>
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
          {postText}
        </div>

        {submission.photoPaths.length > 0 && (
          <div className="photo-grid" style={{ marginBottom: '1rem' }}>
            {submission.photoPaths.map((path: string, index: number) => (
              <div key={index} className="photo-item">
                <img src={path} alt={`Photo ${index + 1}`} />
              </div>
            ))}
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {!showRejectForm ? (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="button"
              onClick={handleApprove}
              disabled={loading}
            >
              {loading ? 'Approving...' : 'Approve'}
            </button>
            <button
              className="button button-danger"
              onClick={() => setShowRejectForm(true)}
              disabled={loading}
            >
              Reject
            </button>
          </div>
        ) : (
          <div>
            <label className="label">Rejection Comment</label>
            <textarea
              className="textarea"
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder="Explain why this post is being rejected..."
              style={{ minHeight: '100px' }}
            />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                className="button button-danger"
                onClick={handleReject}
                disabled={loading || !rejectionComment.trim()}
              >
                {loading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectionComment('')
                }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ApprovePage() {
  return (
    <Suspense fallback={<div className="container"><div className="card"><p>Loading...</p></div></div>}>
      <ApprovePageContent />
    </Suspense>
  )
}

