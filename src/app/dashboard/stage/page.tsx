import { requirePerformer } from "@/lib/auth";
import { publicState } from "@/lib/orders";
import { StageConsole } from "./StageConsole";

export default async function Stage() {
  const { performer: p } = (await requirePerformer())!;
  return <StageConsole slug={p.slug} initial={await publicState(p)} />;
}
