import { requireAuthUser } from '../../../lib/auth'

export async function GET() {
  const authResult = await requireAuthUser()
  if (authResult.error) return authResult.error

  return Response.json({
    items: [],
    message: 'TODO: list profiles for authenticated user',
    userId: authResult.user.id,
  })
}

export async function POST() {
  const authResult = await requireAuthUser()
  if (authResult.error) return authResult.error

  return Response.json(
    {
      message: 'TODO: create profile',
      userId: authResult.user.id,
    },
    { status: 501 }
  )
}
