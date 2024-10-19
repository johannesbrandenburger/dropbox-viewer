'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Dropbox } from 'dropbox'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Replace with your Dropbox access token
const DROPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_DROPBOX_ACCESS_TOKEN

export function DropboxGalleryComponent() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState(null)

  const observer = useRef()
  const dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN })

  const loadImages = useCallback(async () => {
    try {
      setLoading(true)
      let response = null;
      if (cursor === null) {
        response = await dbx.filesListFolder({
          path: '', // Replace with your Dropbox folder path
          limit: 20,
        })
      } else {
        response = await dbx.filesListFolderContinue({ cursor })
      }

      const imageFiles = response.result.entries.filter(
        entry => entry['.tag'] === 'file' && entry.name.match(/\.(jpeg|jpg|png|gif)$/i)
      )

      const imageUrls = await Promise.all(
        imageFiles.map(async (file) => {
          const response = await dbx.filesGetTemporaryLink({ path: file.path_lower })
          console.log("response", response);
          const result = response.result
          return { url: result.link, name: file.name }
        })
      )

      setImages(prevImages => [...prevImages, ...imageUrls])
      setCursor(response.result.has_more ? response.result.cursor : null)
      setHasMore(response.result.has_more)
    } catch (err) {
      setError('Error loading images. Please try again.')
      console.error('Error loading images:', err)
    } finally {
      setLoading(false)
    }
  }, [cursor, dbx])

  useEffect(() => {
    loadImages()
  }, [])

  const lastImageRef = useCallback(node => {
    if (loading) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        // loadImages()
      }
    })
    if (node) observer.current.observe(node)
  }, [loading, hasMore, loadImages])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => { setError(null); loadImages(); }}>
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
            <p className="mt-2 text-sm text-gray-600">{image.name}</p>
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