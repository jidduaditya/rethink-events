export const BRAND = {
  name: "RETHINK",
  tagline: "No permission required.",
  cities: ["Bangalore", "Mumbai", "Pune", "Hyderabad", "Delhi"],
  hero: {
    heading: "Three meetups. One open seat.",
    authCard: "Reserve a spot",
    authButton: "SEND CODE",
  },
  feed: {
    upcoming: "UPCOMING",
    happeningNow: "HAPPENING NOW",
  },
  rsvp: {
    going: "I'M GOING",
    cancel: "CAN'T MAKE IT",
  },
  create: {
    header: "NEW EVENT",
    status: "STATUS: DRAFT",
    publish: "PUBLISH EVENT",
    descriptionPlaceholder: "What's going down?",
  },
  empty: {
    feed: "Nothing on tonight. Build one.",
    myEvents: "You haven't signed up for anything yet.",
  },
  errors: {
    generic: "Something broke. Reload.",
    network: "Couldn't connect. Try again.",
    loadFailed: "Couldn't load events. Try again.",
    notFound: "This event doesn't exist.",
    past: "This event has passed.",
    full: "This event is full.",
  },
  manifesto: "We don't do panels. We do arguments. Bring data or leave.",
  footer: {
    links: ["TERMS", "PRIVACY", "CAREERS", "CONTACT"],
    copyright: "No permission required.",
  },
} as const;
