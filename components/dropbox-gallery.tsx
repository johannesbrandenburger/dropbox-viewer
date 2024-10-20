'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Dropbox, DropboxResponseError, files } from 'dropbox'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import InfiniteScroll from "react-infinite-scroll-component";
import { getAccessToken } from '@/app/server-actions'

export function DropboxGalleryComponent() {
  const [images, setImages] = useState([] as { url: string, name: string }[])
  const [error, setError] = useState(null as string | null)
  const [hasMore, setHasMore] = useState(true)

  let dbx = useRef(null as Dropbox | null).current
  
  const limit = 3
  const imagesMetadataRef = useRef([] as files.FileMetadata[])
  let start = useRef(0).current

  const loadImagesLazy = useCallback(async () => {

    if (!hasMore) {
      return
    }

    if (imagesMetadataRef.current.length === 0) {
      console.log("loadImagesMetadata")
      await loadImagesMetadata()
    }

    try {
      console.log("imagesMetadata", imagesMetadataRef.current)
      const imagesMetadataCut = imagesMetadataRef.current.slice(start, start + limit)
      start += limit
      
      console.log(`start: ${start}, limit: ${limit}, imagesMetadataCut: ${imagesMetadataCut.length}, total: ${imagesMetadataRef.current.length}`)

      const imageUrls = await Promise.all(
        imagesMetadataCut.map(async (file) => {
          const response = await dbx?.filesGetTemporaryLink({ path: file.path_lower ?? '' })
          console.log("response", response);
          if (!response) {
            throw new Error('Failed to get temporary link')
          }
          const result = response.result
          return { url: result.link, name: file.name }
        })
      ) as { url: string, name: string }[]
      setImages(prevImages => [...prevImages, ...imageUrls])
      setHasMore(imagesMetadataRef.current.length > start)
    } catch (err) {
      const errorMsg = err instanceof DropboxResponseError && err.error ? JSON.parse(err.error)['.tag'] : 'Unknown error'
      setError(`Error loading images. Please try again. (${errorMsg})`)
      console.error('Error loading images:', err)
    } finally {
    }
  }, [dbx])

  const loadImagesMetadata = useCallback(async () => {
    try {
      let imageFiles = [] as files.FileMetadata[]
      let metaCursor = null;

      // get a access token by a refresh token
      if (!dbx) {
        const accessToken = await getAccessToken()
        dbx = new Dropbox({ accessToken })
      }

      while (true) {
        let response = null;
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

        if (!response.result.has_more) {
          break
        }

        metaCursor = response.result.cursor
      }
      imageFiles.sort((a, b) => a.client_modified > b.client_modified ? -1 : 1)
      imagesMetadataRef.current = imageFiles
    } catch (err) {
      const errorMsg = err instanceof DropboxResponseError && err.error ? JSON.parse(err.error)['.tag'] : 'Unknown error'
      setError(`Error loading images. Please try again. (${errorMsg})`)
      console.error('Error loading images:', err)
    } finally {
    }
  }, [dbx])

  const initialized = useRef(false)
  useEffect(() => {
    if (!initialized.current) {
      loadImagesLazy()
      initialized.current = true
    }
  })

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
        <InfiniteScroll
          dataLength={images.length}
          next={loadImagesLazy}
          hasMore={hasMore}
          loader={<div className="text-center">Loading...</div>}
          endMessage={<p className="text-center mt-8 text-gray-600">No more images to load</p>}
        >
          {images.map(image => (
            <div
              key={image.name}
              className="w-full mb-8 p-2"
            >
              <div className="relative w-full">
                <Image
                  src={image.url}
                  alt={image.name}
                  width={640}
                  height={360}
                  layout="responsive"
                  className="rounded-lg shadow-lg"
                  onClick={() => window.open(image.url, '_blank')}
                />
              </div>
            </div>
          ))}
        </InfiniteScroll>
      </div>
    </div>
  )
}