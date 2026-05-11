/** Path helpers so staff and guest flows stay on slug-scoped URLs. */

export function encodeSlug(slug: string) {
  return encodeURIComponent(slug)
}

export function staffTablesPath(slug: string) {
  return `/staff/${encodeSlug(slug)}/tables`
}

export function staffLoginPath(slug?: string | null) {
  return slug ? `/staff-login/${encodeSlug(slug)}` : '/staff-login'
}

export function staffForgotPasswordPath(slug?: string | null) {
  return slug ? `/staff-forgot-password/${encodeSlug(slug)}` : '/staff-forgot-password'
}

export function restaurantLoginPath(slug?: string | null) {
  return slug && slug !== 'demo-restaurant' ? `/login/${encodeSlug(slug)}` : '/login'
}

export function forgotPasswordPath(slug?: string | null) {
  return slug && slug !== 'demo-restaurant' ? `/forgot-password/${encodeSlug(slug)}` : '/forgot-password'
}

export function customerSignupPath(slug?: string | null) {
  return slug && slug !== 'demo-restaurant' ? `/customer-signup/${encodeSlug(slug)}` : '/customer-signup'
}

export function bookTablePath(slug?: string | null) {
  return slug && slug !== 'default-restaurant' ? `/book-a-table/${encodeSlug(slug)}` : '/book-a-table'
}

export function userReservePath(slug?: string | null) {
  return slug && slug !== 'default-restaurant' ? `/user-reserve/${encodeSlug(slug)}` : '/user-reserve'
}
