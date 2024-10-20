'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { DropboxResponseError } from 'dropbox'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import InfiniteScroll from "react-infinite-scroll-component";
import { getImagesPaths, getImageUrl } from '@/app/server-actions'

export function DropboxGalleryComponent() {
  const [images, setImages] = useState([] as { url: string }[])
  const [error, setError] = useState(null as string | null)
  const [hasMore, setHasMore] = useState(true)

  const LIMIT = 3
  const imagesPathsRef = useRef([] as string[])
  let start = useRef(0).current

  const loadImagesLazy = useCallback(async () => {
    let end = start + LIMIT
    if (end > imagesPathsRef.current.length) {
      end = imagesPathsRef.current.length
      setHasMore(false)
    }
    const imagesMetadata = imagesPathsRef.current.slice(start, end)
    start = end

    const images = await Promise.all(imagesMetadata.map(async image => {
      const url = await getImageUrl(image as string)
      return { url }
    }))

    setImages(prevImages => [...prevImages, ...images])
  }, [])

  let isInitialized = false

  useEffect(() => {

    if (isInitialized) {
      return
    }

    const fetchImages = async () => {
      try {
        const paths = await getImagesPaths()
        imagesPathsRef.current = paths as string[]
        loadImagesLazy()
      } catch (error) {
        if (error instanceof DropboxResponseError) {
          if (error.error.error_summary === 'invalid_access_token') {
            setError('Invalid access token. Please try again.')
          } else {
            setError('An error occurred. Please try again.')
          }
        } else {
          setError('An error occurred. Please try again.')
        }
      }
    }

    isInitialized = true
    fetchImages()
  }, [])

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
          {images.map((image, index) => (
            <div
              key={index}
              className="w-full p-2"
            >
              <div className="relative w-full">
                <Image
                  src={image.url}
                  alt="Image"
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