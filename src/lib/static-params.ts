/**
 * With Cache Components every generateStaticParams must return at least one
 * entry, or the build fails. Before the first issue is published (and right
 * after the SAMPLE content is deleted) there are none, so return a
 * placeholder that the page answers with "not found".
 */
export function atLeastOne<T>(params: T[], placeholder: T): T[] {
  return params.length ? params : [placeholder];
}
