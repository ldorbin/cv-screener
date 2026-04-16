import { Badge } from "@/components/ui/badge";
import type { Verdict } from "@/types";

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (verdict === "strong-match") {
    return <Badge variant="success">Strong match</Badge>;
  }
  if (verdict === "potential-match") {
    return <Badge variant="warning">Potential match</Badge>;
  }
  return <Badge variant="muted">Weak match</Badge>;
}
