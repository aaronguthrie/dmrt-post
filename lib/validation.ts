// Validation utilities for security

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_NOTES_LENGTH = 10000 // characters
const MAX_FEEDBACK_LENGTH = 2000 // characters

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates file uploads for security
 */
export function validateFile(file: File): FileValidationResult {
  // Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: 'Empty file not allowed' }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
    }
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
    }
  }

  // Sanitize filename - remove path traversal and dangerous characters
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric (except . _ -) with _
    .replace(/\.\./g, '') // Remove path traversal attempts
    .replace(/^\.+/, '') // Remove leading dots
  
  if (sanitizedName !== file.name) {
    return { 
      valid: false, 
      error: 'Invalid filename. Filename contains dangerous characters' 
    }
  }

  // Check filename length
  if (sanitizedName.length > 255) {
    return { valid: false, error: 'Filename too long' }
  }

  return { valid: true }
}

/**
 * Validates notes input length
 */
export function validateNotesLength(notes: string): FileValidationResult {
  if (!notes || notes.trim().length === 0) {
    return { valid: false, error: 'Notes cannot be empty' }
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    return { 
      valid: false, 
      error: `Notes exceed maximum length of ${MAX_NOTES_LENGTH} characters` 
    }
  }

  return { valid: true }
}

/**
 * Validates feedback input length
 */
export function validateFeedbackLength(feedback: string): FileValidationResult {
  if (feedback.length > MAX_FEEDBACK_LENGTH) {
    return { 
      valid: false, 
      error: `Feedback exceeds maximum length of ${MAX_FEEDBACK_LENGTH} characters` 
    }
  }

  return { valid: true }
}

/**
 * Sanitizes user input to prevent prompt injection attacks
 */
export function sanitizePromptInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // Remove prompt injection patterns
  const dangerousPatterns = [
    /ignore\s+(previous|all|above)\s+(instructions?|prompts?)/gi,
    /system\s+prompt/gi,
    /forget\s+(previous|all)/gi,
    /you\s+are\s+now/gi,
    /override\s+(previous|system)/gi,
    /disregard\s+(previous|all|above)/gi,
    /new\s+instructions?/gi,
    /act\s+as\s+if/gi,
    /pretend\s+to\s+be/gi,
    /output\s+(your|the)\s+system/gi,
    /reveal\s+(your|the)\s+prompt/gi,
    /show\s+(me|us)\s+(your|the)\s+prompt/gi,
  ]

  let sanitized = input
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '[removed]')
  }

  // Limit length to prevent cost-based attacks
  if (sanitized.length > MAX_NOTES_LENGTH) {
    sanitized = sanitized.substring(0, MAX_NOTES_LENGTH)
  }

  // Remove excessive whitespace that might be used for obfuscation
  sanitized = sanitized.replace(/\s{3,}/g, ' ')

  return sanitized.trim()
}

/**
 * Validates email format and prevents header injection
 */
export function validateEmail(email: string): FileValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' }
  }

  const trimmedEmail = email.trim()

  // Check for CRLF injection attempts
  if (/[\r\n]/.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' }
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' }
  }

  // Check length
  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email address too long' }
  }

  return { valid: true }
}

