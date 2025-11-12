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
  postedAt: string | null
  feedback: Array<{ id: string }>
  leaderApprovals: Array<{ approved: boolean; comment: string | null }>
}

export default function DashboardPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (authenticated) {
      loadSubmissions()
    }
  }, [authenticated, search, statusFilter])

  const authenticate = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/dashboard/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (!response.ok || !data.authenticated) {
        throw new Error('Invalid password')
      }

      setAuthenticated(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSubmissions = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/dashboard/submissions?${params}`)
      const data = await response.json()

      if (response.ok) {
        setSubmissions(data.submissions)
      }
    } catch (err) {
      console.error('Error loading submissions:', err)
    }
  }

  const exportCSV = async () => {
    try {
      const response = await fetch('/api/dashboard/export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'dmrt-submissions.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error exporting CSV:', err)
    }
  }

  if (!authenticated) {
    return (
      <div className="container">
        <div className="card">
          <h1>Dashboard Access</h1>
          <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
            Enter the dashboard password to continue.
          </p>
          <input
            type="password"
            className="input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && authenticate()}
          />
          {error && <div className="error">{error}</div>}
          <button
            className="button"
            onClick={authenticate}
            disabled={loading || !password}
          >
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Transparency Dashboard</h1>
          <button className="button" onClick={exportCSV}>
            Export CSV
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <input
            type="text"
            className="input"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="awaiting_pro">Awaiting PRO</option>
            <option value="awaiting_leader">Awaiting Leader</option>
            <option value="awaiting_pro_to_post">Awaiting PRO to Post</option>
            <option value="posted">Posted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Submitted By</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Original Notes</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>AI Post</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Feedback</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>PRO Edits</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Approval</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Posted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem' }}>
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{sub.submittedByEmail}</td>
                  <td style={{ padding: '0.75rem' }}>{sub.status}</td>
                  <td style={{ padding: '0.75rem', maxWidth: '200px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.notes.substring(0, 100)}
                      {sub.notes.length > 100 && (
                        <button
                          onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                          style={{ marginLeft: '0.5rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          {expandedId === sub.id ? 'Less' : 'More'}
                        </button>
                      )}
                    </div>
                    {expandedId === sub.id && (
                      <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                        {sub.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', maxWidth: '200px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.finalPostText?.substring(0, 100) || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{sub.feedback.length}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {sub.editedByPro ? 'Yes' : 'No'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {sub.leaderApprovals.length > 0
                      ? sub.leaderApprovals[0].approved
                        ? '✓ Approved'
                        : `✗ Rejected${sub.leaderApprovals[0].comment ? `: ${sub.leaderApprovals[0].comment}` : ''}`
                      : 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {sub.postedToFacebook || sub.postedToInstagram ? (
                      <div>
                        {sub.postedToFacebook && (
                          <div>
                            <a
                              href={`https://facebook.com/${sub.facebookPostId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2563eb' }}
                            >
                              Facebook
                            </a>
                          </div>
                        )}
                        {sub.postedToInstagram && (
                          <div>
                            <a
                              href={`https://instagram.com/p/${sub.instagramPostId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2563eb' }}
                            >
                              Instagram
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      'No'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

