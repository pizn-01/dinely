import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import type { ReservationData } from './ReservationWizard'

interface StepPaymentProps {
  data: ReservationData
  updateData: (updates: Partial<ReservationData>) => void
}

export default function StepPayment({ data, updateData }: StepPaymentProps) {
  const [showFailedModal, setShowFailedModal] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(data.paymentMethod)

  const handleSelect = (method: string) => {
    setSelectedMethod(method)
    updateData({ paymentMethod: method })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Secure Your Reservation</h2>
      <p className="text-sm text-gray-500 mb-6">
        Complete the payment to confirm your premium table booking.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="space-y-4">
          {[
            { id: 'apple', label: 'Apple Pay', icon: '' },
            { id: 'google', label: 'Google Pay', icon: 'G' },
            { id: 'stripe', label: 'Pay with Stripe', icon: '' },
          ].map((method) => (
            <button
              key={method.id}
              onClick={() => handleSelect(method.id)}
              className={`w-full p-5 rounded-xl border text-center text-gray-900 font-medium transition-all cursor-pointer ${
                selectedMethod === method.id
                  ? 'border-[#5E8B6A] bg-[#EAF4EC]'
                  : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm'
              }`}
            >
              {method.id === 'apple' && (
                <span className="text-lg font-semibold text-black"> Pay</span>
              )}
              {method.id === 'google' && (
                <span className="text-lg"><span className="text-blue-500">G</span> Pay</span>
              )}
              {method.id === 'stripe' && (
                <span className="text-lg">Pay with <span className="font-bold text-[#6366f1]">stripe</span></span>
              )}
            </button>
          ))}

          <p className="text-xs text-gray-400 mt-4">
            All payments are securely processed through our trusted payment partners.
          </p>
          <p className="text-xs text-gray-400">
            Your payment information is encrypted and never stored on our servers.
          </p>
        </div>

        {/* Order Summary */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Date</span>
              <span className="text-gray-500">Tue, Feb 17, 2026</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Time</span>
              <span className="text-gray-500">{data.time || '17:00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Guest</span>
              <span className="text-gray-500">{data.guests}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Table Type</span>
              <span className="text-gray-500">{data.tableName || 'Table 8'} (Main hall)</span>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-4 pt-4">
            <h4 className="font-semibold text-gray-900 text-sm mb-3">Charges</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Table Deposit</span>
                <span className="text-gray-900">£20.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Service Fee</span>
                <span className="text-gray-900">£2.50</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900">Total Payable Today</span>
                <span className="text-gray-900">£22.50</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Failed Modal */}
      {showFailedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowFailedModal(false)} />
          <div className="relative bg-white border border-gray-200 shadow-xl rounded-2xl p-8 w-full max-w-md text-center animate-scale-in">
            <button
              onClick={() => setShowFailedModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Failed</h3>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h4 className="text-base font-bold text-gray-900 mb-2">Payment Unsuccessful!</h4>
            <p className="text-sm text-gray-500 mb-6">
              We couldn't process your payment.<br />
              Please try again or use a different method
            </p>
            <button onClick={() => setShowFailedModal(false)} className="btn-gold w-full py-3 text-white">
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
