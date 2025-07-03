import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useSubscriptionStore } from '@/lib/stores/subscriptionStore'
import { formatPrice } from '@/lib/stripe'
import { 
  CreditCard, 
  Download, 
  Eye, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Settings,
  Crown,
  Users,
  HardDrive,
  Folder
} from 'lucide-react'

interface BillingPageProps {
  organizationId: string
}

export default function BillingPage({ organizationId }: BillingPageProps) {
  const {
    currentSubscription,
    billingAddress,
    paymentMethods,
    invoices,
    plans,
    fetchCurrentSubscription,
    fetchBillingAddress,
    fetchPaymentMethods,
    fetchInvoices,
    fetchPlans,
    createBillingPortalSession,
    loading,
    error
  } = useSubscriptionStore()

  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetchCurrentSubscription(organizationId)
    fetchBillingAddress(organizationId)
    fetchPaymentMethods(organizationId)
    fetchInvoices(organizationId)
    fetchPlans()
  }, [organizationId, fetchCurrentSubscription, fetchBillingAddress, fetchPaymentMethods, fetchInvoices, fetchPlans])

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const portalUrl = await createBillingPortalSession(organizationId)
      window.open(portalUrl, '_blank')
    } catch (error) {
      console.error('Failed to open billing portal:', error)
      alert('Failed to open billing portal. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  const getCurrentPlan = () => {
    if (!currentSubscription) return null
    return plans.find(plan => plan.id === currentSubscription.subscription_plan_id)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </span>
      case 'trialing':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Crown className="w-3 h-3 mr-1" />
          Trial
        </span>
      case 'past_due':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Past Due
        </span>
      case 'canceled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Canceled
        </span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>
    }
  }

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const currentPlan = getCurrentPlan()

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <Button 
          onClick={handleManageBilling}
          disabled={portalLoading || !currentSubscription}
          className="inline-flex items-center"
        >
          <Settings className="w-4 h-4 mr-2" />
          {portalLoading ? 'Loading...' : 'Manage Billing'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Current Subscription */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Subscription</h2>
        {currentSubscription && currentPlan ? (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{currentPlan.display_name}</h3>
                <p className="text-gray-600">{currentPlan.description}</p>
                <div className="mt-2 flex items-center space-x-4">
                  {getStatusBadge(currentSubscription.status)}
                  <span className="text-2xl font-bold text-gray-900">
                    {formatPrice(currentPlan.amount, currentPlan.currency)}
                    <span className="text-sm font-normal text-gray-500">
                      /{currentPlan.interval}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Billing Period */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Current Billing Period</h4>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {currentSubscription.current_period_start && currentSubscription.current_period_end ? (
                      <>
                        {formatDate(currentSubscription.current_period_start)} - {formatDate(currentSubscription.current_period_end)}
                      </>
                    ) : (
                      'Not available'
                    )}
                  </div>
                </div>
                {currentSubscription.trial_end && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Trial Ends</h4>
                    <div className="flex items-center text-sm text-gray-600">
                      <Crown className="w-4 h-4 mr-2" />
                      {formatDate(currentSubscription.trial_end)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Usage Overview */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Usage Overview</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {currentSubscription.current_users}
                      {currentPlan.max_users ? ` / ${currentPlan.max_users}` : ' / Unlimited'}
                    </p>
                    <p className="text-xs text-gray-500">Team Members</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Folder className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {currentSubscription.current_projects}
                      {currentPlan.max_projects ? ` / ${currentPlan.max_projects}` : ' / Unlimited'}
                    </p>
                    <p className="text-xs text-gray-500">Projects</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <HardDrive className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {currentSubscription.current_storage_gb.toFixed(1)} GB
                      {currentPlan.max_storage_gb ? ` / ${currentPlan.max_storage_gb} GB` : ' / Unlimited'}
                    </p>
                    <p className="text-xs text-gray-500">Storage Used</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subscription</h3>
            <p className="text-gray-600 mb-4">Choose a plan to get started with premium features.</p>
            <Button onClick={() => window.location.href = '/#pricing'}>
              View Plans
            </Button>
          </div>
        )}
      </Card>

      {/* Payment Methods */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Payment Methods</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleManageBilling}
            disabled={portalLoading}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Add Card
          </Button>
        </div>
        {paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {method.card_brand?.toUpperCase()} •••• {method.card_last4}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires {method.card_exp_month}/{method.card_exp_year}
                    </p>
                  </div>
                </div>
                {method.is_default && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    Default
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No payment methods on file</p>
          </div>
        )}
      </Card>

      {/* Billing History */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.description || `Invoice ${invoice.invoice_number}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(invoice.total_amount, invoice.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {invoice.hosted_invoice_url && (
                          <button
                            onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {invoice.invoice_pdf_url && (
                          <button
                            onClick={() => window.open(invoice.invoice_pdf_url!, '_blank')}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <div className="w-8 h-8 mx-auto mb-2 text-gray-300">📄</div>
            <p>No billing history available</p>
          </div>
        )}
      </Card>
    </div>
  )
}