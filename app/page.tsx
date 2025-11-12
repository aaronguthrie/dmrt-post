'use client'

import { useState, useEffect } from 'react'
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
    // Check for code in URL
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
      
      // Create previews
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

      setSuccess('Post submitted! PRO will review it shortly.')
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
          <h1>DMRT Social Media</h1>
          <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
            Enter your email to receive a login link.
          </p>
          <input
            type="email"
            className="input"
            placeholder="Your email"
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
        <h1>Submit Notes for Social Media Post</h1>

        {!submission ? (
          <>
            <label className="label" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              className="textarea"
              placeholder="Enter your incident or training notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <label className="label" htmlFor="photos">
              Photos (optional)
            </label>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '2rem',
                textAlign: 'center',
                marginBottom: '1rem',
                cursor: 'pointer',
              }}
            >
              <p>Drag and drop photos here, or</p>
              <input
                id="photos"
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ marginTop: '1rem' }}
              />
            </div>

            {photoPreviews.length > 0 && (
              <div className="photo-grid">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="photo-item">
                    <img src={preview} alt={`Preview ${index + 1}`} />
                    <button
                      className="photo-remove"
                      onClick={() => removePhoto(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <button
              className="button"
              onClick={submitNotes}
              disabled={loading || !notes.trim()}
            >
              {loading ? 'Generating Post...' : 'Generate Post'}
            </button>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: '1rem' }}>Generated Post</h2>
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
              {submission.finalPostText}
            </div>

            {submission.photoPaths.length > 0 && (
              <div className="photo-grid" style={{ marginBottom: '1rem' }}>
                {submission.photoPaths.map((path, index) => (
                  <div key={index} className="photo-item">
                    <img src={path} alt={`Photo ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}

            <label className="label" htmlFor="feedback">
              Feedback (optional - e.g., &quot;soften tone&quot;, &quot;add weather details&quot;)
            </label>
            <textarea
              id="feedback"
              className="textarea"
              placeholder="Enter feedback to improve the post..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              style={{ minHeight: '100px' }}
            />

            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                className="button"
                onClick={regeneratePost}
                disabled={regenerating}
              >
                {regenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
              <button
                className="button button-secondary"
                onClick={markAsReady}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Post is Ready'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
