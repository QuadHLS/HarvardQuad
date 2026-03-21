export type EventType = "class" | "deadline" | "event" | "study" | "squad"

export interface CalendarEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
  type: EventType
  location?: string
  notes?: string
  isAllDay?: boolean
  postedTo?: ("campus" | "squad")[]
  squadIds?: string[]
}

export interface PostedEvent {
  id: string
  title: string
  message: string
  startTime: Date
  endTime: Date
  location?: string
  hasSignUp: boolean
  maxSignUps?: number
  signedUpCount: number
  signedUpUsers: string[]
  postedTo: ("campus" | "squad")[]
  squadIds?: string[]
  authorId: string
  authorName: string
  createdAt: Date
}

export interface Squad {
  id: string
  name: string
  memberCount: number
}
