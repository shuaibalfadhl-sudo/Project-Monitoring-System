import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vnrvpgkjpxiqfwfxrcdb.supabase.co',
  'sb_publishable_0BT9wbke7eEP44P9p3PBhQ_LcPMQ5ds'
)

async function test() {
  console.log('Testing Supabase signup...')
  const { data, error } = await supabase.auth.signUp({
    email: 'test_vertex_qa_' + Date.now() + '@gmail.com',
    password: 'password123',
    options: {
      data: {
        full_name: 'Test User'
      }
    }
  })
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Success! User data:', data.user?.id)
  }
}

test()
