"use server"

import { Dropbox, files } from "dropbox"

const cache = new Map()

export const getAccessToken = async () => {

    const response = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: process.env.DROPBOX_REFRESH_TOKEN ?? '',
            client_id: process.env.DROPBOX_APP_KEY ?? '',
            client_secret: process.env.DROPBOX_APP_SECRET ?? '',
        }),
    })
    const data = await response.json()
    console.log("data", data)

    if (!response.ok) {
        throw new Error(data.error_description)
    }

    cache.set('access_token', data.access_token)
    return data.access_token
}
