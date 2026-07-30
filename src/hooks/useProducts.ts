// --- RdivExport - Products Hook ----------------------------------------------
// Recherche de produits avec anti-rebond (debounce) de 300 ms.

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Product } from '@/types'
import { searchProducts as searchProductsService } from '@/services/products.service'

// --- Constants ---------------------------------------------------------------

const DEBOUNCE_DELAY = 300

// --- Return type -------------------------------------------------------------

interface UseProductsReturn {
  products: Product[]
  loading: boolean
  error: string | null
  search: (query: string) => void
  clearSearch: () => void
}

// --- Hook --------------------------------------------------------------------

/**
 * Hook de recherche de produits avec debounce integre.
 * Le declenchement effectif de la recherche est retarde de 300 ms
 * apres la derniere frappe pour eviter les appels reseau excessifs.
 */
export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<boolean>(false)

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      abortRef.current = true
    }
  }, [])

  const search = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const trimmed = query.trim()

    if (!trimmed) {
      setProducts([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    debounceTimerRef.current = setTimeout(async () => {
      abortRef.current = false

      const { data, error: searchError } = await searchProductsService(trimmed)

      if (abortRef.current) return

      if (searchError) {
        setError(searchError)
        setProducts([])
      } else {
        setProducts(data)
        setError(null)
      }

      setLoading(false)
    }, DEBOUNCE_DELAY)
  }, [])

  const clearSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    abortRef.current = true
    setProducts([])
    setLoading(false)
    setError(null)
  }, [])

  return { products, loading, error, search, clearSearch }
}
