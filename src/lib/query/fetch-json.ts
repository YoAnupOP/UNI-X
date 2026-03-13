export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
        const message = typeof data?.error === 'string'
            ? data.error
            : `Request failed with status ${response.status}`
        throw new Error(message)
    }

    return data as T
}

