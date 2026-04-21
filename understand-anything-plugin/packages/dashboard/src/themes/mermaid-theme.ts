export interface MermaidThemeVariables {
  background: string;
  primaryColor: string;
  primaryBorderColor: string;
  primaryTextColor: string;
  lineColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  edgeLabelBackground: string;
  mainBkg: string;
  fontFamily: string;
  fontSize: string;
  nodeBorder: string;
  clusterBkg: string;
  clusterBorder: string;
  defaultLinkColor: string;
  titleColor: string;
  labelBackground: string;
  arrowheadColor: string;
}

export function getMermaidTheme(): MermaidThemeVariables {
  const style = getComputedStyle(document.documentElement);
  const read = (v: string) => style.getPropertyValue(v).trim();
  return {
    background: read("--color-surface"),
    primaryColor: read("--color-accent-dim"),
    primaryBorderColor: read("--color-accent"),
    primaryTextColor: read("--color-text-primary"),
    lineColor: read("--color-accent-dim"),
    secondaryColor: read("--color-surface"),
    tertiaryColor: read("--color-root"),
    edgeLabelBackground: read("--color-elevated"),
    mainBkg: read("--color-elevated"),
    fontFamily: read("--font-sans"),
    fontSize: "14px",
    nodeBorder: read("--color-accent"),
    clusterBkg: read("--color-surface"),
    clusterBorder: read("--color-border-subtle"),
    defaultLinkColor: read("--color-accent"),
    titleColor: read("--color-text-primary"),
    labelBackground: read("--color-elevated"),
    arrowheadColor: read("--color-accent"),
  };
}
