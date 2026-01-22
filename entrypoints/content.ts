import { extractThemeVariables, formatOutput } from "./utils/css-parser";

const THEME_VARIABLES = new Set([
  "--background", "--foreground", "--card", "--card-foreground",
  "--popover", "--popover-foreground", "--primary", "--primary-foreground",
  "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
  "--accent", "--accent-foreground", "--destructive", "--destructive-foreground",
  "--border", "--input", "--ring", "--radius",
  "--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5",
  "--sidebar", "--sidebar-foreground", "--sidebar-primary", "--sidebar-primary-foreground",
  "--sidebar-accent", "--sidebar-accent-foreground", "--sidebar-border", "--sidebar-ring",
  "--font-sans", "--font-serif", "--font-mono",
  "--shadow-2xs", "--shadow-xs", "--shadow-sm", "--shadow", "--shadow-md",
  "--shadow-lg", "--shadow-xl", "--shadow-2xl",
  "--shadow-x", "--shadow-y", "--shadow-blur", "--shadow-spread", "--shadow-opacity", "--shadow-color",
  "--spacing", "--tracking-normal",
]);

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === "extract_theme") {
        extractTheme().then(sendResponse);
        return true;
      }
      if (message.action === "check_site_info") {
        checkSiteInfo().then(sendResponse);
        return true;
      }
    });
  },
});

function extractComputedVariables(): { light: Map<string, string>; dark: Map<string, string> } {
  const light = new Map<string, string>();
  const dark = new Map<string, string>();

  const root = document.documentElement;
  const styles = getComputedStyle(root);

  for (let i = 0; i < styles.length; i++) {
    const name = styles[i];
    if (THEME_VARIABLES.has(name)) {
      const value = styles.getPropertyValue(name).trim();
      if (value) light.set(name, value);
    }
  }

  const darkElement = document.querySelector(".dark") || document.querySelector('[data-theme="dark"]');
  if (darkElement) {
    const darkStyles = getComputedStyle(darkElement);
    for (let i = 0; i < darkStyles.length; i++) {
      const name = darkStyles[i];
      if (THEME_VARIABLES.has(name)) {
        const value = darkStyles.getPropertyValue(name).trim();
        if (value && value !== light.get(name)) {
          dark.set(name, value);
        }
      }
    }
  }

  return { light, dark };
}

function detectTailwind(): boolean {
  const html = document.documentElement.outerHTML;
  const scripts = Array.from(document.querySelectorAll("script"));
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  
  if (scripts.some(s => s.src.includes("tailwind") || s.textContent?.includes("tailwind"))) {
    return true;
  }
  
  if (links.some(l => (l as HTMLLinkElement).href.includes("tailwind"))) {
    return true;
  }
  
  const bodyClasses = document.body.className;
  const tailwindUtilities = [
    /\bflex\b/, /\bgrid\b/, /\bhidden\b/, /\bblock\b/,
    /\bp-\d/, /\bm-\d/, /\bw-\d/, /\bh-\d/,
    /\btext-\w+/, /\bbg-\w+/, /\bborder-\w+/,
    /\brounded/, /\bshadow/, /\bhover:/
  ];
  
  const allElements = document.querySelectorAll("*");
  let tailwindClassCount = 0;
  
  for (let i = 0; i < Math.min(allElements.length, 100); i++) {
    const el = allElements[i];
    const classes = el.className;
    if (typeof classes === "string") {
      for (const pattern of tailwindUtilities) {
        if (pattern.test(classes)) {
          tailwindClassCount++;
          if (tailwindClassCount >= 5) return true;
        }
      }
    }
  }
  
  return false;
}

async function checkSiteInfo() {
  const hasTailwind = detectTailwind();
  
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  let themeVarCount = 0;
  
  for (let i = 0; i < styles.length; i++) {
    const name = styles[i];
    if (THEME_VARIABLES.has(name)) {
      themeVarCount++;
    }
  }
  
  const canExtract = hasTailwind && themeVarCount > 0;
  
  return {
    hasTailwind,
    canExtract,
    stats: {
      themeVarCount,
    }
  };
}

async function extractTheme() {
  const logs: string[] = [];
  let allCss = "";

  const styleTags = document.querySelectorAll("style");
  logs.push(`Found ${styleTags.length} inline style tags`);
  styleTags.forEach((style) => {
    allCss += style.textContent || "";
  });

  const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
  logs.push(`Found ${linkTags.length} linked stylesheets`);

  for (const link of Array.from(linkTags)) {
    const href = (link as HTMLLinkElement).href;
    if (!href) continue;

    try {
      const response = await browser.runtime.sendMessage({
        action: "fetch_css",
        url: href,
      });
      if (response.success) {
        allCss += response.css;
      } else {
        logs.push(`Failed to fetch: ${href}`);
      }
    } catch (err) {
      logs.push(`Error fetching: ${href}`);
    }
  }

  const { light, dark, themeBlocks } = extractThemeVariables(allCss);
  logs.push(`Extracted ${light.size} light mode variables from CSS`);
  logs.push(`Extracted ${dark.size} dark mode variables from CSS`);

  if (light.size === 0) {
    logs.push("Falling back to computed styles...");
    const computed = extractComputedVariables();
    computed.light.forEach((value, key) => light.set(key, value));
    computed.dark.forEach((value, key) => dark.set(key, value));
    logs.push(`Found ${computed.light.size} variables via getComputedStyle`);
  }

  if (themeBlocks.length > 0) {
    logs.push(`Found ${themeBlocks.length} @theme block(s)`);
  }

  const css = formatOutput(light, dark, themeBlocks);

  return {
    css,
    stats: {
      lightCount: light.size,
      darkCount: dark.size,
      themeBlocks: themeBlocks.length,
    },
    logs,
  };
}
