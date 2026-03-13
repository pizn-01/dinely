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
      <h2 className="text-lg font-semibold text-white mb-1">Secure Your Reservation</h2>
      <p className="text-sm text-dark-text-secondary mb-6">
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
              className={`w-full p-5 rounded-xl border text-center text-white font-medium transition-all cursor-pointer ${
                selectedMethod === method.id
                  ? 'border-green-light bg-green-subtle'
                  : 'border-dark-border bg-transparent hover:border-dark-border-light'
              }`}
            >
              {method.id === 'apple' && (
                <span className="text-lg"> Pay</span>
              )}
              {method.id === 'google' && (
                <span className="text-lg"><span className="text-blue-400">G</span> Pay</span>
              )}
              {method.id === 'stripe' && (
                <span className="text-lg">Pay with <span className="font-bold text-purple-400">stripe</span></span>
              )}
            </button>
          ))}

          <p className="text-xs text-dark-text-muted mt-4">
            All payments are securely processed through our trusted payment partners.
          </p>
          <p className="text-xs text-dark-text-muted">
            Your payment information is encrypted and never stored on our servers.
          </p>
        </div>

        {/* Order Summary */}
        <div className="border border-dark-border rounded-xl p-6">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="font-semibold text-white">Date</span>
              <span className="text-dark-text-secondary">Tue, Feb 17, 2026</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-white">Time</span>
              <span className="text-dark-text-secondary">{data.time || '17:00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-white">Guest</span>
              <span className="text-dark-text-secondary">{data.guests}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-white">Tabel Type</span>
              <span className="text-dark-text-secondary">{data.tableName || 'Table 8'} (Main hall)</span>
            </div>
          </div>

          <div className="border-t border-dark-border mt-4 pt-4">
            <h4 className="font-semibold text-white text-sm mb-3">Charges</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-text-secondary">Table Deposit</span>
                <span className="text-white">$20.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-text-secondary">Service Fee</span>
                <span className="text-white">$2.50</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-white">Total Payable Today</span>
                <span className="text-white">$22.50</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Failed Modal */}
      {showFailedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowFailedModal(false)} />
          <div className="relative bg-dark-card border border-dark-border rounded-2xl p-8 w-full max-w-md text-center animate-scale-in">
            <button
              onClick={() => setShowFailedModal(false)}
              className="absolute top-4 right-4 text-dark-text-secondary hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Payment Failed</h3>
            <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">Payment Unsuccessful!</h4>
            <p className="text-sm text-dark-text-secondary mb-6">
              We couldn't process your payment.<br />
              Please try again or use a different method
            </p>
            <button onClick={() => setShowFailedModal(false)} className="btn-gold w-full py-3">
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
