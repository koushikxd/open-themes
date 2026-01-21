const THEME_VARIABLES = new Set([
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
  "--radius",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
  "--font-sans",
  "--font-serif",
  "--font-mono",
  "--shadow-2xs",
  "--shadow-xs",
  "--shadow-sm",
  "--shadow",
  "--shadow-md",
  "--shadow-lg",
  "--shadow-xl",
  "--shadow-2xl",
  "--shadow-x",
  "--shadow-y",
  "--shadow-blur",
  "--shadow-spread",
  "--shadow-opacity",
  "--shadow-color",
  "--spacing",
  "--tracking-normal",
]);

const VARIABLE_ORDER = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
  "--font-sans",
  "--font-serif",
  "--font-mono",
  "--radius",
  "--shadow-x",
  "--shadow-y",
  "--shadow-blur",
  "--shadow-spread",
  "--shadow-opacity",
  "--shadow-color",
  "--shadow-2xs",
  "--shadow-xs",
  "--shadow-sm",
  "--shadow",
  "--shadow-md",
  "--shadow-lg",
  "--shadow-xl",
  "--shadow-2xl",
  "--tracking-normal",
  "--spacing",
];

export function extractCssBlock(cssText: string, startIndex: number): string | null {
  const openBrace = cssText.indexOf("{", startIndex);
  if (openBrace === -1) return null;

  let count = 1;
  let i = openBrace + 1;

  while (i < cssText.length && count > 0) {
    if (cssText[i] === "{") count++;
    else if (cssText[i] === "}") count--;
    i++;
  }

  if (count !== 0) return null;
  return cssText.substring(openBrace + 1, i - 1);
}

export function extractVariables(blockContent: string): Map<string, string> {
  const vars = new Map<string, string>();
  const regex = /--([\w-]+)\s*:\s*([\s\S]*?);/g;
  let match;

  while ((match = regex.exec(blockContent)) !== null) {
    const key = `--${match[1]}`;
    const value = match[2].trim().replace(/\s+/g, " ");

    if (!THEME_VARIABLES.has(key)) continue;

    vars.set(key, value);
  }

  return vars;
}

function extractBlocksWithRegex(cssText: string, regex: RegExp): string[] {
  const blocks: string[] = [];
  const matches = [...cssText.matchAll(regex)];

  for (const match of matches) {
    const block = extractCssBlock(cssText, match.index!);
    if (block) blocks.push(block);
  }

  return blocks;
}

export function extractThemeAtRules(cssText: string): string[] {
  const blocks: string[] = [];
  const regex = /@theme(?:\s+inline)?\s*\{/g;
  const matches = [...cssText.matchAll(regex)];

  for (const match of matches) {
    const startIndex = match.index!;
    const openBrace = cssText.indexOf("{", startIndex);
    if (openBrace === -1) continue;

    let count = 1;
    let i = openBrace + 1;

    while (i < cssText.length && count > 0) {
      if (cssText[i] === "{") count++;
      else if (cssText[i] === "}") count--;
      i++;
    }

    if (count === 0) {
      blocks.push(cssText.substring(startIndex, i));
    }
  }

  return blocks;
}

export function extractThemeVariables(cssText: string): {
  light: Map<string, string>;
  dark: Map<string, string>;
  themeBlocks: string[];
} {
  const light = new Map<string, string>();
  const dark = new Map<string, string>();

  const rootRegex = /(?:^|[}\s])(:root)\s*\{/g;
  for (const block of extractBlocksWithRegex(cssText, rootRegex)) {
    const vars = extractVariables(block);
    vars.forEach((value, key) => light.set(key, value));
  }

  const themeVarRegex = /@theme(?:\s+inline)?\s*\{/g;
  for (const block of extractBlocksWithRegex(cssText, themeVarRegex)) {
    const vars = extractVariables(block);
    vars.forEach((value, key) => light.set(key, value));
  }

  const layerBaseRegex = /@layer\s+base\s*\{/g;
  const layerMatches = [...cssText.matchAll(layerBaseRegex)];
  for (const layerMatch of layerMatches) {
    const layerBlock = extractCssBlock(cssText, layerMatch.index!);
    if (layerBlock) {
      const nestedRootRegex = /(?:^|[}\s])(:root)\s*\{/g;
      for (const block of extractBlocksWithRegex(layerBlock, nestedRootRegex)) {
        const vars = extractVariables(block);
        vars.forEach((value, key) => light.set(key, value));
      }
    }
  }

  const darkRegex = /(?:^|[},\s])\.dark\s*\{/g;
  for (const block of extractBlocksWithRegex(cssText, darkRegex)) {
    const vars = extractVariables(block);
    vars.forEach((value, key) => dark.set(key, value));
  }

  const htmlDarkRegex = /html\.dark\s*\{/g;
  for (const block of extractBlocksWithRegex(cssText, htmlDarkRegex)) {
    const vars = extractVariables(block);
    vars.forEach((value, key) => dark.set(key, value));
  }

  const dataThemeRegex = /\[data-theme=["']dark["']\]\s*\{/g;
  for (const block of extractBlocksWithRegex(cssText, dataThemeRegex)) {
    const vars = extractVariables(block);
    vars.forEach((value, key) => dark.set(key, value));
  }

  const darkMediaRegex = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{/g;
  const mediaMatches = [...cssText.matchAll(darkMediaRegex)];
  for (const mediaMatch of mediaMatches) {
    const mediaBlock = extractCssBlock(cssText, mediaMatch.index!);
    if (mediaBlock) {
      const nestedRootRegex = /(?:^|[}\s])(:root)\s*\{/g;
      for (const block of extractBlocksWithRegex(mediaBlock, nestedRootRegex)) {
        const vars = extractVariables(block);
        vars.forEach((value, key) => dark.set(key, value));
      }
    }
  }

  const themeBlocks = extractThemeAtRules(cssText);

  return { light, dark, themeBlocks };
}

function sortVariables(vars: Map<string, string>): [string, string][] {
  const entries = Array.from(vars.entries());

  return entries.sort((a, b) => {
    const aIdx = VARIABLE_ORDER.indexOf(a[0]);
    const bIdx = VARIABLE_ORDER.indexOf(b[0]);

    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;

    return a[0].localeCompare(b[0]);
  });
}

function generateThemeInlineBlock(light: Map<string, string>): string {
  const colorVars = [
    "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
    "primary", "primary-foreground", "secondary", "secondary-foreground",
    "muted", "muted-foreground", "accent", "accent-foreground",
    "destructive", "destructive-foreground", "border", "input", "ring",
    "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
    "sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
    "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring",
  ];

  let block = "@theme inline {\n";

  for (const v of colorVars) {
    if (light.has(`--${v}`)) {
      block += `  --color-${v}: var(--${v});\n`;
    }
  }

  if (light.has("--font-sans")) block += "\n  --font-sans: var(--font-sans);\n";
  if (light.has("--font-mono")) block += "  --font-mono: var(--font-mono);\n";
  if (light.has("--font-serif")) block += "  --font-serif: var(--font-serif);\n";

  if (light.has("--radius")) {
    block += "\n  --radius-sm: calc(var(--radius) - 4px);\n";
    block += "  --radius-md: calc(var(--radius) - 2px);\n";
    block += "  --radius-lg: var(--radius);\n";
    block += "  --radius-xl: calc(var(--radius) + 4px);\n";
  }

  const shadowVars = ["--shadow-2xs", "--shadow-xs", "--shadow-sm", "--shadow", "--shadow-md", "--shadow-lg", "--shadow-xl", "--shadow-2xl"];
  const hasShadows = shadowVars.some((v) => light.has(v));
  if (hasShadows) {
    block += "\n";
    for (const v of shadowVars) {
      if (light.has(v)) {
        const name = v.replace("--", "");
        block += `  --${name}: var(${v});\n`;
      }
    }
  }

  block += "}";
  return block;
}

export function formatOutput(
  light: Map<string, string>,
  dark: Map<string, string>,
  themeBlocks: string[] = []
): string {
  let output = "";

  if (light.size > 0) {
    output += ":root {\n";
    for (const [key, value] of sortVariables(light)) {
      output += `  ${key}: ${value};\n`;
    }
    output += "}\n";
  }

  if (dark.size > 0) {
    if (output) output += "\n";
    output += ".dark {\n";
    for (const [key, value] of sortVariables(dark)) {
      output += `  ${key}: ${value};\n`;
    }
    output += "}\n";
  }

  if (output) output += "\n";

  if (themeBlocks.length > 0) {
    for (const block of themeBlocks) {
      output += block.trim() + "\n";
    }
  } else if (light.size > 0) {
    output += generateThemeInlineBlock(light) + "\n";
  }

  return output;
}
