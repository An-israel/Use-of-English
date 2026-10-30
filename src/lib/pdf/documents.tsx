import "server-only";
import { Document, Page, StyleSheet, Svg, Path, Text, View, renderToBuffer } from "@react-pdf/renderer";

/*
 * Receipts and acceptance letters (brief sections 5.18 and 7.1). Built-in
 * PDF fonts (Times and Helvetica) keep files small and always embeddable.
 */

const C = { ink: "#15130F", forest: "#0F3B2E", ochre: "#C8962E", stone: "#6F675C", line: "#E4DCCD", paper: "#FFFDF8" };

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
  mast: { fontFamily: "Times-Bold", fontSize: 24, color: "#F1E8D6" },
  sub: { fontFamily: "Helvetica", fontSize: 7.5, letterSpacing: 1.6, color: "#E9DCC0", marginTop: 4 },
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
    <View style={s.band}>
      <Text style={s.mast}>JHTS</Text>
      <Text style={s.sub}>JOURNAL OF HUMANITIES AND TRANSCULTURAL STUDIES</Text>
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
