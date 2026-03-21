export const CATEGORIES = ['sports', 'social', 'academic', 'hobbies', 'creative', 'business', 'wellness'] as const
export const DISCOVER_PRIVACY_TOOLTIP = 'Private squads never appear in Discover. Open and Restricted squads are listed; Private squads are invite-only.'
export const CATEGORY_LABELS: Record<string, string> = {
  sports: 'Sports',
  social: 'Social',
  academic: 'Academic',
  hobbies: 'Hobbies',
  creative: 'Creative',
  business: 'Business',
  wellness: 'Wellness',
}
export const PRIVACY_BADGE_TOOLTIPS: Record<'open' | 'restricted' | 'private', string> = {
  open: 'Open: Anyone can find, join, and see posts. Visible on profiles.',
  restricted: 'Restricted: Request to join. Visibility on profiles depends on squad settings.',
  private: 'Private: Invite only. Only members see it on profiles.',
}
export const PRIVACY_DESCRIPTIONS: Record<'open' | 'restricted' | 'private', string> = {
  open: 'Discover:\nAnyone can find and join.\n\nProfile:\nEveryone sees this squad and your posts from it.',
  restricted: 'Discover:\nAnyone can find; must request to join (or accept an invite).\n\nProfile:\nEveryone sees the squad. Your posts: visible to all if you enable "Non-members can view posts," otherwise only to members.',
  private: 'Discover:\nHidden; not listed.\n\nProfile:\nOnly people who are also members can see this squad and your posts from it.',
}
