-- I5: reviewer guidelines, generative AI, complaints and appeals, and the FAQ
-- with the editorial timeline. Inserted once; editors change them in the admin.
insert into public.pages (id, kind, slug, title, summary, body_html, sort_order) values ('12b4363c-f68f-50f1-b6f5-4b6daa1e05bb', 'page', 'faq', 'Questions and Timeline', 'Answers to common questions, and how long each stage usually takes.', '<h2>How long does it take?</h2>
<p>Typical times for each stage <mark class="to-confirm">[TO CONFIRM]</mark>:</p>
<ul>
<li><strong>Screening and plagiarism check:</strong> about <mark class="to-confirm">[TO CONFIRM]</mark> after submission and payment of the review fee.</li>
<li><strong>Peer review:</strong> about <mark class="to-confirm">[TO CONFIRM]</mark>.</li>
<li><strong>Decision:</strong> sent soon after the reviews are in.</li>
<li><strong>Revisions:</strong> authors are usually given <mark class="to-confirm">[TO CONFIRM]</mark> for minor and <mark class="to-confirm">[TO CONFIRM]</mark> for major revisions.</li>
<li><strong>Publication:</strong> accepted articles appear online as Articles in Press, then in the next quarterly issue (March, June, September or December).</li>
</ul>
<h2>Who can submit?</h2>
<p>Scholars, researchers, and undergraduate and postgraduate students, from Nigeria and anywhere else. You do not need to be at the University of Nigeria.</p>
<h2>What can I submit?</h2>
<p>Original research articles, theoretical papers, critical reviews and book reviews in any of the journal’s nine areas of interest. See the Aims and Scope.</p>
<h2>Is there a template?</h2>
<p>Yes: download the <a href="/templates/JHTS-manuscript-template.docx">JHTS manuscript template</a> (Word). It is set up in Times New Roman 12 point, double-spaced, with page numbers and the recommended headings.</p>
<h2>What does it cost?</h2>
<p>A review fee at submission and a publication fee only if your manuscript is accepted. See Fees and Payment. Payment of fees does not guarantee acceptance.</p>
<h2>Can I follow my submission?</h2>
<p>Yes. Your author dashboard shows each stage, and we email you whenever the status changes.</p>
<h2>What if I disagree with a decision?</h2>
<p>You may appeal. See the Complaints and Appeals policy.</p>', 0) on conflict (kind, slug) do nothing;
insert into public.pages (id, kind, slug, title, summary, body_html, sort_order) values ('a6f8411a-382e-5f73-8b2d-e73b8dac9659', 'policy', 'reviewer-guidelines', 'Guidelines for Reviewers', 'What we ask of reviewers, and how to write a useful report.', '<p>Peer reviewers are the heart of JHTS. These guidelines follow the COPE Ethical Guidelines for Peer Reviewers.</p>
<h2>Before you accept</h2>
<ul>
<li>Accept only if the manuscript is within your expertise and you can return the report by the due date shown in the invitation.</li>
<li>Decline, and tell the editors, if you have a conflict of interest: for example, you think you know who the authors are, you work closely with them, or you are writing on the same question.</li>
<li>If you need more time, ask the editors before the due date.</li>
</ul>
<h2>Confidentiality</h2>
<p>Treat the manuscript as confidential. Do not share it, discuss it with others or use its ideas or data before publication. Do not try to identify the authors. Do not upload the manuscript, or any part of it, to generative AI tools (see the policy on generative AI).</p>
<h2>Writing the report</h2>
<ol>
<li><strong>Summary.</strong> In a few sentences, say what the manuscript argues and what it contributes.</li>
<li><strong>Strengths.</strong> What does the work do well?</li>
<li><strong>Major points.</strong> Problems with the argument, method, evidence or use of the literature that must be addressed.</li>
<li><strong>Minor points.</strong> Clarity, structure, referencing (APA 7th or MLA 9th) and language.</li>
<li><strong>Recommendation.</strong> Accept, minor revisions, major revisions or reject.</li>
</ol>
<p>Be specific, constructive and courteous: write as you would wish to be reviewed. Comments to the authors are shared with them anonymously; confidential comments are seen by the editors only.</p>
<h2>Timing and recognition</h2>
<p>Reviews are due within the period stated in the invitation <mark class="to-confirm">[TO CONFIRM]</mark>. You will receive reminders before and after the due date. Recognition for reviewers <mark class="to-confirm">[TO CONFIRM]</mark>.</p>', 12) on conflict (kind, slug) do nothing;
insert into public.pages (id, kind, slug, title, summary, body_html, sort_order) values ('a6955617-570c-5e68-a109-bfbfb40f4c02', 'policy', 'generative-ai', 'Generative AI in Writing and Reviewing', 'How authors, reviewers and editors may and may not use AI tools.', '<p>JHTS follows the COPE position on authorship and AI tools. <mark class="to-confirm">[TO CONFIRM]</mark></p>
<h2>Authors</h2>
<ul>
<li>AI tools cannot be authors: they cannot take responsibility for the work, approve the final version or answer for its integrity.</li>
<li>If you used a generative AI tool in the research or writing (beyond basic spelling and grammar checking), say so in the Methodology or in a note, naming the tool and how it was used.</li>
<li>You are responsible for everything in your manuscript, including checking any AI-assisted text, translation or references for accuracy and for plagiarism.</li>
<li>Fabricated references, data or quotations are research misconduct, whatever their source.</li>
</ul>
<h2>Reviewers</h2>
<p>Manuscripts under review are confidential. Reviewers must not upload a manuscript, or any part of it, to a generative AI tool, and must not use such tools to write their reports.</p>
<h2>Editors</h2>
<p>Editors do not upload submissions to generative AI tools and do not use them to make editorial decisions. Similarity checking is done with the journal’s plagiarism-detection service.</p>', 13) on conflict (kind, slug) do nothing;
insert into public.pages (id, kind, slug, title, summary, body_html, sort_order) values ('f0d8a30b-9cc1-502e-8b13-1b84b4a7f8b3', 'policy', 'complaints-and-appeals', 'Complaints and Appeals', 'How to appeal a decision or complain about the journal, and what happens next.', '<p>JHTS handles complaints and appeals following COPE guidance. We take every complaint seriously and will not treat you differently for making one.</p>
<h2>Appealing an editorial decision</h2>
<ol>
<li>Write to the Editor-in-Chief within <mark class="to-confirm">[TO CONFIRM]</mark> of the decision, using the contact page and quoting your submission ID (for example JHTS-2027-0042).</li>
<li>Explain clearly why you think the decision should be reconsidered, responding to the reviewers’ and editors’ comments point by point. New evidence or a clear error in the review is a stronger ground than disagreement alone.</li>
<li>The appeal is considered by an editor who was not involved in the original decision, who may seek a further review.</li>
<li>We aim to reply within <mark class="to-confirm">[TO CONFIRM]</mark>. The outcome of an appeal is final.</li>
</ol>
<h2>Complaints</h2>
<p>Complaints about the journal’s processes, delays, conduct of editors or reviewers, or published content can be made through the contact page. Complaints about possible misconduct in published work are handled under the Publication Ethics and the Corrections and Retractions policies.</p>
<p>If you are not satisfied with how your complaint was handled, you may take it to <mark class="to-confirm">[TO CONFIRM]</mark>.</p>', 14) on conflict (kind, slug) do nothing;

-- Link the template from the Author Guidelines, and name the nine areas on the
-- About page, where the launch wording is unchanged.
update public.pages set body_html = replace(body_html,
    'double-spaced throughout, with page numbers.</p>',
    'double-spaced throughout, with page numbers. The <a href="/templates/JHTS-manuscript-template.docx">JHTS manuscript template</a> is set up this way.</p>')
  where kind = 'page' and slug = 'author-guidelines' and body_html not like '%manuscript-template%';
update public.pages set body_html = replace(body_html,
    'JHTS publishes work on language, literature, culture, communication, translation, philosophy, history, the arts and education, and it especially welcomes',
    'JHTS publishes work across nine areas of interest, from language, literature and linguistics to culture and identity, communication and media, education, technology and digital cultures, politics and governance, and philosophy, ethics and religion, and it especially welcomes')
  where kind = 'page' and slug = 'about';
update public.pages set body_html = replace(body_html,
    '<p>You may ask to see, correct or delete your personal data by writing to the editorial office. Published articles and financial records must be kept for the scholarly record and for audit purposes.</p>',
    '<p>You can download a copy of your data, correct your profile or delete your account yourself from My account, or write to the editorial office. Published articles, submitted manuscripts, reviews and financial records must be kept for the scholarly record and for audit purposes; when you delete your account, your name and contact details are removed from them.</p>')
  where kind = 'policy' and slug = 'privacy';
