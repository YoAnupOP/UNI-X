export async function uploadImage(file: File, bucket = 'uploads'): Promise<string | null> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    })

    if (!response.ok) {
        const err = await response.json()
        console.error('Upload Error:', err)
        throw new Error(err.error || 'Upload failed')
    }

    const data = await response.json()
    return data.publicUrl
}
