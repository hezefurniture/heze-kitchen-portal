import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./db";

export const UI_THEMES = ["classic", "modern"] as const;
export type UiTheme = (typeof UI_THEMES)[number];

export function isUiTheme(value: unknown): value is UiTheme {
  return typeof value === "string" && (UI_THEMES as readonly string[]).includes(value);
}

export interface UiThemeState {
  defaultTheme: UiTheme;
  userTheme: UiTheme | null;
  effective: UiTheme;
}

export async function getUiThemeState(): Promise<UiThemeState> {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    const [settings, user] = await Promise.all([
      prisma.appSettings.findUnique({ where: { id: "singleton" }, select: { defaultUiTheme: true } }),
      userId ? prisma.user.findUnique({ where: { id: userId }, select: { uiTheme: true } }) : null,
    ]);
    const defaultTheme = isUiTheme(settings?.defaultUiTheme) ? settings!.defaultUiTheme as UiTheme : "classic";
    const userTheme = isUiTheme(user?.uiTheme) ? (user!.uiTheme as UiTheme) : null;
    return { defaultTheme, userTheme, effective: userTheme ?? defaultTheme };
  } catch {
    // The look must never take the app down (e.g. database briefly unavailable).
    return { defaultTheme: "classic", userTheme: null, effective: "classic" };
  }
}
