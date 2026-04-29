import { requireAuthUser } from '../../../../lib/auth'
import { checkUsageLimit, requirePro } from '../../../../lib/guards'

export async function POST() {
  const authResult = await requireAuthUser()
  if (authResult.error) return authResult.error

  const proError = await requirePro(authResult.user.id)
  if (proError) return proError

  const usage = await checkUsageLimit(authResult.user.id, 'coach_run')
  if (usage instanceof Response) return usage

  return Response.json(
    {
      message: 'TODO: coach analysis (Pro gated)',
      usage,
    },
    { status: 501 }
  )
}
