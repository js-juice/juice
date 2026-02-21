# Data Format

String formatting utilities used by forms and data workflows.

## Files

- `data/format/FormatPipeline.mjs`: Parses and runs format pipelines.
- `data/format/Presets.mjs`: Built-in formatters and formatter registry.
- `data/format/String.mjs`: String transformation helpers.
- `data/format/examples/cli.mjs`: Runnable CLI examples.
- `data/format/examples/index.html`: Browser visual demo.
- `data/format/examples/main.mjs`: Browser demo logic.

## Quick Start

```js
import { applyFormatPipeline } from "./FormatPipeline.mjs";

const value = applyFormatPipeline(" hello world ", "trim:upper");
console.log(value); // "HELLO WORLD"
```

## Pipeline Syntax

- Named formatter: `upper`
- Formatter with args: `unPascal("-")`
- Chained formatters: `trim:upper`
- Digit templates: `tpl(ddddd-dddd)`

## Working Examples

- CLI example file: [`data/format/examples/cli.mjs`](./examples/cli.mjs)
- Browser example file: [`data/format/examples/index.html`](./examples/index.html)

Run CLI examples:

```bash
node data/format/examples/cli.mjs
```

For browser examples, serve the repo root and open `data/format/examples/index.html`.

Expected output includes:

- title-casing text
- slug/computize transformation
- phone/zip digit templates
- custom formatter registration

## Custom Formatters

```js
import { registerFormatter } from "./Presets.mjs";
import { applyFormatPipeline } from "./FormatPipeline.mjs";

registerFormatter("wrap", (value, left = "[", right = "]") => `${left}${value}${right}`);

console.log(applyFormatPipeline("juice", "wrap(<,>)")); // "<juice>"
```
