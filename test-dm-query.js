import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
    const { data, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id, profiles(*)')
        .limit(1)

    if (error) {
        console.error('Error:', JSON.stringify(error, null, 2))
    } else {
        console.log('Success:', data)
    }
}

test()
