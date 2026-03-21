import type { CalendarEvent, PostedEvent, Squad } from "./types"

const today = new Date()
const getDate = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date(today)
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour, minute, 0, 0)
  return date
}

export const mockSquads: Squad[] = [
  { id: "squad1", name: "CS Study Group", memberCount: 12 },
  { id: "squad2", name: "Dorm Floor 3A", memberCount: 8 },
  { id: "squad3", name: "Tennis Club", memberCount: 24 },
  { id: "squad4", name: "Research Lab Team", memberCount: 6 },
]

export const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Introduction to Computer Science",
    startTime: getDate(0, 10, 0),
    endTime: getDate(0, 11, 15),
    type: "class",
    location: "Tech Hall 101",
  },
  {
    id: "2",
    title: "Linear Algebra",
    startTime: getDate(1, 14, 0),
    endTime: getDate(1, 15, 30),
    type: "class",
    location: "Math Building 205",
  },
  {
    id: "3",
    title: "CS Project Due",
    startTime: getDate(2, 23, 59),
    endTime: getDate(2, 23, 59),
    type: "deadline",
    notes: "Submit via course portal",
  },
  {
    id: "4",
    title: "Study Session",
    startTime: getDate(0, 15, 0),
    endTime: getDate(0, 17, 0),
    type: "study",
    location: "Library Room 4B",
  },
  {
    id: "5",
    title: "Campus Career Fair",
    startTime: getDate(3, 12, 0),
    endTime: getDate(3, 16, 0),
    type: "event",
    location: "Student Center",
  },
  {
    id: "6",
    title: "Tennis Practice",
    startTime: getDate(1, 16, 0),
    endTime: getDate(1, 18, 0),
    type: "squad",
    location: "Tennis Courts",
  },
  {
    id: "7",
    title: "Physics I: Mechanics",
    startTime: getDate(0, 13, 0),
    endTime: getDate(0, 14, 15),
    type: "class",
    location: "Science Center 302",
  },
  {
    id: "8",
    title: "Research Meeting",
    startTime: getDate(2, 10, 0),
    endTime: getDate(2, 11, 0),
    type: "squad",
    location: "Lab Building 150",
  },
  {
    id: "9",
    title: "Essay Draft Due",
    startTime: getDate(4, 17, 0),
    endTime: getDate(4, 17, 0),
    type: "deadline",
  },
  {
    id: "10",
    title: "Guest Lecture: AI Ethics",
    startTime: getDate(5, 18, 0),
    endTime: getDate(5, 19, 30),
    type: "event",
    location: "Auditorium A",
  },
]

export const mockPostedEvents: PostedEvent[] = [
  {
    id: "post1",
    title: "Campus Career Fair",
    message:
      "Join us for our annual career fair! Over 50 companies attending. Bring your resume and dress professionally.",
    startTime: getDate(3, 12, 0),
    endTime: getDate(3, 16, 0),
    location: "Student Center",
    hasSignUp: true,
    maxSignUps: 200,
    signedUpCount: 87,
    signedUpUsers: [],
    postedTo: ["campus"],
    authorId: "admin1",
    authorName: "Career Services",
    createdAt: getDate(-2, 9, 0),
  },
  {
    id: "post2",
    title: "Study Session for Midterms",
    message:
      "Planning a group study session to prep for midterms. Bring your notes and questions.",
    startTime: getDate(0, 15, 0),
    endTime: getDate(0, 17, 0),
    location: "Library Room 4B",
    hasSignUp: true,
    maxSignUps: 10,
    signedUpCount: 6,
    signedUpUsers: [],
    postedTo: ["squad"],
    squadIds: ["squad1"],
    authorId: "user2",
    authorName: "Alex Kim",
    createdAt: getDate(-1, 14, 0),
  },
  {
    id: "post3",
    title: "Guest Lecture: AI Ethics",
    message:
      "Dr. Maya Chen from Stanford will be presenting on the ethical implications of AI in society.",
    startTime: getDate(5, 18, 0),
    endTime: getDate(5, 19, 30),
    location: "Auditorium A",
    hasSignUp: false,
    signedUpCount: 0,
    signedUpUsers: [],
    postedTo: ["campus"],
    authorId: "admin2",
    authorName: "CS Department",
    createdAt: getDate(-3, 11, 0),
  },
]
