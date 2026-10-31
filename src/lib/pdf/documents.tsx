import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Document, Image, Page, StyleSheet, Svg, Path, Text, View, renderToBuffer } from "@react-pdf/renderer";

/*
 * Receipts and acceptance letters (brief sections 5.18 and 7.1). Built-in
 * PDF fonts (Times and Helvetica) keep files small and always embeddable.
 */

const C = { ink: "#1C211D", forest: "#14452F", ochre: "#E1B521", stone: "#6A6A5C", line: "#E5DFCD", paper: "#FFFDF7" };

/** The emblem drawn by `npm run brand:generate`, read once. */
let emblem: Buffer | null = null;
function emblemPng() {
  emblem ??= readFileSync(join(process.cwd(), "public/brand/emblem-512.png"));
  return emblem;
}

const s = StyleSheet.create({
  page: { padding: 48, fontFamily: "Times-Roman", fontSize: 11, color: C.ink, backgroundColor: C.paper },
  band: {
    backgroundColor: C.forest,
    marginHorizontal: -48,
    marginTop: -48,
    paddingHorizontal: 48,
    paddingVertical: 22,
    borderBottomWidth: 3,
    borderBottomColor: C.ochre,
    marginBottom: 32,
  },
  mast: { fontFamily: "Times-Bold", fontSize: 24, color: "#FAF7EE" },
  sub: { fontFamily: "Helvetica", fontSize: 7.5, letterSpacing: 1.6, color: "#E9E2C8", marginTop: 4 },
  h1: { fontSize: 20, marginBottom: 6 },
  muted: { color: C.stone, fontFamily: "Helvetica", fontSize: 9 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 7 },
  k: { width: "38%", color: C.stone, fontFamily: "Helvetica", fontSize: 9.5 },
  v: { width: "62%", fontSize: 11 },
  body: { fontSize: 11.5, lineHeight: 1.55, marginBottom: 10 },
  foot: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 36,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 10,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: C.stone,
    lineHeight: 1.5,
  },
});

const PUBLISHER = "The Use of English Unit, School of General Studies, University of Nigeria, Nsukka";
const STATEMENT =
  "Payment of fees does not guarantee acceptance. All editorial decisions are based solely on scholarly merit.";

function Masthead() {
  return (
    <View style={[s.band, { flexDirection: "row", alignItems: "center" }]}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
      <Image src={{ data: emblemPng(), format: "png" }} style={{ width: 46, height: 46, marginRight: 14 }} />
      <View>
        <Text style={s.mast}>JHTS</Text>
        <Text style={s.sub}>JOURNAL OF HUMANITIES AND TRANSCULTURAL STUDIES</Text>
      </View>
    </View>
  );
}

function Lozenge() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" style={{ marginVertical: 14 }}>
      <Path d="M7 0 14 7 7 14 0 7Z" fill={C.ochre} />
    </Svg>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <View style={{ marginTop: 18 }}>
      {rows.map(([k, v]) => (
        <View key={k} style={s.row}>
          <Text style={s.k}>{k}</Text>
          <Text style={s.v}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

export type ReceiptData = {
  receiptNumber: string;
  payer: string;
  payerEmail: string;
  feeLabel: string;
  amount: string;
  date: string;
  reference: string;
  channel: string | null;
  publicId: string;
  title: string;
  testMode: boolean;
};

export function renderReceipt(d: ReceiptData) {
  return renderToBuffer(
    <Document title={`JHTS receipt ${d.receiptNumber}`} author="JHTS" subject="Payment receipt">
      <Page size="A4" style={s.page}>
        <Masthead />
        {d.testMode && (
          <Text style={{ color: "#B4472B", fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 10 }}>
            TEST MODE: NOT A REAL PAYMENT
          </Text>
        )}
        <Text style={s.h1}>Payment receipt</Text>
        <Text style={s.muted}>Receipt number {d.receiptNumber}</Text>
        <Rows
          rows={[
            ["Received from", `${d.payer} (${d.payerEmail})`],
            ["Fee", d.feeLabel],
            ["Amount", d.amount],
            ["Date paid", d.date],
            ["Paystack reference", d.reference],
            ["Payment method", d.channel ? d.channel.replace("_", " ") : "Paystack"],
            ["Submission ID", d.publicId],
            ["Manuscript", d.title],
          ]}
        />
        <Lozenge />
        <Text style={s.body}>{STATEMENT}</Text>
        <Text style={s.foot}>
          {PUBLISHER}
          {"\n"}This receipt was generated electronically and is valid without a signature.
        </Text>
      </Page>
    </Document>,
  );
}

export type LetterData = {
  date: string;
  authorName: string;
  coAuthors: string[];
  title: string;
  publicId: string;
  articleType: string;
  editorName: string;
  feeLine: string;
};

export function renderAcceptanceLetter(d: LetterData) {
  return renderToBuffer(
    <Document title={`JHTS acceptance ${d.publicId}`} author="JHTS" subject="Letter of acceptance">
      <Page size="A4" style={s.page}>
        <Masthead />
        <Text style={[s.muted, { marginBottom: 18 }]}>{d.date}</Text>
        <Text style={s.body}>Dear {d.authorName},</Text>
        <Text style={s.h1}>Letter of acceptance</Text>
        <Text style={[s.muted, { marginBottom: 14 }]}>Submission {d.publicId}</Text>
        <Text style={s.body}>
          On behalf of the editorial board, I am pleased to confirm that your {d.articleType.toLowerCase()} “{d.title}”
          {d.coAuthors.length ? `, co-authored with ${d.coAuthors.join(", ")},` : ""} has been accepted for publication
          in the Journal of Humanities and Transcultural Studies after double-blind peer review.
        </Text>
        <Text style={s.body}>{d.feeLine}</Text>
        <Text style={s.body}>
          The manuscript will now be copy-edited and typeset. It will be published online as an Article in Press and
          then assigned to a forthcoming issue. You will be notified when it is published.
        </Text>
        <Text style={s.body}>Thank you for choosing JHTS for your work.</Text>
        <Lozenge />
        <Text style={s.body}>Yours sincerely,</Text>
        <Text style={[s.body, { fontFamily: "Times-Bold", marginBottom: 2 }]}>{d.editorName}</Text>
        <Text style={s.muted}>Editor-in-Chief, Journal of Humanities and Transcultural Studies</Text>
        <Text style={s.foot}>
          {PUBLISHER}
          {"\n"}This letter was generated electronically. Its authenticity can be confirmed with the editorial office
          using the submission ID.
        </Text>
      </Page>
    </Document>,
  );
}

const t = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: C.ink,
    backgroundColor: C.paper,
  },
  h1: { fontFamily: "Times-Roman", fontSize: 18, marginBottom: 4 },
  h2: { fontFamily: "Times-Roman", fontSize: 13, marginTop: 18, marginBottom: 6 },
  muted: { color: C.stone, fontSize: 8.5 },
  tiles: { flexDirection: "row", marginTop: 14, gap: 8 },
  tile: { flexGrow: 1, flexBasis: 0, borderWidth: 1, borderColor: C.line, padding: 8 },
  tileK: { color: C.stone, fontSize: 7, letterSpacing: 1 },
  tileV: { fontFamily: "Times-Roman", fontSize: 14, marginTop: 3 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 4 },
  th: { color: C.stone, fontSize: 7, letterSpacing: 0.8 },
  num: { textAlign: "right" },
});

type Col = { label: string; width: string; num?: boolean };

function Table({ cols, rows }: { cols: Col[]; rows: string[][] }) {
  return (
    <View>
      <View style={t.tr} fixed>
        {cols.map((c) => (
          <Text key={c.label} style={[t.th, { width: c.width }, c.num ? t.num : {}]}>
            {c.label.toUpperCase()}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={t.tr} wrap={false}>
          {r.map((v, j) => (
            <Text key={j} style={[{ width: cols[j].width, paddingRight: 4 }, cols[j].num ? t.num : {}]}>
              {v}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function ReportFoot({ generated, testMode }: { generated: string; testMode: boolean }) {
  return (
    <Text
      fixed
      style={{ position: "absolute", left: 40, right: 40, bottom: 26, fontSize: 7, color: C.stone }}
      render={({ pageNumber, totalPages }) =>
        `${PUBLISHER} · Generated ${generated}${testMode ? " · TEST MODE: not real payments" : ""} · Page ${pageNumber} of ${totalPages}`
      }
    />
  );
}

export type Tile = [label: string, value: string];

export type PaymentsReportData = {
  title: string;
  filters: string;
  generated: string;
  testMode: boolean;
  tiles: Tile[];
  byMonth: string[][];
  byFee: string[][];
  rows: string[][];
  truncated: number;
};

/** Payments report (brief section 7.3): totals by month and fee type, then the ledger. Landscape A4. */
export function renderPaymentsReport(d: PaymentsReportData) {
  return renderToBuffer(
    <Document title={d.title} author="JHTS" subject="Payments report">
      <Page size="A4" orientation="landscape" style={t.page}>
        <Text style={t.h1}>{d.title}</Text>
        <Text style={t.muted}>{d.filters}</Text>
        <View style={t.tiles}>
          {d.tiles.map(([k, v]) => (
            <View key={k} style={t.tile}>
              <Text style={t.tileK}>{k.toUpperCase()}</Text>
              <Text style={t.tileV}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 24 }}>
          <View style={{ flexGrow: 3, flexBasis: 0 }}>
            <Text style={t.h2}>By month</Text>
            <Table
              cols={[
                { label: "Month", width: "28%" },
                { label: "Payments", width: "14%", num: true },
                { label: "Collected", width: "20%", num: true },
                { label: "Refunded", width: "18%", num: true },
                { label: "Net", width: "20%", num: true },
              ]}
              rows={d.byMonth}
            />
          </View>
          <View style={{ flexGrow: 2, flexBasis: 0 }}>
            <Text style={t.h2}>By fee type</Text>
            <Table
              cols={[
                { label: "Fee", width: "34%" },
                { label: "Paid", width: "14%", num: true },
                { label: "Net", width: "30%", num: true },
                { label: "Waived", width: "22%", num: true },
              ]}
              rows={d.byFee}
            />
          </View>
        </View>
        <Text style={t.h2}>Payments</Text>
        <Table
          cols={[
            { label: "Reference", width: "17%" },
            { label: "Date", width: "10%" },
            { label: "Fee", width: "11%" },
            { label: "Status", width: "8%" },
            { label: "Submission", width: "11%" },
            { label: "Payer", width: "17%" },
            { label: "Amount", width: "9%", num: true },
            { label: "Refunded", width: "8%", num: true },
            { label: "Net", width: "9%", num: true },
          ]}
          rows={d.rows}
        />
        {d.truncated > 0 && (
          <Text style={[t.muted, { marginTop: 8 }]}>
            {d.truncated} more payments are in the totals but not listed; export CSV for every row.
          </Text>
        )}
        <ReportFoot generated={d.generated} testMode={d.testMode} />
      </Page>
    </Document>,
  );
}

export type FundStatementData = {
  generated: string;
  testMode: boolean;
  tiles: Tile[];
  years: string[][];
  byFee: string[][];
};

/** The fund statement for transparency: collected, refunds and net, by year. */
export function renderFundStatement(d: FundStatementData) {
  return renderToBuffer(
    <Document title="JHTS fund statement" author="JHTS" subject="Fund statement">
      <Page size="A4" style={s.page}>
        <Masthead />
        <Text style={s.h1}>Fund statement</Text>
        <Text style={s.muted}>
          Review and publication fees received through Paystack, refunds and net, as of {d.generated}.
        </Text>
        <View style={t.tiles}>
          {d.tiles.map(([k, v]) => (
            <View key={k} style={t.tile}>
              <Text style={t.tileK}>{k.toUpperCase()}</Text>
              <Text style={t.tileV}>{v}</Text>
            </View>
          ))}
        </View>
        <Text style={t.h2}>By year</Text>
        <View style={{ fontFamily: "Helvetica", fontSize: 9 }}>
          <Table
            cols={[
              { label: "Year", width: "16%" },
              { label: "Payments", width: "14%", num: true },
              { label: "Collected", width: "20%", num: true },
              { label: "Refunds", width: "18%", num: true },
              { label: "Net", width: "20%", num: true },
              { label: "Waived", width: "12%", num: true },
            ]}
            rows={d.years}
          />
          <Text style={t.h2}>By fee type</Text>
          <Table
            cols={[
              { label: "Fee", width: "40%" },
              { label: "Payments", width: "20%", num: true },
              { label: "Net", width: "25%", num: true },
              { label: "Waived", width: "15%", num: true },
            ]}
            rows={d.byFee}
          />
        </View>
        <Lozenge />
        <Text style={s.body}>
          Fees cover review administration, similarity checking, copy-editing, production and website maintenance.{" "}
          {STATEMENT}
        </Text>
        <Text style={s.foot}>
          {PUBLISHER}
          {d.testMode ? "\nTEST MODE: these are not real payments." : ""}
        </Text>
      </Page>
    </Document>,
  );
}
