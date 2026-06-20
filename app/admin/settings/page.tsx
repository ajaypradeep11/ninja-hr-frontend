export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/queries";
import { SettingsView } from "./settings-view";

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsView initial={settings} />;
}
