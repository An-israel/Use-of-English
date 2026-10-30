/**
 * Seed text for editable pages and policies. Editors change these in the admin;
 * this is only the starting point. Facts the committee must supply are marked
 * [TO CONFIRM]. The Use of English Unit page deliberately contains no invented
 * history.
 */
import type { Page } from "@/lib/types";

const TC = '<mark class="to-confirm">[TO CONFIRM]</mark>';
const SEEDED = "2026-10-30T00:00:00Z";

function page(kind: Page["kind"], slug: string, title: string, summary: string, bodyHtml: string, sortOrder = 0): Page {
  return { kind, slug, title, summary, bodyHtml: bodyHtml.trim(), sortOrder, updatedAt: SEEDED };
}

export const pages: Page[] = [
  page(
    "page",
    "about",
    "About the Journal",
    "A peer-reviewed, open-access quarterly of the humanities and transcultural studies, published from Nsukka.",
    `
<h2>A home for humanities scholarship</h2>
<p>The <em>Journal of Humanities and Transcultural Studies</em> (JHTS) gives scholars a platform for original research across the humanities. It was established in 2026 by the Use of English Unit of the School of General Studies, University of Nigeria, Nsukka (UNN).</p>
<p>“Transcultural” names the journal’s central interest: ideas crossing borders and being woven together. JHTS publishes work on language, literature, culture, communication, translation, philosophy, history, the arts and education, and it especially welcomes scholarship that moves between languages, cultures and disciplines.</p>
<h2>Purpose</h2>
<p>The journal strengthens the research culture of the Use of English Unit. It develops editorial and peer-review skills among lecturers, mentors emerging scholars and encourages work across disciplines. It also raises the visibility of the Unit, the School of General Studies and UNN, and opens partnerships with scholars and institutions in Nigeria and abroad.</p>
<h2>Publisher</h2>
<p>JHTS is published by the Use of English Unit, School of General Studies, University of Nigeria, Nsukka.</p>
<h2>Frequency and format</h2>
<p>JHTS is published quarterly, in March, June, September and December, as an electronic-only journal. Accepted articles may appear online as Articles in Press before their issue is complete.</p>
<h2>Open access</h2>
<p>All JHTS content is freely available to read, download and share immediately on publication, with no charge to readers or their institutions. Articles are published under the Creative Commons Attribution 4.0 International licence (CC BY 4.0) ${TC}, so others may share and adapt the work provided the authors and the journal are credited.</p>
<h2>ISSN and DOI</h2>
<p>The ISSN is in process. Digital Object Identifiers (DOIs) will be assigned to every article once the journal joins Crossref ${TC}.</p>
<h2>Indexing</h2>
<p>Indexing and abstracting services ${TC}.</p>
`,
  ),
  page(
    "page",
    "aims-and-scope",
    "Aims and Scope",
    "Eight subject areas, four article types, and scholars at every stage of their careers.",
    `
<p>JHTS publishes original, unpublished scholarship across the humanities, with a particular interest in work that crosses borders between languages, cultures and disciplines. Every submission is screened by the editors, checked for plagiarism and sent for double-blind peer review.</p>
`,
  ),
  page(
    "page",
    "use-of-english-unit",
    "The Use of English Unit",
    "The home of JHTS within the School of General Studies, University of Nigeria, Nsukka.",
    `
<p>JHTS is published by the Use of English Unit of the School of General Studies at the University of Nigeria, Nsukka.</p>
<h2>The Unit</h2>
<p>History of the Use of English Unit, its founding and its development ${TC}</p>
<p>The Unit’s teaching role: courses taught, number of students served each year and the departments involved ${TC}</p>
<h2>The School of General Studies</h2>
<p>The School of General Studies, its mandate within UNN and its relationship to the Unit ${TC}</p>
<h2>The Unit and the journal</h2>
<p>JHTS strengthens the research culture of the Use of English Unit. It develops editorial and peer-review skills among lecturers, mentors emerging scholars and encourages work across disciplines. It also raises the visibility of the Unit, the School of General Studies and UNN, and opens partnerships with scholars and institutions in Nigeria and abroad.</p>
<p>The Editor-in-Chief serves a five-year term that is separate from the office of the Coordinator of the Use of English Unit.</p>
<h2>Coordinator</h2>
<p>Name and title of the current Coordinator of the Unit ${TC}</p>
`,
  ),
  page(
    "page",
    "author-guidelines",
    "Author Guidelines",
    "How to prepare and submit a manuscript to JHTS.",
    `
<h2>Originality</h2>
<p>Manuscripts must be original and unpublished, and must not be under review elsewhere at the same time.</p>
<h2>Formatting</h2>
<p>Prepare your manuscript in Microsoft Word (.docx), set in Times New Roman, 12 point, double-spaced throughout, with page numbers.</p>
<h2>Referencing</h2>
<p>Use either APA 7th edition or MLA 9th edition, consistently throughout the paper. Tell us which style you used when you submit.</p>
<h2>Recommended structure for research articles</h2>
<ol>
<li>Title page (uploaded as a separate file)</li>
<li>Abstract of 150 to 250 words</li>
<li>Three to six keywords</li>
<li>Introduction</li>
<li>Literature review</li>
<li>Theoretical framework</li>
<li>Methodology</li>
<li>Analysis and discussion</li>
<li>Conclusion</li>
<li>References (APA) or Works Cited (MLA)</li>
</ol>
<p>Theoretical papers and critical reviews may depart from this structure where the argument requires it.</p>
<h2>Length</h2>
<ul>
<li>Research articles and theoretical papers: word limit ${TC}</li>
<li>Critical reviews: word limit ${TC}</li>
<li>Book reviews: word limit ${TC}</li>
</ul>
<h2>Double-blind review</h2>
<p>Review at JHTS is double-blind: reviewers do not know who the authors are, and authors do not know who reviewed their work. Remove all author names, affiliations, acknowledgements and other identifying details from the manuscript file, including from the document properties. Author details go in the submission form and on the separate title page only.</p>
<h2>Book reviews</h2>
<p>Book reviews follow separate guidelines. A review should give the full bibliographic details of the book (author, title, publisher, year, ISBN and number of pages), summarise its argument, assess its contribution and say who will find it useful. Please contact the Book Review Editors before writing an unsolicited review ${TC}.</p>
<h2>The review process</h2>
<p>Screening → plagiarism check → peer review → decision → revisions → acceptance → publication fee → copy-editing and typesetting → publication.</p>
<p>You can follow each stage from your author dashboard, and we will email you whenever the status of your submission changes.</p>
`,
  ),
  page(
    "page",
    "fees-and-payment",
    "Fees and Payment",
    "Two transparent fees, what they cover and how to pay.",
    `
<h2>Payment methods</h2>
<p>Fees are paid securely online through Paystack by card, bank transfer or USSD. JHTS never sees or stores your card details. You receive an emailed receipt and can download it from your dashboard at any time.</p>
<h2>Refunds</h2>
<p>Refund policy ${TC}</p>
<h2>Waivers</h2>
<p>Waivers may be granted at the editors’ discretion.</p>
`,
  ),
  page(
    "page",
    "contact",
    "Contact",
    "Write to the JHTS editorial office.",
    `<p>For questions about submissions, reviews, payments or the journal in general, write to the editorial office using the form on this page. We aim to reply within three working days ${TC}.</p>`,
  ),
];

export const policies: Page[] = [
  page(
    "policy",
    "publication-ethics",
    "Publication Ethics and Malpractice",
    "Our commitments, and what we expect of authors, reviewers and editors.",
    `
<p>JHTS follows the Core Practices of the Committee on Publication Ethics (COPE). This statement sets out the duties of everyone involved in publishing with the journal. ${TC}</p>
<h2>Editors</h2>
<ul>
<li>Judge manuscripts only on their scholarly merit, originality, clarity and relevance to the journal’s scope, without regard to the authors’ race, sex, religion, ethnic origin, citizenship, institution or political views.</li>
<li>Keep submitted manuscripts confidential, sharing them only with reviewers and editorial staff.</li>
<li>Declare conflicts of interest and step aside from any manuscript where one exists.</li>
<li>Never let payment of fees influence an editorial decision.</li>
</ul>
<h2>Reviewers</h2>
<ul>
<li>Review objectively and courteously, giving reasons for their judgements.</li>
<li>Keep manuscripts confidential and never use unpublished material for their own work.</li>
<li>Decline any review where they have a conflict of interest or cannot respond in time.</li>
</ul>
<h2>Authors</h2>
<ul>
<li>Submit only original work that has not been published and is not under review elsewhere.</li>
<li>Cite the work of others accurately and obtain permission for any copyrighted material they reproduce.</li>
<li>List as authors all, and only, those who made a significant contribution.</li>
<li>Disclose funding and any conflicts of interest, and promptly report significant errors they discover in their published work.</li>
</ul>
<h2>Handling misconduct</h2>
<p>Allegations of misconduct, including plagiarism, data fabrication, duplicate submission and citation manipulation, are investigated following COPE flowcharts. Outcomes may include rejection, correction, retraction, or notifying the author’s institution.</p>
`,
    1,
  ),
  page(
    "policy",
    "peer-review",
    "Peer Review Policy",
    "Every research submission receives double-blind review by independent experts.",
    `
<p>JHTS uses double-blind peer review: reviewers do not know the identity of the authors, and authors do not know the identity of the reviewers. ${TC}</p>
<h2>The process</h2>
<ol>
<li><strong>Screening.</strong> The editors check that the manuscript fits the journal’s scope, follows the author guidelines and is properly anonymised.</li>
<li><strong>Plagiarism check.</strong> The manuscript is checked with similarity-detection software (see the Plagiarism and Similarity Checking policy).</li>
<li><strong>Peer review.</strong> The editors invite at least two independent reviewers with expertise in the subject ${TC}. Reviewers are asked to respond within a set period ${TC}.</li>
<li><strong>Decision.</strong> On the basis of the reviews, the editors accept, ask for minor or major revisions, or reject the manuscript, and send the anonymised reviewer comments to the author.</li>
<li><strong>Revisions.</strong> Revised manuscripts may be returned to the original reviewers.</li>
</ol>
<p>The Editor-in-Chief makes the final decision. Book reviews and editorials are reviewed by the editors rather than external reviewers.</p>
<h2>Appeals</h2>
<p>Authors may appeal a decision by writing to the Editor-in-Chief with a clear explanation of their grounds. Appeals are considered by an editor not involved in the original decision ${TC}.</p>
`,
    2,
  ),
  page(
    "policy",
    "authorship",
    "Authorship and Contributorship",
    "Who qualifies as an author, and how contributions are credited.",
    `
<p>Everyone listed as an author must have made a substantial contribution to the conception, design, research, analysis or interpretation of the work; drafted or critically revised it; approved the final version; and agreed to be accountable for it. ${TC}</p>
<ul>
<li>People who contributed in other ways, such as technical help, language editing or general supervision, should be thanked in the acknowledgements on the title page.</li>
<li>The corresponding author confirms that all co-authors have seen and approved the manuscript and agree to its submission.</li>
<li>Changes to the author list after submission require the written agreement of every author and the approval of the editors.</li>
<li>Students who submit work based on a thesis or project should acknowledge their supervisors appropriately.</li>
</ul>
`,
    3,
  ),
  page(
    "policy",
    "conflicts-of-interest",
    "Conflicts of Interest",
    "How authors, reviewers and editors declare competing interests.",
    `
<p>A conflict of interest exists when personal, professional or financial considerations could affect, or appear to affect, someone’s judgement. ${TC}</p>
<ul>
<li><strong>Authors</strong> declare any funding and any relationships that could be seen as influencing their work.</li>
<li><strong>Reviewers</strong> decline to review a manuscript if they recognise the authors’ work and have a close relationship, rivalry or collaboration with them.</li>
<li><strong>Editors</strong> do not handle manuscripts by themselves, their students, close colleagues or relatives. Such manuscripts are handled by another editor, and the editor concerned takes no part in the decision.</li>
</ul>
<p>Submissions from members of the editorial board receive the same double-blind review as any other submission.</p>
`,
    4,
  ),
  page(
    "policy",
    "plagiarism",
    "Plagiarism and Similarity Checking",
    "Every submission is checked for similarity before review.",
    `
<p>Every manuscript is checked with similarity-detection software before peer review ${TC}. The editors read the similarity report; a percentage alone does not decide the outcome.</p>
<ul>
<li>Manuscripts with substantial unattributed overlap with other work are rejected.</li>
<li>Authors may be asked to rewrite or properly cite passages with minor overlap.</li>
<li>Re-using one’s own published text without citation (self-plagiarism) is treated in the same way.</li>
<li>Plagiarism discovered after publication is handled under the Corrections, Retractions and Expressions of Concern policy.</li>
</ul>
<p>The similarity report is kept private to the editors.</p>
`,
    5,
  ),
  page(
    "policy",
    "corrections-and-retractions",
    "Corrections, Retractions and Expressions of Concern",
    "How the published record is kept accurate.",
    `
<p>JHTS keeps the scholarly record accurate, following COPE guidance. ${TC}</p>
<ul>
<li><strong>Corrections</strong> are published when an error affects part of an article but not its overall findings. The article is updated and a linked correction notice is published.</li>
<li><strong>Retractions</strong> are published when the findings are unreliable, or in cases of plagiarism, duplicate publication or other serious misconduct. The retracted article stays online, clearly marked as retracted, with a notice giving the reason.</li>
<li><strong>Expressions of concern</strong> may be published while an investigation is under way.</li>
</ul>
<p>Anyone who finds an error in a published article should write to the editorial office.</p>
`,
    6,
  ),
  page(
    "policy",
    "open-access-and-licensing",
    "Open Access and Licensing",
    "Free to read and share, immediately, under CC BY 4.0.",
    `
<p>JHTS is a fully open-access journal. All articles are free to read, download, copy, distribute and print immediately on publication, with no charge to readers. ${TC}</p>
<p>Articles are published under the <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International licence (CC BY 4.0)</a>. Anyone may share and adapt the work for any purpose, provided they give appropriate credit to the authors and to JHTS, link to the licence and say whether changes were made.</p>
`,
    7,
  ),
  page(
    "policy",
    "copyright",
    "Copyright",
    "Authors keep the copyright in their work.",
    `
<p>Authors who publish with JHTS keep the copyright in their work and grant the journal the right of first publication under the CC BY 4.0 licence. ${TC}</p>
<ul>
<li>Authors may deposit the published version in institutional or subject repositories and share it on personal websites, with a citation to the original publication in JHTS.</li>
<li>Authors are responsible for obtaining permission to reproduce any material, such as images or long quotations, for which they do not hold the copyright.</li>
</ul>
`,
    8,
  ),
  page(
    "policy",
    "digital-preservation",
    "Digital Preservation and Archiving",
    "How JHTS makes sure its articles remain available.",
    `
<p>JHTS is committed to keeping its content permanently available. ${TC}</p>
<ul>
<li>The journal will apply to deposit its content with a dedicated preservation service, such as the PKP Preservation Network or LOCKSS ${TC}.</li>
<li>The database is backed up daily by the hosting provider, and a full export of the database and all published files is made every week to separate storage owned by the journal.</li>
<li>Authors are encouraged to deposit their published articles in their institutional repositories.</li>
</ul>
`,
    9,
  ),
  page(
    "policy",
    "privacy",
    "Privacy Policy",
    "What personal data we collect, why, and your rights.",
    `
<p>This policy explains how JHTS handles personal data, in line with the Nigeria Data Protection Act 2023 ${TC}.</p>
<h2>What we collect</h2>
<ul>
<li><strong>Account details:</strong> your name, email address, affiliation and, optionally, your ORCID iD.</li>
<li><strong>Submission details:</strong> manuscripts, co-author details and correspondence with the editors.</li>
<li><strong>Payment records:</strong> the amount, date, reference and status of each payment. Card details are handled entirely by Paystack and never reach us.</li>
<li><strong>Usage statistics:</strong> anonymous counts of article views and downloads. We store a daily-changing hashed session code, not your IP address.</li>
</ul>
<h2>Why we use it</h2>
<p>We use your data only to run the journal: to manage submissions and peer review, process fees, send you updates about your work and publish accepted articles.</p>
<h2>Cookies</h2>
<p>The site uses only essential cookies needed to keep you signed in. It does not use advertising or tracking cookies.</p>
<h2>Your rights</h2>
<p>You may ask to see, correct or delete your personal data by writing to the editorial office. Published articles and financial records must be kept for the scholarly record and for audit purposes.</p>
<h2>Retention</h2>
<p>How long submission files and records of rejected submissions are kept ${TC}</p>
`,
    10,
  ),
  page(
    "policy",
    "fees-and-refunds",
    "Fees and Refunds",
    "What the fees pay for, when they are due and when they are refunded.",
    `
<p>Fees are subject to approval by the university ${TC}.</p>
<ul>
<li><strong>Review and plagiarism-check fee</strong>, paid at submission.</li>
<li><strong>Publication fee</strong>, paid only after a manuscript has been accepted.</li>
</ul>
<p>The fees cover review administration, similarity checking, copy-editing, formatting, production and website maintenance.</p>
<p><strong>Payment of fees does not guarantee acceptance. All editorial decisions are based solely on scholarly merit.</strong></p>
<h2>Refunds</h2>
<p>Refund policy ${TC}</p>
<h2>Waivers</h2>
<p>Waivers may be granted at the editors’ discretion.</p>
`,
    11,
  ),
];
