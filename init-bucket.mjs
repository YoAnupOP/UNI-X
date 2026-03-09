import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Manually parse .env.local
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
        let key = match[1]
        let value = match[2] || ''
        value = value.replace(/^['"]|['"]$/g, '').trim()
        envVars[key] = value
    }
})

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL']
const supabaseServiceKey = envVars['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars for Supabase. Cannot run setup script.')
    process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorage() {
    console.log('Admin client initialized.')
    console.log('Creating storage bucket "uploads"...')
    const { data, error } = await supabaseAdmin.storage.createBucket('uploads', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    })

    if (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
            console.log('Bucket "uploads" already exists.')
        } else {
            console.error('Error creating bucket:', error)
            return
        }
    } else {
        console.log('Bucket "uploads" created successfully:', data)
    }

    // Note: RLS policies must be configured manually via the Supabase SQL editor.
    console.log('Bucket setup complete.')
}

setupStorage()
