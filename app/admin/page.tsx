import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export default async function AdminPage() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return <div>Login erforderlich</div>
  return <div className="p-4">Admin Dashboard</div>
}
