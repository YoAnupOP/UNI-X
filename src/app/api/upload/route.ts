import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const bucket = formData.get('bucket') as string || 'uploads'

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`

        const { error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            })

        if (error) {
            console.error('Supabase storage error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)

        return NextResponse.json({ publicUrl: data.publicUrl })
    } catch (error) {
        console.error('Upload route error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
