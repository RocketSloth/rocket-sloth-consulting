import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from './db/index'
import { users } from './db/schema'

export async function requireAuthUser() {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    return {
      error: Response.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
    }
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  })

  if (!user) {
    return {
      error: Response.json({ error: 'User not found' }, { status: 404 }),
      user: null,
    }
  }

  return { error: null, user }
}
