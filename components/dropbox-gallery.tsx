'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Dropbox, DropboxResponseError, files } from 'dropbox'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DropboxGalleryComponent() {
  const [images, setImages] = useState([] as { url: string, name: string }[])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null as string | null)
  const [hasMore, setHasMore] = useState(true)
  
  let dbx = useRef(null as Dropbox | null).current
  const limit = 3
  const imagesMetadataRef = useRef([] as files.FileMetadata[])
  const [start, setStart] = useState(0)
  const accessTokenRef = useRef<string | null>(null)


  const getAccessToken = useCallback(async () => {
    if (accessTokenRef.current) return accessTokenRef.current

    // local storage
    const accessToken = localStorage.getItem('dropboxAccessToken')
    if (accessToken) {
      accessTokenRef.current = accessToken
      return accessToken
    }

    const response = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: process.env.NEXT_PUBLIC_DROPBOX_REFRESH_TOKEN ?? '',
        client_id: process.env.NEXT_PUBLIC_DROPBOX_APP_KEY ?? '',
        client_secret: process.env.NEXT_PUBLIC_DROPBOX_APP_SECRET ?? '',
      }),
    })

    const data = await response.json()
    if (response.ok) {
      accessTokenRef.current = data.access_token
      localStorage.setItem('dropboxAccessToken', data.access_token)
      return data.access_token
    } else {
      throw new Error('Failed to get access token')
    }
  }, [])

  const handleApiError = useCallback(async (err: any, retryFn: Function) => {
    if (err.status === 401) {
      console.log('Token expired. Refreshing...')
      accessTokenRef.current = null // Clear cached token
      localStorage.removeItem('dropboxAccessToken')
      const token = await getAccessToken()
      dbx = new Dropbox({ accessToken: token })
      await retryFn() // Retry the original operation
    } else {
      throw err // Handle other errors
    }
  }, [getAccessToken])

  const loadImagesLazy = useCallback(async () => {
    if (!hasMore) return
    if (imagesMetadataRef.current.length === 0) {
      await loadImagesMetadata()
    }

    try {
      const imagesMetadataCut = imagesMetadataRef.current.slice(start, start + limit)
      setStart(start + limit)

      const imageUrls = await Promise.all(
        imagesMetadataCut.map(async (file) => {
          try {
            const response = await dbx?.filesGetTemporaryLink({ path: file.path_lower ?? '' })
            const result = response?.result
            return { url: result?.link ?? '', name: file.name }
          } catch (err) {
            await handleApiError(err, () => dbx?.filesGetTemporaryLink({ path: file.path_lower ?? '' }))
          }
        })
      ) as { url: string, name: string }[]

      setImages(prevImages => [...prevImages, ...imageUrls])
      setHasMore(imagesMetadataRef.current.length > start)
    } catch (err) {
      const errorMsg = err instanceof DropboxResponseError && err.error ? JSON.parse(err.error)['.tag'] : 'Unknown error'
      setError(`Error loading images. Please try again. (${errorMsg})`)
      console.error('Error loading images:', err)
    } finally {
      setLoading(false)
    }
  }, [dbx, hasMore, start, handleApiError])

  const loadImagesMetadata = useCallback(async () => {
    try {
      setLoading(true)
      let imageFiles = [] as files.FileMetadata[]
      let metaCursor = null

      // Get access token if not already available
      if (!dbx) {
        const token = await getAccessToken()
        dbx = new Dropbox({ accessToken: token })
      }

      while (true) {
        let response = null
        if (metaCursor === null) {
          response = await dbx.filesListFolder({
            path: process.env.NEXT_PUBLIC_DROPBOX_FOLDER_PATH ?? '',
            limit: 20,
          })
        } else {
          response = await dbx.filesListFolderContinue({ cursor: metaCursor })
        }

        const imageFilesI = response.result.entries.filter(
          entry => entry['.tag'] === 'file' && entry.name.match(/\.(jpeg|jpg|png|gif)$/i)
        ) as files.FileMetadata[]
        imageFiles = [...imageFiles, ...imageFilesI]

        if (!response.result.has_more) break
        metaCursor = response.result.cursor
      }

      imageFiles.sort((a, b) => a.client_modified > b.client_modified ? -1 : 1)
      imagesMetadataRef.current = imageFiles
    } catch (err) {
      const errorMsg = err instanceof DropboxResponseError && err.error ? JSON.parse(err.error)['.tag'] : 'Unknown error'
      setError(`Error loading images. Please try again. (${errorMsg})`)
      console.error('Error loading images:', err)
    } finally {
      setLoading(false)
    }
  }, [dbx, getAccessToken])

  const initialized = useRef(false)
  useEffect(() => {
    if (!initialized.current) {
      loadImagesLazy()
      initialized.current = true
    }
  }, [loadImagesLazy])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => { setError(null); loadImagesLazy(); }}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8 max-w-3xl mx-auto">
        {images.map((image, index) => (
          <div key={image.name} className="w-full">
            <div className="relative w-full">
              <Image
                src={image.url}
                alt={image.name}
                width={640}
                height={360}
                layout="responsive"
                className="rounded-lg shadow-lg"
                onLoad={() => {
                  if (index === images.length - 1) loadImagesLazy()
                }}
                onClick={() => window.open(image.url, '_blank')}
              />
            </div>
          </div>
        ))}
        {loading && (
          <div className="space-y-8">
            {Array(2).fill(0).map((_, index) => (
              <div key={index} className="w-full">
                <Skeleton className="w-full rounded-lg" style={{ height: '360px' }} />
              </div>
            ))}
          </div>
        )}
      </div>
      {!hasMore && <p className="text-center mt-8 text-gray-600">No more images to load</p>}
    </div>
  )
}
