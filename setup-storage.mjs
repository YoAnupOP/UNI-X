import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars for Supabase. Cannot run setup script.')
    process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorage() {
    console.log('Creating storage bucket "uploads"...')
    const { data, error } = await supabaseAdmin.storage.createBucket('uploads', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    })

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket "uploads" already exists.')
        } else {
            console.error('Error creating bucket:', error)
            return
        }
    } else {
        console.log('Bucket "uploads" created successfully:', data)
    }

    // Note: RLS policies must be configured manually via the Supabase SQL editor.
    console.log('Please ensure you have RLS policies set up to allow image uploads.')
}

setupStorage()
