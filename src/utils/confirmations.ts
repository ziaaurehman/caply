import { toast } from 'sonner'

export interface ConfirmDeleteOptions {
  itemName: string
  itemType: string
  onDelete: () => Promise<void>
  additionalMessage?: string
}

export interface ConfirmActionOptions {
  title: string
  message: string
  confirmText: string
  action: () => Promise<void>
  successMessage?: string
  type?: 'danger' | 'warning' | 'info'
}

export const createDeleteConfirmation = ({
  itemName,
  itemType,
  onDelete,
  additionalMessage
}: ConfirmDeleteOptions) => ({
  title: `Delete ${itemType}`,
  message: `Are you sure you want to delete "${itemName}"? This action cannot be undone${additionalMessage ? ` and ${additionalMessage}` : ''}.`,
  confirmText: `Delete ${itemType}`,
  cancelText: 'Cancel',
  type: 'danger' as const,
  action: async () => {
    try {
      await onDelete()
      toast.success(`Successfully deleted ${itemName}`)
    } catch (error: any) {
      console.error(`Error deleting ${itemType}:`, error)
      toast.error(error.message || `Failed to delete ${itemType}`)
      throw error
    }
  }
})

export const createActionConfirmation = ({
  title,
  message,
  confirmText,
  action,
  successMessage,
  type = 'info'
}: ConfirmActionOptions) => ({
  title,
  message,
  confirmText,
  cancelText: 'Cancel',
  type,
  action: async () => {
    try {
      await action()
      if (successMessage) {
        toast.success(successMessage)
      }
    } catch (error: any) {
      console.error('Error performing action:', error)
      toast.error(error.message || 'Action failed')
      throw error
    }
  }
})
