'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Dropbox, files } from 'dropbox'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Replace with your Dropbox access token
const DROPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_DROPBOX_ACCESS_TOKEN

export function DropboxGalleryComponent() {
  const [images, setImages] = useState([] as { url: string, name: string }[])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null as string | null)
  const [hasMore, setHasMore] = useState(true)

  const observer = useRef() as React.MutableRefObject<IntersectionObserver | null>
  const dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN })
  
  const limit = 3
  const [imagesMetadata, setImagesMetadata] = useState([] as files.FileMetadata[])
  const [start, setStart] = useState(0)

  const loadImagesLazy = useCallback(async () => {

    if (!hasMore) {
      return
    }

    if (imagesMetadata.length === 0) {
      await loadImagesMetadata()
    }

    try {
      const imagesMetadataCut = imagesMetadata.slice(start, start + limit)
      setStart(start + limit)
      console.log(`start: ${start}, limit: ${limit}, imagesMetadataCut: ${imagesMetadataCut.length}, total: ${imagesMetadata.length}`)

      const imageUrls = await Promise.all(
        imagesMetadataCut.map(async (file) => {
          const response = await dbx.filesGetTemporaryLink({ path: file.path_lower ?? '' })
          console.log("response", response);
          const result = response.result
          return { url: result.link, name: file.name }
        })
      )
      setImages(prevImages => [...prevImages, ...imageUrls])
      setHasMore(imagesMetadata.length > start)
    } catch (err) {
      setError('Error loading images. Please try again.')
      console.error('Error loading images:', err)
    } finally {
      setLoading(false)
    }
  }, [dbx])

  const loadImagesMetadata = useCallback(async () => {
    try {
      setLoading(true)
      let imageFiles = [] as files.FileMetadata[]
      while (true) {
        let response = null;
        const metaCursor = null;
        if (metaCursor === null) {
          response = await dbx.filesListFolder({
            path: '', // Replace with your Dropbox folder path
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
      }
      imageFiles.sort((a, b) => a.client_modified > b.client_modified ? -1 : 1)
      setImagesMetadata(imageFiles)
    } catch (err) {
      setError('Error loading images. Please try again.')
      console.error('Error loading images:', err)
    } finally {
      setLoading(false)
    }
  }, [dbx, loadImagesLazy])

  useEffect(() => {
    loadImagesLazy()
  }, [])

  const lastImageRef = useCallback((node: Element) => {
    if (loading) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        console.log("loadImagesLazy triggered by observer");
        loadImagesLazy()
      }
    })
    if (node) observer.current.observe(node)
  }, [loading, hasMore, loadImagesLazy])

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
      <h1 className="text-3xl font-bold mb-8 text-center">Dropbox Photo Gallery</h1>
      <div className="space-y-8 max-w-3xl mx-auto">
        {images.map((image, index) => (
          <div
            key={image.name}
            ref={index === images.length - 1 ? lastImageRef : null}
            className="w-full"
          >
            <div className="relative w-full">
              <Image
                src={image.url}
                alt={image.name}
                width={640}
                height={360}
                layout="responsive"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        ))}
        {loading && (
          <div className="space-y-8">
            {Array(2).fill(0).map((_, index) => (
              <div key={index} className="w-full">
                <Skeleton className="h-64 w-full rounded-lg" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </div>
            ))}
          </div>
        )}
      </div>
      {!hasMore && <p className="text-center mt-8 text-gray-600">No more images to load</p>}
    </div>
  )
}