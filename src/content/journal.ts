/**
 * Seed content for JHTS. This file is the single source of truth for the
 * initial database contents: `npm run seed:generate` turns it into
 * supabase/seed.sql, and the site uses it directly in demo mode (no Supabase).
 *
 * Anything the committee must still confirm is marked [TO CONFIRM].
 */
import type { BoardGroup, CallForPapers, Category, FeatureFlags, SiteSettings } from "@/lib/types";

export const FEE_INTEGRITY_STATEMENT =
  "Payment of fees does not guarantee acceptance. All editorial decisions are based solely on scholarly merit.";

export const settings: SiteSettings = {
  journalName: "Journal of Humanities and Transcultural Studies",
  shortName: "JHTS",
  tagline: "A quarterly journal of humanities and transcultural scholarship",
  motto: "Knowledge · Cultures · Global Voices",
  publisher: "The Use of English Unit, School of General Studies, University of Nigeria, Nsukka",
  publisherShort: "Use of English Unit, School of General Studies, UNN",
  foundedYear: 2026,
  frequency: "Quarterly: March, June, September and December",
  issn: null,
  eissn: null,
  doiPrefix: null,
  contactEmail: "[JHTS_EMAIL]",
  // From the Call for Papers flyer.
  enquiries: [
    { name: "Associate Professor Virginia Eze", role: "Editor-in-Chief", phone: "+234 (0)803 665 9581" },
    { name: "Professor Chinyere Ngonebu", role: "Assistant Editor", phone: "+234 (0)803 618 6242" },
    { name: "Dr Festus Ngwoke", role: "Book Review Editor", phone: "+234 (0)803 736 7014" },
    { name: "Dr Ifeyinwa David-Ojukwu", role: "Managing Editor", phone: "+234 (0)903 386 6531" },
  ],
  domain: "jhts.unn.edu.ng",
  postalAddress:
    "Use of English Unit, School of General Studies, University of Nigeria, Nsukka 410001, Enugu State, Nigeria [TO CONFIRM]",
  officeHours: "Monday to Friday, 9:00 to 16:00 WAT [TO CONFIRM]",
  licence: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  fees: {
    enabled: true,
    reviewKobo: 500_000,
    publicationKobo: 2_000_000,
    covers: "Review administration, similarity checking, copy-editing, formatting, production and website maintenance.",
  },
  showBoardTerms: false,
  social: [],
  seo: {
    description:
      "JHTS is a peer-reviewed, open-access quarterly journal of the humanities and transcultural studies, published by the Use of English Unit, School of General Studies, University of Nigeria, Nsukka.",
  },
  emailSender: "JHTS Editorial Office <editorial@jhts.unn.edu.ng>",
};

export const featureFlags: FeatureFlags = {
  submissions_open: true,
  fees_enabled: true,
  oai_pmh: false,
  google_sign_in: false,
  home_most_read: true,
  home_book_reviews: true,
};

export const FEATURE_FLAG_DESCRIPTIONS: Record<keyof FeatureFlags, string> = {
  submissions_open: "Authors can start new submissions",
  fees_enabled: "Review and publication fees are charged (fees are subject to approval)",
  oai_pmh: "Expose the OAI-PMH endpoint at /api/oai for indexers",
  google_sign_in: "Offer “Sign in with Google” to authors and reviewers",
  home_most_read: "Show “Most read this month” on the home page",
  home_book_reviews: "Show the latest book reviews on the home page",
};

export const categories: Category[] = [
  {
    id: "c0000000-0000-4000-8000-000000000002",
    name: "Humanities and Social Sciences",
    slug: "humanities-and-social-sciences",
    shortDescription: "Human life, society and the past, studied through the humanities and social sciences.",
    description:
      "Scholarship on human experience, society and the past: history, archaeology, the arts, music, theatre and performance, sociology, anthropology, psychology and related fields. We welcome studies of Nigerian and African societies and comparative work that sets them beside other parts of the world.",
    threadColor: "--thread-humanities",
    sortOrder: 1,
  },
  {
    id: "c0000000-0000-4000-8000-000000000001",
    name: "Language, Literature and Linguistics",
    slug: "language-literature-and-linguistics",
    shortDescription: "Language in use and in structure, and literatures in every form, oral and written.",
    description:
      "Studies of the structure, acquisition, use and change of language, from phonology and syntax to sociolinguistics, discourse analysis and applied linguistics; criticism and scholarship on fiction, poetry, drama, life writing and oral literature; and translation and interpreting as practice and theory. JHTS particularly welcomes work on Nigerian and other African languages and literatures, on Nigerian English and World Englishes, and on multilingual practice.",
    threadColor: "--thread-language",
    sortOrder: 2,
  },
  {
    id: "c0000000-0000-4000-8000-000000000004",
    name: "Communication and Media Studies",
    slug: "communication-and-media-studies",
    shortDescription: "Media, rhetoric and communication in print, broadcast and digital cultures.",
    description:
      "Studies of communication in its social settings: journalism, broadcasting, film, digital and social media, rhetoric, public relations and development communication, including the language and ethics of media in Nigeria and beyond.",
    threadColor: "--thread-communication",
    sortOrder: 3,
  },
  {
    id: "c0000000-0000-4000-8000-000000000007",
    name: "Education and Pedagogy",
    slug: "education-and-pedagogy",
    shortDescription: "Teaching, learning and literacy in their social and institutional settings.",
    description:
      "Research on education as a social practice: language and literacy education, English for academic purposes, the teaching of the general studies curriculum, curriculum and policy, teacher education, assessment, and the place of the humanities in schools and universities.",
    threadColor: "--thread-education",
    sortOrder: 4,
  },
  {
    id: "c0000000-0000-4000-8000-000000000005",
    name: "Technology, Innovation and Digital Cultures",
    slug: "technology-innovation-and-digital-cultures",
    shortDescription: "How digital tools and new technologies change language, culture, learning and society.",
    description:
      "Work on technology as a cultural and social force: digital humanities, computational and corpus approaches, artificial intelligence and language, online communities, digital literacies, e-learning, and innovation in Nigerian and African contexts.",
    threadColor: "--thread-technology",
    sortOrder: 5,
  },
  {
    id: "c0000000-0000-4000-8000-000000000003",
    name: "Culture, Identity and Transcultural Studies",
    slug: "culture-identity-and-transcultural-studies",
    shortDescription: "How ideas, forms and identities travel, meet and change across borders.",
    description:
      "Research on how cultural forms, ideas and identities move across borders and are remade in the process: diaspora, migration, hybridity, popular and material culture, gender, ethnicity, heritage and the politics of representation. This is the journal’s home ground, and interdisciplinary approaches are encouraged.",
    threadColor: "--thread-culture",
    sortOrder: 6,
  },
  {
    id: "c0000000-0000-4000-8000-000000000009",
    name: "Politics, Governance and Development",
    slug: "politics-governance-and-development",
    shortDescription: "Power, public life and development, read through language, culture and society.",
    description:
      "Studies of politics and public life: governance, democracy, policy, law and society, conflict and peace, and development, with attention to the role of language, media and culture in public reason in Nigeria, Africa and beyond.",
    threadColor: "--thread-politics",
    sortOrder: 7,
  },
  {
    id: "c0000000-0000-4000-8000-000000000006",
    name: "Philosophy, Ethics and Religion",
    slug: "philosophy-ethics-and-religion",
    shortDescription: "Ideas, values and belief: African and comparative philosophy, ethics and religion.",
    description:
      "Philosophical, ethical and religious scholarship: African and comparative philosophy, applied and research ethics, religious studies, theology in its cultural setting, and the history of ideas.",
    threadColor: "--thread-philosophy",
    sortOrder: 8,
  },
  {
    id: "c0000000-0000-4000-8000-000000000008",
    name: "Interdisciplinary and Applied Research",
    slug: "interdisciplinary-and-applied-research",
    shortDescription: "Work that crosses disciplines, or applies humanities scholarship to practical problems.",
    description:
      "Research that crosses or sits between the areas above, and applied work that brings the humanities and social sciences to bear on practical problems in communities, institutions and industry. If you are unsure whether your work fits, please contact the editorial office before submitting.",
    threadColor: "--thread-interdisciplinary",
    sortOrder: 9,
  },
];

type SeedBoardMember = { group: BoardGroup; name: string; affiliation: string };

const UNN = "University of Nigeria, Nsukka";

export const board: SeedBoardMember[] = [
  { group: "editor_in_chief", name: "Assoc. Prof. Virginia O. Eze", affiliation: UNN },

  { group: "assistant_editors", name: "Prof. Chinyere L. Ngonebu", affiliation: UNN },
  { group: "assistant_editors", name: "Prof. Laz C. Ogenyi", affiliation: UNN },
  { group: "assistant_editors", name: "Prof. Goodluck C. Kadiri", affiliation: UNN },
  { group: "assistant_editors", name: "Dr Basil O. Nwokolo", affiliation: UNN },
  { group: "assistant_editors", name: "Dr Gertrude N. Ezeh", affiliation: UNN },

  { group: "associate_editors", name: "Prof. Francis Njoku", affiliation: UNN },
  { group: "associate_editors", name: "Prof. Ike Onyeishi", affiliation: UNN },
  { group: "associate_editors", name: "Prof. O. M. Melefa", affiliation: "Federal University, Lokoja" },
  {
    group: "associate_editors",
    name: "Prof. Diffang Funge",
    affiliation: "University of Buea, South West Region, Cameroon",
  },
  { group: "associate_editors", name: "Prof. Danish Suleman", affiliation: "University of Malaysia" },

  { group: "book_review_editors", name: "Dr Festus U. Ngwoke", affiliation: UNN },
  { group: "book_review_editors", name: "Dr Isaiah I. Agbo", affiliation: UNN },
  { group: "book_review_editors", name: "Dr Oluchi C. Okeugo", affiliation: UNN },

  { group: "managing_editors", name: "Dr Ifeyinwa David-Ojukwu", affiliation: UNN },
  { group: "managing_editors", name: "Dr Onyinye B. Udoumoh", affiliation: UNN },

  { group: "journal_consultants", name: "Prof. Benson O. Oluikpe", affiliation: UNN },
  { group: "journal_consultants", name: "Prof. Florence O. Orabueze", affiliation: UNN },
  { group: "journal_consultants", name: "Assoc. Prof. Kingsley O. Ugwuanyi", affiliation: "King's College, London" },
];

/** Board terms are five years; stored for every member, shown only if enabled. */
export const BOARD_TERM = { start: "2026-10-19", end: "2031-10-18" };

export const callForPapers: CallForPapers = {
  title: "Call for Papers: Volume 1, Issue 1",
  targetLabel: "Vol. 1 No. 1 (March 2027)",
  summaryHtml:
    "<p>The Journal of Humanities and Transcultural Studies invites original research articles, theoretical papers, critical reviews and book reviews for its inaugural issue and forthcoming issues. Submissions are welcome across all nine areas of interest of the journal, from language, literature and linguistics to technology, innovation and digital cultures. We are especially interested in work that crosses borders between languages, cultures and disciplines.</p><p>Scholars, researchers, and undergraduate and postgraduate students are all welcome to submit. Every manuscript is screened by the editors, checked for plagiarism and sent for double-blind peer review.</p>",
  bannerText: "Now accepting submissions for the inaugural issue.",
  submissionDeadline: "2027-01-15T23:59:00+01:00",
  reviewPeriod: "January to February 2027 [TO CONFIRM]",
  publicationMonth: "March 2027",
};
