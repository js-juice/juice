/**
 * Data Module Examples - Index
 * 
 * Run individual or all examples to learn how to use the data module.
 * 
 * Usage:
 *   node examples/index.mjs --all      # Run all examples
 *   node examples/index.mjs --models   # Run models example
 *   node examples/index.mjs --validate # Run validation example
 *   node examples/index.mjs --database # Run database example
 *   node examples/index.mjs --format   # Run formatting example
 */

import { runExamples as runModels } from "./models.mjs";
import { runExamples as runValidation } from "./validation.mjs";
import { runExamples as runDatabase } from "./database.mjs";
import { runExamples as runFormatting } from "./formatting.mjs";

const args = process.argv.slice(2);
const command = args[0] || "--all";

const examples = {
    "--all": [
        { name: "Models & ORM", fn: runModels },
        { name: "Validation", fn: runValidation },
        { name: "Database & SQL Builder", fn: runDatabase },
        { name: "Formatting & Strings", fn: runFormatting }
    ],
    "--models": [
        { name: "Models & ORM", fn: runModels }
    ],
    "--validate": [
        { name: "Validation", fn: runValidation }
    ],
    "--database": [
        { name: "Database & SQL Builder", fn: runDatabase }
    ],
    "--format": [
        { name: "Formatting & Strings", fn: runFormatting }
    ]
};

async function main() {
    const selected = examples[command];
    
    if (!selected) {
        console.log("Invalid command:", command);
        console.log("\nUsage:");
        console.log("  node examples/index.mjs --all      # Run all examples");
        console.log("  node examples/index.mjs --models   # Run models example");
        console.log("  node examples/index.mjs --validate # Run validation example");
        console.log("  node examples/index.mjs --database # Run database example");
        console.log("  node examples/index.mjs --format   # Run formatting example");
        process.exit(1);
    }
    
    console.log("\n");
    console.log("╔" + "═".repeat(46) + "╗");
    console.log("║" + " Data Module Examples ".padEnd(46, "═") + "║");
    console.log("╚" + "═".repeat(46) + "╝");
    
    for (const example of selected) {
        try {
            await example.fn();
        } catch (error) {
            console.error(`\n✗ Error in ${example.name}:`, error.message);
        }
    }
    
    console.log("\n");
    console.log("╔" + "═".repeat(46) + "╗");
    console.log("║" + " Examples Complete ".padEnd(46, "═") + "║");
    console.log("╚" + "═".repeat(46) + "╝");
    console.log("\n");
}

main().catch(console.error);
