import { useSubscriptionStore } from "@/lib/stores/subscriptionStore"
import { useAuthStore } from "@/lib/stores/authStore"

export const useSubscriptionModal = () => {
  const { setShowSubscriptionModal } = useSubscriptionStore()
  const { organization } = useAuthStore()

  const openSubscriptionModal = () => {
    setShowSubscriptionModal(true)
  }

  const closeSubscriptionModal = () => {
    setShowSubscriptionModal(false)
    // Mark that user has seen the modal
    if (organization) {
      localStorage.setItem(`subscription-modal-seen-${organization.id}`, 'true')
    }
  }

  return {
    openSubscriptionModal,
    closeSubscriptionModal,
  }
}
