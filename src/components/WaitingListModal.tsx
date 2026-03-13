import { useState } from 'react'
import { X, Calendar, Clock } from 'lucide-react'

interface WaitingListModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function WaitingListModal({ isOpen, onClose }: WaitingListModalProps) {
  const [form, setForm] = useState({
    date: '20/02/2026',
    time: '18:30',
    partySize: '2',
    email: 'johndoe@example.com',
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-card border border-dark-border rounded-2xl p-8 w-full max-w-lg animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Table Reservation</h2>
          <button onClick={onClose} className="text-dark-text-secondary hover:text-white transition-colors cursor-pointer">
            <X size={22} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gold mb-2">Date</label>
            <div className="relative">
              <input
                type="text"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="input-dark pr-10"
              />
              <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-text-secondary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gold mb-2">Time</label>
            <div className="relative">
              <input
                type="text"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="input-dark pr-10"
              />
              <Clock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-text-secondary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gold mb-2">Party Size</label>
            <input
              type="text"
              value={form.partySize}
              onChange={(e) => setForm({ ...form, partySize: e.target.value })}
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gold mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-dark"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={onClose} className="btn-gold">Done</button>
        </div>
      </div>
    </div>
  )
}
