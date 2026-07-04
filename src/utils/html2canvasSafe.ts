import html2canvas from "html2canvas";

// OKLCH to RGB conversion
function oklchToRgb(l: number, c: number, h: number, a = 1): string {
  // Convert h from degrees to radians
  const hRad = (h * Math.PI) / 180;
  
  // OKLCH to OKLAB
  const aLab = c * Math.cos(hRad);
  const bLab = c * Math.sin(hRad);
  
  // OKLAB to LMS
  const l_ = l + 0.3963377774 * aLab + 0.2158037573 * bLab;
  const m_ = l - 0.1055613458 * aLab - 0.0638541728 * bLab;
  const s_ = l - 0.0894841775 * aLab - 1.2914855480 * bLab;
  
  // LMS to LMS cubed
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;
  
  // LMS cubed to linear RGB
  const rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;
  
  // Linear RGB to standard sRGB (with gamma correction)
  const f = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  
  const r = Math.round(Math.max(0, Math.min(1, f(rL))) * 255);
  const g = Math.round(Math.max(0, Math.min(1, f(gL))) * 255);
  const b = Math.round(Math.max(0, Math.min(1, f(bL))) * 255);
  
  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

// Replace oklch(...) with rgb(...) or rgba(...) in a string
export function replaceOklchInString(cssText: string): string {
  return cssText.replace(/oklch\(([^)]+)\)/g, (match, contents) => {
    try {
      // Split on space, slash, or commas
      const parts = contents.trim().split(/[\s,/]+/);
      if (parts.length < 3) return match;
      
      const lVal = parts[0];
      const cVal = parts[1];
      const hVal = parts[2];
      const aVal = parts[3];
      
      // Parse L
      let l = parseFloat(lVal);
      if (lVal.endsWith('%')) {
        l = parseFloat(lVal) / 100;
      }
      
      // Parse C
      const c = parseFloat(cVal);
      
      // Parse H
      let h = parseFloat(hVal);
      if (hVal.endsWith('deg')) {
        h = parseFloat(hVal);
      } else if (hVal.endsWith('rad')) {
        h = parseFloat(hVal) * (180 / Math.PI);
      } else if (hVal.endsWith('turn')) {
        h = parseFloat(hVal) * 360;
      }
      
      // Parse A
      let a = 1;
      if (aVal !== undefined) {
        if (aVal.endsWith('%')) {
          a = parseFloat(aVal) / 100;
        } else {
          a = parseFloat(aVal);
        }
      }
      
      if (isNaN(l) || isNaN(c) || isNaN(h)) {
        return match;
      }
      
      return oklchToRgb(l, c, h, a);
    } catch (e) {
      return match;
    }
  });
}

// Helper to replace nested functions like light-dark and color-mix
function replaceNestedFunction(
  css: string, 
  fnName: string, 
  replacer: (contents: string) => string
): string {
  let index = css.indexOf(fnName + "(");
  while (index !== -1) {
    let depth = 1;
    let i = index + fnName.length + 1;
    while (i < css.length && depth > 0) {
      if (css[i] === "(") depth++;
      else if (css[i] === ")") depth--;
      i++;
    }
    if (depth === 0) {
      const contents = css.slice(index + fnName.length + 1, i - 1);
      const replacement = replacer(contents);
      css = css.slice(0, index) + replacement + css.slice(i);
      index = css.indexOf(fnName + "(", index + replacement.length);
    } else {
      break;
    }
  }
  return css;
}

// Helper to split contents of a function call by top-level commas (ignoring commas inside nested parens)
function splitByTopLevelComma(str: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "(") {
      depth++;
      current += char;
    } else if (char === ")") {
      depth--;
      current += char;
    } else if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
}

export function replaceUnsupportedFunctions(css: string): string {
  // 1. First replace OKLCH
  css = replaceOklchInString(css);

  // 2. Replace light-dark(color1, color2) with color1
  css = replaceNestedFunction(css, "light-dark", (contents) => {
    const args = splitByTopLevelComma(contents);
    return args[0] || "transparent";
  });

  // 3. Replace color-mix(in srgb, color1, color2) with color1
  css = replaceNestedFunction(css, "color-mix", (contents) => {
    const args = splitByTopLevelComma(contents);
    if (args.length >= 3) {
      return args[1] || "transparent";
    }
    return "transparent";
  });

  return css;
}

/**
 * A wrapper around html2canvas that temporarily converts oklch and other 
 * unsupported color functions (light-dark, color-mix) in document stylesheets
 * and links to standard rgb/rgba, ensuring html2canvas can parse them correctly.
 */
export async function html2canvasSafe(element: HTMLElement, options: any = {}): Promise<HTMLCanvasElement> {
  // 1. Locate all <style> elements and <link> stylesheet elements
  const styleElements = Array.from(document.querySelectorAll("style"));
  const linkElements = Array.from(document.querySelectorAll("link[rel='stylesheet']")) as HTMLLinkElement[];

  // 2. Backup original stylesheet states
  const originalStyleContents = styleElements.map(el => el.textContent || "");
  const originalLinkRels = linkElements.map(el => el.rel);

  const tempStyles: HTMLStyleElement[] = [];

  try {
    // 3. Preprocess inline style elements
    styleElements.forEach(el => {
      const text = el.textContent || "";
      if (text && (text.includes("oklch") || text.includes("light-dark") || text.includes("color-mix"))) {
        el.textContent = replaceUnsupportedFunctions(text);
      }
    });

    // 4. Preprocess linked stylesheets (fetch, convert, and inject as dynamic style tags)
    const fetchPromises = linkElements.map(async (link) => {
      try {
        const href = link.href;
        if (href && (href.startsWith(window.location.origin) || !href.startsWith("http"))) {
          const response = await fetch(href);
          if (response.ok) {
            const cssText = await response.text();
            
            if (cssText.includes("oklch") || cssText.includes("light-dark") || cssText.includes("color-mix")) {
              const cleanCss = replaceUnsupportedFunctions(cssText);
              
              const tempStyle = document.createElement("style");
              tempStyle.setAttribute("data-temp-style", "true");
              tempStyle.textContent = cleanCss;
              document.head.appendChild(tempStyle);
              tempStyles.push(tempStyle);

              // Disable the original link stylesheet while canvas is generating
              link.rel = "alternate";
            }
          }
        }
      } catch (err) {
        console.warn("Failed to preprocess link stylesheet:", link.href, err);
      }
    });

    // Wait for links to process with 1.5s timeout threshold
    await Promise.race([
      Promise.all(fetchPromises),
      new Promise(resolve => setTimeout(resolve, 1500))
    ]);

    // 5. Also modify onclone if specified to ensure inline attributes on DOM are safe too
    const originalOnClone = options.onclone;
    options.onclone = (clonedDoc: Document, clonedElement: HTMLElement) => {
      const traverseAndReplaceInlineStyles = (node: any) => {
        if (!node) return;
        if (typeof node.getAttribute === "function") {
          const styleAttr = node.getAttribute("style");
          if (styleAttr && (styleAttr.includes("oklch") || styleAttr.includes("light-dark") || styleAttr.includes("color-mix"))) {
            node.setAttribute("style", replaceUnsupportedFunctions(styleAttr));
          }
        }
        if (node.children && node.children.length) {
          for (let i = 0; i < node.children.length; i++) {
            traverseAndReplaceInlineStyles(node.children[i]);
          }
        }
      };
      
      traverseAndReplaceInlineStyles(clonedElement);
      
      if (originalOnClone) {
        originalOnClone(clonedDoc, clonedElement);
      }
    };

    // 6. Generate the canvas
    return await html2canvas(element, options);
  } finally {
    // 7. Restore original style contents
    styleElements.forEach((el, index) => {
      el.textContent = originalStyleContents[index];
    });

    // 8. Restore original link rel attributes
    linkElements.forEach((el, index) => {
      el.rel = originalLinkRels[index];
    });

    // 9. Clean up temporary style tags
    tempStyles.forEach(style => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    });
  }
}
