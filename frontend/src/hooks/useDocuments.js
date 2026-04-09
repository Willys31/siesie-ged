import { useCallback, useState } from 'react'
import { documentsService } from '../services/documents'

export function useDocuments() {
  const [documents, setDocuments] = useState([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const fetchDocuments = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const data = await documentsService.list(params)
      setDocuments(data.items)
      setTotal(data.total)
      return data
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { documents, total, loading, error, fetchDocuments, setDocuments }
}
