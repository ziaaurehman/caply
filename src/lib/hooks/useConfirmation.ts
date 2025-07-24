"use client"

import { useState, useCallback, useRef } from 'react'

export interface ConfirmationOptions {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

export interface ConfirmationState extends ConfirmationOptions {
  isOpen: boolean
  isLoading: boolean
}

export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    isLoading: false,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger'
  })

  const onConfirmRef = useRef<(() => void) | (() => Promise<void>)>(() => {})

  const confirm = useCallback((
    onConfirm: (() => void) | (() => Promise<void>),
    options: ConfirmationOptions = {}
  ) => {
    onConfirmRef.current = onConfirm
    setState({
      isOpen: true,
      isLoading: false,
      title: options.title || 'Confirm Action',
      message: options.message || 'Are you sure you want to proceed?',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      type: options.type || 'danger'
    })
  }, [])

  const handleConfirm = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      await onConfirmRef.current()
      setState(prev => ({ ...prev, isOpen: false, isLoading: false }))
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }))
      // Let the calling component handle the error
      throw error
    }
  }, [])

  const handleClose = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, isLoading: false }))
  }, [])

  return {
    confirmation: state,
    confirm,
    handleConfirm,
    handleClose
  }
}
