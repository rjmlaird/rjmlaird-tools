import type { FC, PropsWithChildren } from "hono/jsx";
import { BrandBar, BrandFooter, FAVICON_HREF, FONTS_HREF } from "./brand";
import { brandCss } from "./brand-css.generated";

export interface LayoutProps {
  /** Page heading and <title>. */
  title: string;
  /** Short intro under the heading; also used as the meta description. */
  lede?: string;
  /** Use the wide (index-width) container instead of the prose-width one. */
  wide?: boolean;
  /** Extra CSS for this tool, inlined after the brand CSS. */
  css?: string;
  /** Link the brand CSS from this URL instead of inlining it (for strict style-src CSPs). */
  stylesheet?: string;
  /** Inline script appended to <body>. */
  script?: string;
  /** External script (deferred), for tools that serve their own JS under a strict CSP. */
  scriptSrc?: string;
}

/** Standard page shell for every Hono-rendered tool: brand bar, heading, content, footer. */
export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  title,
  lede,
  wide,
  css,
  stylesheet,
  script,
  scriptSrc,
  children,
}) => (
  <html lang="en-GB">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{`${title} · rjmlaird tools`}</title>
      {lede && <meta name="description" content={lede} />}
      <meta name="theme-color" content="#0b0f1a" />
      <meta name="color-scheme" content="dark" />
      <link rel="icon" type="image/svg+xml" href={FAVICON_HREF} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
      <link rel="stylesheet" href={FONTS_HREF} />
      {stylesheet ? (
        <link rel="stylesheet" href={stylesheet} />
      ) : (
        <style dangerouslySetInnerHTML={{ __html: brandCss + (css ?? "") }} />
      )}
    </head>
    <body>
      <BrandBar />
      <main class={wide ? "rj-main wrap" : "rj-main narrow"}>
        <header class="rj-intro">
          <div class="orbit-line" aria-hidden="true"></div>
          <h1>{title}</h1>
          {lede && <p class="lede">{lede}</p>}
        </header>
        {children}
      </main>
      <BrandFooter />
      {script && <script dangerouslySetInnerHTML={{ __html: script }} />}
      {scriptSrc && <script src={scriptSrc} defer></script>}
    </body>
  </html>
);
