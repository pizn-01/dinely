import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import ReservationWizard from './pages/reservation/ReservationWizard'
import BookingConfirmed from './pages/reservation/BookingConfirmed'
import CustomerDashboard from './pages/CustomerDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import SetupWizard from './pages/setup/SetupWizard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/reserve" element={<ReservationWizard />} />
      <Route path="/booking-confirmed" element={<BookingConfirmed />} />
      <Route path="/dashboard" element={<CustomerDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/setup" element={<SetupWizard />} />
    </Routes>
  )
}

export default App
