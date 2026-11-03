export type ArticleType = "research_article" | "theoretical_paper" | "critical_review" | "book_review" | "editorial";

export const ARTICLE_TYPE_LABEL: Record<ArticleType, string> = {
  research_article: "Research Article",
  theoretical_paper: "Theoretical Paper",
  critical_review: "Critical Review",
  book_review: "Book Review",
  editorial: "Editorial",
};

export type CitationStyle = "apa7" | "mla9";

export type BoardGroup =
  | "editor_in_chief"
  | "assistant_editors"
  | "associate_editors"
  | "book_review_editors"
  | "managing_editors"
  | "journal_consultants";

export const BOARD_GROUP_LABEL: Record<BoardGroup, string> = {
  editor_in_chief: "Editor-in-Chief",
  assistant_editors: "Assistant Editors",
  associate_editors: "Associate Editors",
  book_review_editors: "Book Review Editors",
  managing_editors: "Managing Editors",
  journal_consultants: "Journal Consultants",
};

export const BOARD_GROUP_ORDER: BoardGroup[] = [
  "editor_in_chief",
  "assistant_editors",
  "associate_editors",
  "book_review_editors",
  "managing_editors",
  "journal_consultants",
];

export type Category = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  /** CSS custom property name, e.g. "--thread-language" */
  threadColor: string;
  sortOrder: number;
};

export type BoardMember = {
  id: string;
  group: BoardGroup;
  name: string;
  title: string | null;
  affiliation: string | null;
  photoUrl: string | null;
  orcid: string | null;
  profileUrl: string | null;
  termStart: string | null;
  termEnd: string | null;
  sortOrder: number;
};

export type Author = {
  name: string;
  affiliation: string | null;
  orcid: string | null;
  isCorresponding: boolean;
  email?: string | null;
};

export type IssueSummary = {
  id: string;
  volume: number;
  year: number;
  number: number;
  month: number;
  title: string | null;
  coverUrl: string | null;
  publishedAt: string | null;
  isSample: boolean;
};

export type Issue = IssueSummary & {
  editorialHtml: string | null;
  fullPdfUrl: string | null;
  fullDocxUrl: string | null;
};

export type ArticleSummary = {
  id: string;
  slug: string;
  type: ArticleType;
  title: string;
  authors: Author[];
  categorySlug: string | null;
  firstPage: number | null;
  lastPage: number | null;
  doi: string | null;
  onlineAt: string | null;
  publishedAt: string | null;
  issue: Pick<IssueSummary, "volume" | "number" | "month" | "year"> | null;
  abstract: string;
  hasPdf: boolean;
  hasDocx: boolean;
  /** Public CDN address of the PDF, for the in-page reader (downloads go through the counted route). */
  pdfUrl: string | null;
  viewCount: number;
  downloadCount: number;
  isSample: boolean;
};

export type Article = ArticleSummary & {
  keywords: string[];
  bodyHtml: string | null;
  citationStyle: CitationStyle | null;
  licence: string;
  receivedAt: string | null;
  acceptedAt: string | null;
  status: "in_press" | "published";
  bookReview: BookDetails | null;
};

export type BookDetails = {
  bookTitle: string;
  bookAuthor: string;
  publisher: string | null;
  year: number | null;
  isbn: string | null;
  pages: number | null;
  coverUrl: string | null;
};

export type Page = {
  kind: "page" | "policy";
  slug: string;
  title: string;
  summary: string | null;
  bodyHtml: string;
  sortOrder: number;
  updatedAt: string;
};

export type CallForPapers = {
  title: string;
  targetLabel: string;
  summaryHtml: string;
  bannerText: string;
  submissionDeadline: string;
  reviewPeriod: string | null;
  publicationMonth: string | null;
};

export type SiteSettings = {
  journalName: string;
  shortName: string;
  tagline: string;
  /** The journal's motto, from its logo: "Knowledge · Cultures · Global Voices". */
  motto: string;
  publisher: string;
  publisherShort: string;
  foundedYear: number;
  frequency: string;
  issn: string | null;
  eissn: string | null;
  doiPrefix: string | null;
  contactEmail: string;
  /** People to contact with enquiries, as on the Call for Papers flyer. */
  enquiries: { name: string; role: string; phone: string }[];
  domain: string;
  postalAddress: string;
  officeHours: string;
  licence: { name: string; url: string };
  fees: {
    enabled: boolean;
    reviewKobo: number;
    publicationKobo: number;
    covers: string;
  };
  showBoardTerms: boolean;
  social: { label: string; url: string }[];
  seo: { description: string };
  emailSender: string;
};

export type FeatureFlags = {
  submissions_open: boolean;
  fees_enabled: boolean;
  oai_pmh: boolean;
  google_sign_in: boolean;
  home_most_read: boolean;
  home_book_reviews: boolean;
};
