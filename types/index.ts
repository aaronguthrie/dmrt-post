import { Role, SubmissionStatus } from '@prisma/client'

export interface AuthSession {
  email: string
  role: Role
  submissionId?: string
}

export interface SubmissionWithRelations {
  id: string
  notes: string
  photoPaths: string[]
  status: SubmissionStatus
  createdAt: Date
  updatedAt: Date
  submittedByEmail: string
  finalPostText: string | null
  editedByPro: string | null
  postedToFacebook: boolean
  postedToInstagram: boolean
  facebookPostId: string | null
  instagramPostId: string | null
  postedAt: Date | null
  feedback: Array<{
    id: string
    feedbackText: string
    versionNumber: number
    createdAt: Date
  }>
  leaderApprovals: Array<{
    id: string
    approved: boolean
    comment: string | null
    createdAt: Date
  }>
}

