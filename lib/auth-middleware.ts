// Authentication and authorization middleware
import { NextRequest, NextResponse } from 'next/server'
import { getSession, hasRole, Session } from './session'
import { Role } from '@prisma/client'

export interface AuthContext {
  session: Session
  request: NextRequest
}

/**
 * Requires authentication - returns session or error response
 */
export async function requireAuth(
  request: NextRequest
): Promise<Session | NextResponse> {
  const session = await getSession()
  
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }
  
  return session
}

/**
 * Requires specific role - returns session or error response
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: Role
): Promise<Session | NextResponse> {
  const session = await getSession()
  
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }
  
  if (!hasRole(session, requiredRole)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }
  
  return session
}

/**
 * Checks if user owns a submission or has appropriate role
 */
export async function checkSubmissionAccess(
  request: NextRequest,
  submissionEmail: string,
  allowPro: boolean = true,
  allowLeader: boolean = true
): Promise<Session | NextResponse> {
  const session = await getSession()
  
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }
  
  // Owner can always access
  if (session.email === submissionEmail) {
    return session
  }
  
  // PRO can access if allowed
  if (allowPro && session.role === 'pro') {
    return session
  }
  
  // Leader can access if allowed
  if (allowLeader && session.role === 'leader') {
    return session
  }
  
  return NextResponse.json(
    { error: 'Access denied' },
    { status: 403 }
  )
}

