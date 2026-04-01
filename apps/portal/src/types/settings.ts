/**
 * Settings types for portal settings window.
 * 8 sections: Profile, Addresses, Projects, Team, Notifications, Appearance, Security, Referrals.
 */

export type SettingsSection =
  | 'profile'
  | 'addresses'
  | 'projects'
  | 'team'
  | 'notifications'
  | 'appearance'
  | 'security'
  | 'referrals'

export interface CustomerProfile {
  companyName: string
  contactName: string
  phone: string
  email?: string
  tradeLicenseStatus: 'not_uploaded' | 'under_review' | 'verified'
  profilePhotoUrl?: string
}

export interface Address {
  id: string
  label: string
  street: string
  city: string
  governorate: string
  isDefault: boolean
  postalCode?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  orderCount: number
  createdAt: string
  archived: boolean
}

export interface TeamMember {
  id: string
  name: string
  email: string
  phone?: string
  role: 'buyer' | 'approver' | 'site_manager'
  isOwner: boolean
  joinedAt: string
}

export interface NotificationPreference {
  channel: 'whatsapp' | 'email' | 'push' | 'sms'
  event:
    | 'quote_ready'
    | 'order_status'
    | 'delivery_update'
    | 'invoice_generated'
    | 'payment_confirmation'
    | 'support_response'
  enabled: boolean
}

export interface ActiveSession {
  id: string
  device: string
  lastActive: string
  location: string
  isCurrent: boolean
}

export interface ReferralStats {
  totalReferrals: number
  pendingCredits: number
  earnedCredits: number
  referralCode: string
  referralLink: string
}
