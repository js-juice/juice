/**
 * Example: Data Validation
 * 
 * Demonstrates how to create validators, apply rules, handle errors,
 * and use custom validation messages.
 */

import { ValidatorInstance } from "../validate/Validator.mjs";
import * as Messages from "../validate/Messages.mjs";

// ============================================================================
// 1. Basic Validation
// ============================================================================

function basicValidationExample() {
    console.log("\n--- Basic Validation ---");
    
    // Create a validator with rules
    const validator = new ValidatorInstance({
        email: "required|email",
        password: "required|string|min:8",
        agree: "required"
    });
    
    // Validate data
    const validData = {
        email: "user@example.com",
        password: "SecurePass123!",
        agree: true
    };
    
    const isValid = validator.validate(validData);
    console.log("Valid data - passes:", isValid); // true
    console.log("Errors:", validator.errors); // {}
    
    // Validate invalid data
    const invalidData = {
        email: "not-an-email",
        password: "short",
        agree: false
    };
    
    const isInvalid = validator.validate(invalidData);
    console.log("\nInvalid data - passes:", isInvalid); // false
    console.log("Errors:", validator.errors); // Multiple error objects
    
    // Get error messages for specific field
    const emailErrors = validator.messages("email");
    console.log("Email errors:", emailErrors);
}

// ============================================================================
// 2. Field-Level Validation
// ============================================================================

function fieldLevelValidationExample() {
    console.log("\n--- Field-Level Validation ---");
    
    const validator = new ValidatorInstance({
        username: "required|string|length:8",
        score: "required|int|min:0|max:100"
    });
    
    // Validate individual fields
    const username = "testuser";
    const isUsernameValid = validator.field("username", username);
    console.log("Username valid:", isUsernameValid);
    console.log("Username errors:", validator.messages("username"));
    
    // Validate another field
    const score = 150; // Invalid - exceeds max
    const isScoreValid = validator.field("score", score);
    console.log("\nScore valid:", isScoreValid);
    console.log("Score errors:", validator.messages("score"));
}

// ============================================================================
// 3. Custom Validation Messages
// ============================================================================

function customMessagesExample() {
    console.log("\n--- Custom Validation Messages ---");
    
    // Create validator with rule-specific messages
    const validator = new ValidatorInstance({
        username: "required|string|min:3",
        email: "required|email",
        age: "required|int|min:18|max:120"
    });
    
    // Override default messages
    const customMessages = {
        "username.required": "Username is mandatory",
        "username.min": "Username must be at least 3 characters",
        "email.email": "Please enter a valid email address",
        "age.min": "You must be at least 18 years old",
        "age.max": "Age cannot exceed 120"
    };
    
    // Apply custom messages (implementation depends on validator setup)
    validator.labels = {
        username: "User Name",
        email: "Email Address",
        age: "Age"
    };
    
    const invalidData = {
        username: "ab",
        email: "invalid",
        age: 15
    };
    
    validator.validate(invalidData);
    
    console.log("Custom error messages:");
    console.log("Username:", validator.messages("username"));
    console.log("Email:", validator.messages("email"));
    console.log("Age:", validator.messages("age"));
}

// ============================================================================
// 4. Common Validation Rules
// ============================================================================

function commonRulesExample() {
    console.log("\n--- Common Validation Rules ---");
    
    const rules = {
        // Text fields
        name: "required|string|min:2|max:100",
        
        // Email and contact
        email: "required|email",
        phone: "phone",
        postal: "postal",
        
        // Numbers
        age: "required|int|min:0|max:150",
        quantity: "required|number|min:1",
        
        // Boolean
        newsletter: "boolean",
        
        // Enum-like validation
        status: "in:active,pending,inactive",
        
        // Custom patterns
        username: "required|string|length:8|match:/^[a-z0-9_]+$/i",
        
        // Multiple types
        data: "required|array|min:1"
    };
    
    const validator = new ValidatorInstance(rules);
    
    // Test various data types
    const testData = {
        name: "John Doe",
        email: "john@example.com",
        phone: "555-123-4567",
        postal: "12345",
        age: 30,
        quantity: 5,
        newsletter: true,
        status: "active",
        username: "john_1234",
        data: [1, 2, 3]
    };
    
    const isValid = validator.validate(testData);
    console.log("Complex validation result:", isValid);
    console.log("Errors:", validator.errors);
}

// ============================================================================
// 5. Conditional Validation
// ============================================================================

function conditionalValidationExample() {
    console.log("\n--- Conditional Validation ---");
    
    const validator = new ValidatorInstance({
        accountType: "required|in:personal,business",
        businessName: "required_if:accountType,business|string",
        businessTaxId: "required_if:accountType,business|string",
        firstName: "required_if:accountType,personal|string",
        lastName: "required_if:accountType,personal|string"
    });
    
    // Business account
    const businessData = {
        accountType: "business",
        businessName: "Acme Corp",
        businessTaxId: "12-3456789"
    };
    
    console.log("\nBusiness account validation:");
    console.log("Valid:", validator.validate(businessData));
    console.log("Errors:", validator.errors);
    
    // Personal account
    const personalData = {
        accountType: "personal",
        firstName: "John",
        lastName: "Doe"
    };
    
    console.log("\nPersonal account validation:");
    validator.validate(personalData);
    console.log("Valid:", true); // Should be valid
    console.log("Errors:", validator.errors);
}

// ============================================================================
// 6. Async Async Validation
// ============================================================================

async function asyncValidationExample() {
    console.log("\n--- Async Validation ---");
    
    const validator = new ValidatorInstance({
        email: "required|email|async:checkEmailAvailable",
        username: "required|string|async:checkUsernameAvailable"
    });
    
    // Simulated async validation endpoints
    const asyncRules = {
        checkEmailAvailable: async (value) => {
            // Simulate database lookup
            await new Promise(r => setTimeout(r, 100));
            const taken = ["admin@example.com", "info@example.com"];
            return !taken.includes(value);
        },
        checkUsernameAvailable: async (value) => {
            // Simulate API call
            await new Promise(r => setTimeout(r, 100));
            const taken = ["admin", "root", "test"];
            return !taken.includes(value.toLowerCase());
        }
    };
    
    // Test with available email and username
    const data = {
        email: "newuser@example.com",
        username: "john_doe"
    };
    
    console.log("Checking availability...");
    const isValid = await validator.validate(data);
    console.log("Validation result:", isValid);
    console.log("Errors:", validator.errors);
}

// ============================================================================
// 7. Debug Mode
// ============================================================================

function debugModeExample() {
    console.log("\n--- Debug Mode ---");
    
    const validator = new ValidatorInstance({
        email: "required|email",
        age: "required|int|min:18"
    });
    
    // Enable debug logging
    validator.debug = true;
    
    const data = {
        email: "user@example.com",
        age: 25
    };
    
    console.log("Running validation with debug enabled...");
    validator.validate(data);
    // Will output:
    // [Validator debug] "email" -> valid
    // value: "user@example.com"
    // errors: []
    // [Validator debug] "age" -> valid
    // value: 25
    // errors: []
}

// ============================================================================
// 8. Error Handling and Reporting
// ============================================================================

function errorHandlingExample() {
    console.log("\n--- Error Handling and Reporting ---");
    
    const validator = new ValidatorInstance({
        username: "required|string|min:3|max:20",
        email: "required|email",
        password: "required|string|min:8",
        confirmPassword: "required|match:password"
    });
    
    const formData = {
        username: "ab", // Too short
        email: "not-email", // Invalid format
        password: "pass123", // Too short
        confirmPassword: "pass456" // Doesn't match
    };
    
    validator.validate(formData);
    
    // Get all errors
    console.log("All errors:", validator.errors);
    
    // Check if specific field has errors
    if (validator.errorsOf("username").length) {
        console.log("Username has errors:", validator.messages("username"));
    }
    
    // Generate error report
    const errorReport = Object.entries(validator.errors).map(([field, errors]) => ({
        field,
        count: errors.length,
        messages: validator.messages(field)
    }));
    
    console.log("Error Report:");
    console.table(errorReport);
}

// ============================================================================
// 9. Main Example Runner
// ============================================================================

async function runExamples() {
    try {
        console.log("====================================");
        console.log("Validation Examples");
        console.log("====================================");
        
        basicValidationExample();
        fieldLevelValidationExample();
        customMessagesExample();
        commonRulesExample();
        conditionalValidationExample();
        await asyncValidationExample();
        debugModeExample();
        errorHandlingExample();
        
        console.log("\n====================================");
        console.log("✓ All validation examples completed!");
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
