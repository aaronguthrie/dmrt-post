# DMRT Postal Service App

A Next.js application for Donegal Mountain Rescue Team (DMRT) that transforms raw team member notes into formatted social media posts for Facebook and Instagram.

## Features

- **Magic Link Authentication**: Passwordless authentication via email for team members, PRO, and team leaders
- **AI-Powered Post Generation**: Uses Google Gemini 2.0 Flash to transform notes into professional social media posts
- **Iterative Feedback Loop**: Team members can provide feedback and regenerate posts until satisfied
- **PRO Review & Editing**: PRO can review, edit, and either post directly or send for team leader approval
- **Team Leader Approval**: Optional approval workflow for sensitive posts
- **Social Media Integration**: Direct posting to Facebook and Instagram via Meta Graph API
- **Transparency Dashboard**: Password-protected dashboard for viewing all submissions and their status

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Vercel Postgres (Neon) with Prisma ORM
- **Photo Storage**: Vercel Blob
- **AI**: Google Gemini 2.0 Flash
- **Email**: Resend API
- **Social Media**: Meta Graph API
- **Hosting**: Vercel

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
POSTGRES_URL="postgresql://user:password@host:5432/dbname"

# Authentication
APPROVED_TEAM_EMAILS=aaronguthrie@me.com,member2@email.com,member3@email.com
PRO_EMAIL=pro@donegalmrt.ie
TEAM_LEADER_EMAIL=teamleader@donegalmrt.ie
DASHBOARD_PASSWORD=testing123

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# AI (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=your_blob_token

# Social Media (Meta Graph API)
META_ACCESS_TOKEN=your_meta_token
FACEBOOK_PAGE_ID=your_facebook_page_id
INSTAGRAM_ACCOUNT_ID=your_instagram_account_id

# App URL
VERCEL_URL=https://post.dmrt.ie
```

### 3. Set Up Database

```bash
# Push Prisma schema to database
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and import your GitHub repository
2. Add all environment variables in Vercel dashboard
3. Deploy

### 3. Set Up Subdomain (post.DMRT.ie)

1. In Vercel project settings, go to "Domains"
2. Add `post.dmrt.ie` as a custom domain
3. Configure DNS records as instructed by Vercel:
   - Add a CNAME record pointing `post.dmrt.ie` to `cname.vercel-dns.com`
   - Or add an A record as specified by Vercel

### 4. Set Up Vercel Postgres

1. In Vercel dashboard, go to Storage
2. Create a new Postgres database
3. Copy the connection string to `POSTGRES_URL` environment variable
4. Run `npx prisma db push` to set up the schema

### 5. Set Up Vercel Blob

1. In Vercel dashboard, go to Storage
2. Create a new Blob store
3. Copy the read/write token to `BLOB_READ_WRITE_TOKEN` environment variable

## API Setup

### Google Gemini API

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add to `GEMINI_API_KEY` environment variable

### Resend API

1. Sign up at [Resend](https://resend.com)
2. Create an API key
3. Add to `RESEND_API_KEY` environment variable
4. Verify your domain and set `RESEND_FROM_EMAIL`

### Meta Graph API

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create an app and get an access token
3. Get your Facebook Page ID and Instagram Account ID
4. Add to environment variables:
   - `META_ACCESS_TOKEN`
   - `FACEBOOK_PAGE_ID`
   - `INSTAGRAM_ACCOUNT_ID`

## Workflow

### Team Member Submission

1. Team member visits `post.dmrt.ie`
2. Enters email (must be in `APPROVED_TEAM_EMAILS`)
3. Receives magic link via email
4. Clicks link to authenticate
5. Submits notes and photos
6. Reviews AI-generated post
7. Provides feedback and regenerates if needed
8. Clicks "Post is Ready" when satisfied

### PRO Review

1. PRO visits `/pro`
2. Authenticates via magic link
3. Reviews submissions with status `awaiting_pro` or `awaiting_pro_to_post`
4. Can edit post text
5. Either:
   - Posts directly to Facebook/Instagram
   - Sends to team leader for approval

### Team Leader Approval

1. Team leader receives email with approval link
2. Clicks link (auto-authenticated)
3. Reviews PRO's edited post
4. Approves or rejects with comment
5. PRO receives notification

### Dashboard

1. Visit `/dashboard`
2. Enter password (`DASHBOARD_PASSWORD`)
3. View all submissions with search and filter
4. Export as CSV

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/              # Authentication endpoints
│   │   ├── submissions/        # Submission CRUD endpoints
│   │   └── dashboard/         # Dashboard endpoints
│   ├── pro/                    # PRO dashboard page
│   ├── approve/[id]/          # Team leader approval page
│   ├── dashboard/             # Transparency dashboard
│   ├── layout.tsx
│   ├── page.tsx               # Team member submission page
│   └── globals.css
├── lib/
│   ├── auth.ts                # Authentication utilities
│   ├── blob.ts                # Vercel Blob integration
│   ├── db.ts                  # Prisma client
│   ├── gemini.ts              # Gemini API integration
│   ├── meta.ts                # Meta Graph API integration
│   └── resend.ts              # Resend email integration
├── prisma/
│   └── schema.prisma          # Database schema
└── types/
    └── index.ts               # TypeScript types
```

## Database Schema

- **auth_codes**: One-time authentication codes
- **submissions**: Post submissions with status tracking
- **feedback**: Feedback history for regenerations
- **leader_approvals**: Team leader approval records

## Security Notes

- All authentication codes expire after 4 hours
- Codes are single-use only
- Email whitelist validation for each role
- Dashboard password protection
- Environment variables for sensitive data

## Support

For issues or questions, contact the development team.

