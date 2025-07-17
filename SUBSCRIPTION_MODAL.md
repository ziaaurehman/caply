# Subscription Modal System

This system provides a subscription modal that can be shown to users when they access the dashboard or triggered manually from anywhere in the application.

## Features

- **Automatic Display**: Shows subscription modal when users first access the dashboard (if they don't have an active subscription)
- **Manual Trigger**: Can be triggered from anywhere using the `useSubscriptionModal` hook
- **Persistent State**: Remembers if user has seen the modal (stored in localStorage)
- **Current Plan Display**: Shows user's current subscription status
- **Multiple Plan Support**: Displays all available plans with pricing
- **Loading States**: Shows proper loading indicators during subscription process

## Components

### 1. SubscriptionModal
Main modal component that displays pricing cards and handles subscription flow.

**Location**: `src/components/modals/SubscriptionModal.tsx`

### 2. useSubscriptionModal Hook
Custom hook for managing modal state.

**Location**: `src/lib/hooks/useSubscriptionModal.ts`

**Usage**:
```tsx
import { useSubscriptionModal } from "@/lib/hooks/useSubscriptionModal"

function MyComponent() {
  const { openSubscriptionModal, closeSubscriptionModal } = useSubscriptionModal()
  
  return (
    <button onClick={openSubscriptionModal}>
      View Plans
    </button>
  )
}
```

### 3. SubscriptionTrigger Component
Ready-to-use button component for triggering the subscription modal.

**Location**: `src/components/ui/SubscriptionTrigger.tsx`

**Usage**:
```tsx
import SubscriptionTrigger from "@/components/ui/SubscriptionTrigger"

function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
      <SubscriptionTrigger />
    </div>
  )
}
```

### 4. SubscriptionBanner Component
Dismissible banner for promoting subscriptions or showing subscription-related alerts.

**Location**: `src/components/ui/SubscriptionBanner.tsx`

**Usage**:
```tsx
import SubscriptionBanner from "@/components/ui/SubscriptionBanner"

function MyPage() {
  return (
    <div>
      {/* Different banner types */}
      <SubscriptionBanner type="trial" />
      <SubscriptionBanner type="upgrade" />
      <SubscriptionBanner type="expired" />
      <SubscriptionBanner type="payment_failed" />
      
      {/* Custom message */}
      <SubscriptionBanner 
        type="upgrade" 
        message="Unlock advanced analytics with Pro plan!"
        dismissible={false}
      />
    </div>
  )
}
```

## Integration

The modal is automatically integrated into the dashboard layout and will:

1. **Show automatically** when a user signs in and navigates to the dashboard (if they haven't seen it before and don't have an active subscription)
2. **Be accessible** from the user profile menu in the header
3. **Remember** if the user has dismissed it (using localStorage)

## Customization

### Hiding the Auto-Display
To prevent the modal from showing automatically for a specific organization, you can set the localStorage flag:

```javascript
localStorage.setItem(`subscription-modal-seen-${organizationId}`, 'true')
```

### Forcing the Modal to Show
To force the modal to show again (for example, after a failed payment):

```typescript
import { useSubscriptionModal } from "@/lib/hooks/useSubscriptionModal"

const { openSubscriptionModal } = useSubscriptionModal()
openSubscriptionModal()
```

## Store Integration

The modal state is managed through the `useSubscriptionStore` which includes:

- `showSubscriptionModal`: Boolean state for modal visibility
- `setShowSubscriptionModal`: Function to control modal visibility
- Current subscription data
- Available plans data
- Loading states

## Styling

The modal uses Tailwind CSS and includes:
- Responsive design (works on mobile and desktop)
- Hover effects and transitions
- Loading indicators
- Current plan highlighting
- Accessibility features (close on backdrop click, keyboard navigation)
