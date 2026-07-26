const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf-8');

const baseStylesRegex = /\/\* ─── Base element resets ─── \*\/\s*(h1, h2.*?)(?=\/\* ─── Scrollbar ─── \*\/)/s;
const match = css.match(baseStylesRegex);

if (match) {
  let baseStyles = match[1];
  let layeredBaseStyles = `@layer base {\n` + baseStyles.replace(/^/gm, '  ') + `\n}\n`;
  css = css.replace(baseStylesRegex, `/* ─── Base element resets ─── */\n\n` + layeredBaseStyles);
  fs.writeFileSync('app/globals.css', css);
  console.log("Patched globals.css to put base styles in @layer base");
} else {
  console.log("Could not find base styles block");
}
