import { fetchAuthSession } from 'aws-amplify/auth'

type AuthFetchOptions = RequestInit & {
    headers?: HeadersInit
}

async function authFetch(
    url: string,
    options: AuthFetchOptions = {}
): Promise<Response> {
    const session = await fetchAuthSession()

    const token = session.tokens?.accessToken?.toString()

    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && {
                Authorization: `Bearer ${token}`,
            }),
            ...(options.headers || {}),
        },
    })
}



export default authFetch