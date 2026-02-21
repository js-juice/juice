/**
 * Example: Data Formatting and String Utilities
 * 
 * Demonstrates string formatting, case conversion,
 * data transformation, and format pipelines.
 */

import FormatPipeline from "../format/FormatPipeline.mjs";
import {
    applyDigitTemplate,
    applyPhoneFormat,
    applyCurrencyFormat,
    applyPercentFormat
} from "../format/Presets.mjs";
import * as StringUtils from "../format/String.mjs";

// ============================================================================
// 1. Basic String Case Conversions
// ============================================================================

function caseConversionExample() {
    console.log("\n--- String Case Conversions ---");
    
    const input = "hello-world_example TEXT";
    
    // Convert case
    console.log("Original:", input);
    console.log("Uppercase:", StringUtils.toUpper(input));
    console.log("Lowercase:", StringUtils.toLower(input));
    console.log("Capitalize first:", StringUtils.ucword("hello world"));
    console.log("Capitalize all:", StringUtils.ucwords("hello world example"));
    console.log("camelCase:", StringUtils.camelCase("hello-world-example"));
    console.log("snake_case:", StringUtils.snakeCase("helloWorldExample"));
    console.log("PascalCase:", StringUtils.pascalCase("hello-world-example"));
    console.log("kebab-case:", StringUtils.dashed("helloWorldExample"));
}

// ============================================================================
// 2. Digit Template Formatting
// ============================================================================

function digitTemplateExample() {
    console.log("\n--- Digit Template Formatting ---");
    
    // Phone number
    const phoneDigits = "5551234567";
    console.log("Phone number:", phoneDigits);
    console.log("Formatted (ddd) ddd-dddd:", applyDigitTemplate(phoneDigits, "(ddd) ddd-dddd"));
    console.log("Formatted ddd.ddd.dddd:", applyDigitTemplate(phoneDigits, "ddd.ddd.dddd"));
    console.log("Formatted +d ddd ddd dddd:", applyDigitTemplate(phoneDigits, "+d ddd ddd dddd"));
    
    // Postal codes
    const postalDigits = "12345";
    console.log("\nPostal code:", postalDigits);
    console.log("Formatted ddddd:", applyDigitTemplate(postalDigits, "ddddd"));
    console.log("Formatted dd ddd:", applyDigitTemplate(postalDigits, "dd ddd"));
    
    // Social security number
    const ssn = "123456789";
    console.log("\nSSN:", ssn);
    console.log("Formatted ddd-dd-dddd:", applyDigitTemplate(ssn, "ddd-dd-dddd"));
    
    // Credit card
    const cardNumber = "4532123456789010";
    console.log("\nCredit card:", cardNumber);
    console.log("Formatted dddd dddd dddd dddd:", 
        applyDigitTemplate(cardNumber, "dddd dddd dddd dddd"));
}

// ============================================================================
// 3. Phone Number Formatting
// ============================================================================

function phoneFormattingExample() {
    console.log("\n--- Phone Number Formatting ---");
    
    const numbers = [
        "5551234567",
        "2025550173",
        "9141234567"
    ];
    
    console.log("Phone numbers formatted as (ddd) ddd-dddd:");
    numbers.forEach(num => {
        console.log(`  ${num} → ${applyPhoneFormat(num)}`);
    });
}

// ============================================================================
// 4. Currency and Numeric Formatting
// ============================================================================

function currencyFormattingExample() {
    console.log("\n--- Currency and Numeric Formatting ---");
    
    const amounts = [1234.5, 1000000.99, 50, 0.99];
    
    console.log("Currency formatting:");
    amounts.forEach(amount => {
        console.log(`  ${amount} → ${applyCurrencyFormat(amount)}`);
    });
    
    console.log("\nPercent formatting:");
    const percentages = [0.75, 0.5, 0.25, 1.0];
    percentages.forEach(pct => {
        console.log(`  ${pct} → ${applyPercentFormat(pct)}`);
    });
}

// ============================================================================
// 5. String Padding and Alignment
// ============================================================================

function paddingExample() {
    console.log("\n--- String Padding and Alignment ---");
    
    const items = ["item", "longer_item", "a"];
    const width = 15;
    
    console.log("Left-aligned (default):");
    items.forEach(item => {
        const padded = StringUtils.pad(item, width, " ");
        console.log(`  |${padded}|`);
    });
    
    console.log("\nRight-aligned (with custom char):");
    items.forEach(item => {
        // Custom implementation would right-align
        const padded = StringUtils.pad(item, width, ".");
        console.log(`  |${padded}|`);
    });
    
    console.log("\nCenter-aligned:");
    items.forEach(item => {
        const totalPad = width - item.length;
        const leftPad = Math.floor(totalPad / 2);
        const rightPad = totalPad - leftPad;
        const centered = " ".repeat(leftPad) + item + " ".repeat(rightPad);
        console.log(`  |${centered}|`);
    });
}

// ============================================================================
// 6. String Splitting and Joining
// ============================================================================

function splittingExample() {
    console.log("\n--- String Splitting and Joining ---");
    
    // Split on various delimiters
    const text = "hello-world_example TEXT";
    
    console.log("Original:", text);
    console.log("Split words:", StringUtils.words(text));
    
    // Custom splitting
    console.log("\nCustom splitting:");
    const csv = "name,email,phone,status";
    const fields = csv.split(",");
    console.log("CSV fields:", fields);
    
    // Join with different separators
    console.log("\nJoin with separators:");
    console.log("  with '-':", fields.join("-"));
    console.log("  with ', ':", fields.join(", "));
    console.log("  with '|':", fields.join("|"));
}

// ============================================================================
// 7. Text Truncation and Ellipsis
// ============================================================================

function truncationExample() {
    console.log("\n--- Text Truncation ---");
    
    const longText = "This is a very long text that might need to be truncated for display purposes";
    const maxLength = 50;
    
    // Simple truncation
    console.log("Original length:", longText.length);
    console.log("Truncated to 50 chars:");
    const truncated = longText.substring(0, maxLength);
    console.log(`  ${truncated}...`);
    
    // Truncate at word boundary
    console.log("\nTruncate at word boundary:");
    const words = longText.split(" ");
    let result = "";
    for (const word of words) {
        if ((result + word).length > maxLength) break;
        result += word + " ";
    }
    console.log(`  ${result.trim()}...`);
}

// ============================================================================
// 8. Format Pipeline
// ============================================================================

function formatPipelineExample() {
    console.log("\n--- Format Pipeline ---");
    
    const pipeline = new FormatPipeline();
    
    // Example 1: Simple pipeline
    console.log("Example 1: Convert and trim");
    let result = pipeline.apply("  HELLO world  ", "trim|lower");
    console.log(`  Input: "  HELLO world  "`);
    console.log(`  Formatters: trim|lower`);
    console.log(`  Result: "${result}"\n`);
    
    // Example 2: Complex pipeline
    console.log("Example 2: Complex transformation");
    result = pipeline.apply("hello_world_example", "upper|replace(_,-)|trim");
    console.log(`  Input: "hello_world_example"`);
    console.log(`  Formatters: upper|replace(_,-)|trim`);
    console.log(`  Result: "${result}"\n`);
    
    // Example 3: with parameters
    console.log("Example 3: Formatters with parameters");
    result = pipeline.apply("Hello World Text", "lower|pad(20,-)");
    console.log(`  Input: "Hello World Text"`);
    console.log(`  Formatters: lower|pad(20,-)`);
    console.log(`  Result: "${result}"`);
}

// ============================================================================
// 9. Practical Examples
// ============================================================================

function practicalExamplesExample() {
    console.log("\n--- Practical Examples ---");
    
    // Format user input for database
    console.log("1. Format user input for storage:");
    const userInput = "  John Doe  ";
    const normalized = StringUtils.trim(userInput);
    console.log(`   Input: "${userInput}"`);
    console.log(`   Stored: "${normalized}"`);
    
    // Create slug from title
    console.log("\n2. Create URL slug from title:");
    const title = "My Awesome Blog Post!";
    const slug = StringUtils
        .toLower(title)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    console.log(`   Title: "${title}"`);
    console.log(`   Slug: "${slug}"`);
    
    // Format for display
    console.log("\n3. Format API data for display:");
    const apiData = {
        first_name: "john",
        last_name: "doe",
        email_address: "john.doe@example.com"
    };
    console.log("   Raw API data:", apiData);
    console.log("   Formatted:");
    Object.entries(apiData).forEach(([key, value]) => {
        const label = StringUtils.ucwords(key.replace(/_/g, " "));
        const formatted = typeof value === "string" 
            ? StringUtils.ucword(value) 
            : value;
        console.log(`     ${label}: ${formatted}`);
    });
    
    // Mask sensitive data
    console.log("\n4. Mask sensitive data for display:");
    const ssn = "123-45-6789";
    const masked = "***-**-" + ssn.slice(-4);
    console.log(`   SSN: ${ssn}`);
    console.log(`   Masked: ${masked}`);
    
    // Format table output
    console.log("\n5. Format table output:");
    const data = [
        { name: "Item 1", price: 10.99 },
        { name: "Something Longer", price: 25.50 },
        { name: "X", price: 100 }
    ];
    
    console.log("   Name".padEnd(20) + "Price".padStart(10));
    console.log("-".repeat(30));
    data.forEach(item => {
        const name = StringUtils.pad(item.name, 20);
        const price = String(item.price.toFixed(2)).padStart(10);
        console.log(`${name}${price}`);
    });
}

// ============================================================================
// 10. Main Example Runner
// ============================================================================

function runExamples() {
    try {
        console.log("====================================");
        console.log("Formatting & String Utilities Examples");
        console.log("====================================");
        
        caseConversionExample();
        digitTemplateExample();
        phoneFormattingExample();
        currencyFormattingExample();
        paddingExample();
        splittingExample();
        truncationExample();
        formatPipelineExample();
        practicalExamplesExample();
        
        console.log("\n====================================");
        console.log("✓ All formatting examples completed!");
        console.log("====================================");
        
    } catch (error) {
        console.error("Error running examples:", error);
    }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runExamples();
}

export { runExamples };
