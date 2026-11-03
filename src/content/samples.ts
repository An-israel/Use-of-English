/**
 * SAMPLE content so the design can be judged with realistic material.
 * Every author, affiliation and article here is fictional and flagged
 * is_sample. Remove before launch with `npm run samples:delete`.
 */
import type { ArticleType, CitationStyle } from "@/lib/types";

export type SampleAuthor = { name: string; affiliation: string; orcid?: string; corresponding?: boolean };

export type SampleArticle = {
  slug: string;
  type: ArticleType;
  category: string;
  title: string;
  authors: SampleAuthor[];
  abstract: string;
  keywords: string[];
  pages?: [number, number];
  citationStyle: CitationStyle;
  views: number;
  downloads: number;
  book?: { title: string; author: string; publisher: string; year: number; isbn: string; pages: number };
  bodyHtml?: string;
};

export type SampleIssue = {
  volume: number;
  year: number;
  number: number;
  month: number;
  publishedAt: string;
  editorial: string;
  articles: SampleArticle[];
};

const S = " (SAMPLE)";
const dept = (d: string) => `${d}, Sample University${S}`;

const editorial = (lead: string) =>
  `<p>${lead}</p><p>As always, every article in this issue was screened by the editors, checked for similarity and read by two independent reviewers under double-blind conditions. We thank our reviewers for their generous and careful work, and we invite readers to respond to these essays, in these pages or elsewhere.</p><p class="signature">Editor-in-Chief</p>`;

export const sampleIssues: SampleIssue[] = [
  {
    volume: 1,
    year: 2027,
    number: 1,
    month: 3,
    publishedAt: "2027-03-28T09:00:00Z",
    editorial: editorial(
      "This inaugural issue sets out the journal’s concerns: language as it is lived in Nigerian classrooms and markets, literature that crosses borders, and the habits of translation that make a shared intellectual life possible. The four articles collected here differ in method, but each asks how meaning travels and what it carries with it.",
    ),
    articles: [
      {
        slug: "code-switching-and-authority-in-nsukka-classrooms",
        type: "research_article",
        category: "education-and-pedagogy",
        title: "Code-Switching and Classroom Authority in Nsukka Secondary Schools",
        authors: [
          {
            name: "Adaeze N. Okafor",
            affiliation: dept("Department of Linguistics"),
            orcid: "0000-0002-1825-0097",
            corresponding: true,
          },
          { name: "Tobenna Eze", affiliation: dept("Department of Education") },
        ],
        abstract:
          "Teachers in Nigerian secondary schools routinely move between English and Igbo, yet official policy treats such switching as a lapse. Drawing on forty hours of recorded lessons in four Nsukka schools, this study examines when and why teachers switch codes. The analysis shows that switches into Igbo cluster around discipline, encouragement and the explanation of difficult concepts, while English marks assessment and formal instruction. Rather than undermining authority, code-switching lets teachers manage the classroom on two registers at once. The article argues for language policies that recognise this practice as a pedagogical resource.",
        keywords: ["code-switching", "Igbo", "classroom discourse", "language policy", "Nigerian English"],
        pages: [1, 22],
        citationStyle: "apa7",
        views: 1840,
        downloads: 612,
        bodyHtml: `<p class="lede">Walk past any secondary school classroom in Nsukka and you are likely to hear two languages. A teacher explains photosynthesis in English, then turns to a restless row at the back and switches, without pause, into Igbo. Official policy treats such moments as lapses. This article argues that they are something closer to a method.</p>
<h2>Background</h2>
<p>Nigeria’s National Policy on Education makes English the medium of instruction from the upper primary years onwards, while encouraging the use of the language of the immediate environment in the early years.<span class="sidenote-ref">1</span><span class="sidenote" data-n="1">SAMPLE note. The policy has been revised several times; the provisions on language have changed little in substance.</span> In practice, the line between the two is crossed constantly, and research on Nigerian classrooms has long documented this movement between languages.</p>
<p>Most earlier studies describe code-switching as a response to comprehension problems: teachers switch when students do not understand. That account is accurate but incomplete. It does not explain why switches cluster at particular moments that have little to do with difficulty, such as reprimands, jokes and praise.</p>
<h2>Method</h2>
<p>We recorded forty hours of lessons in four schools, two public and two private, across Junior and Senior Secondary classes. Each switch was coded for its direction, its length and its function in the lesson.<span class="sidenote-ref">2</span><span class="sidenote" data-n="2">SAMPLE note. Consent was obtained from schools, teachers and parents; student names were removed at transcription.</span></p>
<table>
<caption>Table 1. Functions of switches into Igbo (SAMPLE data)</caption>
<thead><tr><th scope="col">Function</th><th scope="col">Switches</th><th scope="col">Share</th></tr></thead>
<tbody>
<tr><td>Discipline and classroom management</td><td>412</td><td>38%</td></tr>
<tr><td>Explaining a difficult concept</td><td>301</td><td>28%</td></tr>
<tr><td>Encouragement and praise</td><td>214</td><td>20%</td></tr>
<tr><td>Humour and asides</td><td>152</td><td>14%</td></tr>
</tbody>
</table>
<h2>Findings</h2>
<h3>Two registers of authority</h3>
<p>English, in these classrooms, is the language of the syllabus and the examination. Igbo is the language of relationship. When a teacher moves into Igbo to call a student to order, the switch does not weaken their authority; it changes its kind, from institutional to personal.</p>
<blockquote>“When I speak Igbo to them, they know I am not reading from the scheme of work. They know it is me talking.” (Teacher, public school, SAMPLE)</blockquote>
<h3>Switching back</h3>
<p>Just as telling are the moments of return. Teachers almost always switch back into English to restate a point formally, often in words close to the textbook’s. The return marks what will be examined.</p>
<h2>Conclusion</h2>
<p>Code-switching in these classrooms is neither a failure of policy nor a simple aid to comprehension. It allows teachers to manage the classroom on two registers at once. Language policy would serve teachers better by recognising this practice and training them to use it deliberately.</p>`,
      },
      {
        slug: "the-weaver-and-the-word-akwete-cloth-in-igbo-poetry",
        type: "critical_review",
        category: "language-literature-and-linguistics",
        title: "The Weaver and the Word: Akwete Cloth as Metaphor in Modern Igbo Poetry",
        authors: [
          {
            name: "Chiamaka R. Obi",
            affiliation: dept("Department of English and Literary Studies"),
            corresponding: true,
          },
        ],
        abstract:
          "Akwete cloth, woven by women in south-eastern Nigeria, recurs in modern Igbo poetry as an image of memory, labour and continuity. This review traces the motif through the work of several poets writing in Igbo and English since the 1970s, reading the loom as a figure for composition itself. It argues that the weaving metaphor allows poets to claim a feminine, communal model of authorship against the solitary genius of the Romantic tradition.",
        keywords: ["Igbo poetry", "Akwete", "metaphor", "authorship", "material culture"],
        pages: [23, 41],
        citationStyle: "mla9",
        views: 1205,
        downloads: 388,
      },
      {
        slug: "translating-proverbs-loss-and-gain",
        type: "research_article",
        category: "language-literature-and-linguistics",
        title: "Loss and Gain in Translating Igbo Proverbs into English",
        authors: [
          { name: "Emeka J. Nwosu", affiliation: dept("Department of Foreign Languages"), corresponding: true },
          { name: "Halima Bello", affiliation: dept("Department of Translation Studies") },
          { name: "Grace O. Adeyemi", affiliation: dept("Centre for Language Studies") },
        ],
        abstract:
          "Proverbs are among the hardest items to translate, because their force depends on shared cultural knowledge. Using a corpus of 120 Igbo proverbs and their published English translations, this study classifies the strategies translators use, from literal rendering to substitution with an English proverb. Literal translation preserves imagery but often loses the proverb’s pragmatic point, while substitution keeps the point and sacrifices the culture. The article proposes a combined strategy of literal rendering with a brief gloss, and tests it with student readers.",
        keywords: ["translation", "proverbs", "Igbo", "equivalence", "paremiology"],
        pages: [42, 63],
        citationStyle: "apa7",
        views: 970,
        downloads: 301,
      },
      {
        slug: "radio-call-in-programmes-and-public-reason",
        type: "theoretical_paper",
        category: "politics-governance-and-development",
        title: "Radio Call-In Programmes and the Making of Public Reason in Nigeria",
        authors: [
          { name: "Ibrahim K. Musa", affiliation: dept("Department of Mass Communication"), corresponding: true },
        ],
        abstract:
          "Call-in programmes on Nigerian radio give ordinary listeners a rare public platform. This paper develops a theoretical account of these programmes as sites of public reason, drawing on Habermas and on African theories of communal deliberation. It argues that the genre’s conventions, the greeting, the testimony and the presenter’s summing-up, create a distinctive form of reasoned exchange that the idealised public sphere does not capture.",
        keywords: ["radio", "public sphere", "deliberation", "call-in programmes"],
        pages: [64, 80],
        citationStyle: "apa7",
        views: 640,
        downloads: 201,
      },
    ],
  },
  {
    volume: 1,
    year: 2027,
    number: 2,
    month: 6,
    publishedAt: "2027-06-27T09:00:00Z",
    editorial: editorial(
      "Our second issue turns to the past and to the ways it is retold: in oral history, in museum catalogues and in the philosophy we teach our students. The contributors share a conviction that the humanities must account for the archives they rely on.",
    ),
    articles: [
      {
        slug: "oral-history-and-the-nigerian-civil-war-archive",
        type: "research_article",
        category: "humanities-and-social-sciences",
        title: "Oral Testimony and the Nigerian Civil War Archive",
        authors: [
          {
            name: "Ngozi P. Uche",
            affiliation: dept("Department of History and International Studies"),
            corresponding: true,
          },
        ],
        abstract:
          "Official archives of the Nigerian Civil War remain incomplete, and much of what is known survives in family memory. This article analyses thirty oral testimonies collected in Enugu and Anambra States to show how survivors narrate displacement, hunger and return. It argues that oral testimony is not merely a supplement to written records but an archive with its own forms and silences, and it proposes protocols for its ethical use in historical writing.",
        keywords: ["oral history", "civil war", "memory", "archives", "Nigeria"],
        pages: [1, 24],
        citationStyle: "mla9",
        views: 1510,
        downloads: 540,
      },
      {
        slug: "ubuntu-and-the-ethics-of-scholarly-collaboration",
        type: "theoretical_paper",
        category: "philosophy-ethics-and-religion",
        title: "Ubuntu and the Ethics of Scholarly Collaboration",
        authors: [
          { name: "Samuel A. Okonkwo", affiliation: dept("Department of Philosophy"), corresponding: true },
          { name: "Thandiwe M. Dlamini", affiliation: dept("School of Humanities") },
        ],
        abstract:
          "Academic collaboration is usually governed by rules of credit borrowed from the sciences. This paper asks what an ethics of collaboration grounded in Ubuntu, the southern African idea that a person is a person through other persons, would require of humanities scholars. It argues for practices of shared authorship, mentoring and citation that recognise intellectual work as communal without erasing individual contribution.",
        keywords: ["Ubuntu", "ethics", "collaboration", "authorship", "African philosophy"],
        pages: [25, 44],
        citationStyle: "apa7",
        views: 880,
        downloads: 260,
      },
      {
        slug: "museum-labels-and-the-language-of-restitution",
        type: "research_article",
        category: "culture-identity-and-transcultural-studies",
        title: "Museum Labels and the Language of Restitution",
        authors: [
          { name: "Kelechi Anyanwu", affiliation: dept("Department of Fine and Applied Arts"), corresponding: true },
        ],
        abstract:
          "As European museums return looted Benin bronzes, the labels beside the objects have begun to change. This study compares labels from six museums before and after 2020, using critical discourse analysis to trace shifts in agency, voice and tense. It finds that while newer labels name the 1897 expedition as a looting, many still present the objects through the eyes of their collectors. The article suggests principles for co-authored labels.",
        keywords: ["restitution", "museums", "discourse analysis", "Benin bronzes"],
        pages: [45, 66],
        citationStyle: "apa7",
        views: 1320,
        downloads: 415,
      },
      {
        slug: "general-studies-english-and-student-voice",
        type: "research_article",
        category: "education-and-pedagogy",
        title: "Student Voice in the General Studies English Classroom",
        authors: [
          { name: "Blessing C. Nnamdi", affiliation: dept("School of General Studies"), corresponding: true },
          { name: "Uchenna D. Ike", affiliation: dept("Department of Arts Education") },
        ],
        abstract:
          "Use of English courses reach every first-year student, yet students rarely shape how they are taught. Through focus groups with 64 students and interviews with eight lecturers, this study explores how students experience the course and what they would change. Students value the course’s practical aims but describe large classes as silencing. The article recommends small-group writing workshops and peer review as ways to restore student voice.",
        keywords: ["general studies", "academic writing", "student voice", "higher education"],
        pages: [67, 85],
        citationStyle: "apa7",
        views: 1105,
        downloads: 489,
      },
    ],
  },
  {
    volume: 1,
    year: 2027,
    number: 3,
    month: 9,
    publishedAt: "2027-09-26T09:00:00Z",
    editorial: editorial(
      "This issue gathers work on the screen and the page: Nollywood’s multilingual audiences, the novel of migration and the new forms of reading that phones have made possible. It closes with our first book review.",
    ),
    articles: [
      {
        slug: "subtitles-and-multilingual-audiences-in-nollywood",
        type: "research_article",
        category: "communication-and-media-studies",
        title: "Subtitles and Multilingual Audiences in Nollywood",
        authors: [
          {
            name: "Funmilayo O. Adebayo",
            affiliation: dept("Department of Theatre and Film Studies"),
            corresponding: true,
          },
        ],
        abstract:
          "Nollywood films increasingly circulate with English subtitles on streaming platforms, reaching viewers who do not speak the languages on screen. This study compares subtitled and original versions of twelve Yoruba- and Igbo-language films to show how subtitling flattens proverbs, honorifics and humour. It argues that subtitles are a site of cultural negotiation and calls for subtitling practices that keep more of the source culture visible.",
        keywords: ["Nollywood", "subtitling", "audiovisual translation", "streaming"],
        pages: [1, 19],
        citationStyle: "apa7",
        views: 1720,
        downloads: 530,
      },
      {
        slug: "the-novel-of-return-in-nigerian-diaspora-fiction",
        type: "critical_review",
        category: "culture-identity-and-transcultural-studies",
        title: "Coming Home Changed: The Novel of Return in Nigerian Diaspora Fiction",
        authors: [
          {
            name: "Ijeoma S. Chukwu",
            affiliation: dept("Department of English and Literary Studies"),
            corresponding: true,
          },
        ],
        abstract:
          "A growing body of Nigerian fiction follows characters who return home after years abroad. This review reads five such novels published since 2009 and identifies the conventions of the ‘novel of return’: the airport arrival, the misrecognised accent and the family that has moved on. It argues that these novels use return to examine what the nation expects of its diaspora.",
        keywords: ["diaspora", "return", "Nigerian fiction", "migration"],
        pages: [20, 37],
        citationStyle: "mla9",
        views: 1480,
        downloads: 466,
      },
      {
        slug: "reading-on-phones-among-undergraduates",
        type: "research_article",
        category: "technology-innovation-and-digital-cultures",
        title: "Reading on Phones: Undergraduate Reading Habits in a Mobile Age",
        authors: [
          {
            name: "Chinedu P. Okeke",
            affiliation: dept("Department of Library and Information Science"),
            corresponding: true,
          },
          { name: "Amina Yusuf", affiliation: dept("Department of English") },
        ],
        abstract:
          "Most Nigerian undergraduates now read set texts on their phones. A survey of 410 students and reading diaries kept by 30 of them reveal how mobile reading shapes attention, annotation and recall. Students read more often but in shorter sessions, and rarely annotate. The study proposes reading tasks designed for mobile readers and argues that libraries should license texts for phone use.",
        keywords: ["reading habits", "mobile learning", "undergraduates", "literacy"],
        pages: [38, 57],
        citationStyle: "apa7",
        views: 990,
        downloads: 310,
      },
      {
        slug: "review-of-languages-of-the-market",
        type: "book_review",
        category: "language-literature-and-linguistics",
        title: "Review of Languages of the Market: Trade Talk in West Africa",
        authors: [{ name: "Daniel O. Agu", affiliation: dept("Department of Linguistics"), corresponding: true }],
        abstract:
          "A review of a study of the multilingual talk of West African markets, which combines fieldwork in Onitsha, Kano and Accra with an accessible account of how traders build trust across languages.",
        keywords: ["book review", "markets", "multilingualism", "West Africa"],
        pages: [58, 61],
        citationStyle: "apa7",
        views: 420,
        downloads: 98,
        book: {
          title: "Languages of the Market: Trade Talk in West Africa (SAMPLE)",
          author: "R. A. Sample",
          publisher: "Sample Academic Press",
          year: 2026,
          isbn: "978-0-00-000000-1",
          pages: 248,
        },
      },
    ],
  },
  {
    volume: 1,
    year: 2027,
    number: 4,
    month: 12,
    publishedAt: "2027-12-19T09:00:00Z",
    editorial: editorial(
      "The December issue closes our first volume with essays on festival, performance and the sacred, and on the words we use for them in more than one language.",
    ),
    articles: [
      {
        slug: "masquerade-performance-and-the-urban-crowd",
        type: "research_article",
        category: "culture-identity-and-transcultural-studies",
        title: "Masquerade Performance and the Urban Crowd",
        authors: [{ name: "Obinna T. Nweke", affiliation: dept("Department of Theatre Arts"), corresponding: true }],
        abstract:
          "Masquerades once performed in village squares now process through crowded city streets, filmed on dozens of phones. Drawing on fieldwork at festivals in Enugu and Nsukka, this article examines how urban audiences reshape masquerade performance, from route and timing to costume. It argues that the masquerade has adapted to the city by becoming a spectacle of circulation, both on the street and online.",
        keywords: ["masquerade", "performance", "festival", "urban culture"],
        pages: [1, 21],
        citationStyle: "mla9",
        views: 1260,
        downloads: 402,
      },
      {
        slug: "translating-the-sacred-bible-translation-in-igbo",
        type: "research_article",
        category: "philosophy-ethics-and-religion",
        title: "Translating the Sacred: Key Terms in Igbo Bible Translation",
        authors: [
          {
            name: "Peter C. Odo",
            affiliation: dept("Department of Religion and Cultural Studies"),
            corresponding: true,
          },
          { name: "Mary-Jane Ezike", affiliation: dept("Department of Linguistics") },
        ],
        abstract:
          "Translators of the Bible into Igbo have had to choose words for God, spirit and sin from a religious vocabulary with its own history. This study compares key terms across three Igbo Bible translations and shows how each choice negotiates between indigenous religious meaning and missionary theology. It concludes that these terms have reshaped both Igbo Christianity and the Igbo language.",
        keywords: ["Bible translation", "Igbo", "religious language", "lexical choice"],
        pages: [22, 43],
        citationStyle: "apa7",
        views: 1010,
        downloads: 333,
      },
      {
        slug: "highlife-lyrics-and-the-poetics-of-advice",
        type: "critical_review",
        category: "humanities-and-social-sciences",
        title: "Highlife Lyrics and the Poetics of Advice",
        authors: [{ name: "Ebuka Nnaji", affiliation: dept("Department of Music"), corresponding: true }],
        abstract:
          "Highlife songs often speak in the voice of an elder giving advice. This review surveys the advisory mode in Igbo highlife from the 1960s to the present, reading lyrics as moral philosophy set to music. It argues that the genre’s proverbs, warnings and blessings make it an important and neglected archive of popular ethics.",
        keywords: ["highlife", "music", "lyrics", "popular ethics"],
        pages: [44, 59],
        citationStyle: "mla9",
        views: 780,
        downloads: 199,
      },
      {
        slug: "review-of-the-translators-house",
        type: "book_review",
        category: "language-literature-and-linguistics",
        title: "Review of The Translator’s House: Essays on Language and Belonging",
        authors: [{ name: "Ruth A. Okoro", affiliation: dept("Department of Foreign Languages"), corresponding: true }],
        abstract:
          "A review of a collection of essays by working translators on the homes, real and imagined, that translation builds between languages.",
        keywords: ["book review", "translation", "essays", "belonging"],
        pages: [60, 63],
        citationStyle: "apa7",
        views: 360,
        downloads: 77,
        book: {
          title: "The Translator’s House: Essays on Language and Belonging (SAMPLE)",
          author: "M. B. Sample (ed.)",
          publisher: "Sample University Press",
          year: 2027,
          isbn: "978-0-00-000000-2",
          pages: 312,
        },
      },
    ],
  },
  {
    volume: 2,
    year: 2028,
    number: 1,
    month: 3,
    publishedAt: "2028-03-26T09:00:00Z",
    editorial: editorial(
      "We open our second volume with a special focus on language in public life: on signboards, in parliament, and in the slogans that circulate on social media. The essays show how much of politics is conducted in the choice between languages.",
    ),
    articles: [
      {
        slug: "linguistic-landscape-of-enugu-signboards",
        type: "research_article",
        category: "language-literature-and-linguistics",
        title: "The Linguistic Landscape of Enugu: Signboards, Prestige and Play",
        authors: [
          {
            name: "Nkechi L. Okoli",
            affiliation: dept("Department of Linguistics"),
            orcid: "0000-0001-5109-3700",
            corresponding: true,
          },
          { name: "Yusuf A. Danjuma", affiliation: dept("Department of Languages") },
        ],
        abstract:
          "Shop signs, billboards and posters make language visible in the city. This study photographs and analyses 1,200 signs in three districts of Enugu to map the use of English, Igbo, Nigerian Pidgin and other languages. English dominates official and commercial signs, but Igbo and Pidgin appear in playful and intimate registers, particularly in names and slogans. The article argues that the linguistic landscape shows a division of labour between languages rather than simple English dominance.",
        keywords: ["linguistic landscape", "Enugu", "multilingualism", "Nigerian Pidgin", "signage"],
        pages: [1, 24],
        citationStyle: "apa7",
        views: 1980,
        downloads: 701,
      },
      {
        slug: "hashtags-and-the-grammar-of-protest",
        type: "research_article",
        category: "technology-innovation-and-digital-cultures",
        title: "Hashtags and the Grammar of Protest",
        authors: [
          { name: "Zainab O. Lawal", affiliation: dept("Department of Mass Communication"), corresponding: true },
        ],
        abstract:
          "Hashtags compress political claims into a few words. Analysing 50,000 posts from three Nigerian protest movements, this study describes the grammar of protest hashtags: their imperatives, their pronouns and their code-mixing. It shows how hashtags build collective identity and argues that their brevity is a resource for mobilisation rather than a limit on argument.",
        keywords: ["hashtags", "social media", "protest", "discourse"],
        pages: [25, 44],
        citationStyle: "apa7",
        views: 1650,
        downloads: 520,
      },
      {
        slug: "multilingualism-in-the-national-assembly",
        type: "theoretical_paper",
        category: "politics-governance-and-development",
        title: "Rethinking Multilingualism in the National Assembly",
        authors: [
          { name: "Oluwaseun T. Bakare", affiliation: dept("Department of Political Science"), corresponding: true },
        ],
        abstract:
          "Nigeria’s constitution allows legislators to speak Hausa, Igbo or Yoruba, but English remains the language of the National Assembly. This paper reads parliamentary records alongside theories of linguistic justice to ask what a genuinely multilingual legislature would require. It proposes a model of interpreted debate that treats language rights as part of political representation.",
        keywords: ["linguistic justice", "parliament", "language rights", "representation"],
        pages: [45, 62],
        citationStyle: "apa7",
        views: 870,
        downloads: 244,
      },
      {
        slug: "review-of-writing-in-two-tongues",
        type: "book_review",
        category: "language-literature-and-linguistics",
        title: "Review of Writing in Two Tongues: Bilingual African Authors",
        authors: [
          {
            name: "Ifeoma G. Nwachukwu",
            affiliation: dept("Department of English and Literary Studies"),
            corresponding: true,
          },
        ],
        abstract:
          "A review of a lucid study of African writers who publish in two languages, with chapters on self-translation and on the economics of publishing in African languages.",
        keywords: ["book review", "bilingualism", "African literature", "self-translation"],
        pages: [63, 66],
        citationStyle: "mla9",
        views: 510,
        downloads: 140,
        book: {
          title: "Writing in Two Tongues: Bilingual African Authors (SAMPLE)",
          author: "K. C. Sample",
          publisher: "Sample Academic Press",
          year: 2027,
          isbn: "978-0-00-000000-3",
          pages: 276,
        },
      },
    ],
  },
];

/** Accepted, paid and formatted articles published online ahead of their issue. */
export const sampleInPress: (SampleArticle & { onlineAt: string })[] = [
  {
    slug: "pidgin-news-and-the-reach-of-radio",
    type: "research_article",
    category: "communication-and-media-studies",
    title: "Pidgin News Bulletins and the Reach of Public Radio",
    authors: [{ name: "Efe M. Oghene", affiliation: dept("Department of Mass Communication"), corresponding: true }],
    abstract:
      "Public radio stations increasingly broadcast news in Nigerian Pidgin. Combining listener surveys in Warri and Benin City with analysis of bulletin scripts, this study asks whether Pidgin news reaches audiences that English news does not. It finds that Pidgin bulletins significantly widen reach among market traders and artisans, and that listeners judge them as trustworthy as English bulletins.",
    keywords: ["Nigerian Pidgin", "radio news", "audiences", "public broadcasting"],
    citationStyle: "apa7",
    views: 320,
    downloads: 88,
    onlineAt: "2028-04-14T09:00:00Z",
  },
  {
    slug: "achebe-and-the-ethics-of-translation",
    type: "critical_review",
    category: "language-literature-and-linguistics",
    title: "Achebe’s English and the Ethics of Translation",
    authors: [
      { name: "Chukwudi E. Onu", affiliation: dept("Department of English and Literary Studies"), corresponding: true },
      { name: "Sarah L. Bennett", affiliation: dept("School of Modern Languages") },
    ],
    abstract:
      "Chinua Achebe described his English as ‘a new English, still in full communion with its ancestral home but altered to suit its new African surroundings’. This review reads that claim as an ethics of translation and traces its influence on later Nigerian writers and on translation studies.",
    keywords: ["Achebe", "translation", "African English", "postcolonial literature"],
    citationStyle: "mla9",
    views: 610,
    downloads: 175,
    onlineAt: "2028-04-28T09:00:00Z",
  },
  {
    slug: "indigenous-knowledge-in-the-humanities-curriculum",
    type: "theoretical_paper",
    category: "interdisciplinary-and-applied-research",
    title: "Indigenous Knowledge in the Humanities Curriculum",
    authors: [{ name: "Ada U. Okwuosa", affiliation: dept("Department of Arts Education"), corresponding: true }],
    abstract:
      "Calls to decolonise the curriculum often stall at the question of what should be taught instead. This paper proposes a framework for bringing indigenous knowledge into humanities courses without reducing it to folklore, using examples from language, history and philosophy teaching in Nigerian universities.",
    keywords: ["decolonisation", "curriculum", "indigenous knowledge", "higher education"],
    citationStyle: "apa7",
    views: 190,
    downloads: 41,
    onlineAt: "2028-05-09T09:00:00Z",
  },
];
