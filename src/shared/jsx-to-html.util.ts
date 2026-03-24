/**
 * Best-effort JSX/TSX → HTML converter for file uploads.
 *
 * Handles common React / Next.js patterns:
 *  - Strips imports, exports, type annotations, function wrappers
 *  - Extracts JSX from the return statement
 *  - Converts className → class, htmlFor → for
 *  - Converts <Image> → <img>, <Link> → <a>
 *  - Expands inline .map() over static arrays
 *  - Removes JSX comments, cleans up remaining expressions
 *
 * NOT a full parser — designed for landing-page templates.
 */

/* ────────────────────────────────────────────────────────────────────────── */
/*  PUBLIC API                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

export function convertJsxToHtml(source: string): string {
  let jsx = extractJsxBody(source);
  if (!jsx) return source; // fallback: return raw content

  jsx = removeJsxComments(jsx);
  jsx = expandMapExpressions(jsx);
  jsx = convertNextComponents(jsx);
  jsx = convertJsxAttributes(jsx);
  jsx = cleanJsxExpressions(jsx);
  jsx = cleanupHtml(jsx);

  return jsx;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  STEP 1 — Extract JSX body from component                                */
/* ────────────────────────────────────────────────────────────────────────── */

function extractJsxBody(source: string): string | null {
  // Remove import lines
  let code = source.replace(/^import\s+.*?;?\s*$/gm, "");
  // Remove type / interface declarations
  code = code.replace(/^(export\s+)?(type|interface)\s+\w+[\s\S]*?^}/gm, "");

  // Find the return statement which contains the JSX
  // Patterns: `return (` or `return <`
  const returnMatch = code.match(
    /return\s*\(\s*([\s\S]*)\s*\)\s*;?\s*\}[\s\S]*$/,
  );
  if (returnMatch) {
    return returnMatch[1].trim();
  }

  // Try simpler: return <tag...
  const returnSimple = code.match(/return\s*(<[\s\S]*>)\s*;?\s*\}[\s\S]*$/);
  if (returnSimple) {
    return returnSimple[1].trim();
  }

  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  STEP 2 — Remove JSX comments {/* ... * /}                               */
/* ────────────────────────────────────────────────────────────────────────── */

function removeJsxComments(jsx: string): string {
  return jsx.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  STEP 3 — Expand .map() expressions with inline arrays                   */
/* ────────────────────────────────────────────────────────────────────────── */

function expandMapExpressions(jsx: string): string {
  // We need to repeatedly process map expressions from innermost to outermost
  let result = jsx;
  let changed = true;
  let maxIterations = 20;

  while (changed && maxIterations-- > 0) {
    changed = false;

    // Pattern: {[...array...].map((param) => ( ... ))}
    // or:      {[...array...].map((param, index) => ( ... ))}
    // We look for `{[` as the start of an inline-array .map(...)
    const mapStart = result.indexOf("{[");
    if (mapStart === -1) break;

    const expanded = tryExpandMapAt(result, mapStart);
    if (expanded !== null) {
      result = expanded;
      changed = true;
    } else {
      // If we can't parse this one, skip past it to avoid infinite loop
      break;
    }
  }

  return result;
}

function tryExpandMapAt(src: string, start: number): string | null {
  // Find the matching closing `}` for the outer expression
  const exprEnd = findMatchingBrace(src, start);
  if (exprEnd === -1) return null;

  const expr = src.slice(start + 1, exprEnd); // strip outer { }

  // Match: [...].map((params) => ( template ))
  // or:    [...].map((params) => template)
  const mapPattern = /^\[[\s\S]*?\]\.map\s*\(/;
  if (!mapPattern.test(expr)) return null;

  // Extract the array portion
  const arrayEnd = findMatchingBracket(expr, 0);
  if (arrayEnd === -1) return null;
  const arrayStr = expr.slice(1, arrayEnd); // content inside [ ]

  // Parse the array items (objects of shape { key: "value", ... })
  const items = parseInlineArray(arrayStr);
  if (!items || items.length === 0) return null;

  // Find .map(( and extract the parameter name and template
  const afterArray = expr.slice(arrayEnd + 1);
  const mapCallMatch = afterArray.match(
    /^\.map\s*\(\s*\((\w+)(?:\s*,\s*(\w+))?\)\s*=>\s*\(/,
  );
  if (!mapCallMatch) {
    // Try arrow without parens around template: .map((p) => <div...)
    const mapSimple = afterArray.match(
      /^\.map\s*\(\s*\((\w+)(?:\s*,\s*(\w+))?\)\s*=>\s*/,
    );
    if (!mapSimple) return null;

    const paramName = mapSimple[1];
    const indexName = mapSimple[2] || null;
    const templateStart = mapSimple[0].length;
    // Template runs until closing `)}`
    const template = afterArray
      .slice(templateStart)
      .replace(/\)\s*$/, "")
      .trim();

    const expanded = items
      .map((item, i) =>
        substituteParams(template, paramName, item, indexName, i),
      )
      .join("\n");

    return src.slice(0, start) + expanded + src.slice(exprEnd + 1);
  }

  const paramName = mapCallMatch[1];
  const indexName = mapCallMatch[2] || null;

  // Find the template between the opening `(` after `=>` and its matching `)`
  const templateOffset =
    afterArray.indexOf(mapCallMatch[0]) + mapCallMatch[0].length;
  const fullAfter = afterArray.slice(templateOffset);

  // Find matching closing paren for the template
  const templateEnd = findMatchingParen(fullAfter);
  if (templateEnd === -1) return null;

  const template = fullAfter.slice(0, templateEnd).trim();

  // Generate HTML for each array item
  const expanded = items
    .map((item, i) => substituteParams(template, paramName, item, indexName, i))
    .join("\n");

  return src.slice(0, start) + expanded + src.slice(exprEnd + 1);
}

function substituteParams(
  template: string,
  paramName: string,
  item: Record<string, string>,
  indexName: string | null,
  index: number,
): string {
  let result = template;

  // Replace {paramName.key} with the value
  for (const [key, value] of Object.entries(item)) {
    const pattern = new RegExp(
      `\\{${escapeRegex(paramName)}\\.${escapeRegex(key)}\\}`,
      "g",
    );
    result = result.replace(pattern, value);
  }

  // Replace attribute expressions: paramName.key (inside attribute values like key={p.step})
  for (const [key, value] of Object.entries(item)) {
    const attrPattern = new RegExp(
      `\\{${escapeRegex(paramName)}\\.${escapeRegex(key)}\\}`,
      "g",
    );
    result = result.replace(attrPattern, value);
  }

  // Replace index variable
  if (indexName !== null) {
    result = result.replace(
      new RegExp(`\\{${escapeRegex(indexName)}\\}`, "g"),
      String(index),
    );
    // Handle conditional expressions like: {i < 2 && (...)}
    result = result.replace(
      new RegExp(
        `\\{${escapeRegex(indexName)}\\s*<\\s*(\\d+)\\s*&&\\s*\\(([\\s\\S]*?)\\)\\}`,
        "g",
      ),
      (_, threshold, content) => (index < Number(threshold) ? content : ""),
    );
  }

  // Remove key={...} attributes (React-only, not needed in HTML)
  result = result.replace(/\s+key=\{[^}]*\}/g, "");

  return result;
}

function parseInlineArray(
  arrayContent: string,
): Record<string, string>[] | null {
  const items: Record<string, string>[] = [];

  // Match objects: { key: "value", key2: "value2", ... }
  const objectRegex = /\{([^{}]*)\}/g;
  let match;

  while ((match = objectRegex.exec(arrayContent)) !== null) {
    const objContent = match[1];
    const item: Record<string, string> = {};

    // Match key: "value" or key: 'value'
    const propRegex = /(\w+)\s*:\s*(?:"([^"]*?)"|'([^']*?)'|`([^`]*?)`)/g;
    let propMatch;
    while ((propMatch = propRegex.exec(objContent)) !== null) {
      item[propMatch[1]] = propMatch[2] ?? propMatch[3] ?? propMatch[4] ?? "";
    }

    // Match key: number
    const numRegex = /(\w+)\s*:\s*(\d+(?:\.\d+)?)\s*(?:,|$)/g;
    let numMatch;
    while ((numMatch = numRegex.exec(objContent)) !== null) {
      if (!(numMatch[1] in item)) {
        item[numMatch[1]] = numMatch[2];
      }
    }

    if (Object.keys(item).length > 0) {
      items.push(item);
    }
  }

  return items.length > 0 ? items : null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  STEP 4 — Convert Next.js components to HTML                             */
/* ────────────────────────────────────────────────────────────────────────── */

function convertNextComponents(jsx: string): string {
  let result = jsx;

  // <Image src="..." alt="..." fill className="..." /> → <img>
  // Handle self-closing <Image ... />
  result = result.replace(/<Image\b([^>]*?)\/>/g, (_match, attrs: string) => {
    let htmlAttrs = attrs;
    // Remove `fill` prop (Next.js specific)
    htmlAttrs = htmlAttrs.replace(/\s+fill\b(?!=)/g, "");
    // Remove `priority` prop
    htmlAttrs = htmlAttrs.replace(/\s+priority\b(?!=)/g, "");
    // Convert className to class
    htmlAttrs = htmlAttrs.replace(/\bclassName=/g, "class=");
    return `<img${htmlAttrs} style="width:100%;height:100%;object-fit:cover" />`;
  });

  // <Link href="...">children</Link> → <a href="...">children</a>
  result = result.replace(
    /<Link\b([^>]*?)>([\s\S]*?)<\/Link>/g,
    (_match, attrs: string, children: string) => {
      let htmlAttrs = attrs;
      htmlAttrs = htmlAttrs.replace(/\bclassName=/g, "class=");
      return `<a${htmlAttrs}>${children}</a>`;
    },
  );

  return result;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  STEP 5 — Convert JSX attributes to HTML                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function convertJsxAttributes(jsx: string): string {
  let result = jsx;

  // className → class
  result = result.replace(/\bclassName=/g, "class=");
  // htmlFor → for
  result = result.replace(/\bhtmlFor=/g, "for=");
  // tabIndex → tabindex
  result = result.replace(/\btabIndex=/g, "tabindex=");

  // Convert JSX attribute expressions to string attributes where possible
  // e.g., class={"some-class"} → class="some-class"
  result = result.replace(/(\w+)=\{["']([^"']*?)["']\}/g, '$1="$2"');

  // Convert attribute={`template literal without expressions`}
  result = result.replace(/(\w+)=\{`([^$`]*?)`\}/g, '$1="$2"');

  return result;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  STEP 6 — Clean remaining JSX expressions                                */
/* ────────────────────────────────────────────────────────────────────────── */

function cleanJsxExpressions(jsx: string): string {
  let result = jsx;

  // Remove {" "} spacers
  result = result.replace(/\{"\s*"\}/g, " ");

  // Convert {"text"} to text
  result = result.replace(/\{["']([^"']*?)["']\}/g, "$1");

  // Remove remaining simple {expression} blocks that look like code
  // but preserve content inside elements — only strip attribute-position expressions
  // e.g., style={...}, onClick={...}
  result = result.replace(
    /\s+(on\w+|style|ref|dangerouslySetInnerHTML)=\{[^}]*\}/g,
    "",
  );

  return result;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  STEP 7 — Final cleanup                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function cleanupHtml(jsx: string): string {
  let result = jsx;

  // Remove empty lines (more than 2 consecutive newlines)
  result = result.replace(/\n{3,}/g, "\n\n");

  // Trim
  result = result.trim();

  return result;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  HELPERS — Brace / Bracket / Paren matching                               */
/* ────────────────────────────────────────────────────────────────────────── */

function findMatchingBrace(src: string, start: number): number {
  return findMatching(src, start, "{", "}");
}

function findMatchingBracket(src: string, start: number): number {
  return findMatching(src, start, "[", "]");
}

function findMatchingParen(src: string): number {
  let depth = 1;
  let inString: string | null = null;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inString) {
      if (ch === inString && src[i - 1] !== "\\") inString = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function findMatching(
  src: string,
  start: number,
  open: string,
  close: string,
): number {
  let depth = 0;
  let inString: string | null = null;

  for (let i = start; i < src.length; i++) {
    const ch = src[i];

    if (inString) {
      if (ch === inString && src[i - 1] !== "\\") inString = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
