async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        const { data: users, error: userErr } = await supabase.from('profiles').select('id').limit(1)
        if (userErr || !users?.length) throw userErr || new Error('No user found')

        const authorId = users[0].id

        const { data: post, error: postErr } = await supabase
            .from('posts')
            .insert({ author_id: authorId, content: 'Test post for cascade check' })
            .select()
            .single()

        if (postErr || !post) throw postErr || new Error('Failed to create post')

        console.log('Created post:', post.id)

        const { error: commentErr } = await supabase
            .from('comments')
            .insert({ author_id: authorId, post_id: post.id, content: 'Test comment' })
        if (commentErr) console.log('Comment error:', commentErr)

        const { error: likeErr } = await supabase
            .from('likes')
            .insert({ user_id: authorId, post_id: post.id })
        if (likeErr) console.log('Like error:', likeErr)

        const { error: bookmarkErr } = await supabase
            .from('bookmarks')
            .insert({ user_id: authorId, post_id: post.id })
        if (bookmarkErr) console.log('Bookmark error:', bookmarkErr)

        const { error: delErr } = await supabase.from('posts').delete().eq('id', post.id)

        if (delErr) {
            console.log('Error deleting post WITH dependents:', delErr)
            await supabase.from('comments').delete().eq('post_id', post.id)
            await supabase.from('likes').delete().eq('post_id', post.id)
            await supabase.from('bookmarks').delete().eq('post_id', post.id)
            await supabase.from('reports').delete().eq('post_id', post.id)
            await supabase.from('posts').delete().eq('id', post.id)
            console.log('Cleaned up post manually')
        } else {
            console.log('Successfully deleted post WITH dependents (Cascade is working).')
        }
    } catch (err) {
        console.error('Fatal error:', err)
    }
}

void main()
