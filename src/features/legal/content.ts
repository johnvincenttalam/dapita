import type { ConsentPurpose } from '@/types/account'

// DRAFT legal texts (plan step 11). They describe how Dapita works today and have
// not been reviewed by a lawyer (doc §13.3). Bracketed items are facts only the
// operator can supply. When a text changes, bump its version in config/legal.ts so
// new consents record which text was accepted.

/** A paragraph, or a bulleted list. */
export type LegalBlock = string | { list: string[] }

export interface LegalSection {
  /** Anchor for the "On this page" links. */
  id: string
  heading: string
  blocks: LegalBlock[]
}

export interface LegalDocumentContent {
  /** One-paragraph plain-language summary shown above the full text. */
  summary: string
  sections: LegalSection[]
}

const operator = '[Company legal name], [registered address], Davao City, Philippines'
const privacyContact = '[privacy contact email]'

export const legalContent: Record<ConsentPurpose, LegalDocumentContent> = {
  terms: {
    summary:
      'Dapita helps you find beauty, grooming and wellness shops in Davao City and ask them for appointments. The shop, not Dapita, provides the service and confirms your time. Be honest and respectful, keep the appointments you make, and tell us when something goes wrong.',
    sections: [
      {
        id: 'who-we-are',
        heading: 'Who we are',
        blocks: [
          `Dapita is operated by ${operator} (“Dapita”, “we”). These terms apply when you use the Dapita website and app as a customer, and alongside the Merchant listing policy when you list a business.`,
          'By creating an account you agree to these terms. If you don’t agree, please don’t use Dapita.',
        ],
      },
      {
        id: 'what-dapita-does',
        heading: 'What Dapita does',
        blocks: [
          'Dapita is a marketplace. We show listings that shops create and that we review before they go live, and we pass your booking requests and messages between you and the shop.',
          'Dapita does not provide beauty, grooming or wellness services itself, and does not employ the shops’ staff. Each shop is responsible for its services, prices, staff, premises and conduct.',
        ],
      },
      {
        id: 'your-account',
        heading: 'Your account',
        blocks: [
          {
            list: [
              'You must be at least 18 years old, or have a parent or guardian’s permission, to create an account.',
              'Give your real name and an email address you can read. Keep your password to yourself; you’re responsible for what happens under your account.',
              'One person, one account. Don’t create accounts for other people without their permission.',
            ],
          },
        ],
      },
      {
        id: 'bookings',
        heading: 'Booking requests',
        blocks: [
          'Most shops on Dapita take booking requests. Sending a request does not book the time: the shop accepts it, declines it or proposes another time. Your appointment is confirmed only when Dapita shows it as Confirmed.',
          'A request the shop doesn’t answer before its deadline expires. If the shop proposes another time, nothing changes until you accept it.',
          'Prices shown are set by the shop and may change for your specific needs (for example hair length). Agree the final price with the shop before the service starts.',
        ],
      },
      {
        id: 'payments',
        heading: 'Payments and deposits',
        blocks: [
          'Dapita does not take payments. You pay the shop directly, under the shop’s own policies, which are shown on its page and when you book.',
          'Never send money to a personal account because someone asked you to in a message. If a shop asks for payment in a way that doesn’t match its listed policies, report the conversation.',
        ],
      },
      {
        id: 'cancellations',
        heading: 'Cancellations and no-shows',
        blocks: [
          'You can cancel a request or an upcoming appointment from My bookings. Each shop sets its own cancellation and deposit policy; the version shown when you booked applies.',
          'Shops can record when a customer doesn’t arrive. Repeated no-shows may lead us to limit your account.',
        ],
      },
      {
        id: 'conduct',
        heading: 'How to behave on Dapita',
        blocks: [
          'Don’t use Dapita to:',
          {
            list: [
              'harass, threaten or discriminate against anyone, including shop staff;',
              'send spam, advertising or links unrelated to a booking;',
              'make requests you don’t intend to keep, or book under someone else’s name;',
              'share other people’s personal information without their permission;',
              'try to get into accounts, data or parts of the service that aren’t yours.',
            ],
          },
          'We may remove content, refuse requests, or suspend an account that breaks these rules. We tell you why, and you can ask us to look again through Support.',
        ],
      },
      {
        id: 'problems',
        heading: 'When something goes wrong',
        blocks: [
          'Try the shop first: message it from your booking. If that doesn’t help, or if you’re worried about safety, a message or a listing, contact Support. A person reads every request.',
          'We help both sides reach a fair outcome, but we can’t guarantee one: disputes about the service itself remain between you and the shop.',
        ],
      },
      {
        id: 'liability',
        heading: 'Our responsibility',
        blocks: [
          'We work to keep Dapita accurate and available, but listings are provided by shops and the service may sometimes be interrupted. To the extent the law allows, Dapita is not responsible for the services shops provide or for losses that come from relying on a shop’s listing. Nothing in these terms limits rights you have under Philippine consumer law.',
        ],
      },
      {
        id: 'changes',
        heading: 'Changes to these terms',
        blocks: [
          'If we change these terms in a way that matters, we tell you before the change takes effect and ask you to accept the new version. The version you accepted is listed under Privacy & data in your account.',
          'These terms are governed by the laws of the Philippines.',
        ],
      },
    ],
  },

  privacy_notice: {
    summary:
      'We collect what we need to run your account, your bookings and your messages with shops, and nothing for advertising. Shops see only what they need for your appointment. You can see what you agreed to, correct your details, ask for a copy of your data, or ask us to delete your account.',
    sections: [
      {
        id: 'controller',
        heading: 'Who is responsible for your data',
        blocks: [
          `${operator} is the personal information controller for Dapita under the Data Privacy Act of 2012 (Republic Act No. 10173). Our data protection officer can be reached at ${privacyContact}.`,
        ],
      },
      {
        id: 'what-we-collect',
        heading: 'What we collect',
        blocks: [
          {
            list: [
              'Account details: your name, email address, an optional mobile number, and your password (stored only in a scrambled form we can’t read back).',
              'Bookings: the shop, service, requested and agreed times, notes you add, and each change to the booking with who made it.',
              'Messages you exchange with shops, and any report you make about a conversation.',
              'Support requests and what our team did about them.',
              'Agreements: which version of these documents you accepted, and when.',
              'Technical data needed to keep you signed in and the service secure, such as a session cookie and server logs.',
            ],
          },
          'Business owners also give us their business’s details, opening hours, services and policies. That information is meant to be public once the listing is approved.',
        ],
      },
      {
        id: 'why',
        heading: 'Why we use it',
        blocks: [
          {
            list: [
              'To run your account and the bookings and messages you ask for (to perform our agreement with you).',
              'To review listings, handle reports and support requests, and prevent fraud and abuse (our legitimate interest in a safe marketplace).',
              'To keep records the law requires.',
              'To suggest shops you might like, using bookings and saved shops combined across customers. Suggestions never show anyone what you booked or saved.',
            ],
          },
          'We don’t sell your data and don’t use it for advertising. If we ever want to send you marketing, we’ll ask first, and you can say no.',
        ],
      },
      {
        id: 'sharing',
        heading: 'Who sees it',
        blocks: [
          {
            list: [
              'The shop you book with or message sees your name, the contact details on your booking, your booking and your messages with it. Nothing about your bookings with other shops.',
              'Dapita staff see what they need to review listings and handle reports and support requests. Their actions are recorded.',
              'Service providers who host and run Dapita for us (for example hosting and email delivery) process data only on our instructions. [List of providers to be added.]',
              'Authorities, when the law requires it.',
            ],
          },
        ],
      },
      {
        id: 'retention',
        heading: 'How long we keep it',
        blocks: [
          'We keep your account data while your account is open. When you ask us to delete your account, we delete or anonymise your personal data, except records we must keep by law or to settle an open dispute, which we keep only as long as needed. [Retention periods to be confirmed.]',
        ],
      },
      {
        id: 'your-rights',
        heading: 'Your rights',
        blocks: [
          'Under the Data Privacy Act you can:',
          {
            list: [
              'be told how your data is used (this notice);',
              'see the data we hold about you and get a copy of it;',
              'correct data that is wrong or out of date;',
              'object to a use of your data, or withdraw consent you gave;',
              'ask us to delete or block your data;',
              'complain to the National Privacy Commission.',
            ],
          },
          'You can correct your name and mobile number on your profile, and see your agreements and ask for deletion under Privacy & data. For anything else, contact Support and choose “My account or data”.',
        ],
      },
      {
        id: 'security',
        heading: 'Keeping it safe',
        blocks: [
          'Data travels encrypted between your device and Dapita. Access inside Dapita is limited by role, and staff actions on accounts, listings and cases are logged. If a breach puts you at risk, we’ll tell you and the National Privacy Commission as the law requires.',
        ],
      },
      {
        id: 'cookies',
        heading: 'Cookies and storage',
        blocks: [
          'We use one cookie to keep you signed in. Your browser also remembers choices such as light or dark theme. If you set a location, your browser remembers it on this device only; choose Change to clear it. We don’t use advertising or tracking cookies.',
        ],
      },
      {
        id: 'changes',
        heading: 'Changes to this notice',
        blocks: [
          'If we change how we use your data, we update this notice and tell you before the change applies. Where we need your consent, we ask for it again.',
        ],
      },
    ],
  },

  merchant_policy: {
    summary:
      'List a real business that you run or are authorised to represent, describe it accurately, and answer booking requests and messages promptly. We review every listing before it goes live and may ask for changes, reject it, or suspend it later, always with a reason.',
    sections: [
      {
        id: 'who-can-list',
        heading: 'Who can list',
        blocks: [
          'You can list a beauty, grooming or wellness business in the Davao City area that you own or are authorised to manage. By listing, you confirm the business may legally offer its services, and you accept these rules and the Terms of use.',
        ],
      },
      {
        id: 'review',
        heading: 'How listings are reviewed',
        blocks: [
          'Every new listing is reviewed by Dapita staff before customers see it. We check that the business is real and reachable, the details are complete and the content follows this policy.',
          {
            list: [
              'Approved: your listing is live and customers can send requests.',
              'Changes requested: we tell you what to fix; you edit and send it again.',
              'Rejected: the listing can’t go live; we tell you why.',
              'Suspended: a live listing is hidden while we deal with a serious problem; we tell you why and how to respond.',
            ],
          },
          'Each decision is recorded with a reason. If you disagree, contact Support.',
        ],
      },
      {
        id: 'accurate-listings',
        heading: 'Keeping your listing accurate',
        blocks: [
          {
            list: [
              'Use your business’s real name, address and area, and keep opening hours and closures up to date.',
              'Show prices customers can expect to pay. If a price depends on the customer (for example hair length), say so, or show a range or “from” price.',
              'Use photos of your own premises and work, or photos you have the right to use.',
              'Describe your cancellation, deposit and late-arrival policies plainly. Customers see the version in force when they book.',
            ],
          },
        ],
      },
      {
        id: 'not-allowed',
        heading: 'What’s not allowed',
        blocks: [
          {
            list: [
              'Services that are illegal, or that need a licence you don’t hold.',
              'Sexual services, or content that is sexual, violent, hateful or discriminatory.',
              'Misleading claims, fake reviews, or prices you don’t intend to honour.',
              'Asking customers to pay outside your listed policies, especially to personal accounts.',
              'Using customer details for anything other than their appointment, such as marketing they didn’t ask for.',
            ],
          },
        ],
      },
      {
        id: 'requests',
        heading: 'Answering booking requests',
        blocks: [
          'Accept, decline or propose another time before the request’s deadline; unanswered requests expire. Only accept times you can keep, and tell the customer as early as possible if you need to cancel.',
          'Record honestly whether an appointment was completed or the customer didn’t arrive.',
        ],
      },
      {
        id: 'customer-data',
        heading: 'Customer information',
        blocks: [
          'You see customers’ names, contact details, bookings and messages so you can serve them. Keep this information confidential, give your staff access only as needed, and handle it as the Data Privacy Act requires.',
        ],
      },
      {
        id: 'enforcement',
        heading: 'Reports and enforcement',
        blocks: [
          'Customers can report listings and conversations. We investigate, may contact you, and may ask for changes or suspend a listing while we do. Serious or repeated breaches can lead to removal from Dapita.',
        ],
      },
      {
        id: 'changes',
        heading: 'Changes to this policy',
        blocks: [
          'We tell you before changes to this policy take effect. Continuing to list after that means you accept the new version.',
        ],
      },
    ],
  },
}
