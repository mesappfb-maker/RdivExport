// --- RdivExport - Requisitions Hook ------------------------------------------
// Gestion CRUD des requisitions : creation, lecture, mise a jour de statut.

import { useState, useCallback } from 'react'
import type {
  Requisition,
  RequisitionStatus,
  CreateRequisitionInput,
  PaginatedResponse,
} from '@/types'
import type { UUID } from '@/types/database'
import {
  createRequisition as createRequisitionService,
  getRequisitionsByPharmacy,
  getAllRequisitions,
  getRequisitionById,
  updateRequisitionStatus,
} from '@/services/requisitions.service'
import type { RequisitionFilters } from '@/services/requisitions.service'

// --- State ------------------------------------------------------------------

interface RequisitionsState {
  requisitions: PaginatedResponse<Requisition>
  currentRequisition: Requisition | null
  loading: boolean
  error: string | null
}

const emptyPaginated: PaginatedResponse<Requisition> = {
  data: [],
  total: 0,
  page: 1,
  itemsPerPage: 20,
  totalPages: 0,
}

// --- Hook -------------------------------------------------------------------

interface UseRequisitionsReturn {
 requisitions: PaginatedResponse<Requisition>
 currentRequisition: Requisition | null
 loading: boolean
 error: string | null
 fetchRequisitions: (pharmacyId: UUID, filters?: RequisitionFilters) => Promise<void>
 fetchAllRequisitions: (filters?: RequisitionFilters) => Promise<void>
 fetchRequisitionDetail: (id: UUID) => Promise<void>
 createRequisition: (input: CreateRequisitionInput, createdBy: UUID) => Promise<Requisition | null>
 updateStatus: (id: UUID, status: RequisitionStatus, userId: UUID, cancelReason?: string) => Promise<Requisition | null>
 clearError: () => void
 clearCurrentRequisition: () => void
}

export function useRequisitions(): UseRequisitionsReturn {
 const [state, setState] = useState<RequisitionsState>({
   requisitions: emptyPaginated,
   currentRequisition: null,
   loading: false,
   error: null,
 })

 const clearError = useCallback(() => {
   setState((prev) => ({ ...prev, error: null }))
 }, [])

 const clearCurrentRequisition = useCallback(() => {
   setState((prev) => ({ ...prev, currentRequisition: null }))
 }, [])

 const fetchRequisitions = useCallback(
   async (pharmacyId: UUID, filters?: RequisitionFilters) => {
     setState((prev) => ({ ...prev, loading: true, error: null }))

     const result = await getRequisitionsByPharmacy(pharmacyId, filters)

     setState((prev) => ({
       ...prev,
       requisitions: {
         data: result.data,
         total: result.total,
         page: result.page,
         itemsPerPage: result.itemsPerPage,
         totalPages: result.totalPages,
       },
       loading: false,
       error: result.error,
     }))
   },
   []
 )

 const fetchAllRequisitions = useCallback(
   async (filters?: RequisitionFilters) => {
     setState((prev) => ({ ...prev, loading: true, error: null }))

     const result = await getAllRequisitions(filters)

     setState((prev) => ({
       ...prev,
       requisitions: {
         data: result.data,
         total: result.total,
         page: result.page,
         itemsPerPage: result.itemsPerPage,
         totalPages: result.totalPages,
       },
       loading: false,
       error: result.error,
     }))
   },
   []
 )

 const fetchRequisitionDetail = useCallback(async (id: UUID) => {
   setState((prev) => ({ ...prev, loading: true, error: null }))

   const result = await getRequisitionById(id)

   setState((prev) => ({
     ...prev,
     currentRequisition: result.data,
     loading: false,
     error: result.error,
   }))
 }, [])

 const createRequisition = useCallback(
   async (input: CreateRequisitionInput, createdBy: UUID): Promise<Requisition | null> => {
     setState((prev) => ({ ...prev, loading: true, error: null }))

     const result = await createRequisitionService(input, createdBy)

     setState((prev) => ({ ...prev, loading: false, error: result.error }))

     return result.data
   },
   []
 )

 const updateStatus = useCallback(
   async (
     id: UUID,
     status: RequisitionStatus,
     userId: UUID,
     cancelReason?: string
   ): Promise<Requisition | null> => {
     setState((prev) => ({ ...prev, loading: true, error: null }))

     const result = await updateRequisitionStatus(id, status, userId, cancelReason)

     setState((prev) => ({ ...prev, loading: false, error: result.error }))

     // If we have a current requisition that matches, update it
     if (result.data) {
       setState((prev) => {
         if (prev.currentRequisition?.id === id) {
           return { ...prev, currentRequisition: result.data }
         }
         return prev
       })
     }

     return result.data
   },
   []
 )

 return {
   requisitions: state.requisitions,
   currentRequisition: state.currentRequisition,
   loading: state.loading,
   error: state.error,
   fetchRequisitions,
   fetchAllRequisitions,
   fetchRequisitionDetail,
   createRequisition,
   updateStatus,
   clearError,
   clearCurrentRequisition,
 }
}
