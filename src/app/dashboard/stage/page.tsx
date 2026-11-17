import { requirePerformer } from "@/lib/auth";
import { publicState } from "@/lib/orders";
import { StageConsole } from "./StageConsole";
import { kindBySlug } from "@/lib/kinds";

export default async function Stage() {
  const { performer: p } = (await requirePerformer())!;
  const k = kindBySlug(p.kind);
  return <StageConsole slug={p.slug} initial={await publicState(p)} modes={k.modes} defaultMode={k.defaultMode} />;
}
