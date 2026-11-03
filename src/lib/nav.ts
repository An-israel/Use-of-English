export type NavLink = { label: string; href: string; description?: string };
export type NavGroup = { id: "journal" | "about" | "authors"; label: string; links: NavLink[] };

export const NAV: NavGroup[] = [
  {
    id: "journal",
    label: "Journal",
    links: [
      { label: "Current Issue", href: "/issues/current", description: "The latest quarterly issue in full" },
      { label: "All Issues", href: "/issues", description: "Every volume and issue, newest first" },
      { label: "Articles in Press", href: "/in-press", description: "Accepted work published ahead of its issue" },
      { label: "Book Reviews", href: "/book-reviews", description: "New books in the humanities, reviewed" },
      {
        label: "Browse by Subject",
        href: "/subjects",
        description: "Nine areas of interest, from the humanities to digital cultures",
      },
    ],
  },
  {
    id: "about",
    label: "About",
    links: [
      { label: "About the Journal", href: "/about", description: "Purpose, publisher and open access" },
      { label: "Aims and Scope", href: "/aims-and-scope", description: "What we publish and who may submit" },
      { label: "Editorial Board", href: "/editorial-board", description: "The editors and consultants of JHTS" },
      {
        label: "The Use of English Unit",
        href: "/use-of-english-unit",
        description: "Our home in the School of General Studies, UNN",
      },
      { label: "Policies", href: "/policies", description: "Ethics, peer review, licensing and privacy" },
    ],
  },
  {
    id: "authors",
    label: "Authors",
    links: [
      { label: "Call for Papers", href: "/call-for-papers", description: "The current call and its deadline" },
      {
        label: "Author Guidelines",
        href: "/author-guidelines",
        description: "Preparing and formatting your manuscript",
      },
      { label: "Fees and Payment", href: "/fees", description: "Two transparent fees and how to pay" },
      { label: "Questions and Timeline", href: "/faq", description: "Common questions and how long review takes" },
      { label: "Submit a Manuscript", href: "/submit", description: "Start a new submission" },
      { label: "Track My Submission", href: "/account", description: "Follow your submission’s progress" },
    ],
  },
];

export const QUICK_LINKS: NavLink[] = [
  { label: "Current Issue", href: "/issues/current" },
  { label: "All Issues", href: "/issues" },
  { label: "Articles in Press", href: "/in-press" },
  { label: "Call for Papers", href: "/call-for-papers" },
  { label: "Author Guidelines", href: "/author-guidelines" },
  { label: "Editorial Board", href: "/editorial-board" },
  { label: "Policies", href: "/policies" },
  { label: "Contact", href: "/contact" },
];
