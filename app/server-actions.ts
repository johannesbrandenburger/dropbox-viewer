"use server"

import { Dropbox, DropboxResponseError, files } from "dropbox"
import fetch from "node-fetch"


let dbx = null as Dropbox | null
let accessToken = null as string | null

const fetchAccessToken = async () => {

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
    const data = await response.json() as { access_token: string, error_description: string }
    console.log("data", data)

    if (!response.ok) {
        throw new Error(data.error_description)
    }

    return data.access_token
}

const createDropbox = async () => {
    accessToken = await fetchAccessToken() as string
    return new Dropbox({ accessToken, fetch: fetch })
}

export async function getImagesPaths() {

    if (!dbx) {
        dbx = await createDropbox()
    }

    try {
        let imageFiles = [] as files.FileMetadata[]
        let metaCursor = null
        while (true) {
            let response = null
            if (metaCursor === null) {
                response = await dbx.filesListFolder({
                    path: process.env.DROPBOX_FOLDER_PATH ?? '',
                    limit: 20,
                })
            } else {
                response = await dbx.filesListFolderContinue({ cursor: metaCursor })
            }

            const imageFilesI = response.result.entries.filter(
                entry => entry['.tag'] === 'file' && entry.name.match(/\.(jpeg|jpg|png|gif)$/i)
            ) as files.FileMetadata[]
            imageFiles = [...imageFiles, ...imageFilesI]

            if (!response.result.has_more) {
                break
            }

            metaCursor = response.result.cursor
        }
        imageFiles.sort((a, b) => a.client_modified > b.client_modified ? -1 : 1)
        return imageFiles.map(file => file.path_display)
    } catch (error) {
        // handle 401
        if (error instanceof DropboxResponseError) {
            if (error.error.error_summary === 'invalid_access_token') {
                accessToken = await fetchAccessToken()
                dbx = await createDropbox()
                return await getImagesPaths()
            }
        }
        throw error
    }
}

export async function getImageUrl(path: string) {
    if (!dbx) {
        dbx = await createDropbox()
    }

    try {
        const response = await dbx.filesGetTemporaryLink({ path })
        return response.result.link
    } catch (error) {
        // handle 401
        if (error instanceof DropboxResponseError) {
            if (error.error.error_summary === 'invalid_access_token') {
                accessToken = await fetchAccessToken()
                dbx = await createDropbox()
                return await getImageUrl(path)
            }
        }
        throw error
    }
}