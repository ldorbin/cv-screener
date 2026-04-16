import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { JobSpec, Cv, Score } from "@/types";
import { DIMENSION_LABELS } from "@/types";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  h2: { fontSize: 14, fontWeight: 700, marginTop: 16, marginBottom: 6 },
  h3: { fontSize: 11, fontWeight: 700, marginTop: 8, marginBottom: 4, color: "#334155" },
  muted: { color: "#64748b" },
  badge: {
    padding: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 9,
    color: "#fff",
    alignSelf: "flex-start",
  },
  row: { flexDirection: "row", gap: 8 },
  card: {
    border: "1pt solid #e2e8f0",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  dimRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  scoreBig: { fontSize: 36, fontWeight: 700, color: "#4f46e5" },
  bullet: { marginLeft: 8, marginBottom: 2 },
});

function verdictColor(v: string) {
  if (v === "strong-match") return "#059669";
  if (v === "potential-match") return "#d97706";
  return "#64748b";
}

interface Props {
  job: JobSpec;
  entries: Array<{ cv: Cv; score: Score | null }>;
}

export function ScoringReport({ job, entries }: Props) {
  const scored = entries
    .filter((e) => e.score)
    .sort((a, b) => (b.score!.overall_score - a.score!.overall_score));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{job.title}</Text>
        <Text style={styles.muted}>{job.company ?? "—"}</Text>
        <Text style={[styles.muted, { marginTop: 4 }]}>
          {entries.length} CVs · {scored.length} scored
        </Text>

        <Text style={styles.h2}>Ranked candidates</Text>
        {scored.map(({ cv, score }) => {
          const r = score!.result;
          return (
            <View style={styles.card} key={cv.id} wrap={false}>
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <Text style={{ fontWeight: 700, fontSize: 12 }}>
                  {cv.candidate_name ?? cv.file_name ?? "Candidate"}
                </Text>
                <Text style={styles.scoreBig}>{score!.overall_score}</Text>
              </View>
              <View style={styles.row}>
                <Text
                  style={[
                    styles.badge,
                    { backgroundColor: verdictColor(score!.verdict) },
                  ]}
                >
                  {score!.verdict}
                </Text>
                <Text style={[styles.muted, { marginLeft: 6 }]}>
                  confidence: {score!.confidence}
                </Text>
              </View>

              <Text style={styles.h3}>Dimensions</Text>
              {Object.entries(r.dimensions).map(([k, d]) => (
                <View key={k} style={styles.dimRow}>
                  <Text>{DIMENSION_LABELS[k as keyof typeof DIMENSION_LABELS]}</Text>
                  <Text>{d.score}</Text>
                </View>
              ))}

              <Text style={styles.h3}>Summary</Text>
              <Text>{r.summary}</Text>

              {r.strengths.length > 0 && (
                <>
                  <Text style={styles.h3}>Strengths</Text>
                  {r.strengths.map((s, i) => (
                    <Text key={i} style={styles.bullet}>
                      • {s}
                    </Text>
                  ))}
                </>
              )}

              {r.gaps.length > 0 && (
                <>
                  <Text style={styles.h3}>Gaps</Text>
                  {r.gaps.map((s, i) => (
                    <Text key={i} style={styles.bullet}>
                      • {s}
                    </Text>
                  ))}
                </>
              )}

              {r.interviewProbes.length > 0 && (
                <>
                  <Text style={styles.h3}>Interview probes</Text>
                  {r.interviewProbes.map((s, i) => (
                    <Text key={i} style={styles.bullet}>
                      • {s}
                    </Text>
                  ))}
                </>
              )}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

export async function renderScoringPdf(
  job: JobSpec,
  entries: Array<{ cv: Cv; score: Score | null }>,
): Promise<Buffer> {
  return renderToBuffer(<ScoringReport job={job} entries={entries} />);
}
