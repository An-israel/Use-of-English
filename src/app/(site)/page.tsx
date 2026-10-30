import { BoardStrip } from "@/components/home/BoardStrip";
import { CfpBanner } from "@/components/home/CfpBanner";
import { CurrentIssueFeature } from "@/components/home/CurrentIssueFeature";
import { Hero } from "@/components/home/Hero";
import { InPressRail } from "@/components/home/InPressRail";
import { MostReadAndReviews } from "@/components/home/MostReadAndReviews";
import { SubjectTiles } from "@/components/home/SubjectTiles";
import { WhyPublish } from "@/components/home/WhyPublish";
import {
  getBoard,
  getBookReviews,
  getCallForPapers,
  getCategories,
  getCategoryCounts,
  getCurrentIssue,
  getFlags,
  getInPress,
  getMostRead,
  getSettings,
} from "@/lib/data";
import { siteUrl } from "@/lib/env";

export default async function HomePage() {
  const [settings, flags, cfp, current, inPress, categories, counts, mostRead, reviews, board] = await Promise.all([
    getSettings(),
    getFlags(),
    getCallForPapers(),
    getCurrentIssue(),
    getInPress(),
    getCategories(),
    getCategoryCounts(),
    getMostRead(5),
    getBookReviews(3),
    getBoard(),
  ]);
  const byslug = new Map(categories.map((c) => [c.slug, c]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Periodical",
    name: settings.journalName,
    alternateName: settings.shortName,
    url: siteUrl,
    description: settings.seo.description,
    ...(settings.issn ? { issn: settings.issn } : {}),
    publisher: { "@type": "Organization", name: settings.publisher },
    inLanguage: "en",
    isAccessibleForFree: true,
    license: settings.licence.url,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Hero settings={settings} cfp={cfp} current={current} submissionsOpen={flags.submissions_open} />
      {current && <CurrentIssueFeature issue={current} categories={byslug} />}
      <InPressRail articles={inPress} categories={byslug} />
      <SubjectTiles categories={categories} counts={counts} />
      <MostReadAndReviews
        mostRead={flags.home_most_read ? mostRead : []}
        reviews={flags.home_book_reviews ? reviews : []}
      />
      <WhyPublish />
      {cfp && flags.submissions_open && <CfpBanner cfp={cfp} />}
      <BoardStrip board={board} />
    </>
  );
}
