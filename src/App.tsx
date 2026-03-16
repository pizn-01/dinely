import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import ReservationWizard from './pages/reservation/ReservationWizard'
import BookingConfirmed from './pages/reservation/BookingConfirmed'
import CustomerDashboard from './pages/CustomerDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import SetupWizard from './pages/setup/SetupWizard'
import StaffLogin from './pages/StaffLogin'
import StaffTableManagement from './pages/staff/StaffTableManagement'
import LoggedInTabRes from './pages/LoggedInTabRes'
import Welcome from './pages/Welcome'
import PremiumReservation from './pages/PremiumReservation'
import PremiumBookingConfirmed from './pages/reservation/PremiumBookingConfirmed'
import UserReservationWizard from './pages/user-reservation/UserReservationWizard'
import UserBookingConfirmed from './pages/user-reservation/UserBookingConfirmed'

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
      <Route path="/staff-login" element={<StaffLogin />} />
      <Route path="/staff/tables" element={<StaffTableManagement />} />
      <Route path="/logged-in-tab-res" element={<LoggedInTabRes />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/premium-reserve" element={<PremiumReservation />} />
      <Route path="/premium-booking-confirmed" element={<PremiumBookingConfirmed />} />
      <Route path="/user-reserve" element={<UserReservationWizard />} />
      <Route path="/user-booking-confirmed" element={<UserBookingConfirmed />} />
    </Routes>
  )
}

export default App
