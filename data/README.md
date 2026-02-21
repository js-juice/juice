# Data Module

Comprehensive data management system for juice framework including ORM, database access, validation, and formatting utilities.

## Overview

The `data` module provides:

- **ORM (Object-Relational Mapping)** - Model-based database interaction with relationships
- **Database Access** - SQLite support with migrations and schema management  
- **Validation** - Rule-based data validation with custom error types
- **Formatting** - String formatting and data transformation

## Folder Structure

### `/db` - Database Layer

Core database functionality and SQL utilities.

- **Database.js** - Abstract base class for database implementations
- **SQLBuilder.js** - Fluent SQL query builder supporting SELECT, INSERT, UPDATE, DELETE
- **SQLite/Database.js** - SQLite concrete implementation with migrations
- **SQLite/Migration.mjs** - Schema version tracking and auto-migration
- **SQLite/RemoteDatabase.js** - Remote SQLite connection support
- **MessageChannelConnection.mjs** - Async database operations via message ports
- **Conditions.js** - WHERE clause condition builder

### `/models` - ORM Layer

Object-relational mapping with model definitions and collections.

- **Model.js** - Base ORM class with CRUD operations, relationships, validation, events
- **Collection.mjs** - Array-like collection for query results with model methods
- **ModelSQLBuilder.js** - Model-aware SQL builder with schema integration
- **make.js** - CLI utility for scaffolding model files

### `/validate` - Validation Layer

Rule-based validation engine with custom error types.

- **Validator.mjs** - Main validator class bound to scope with rule execution
- **Rules.mjs** - Rule registry and executor per validated scope
- **Rules/Rule.mjs** - Individual validation rule with async support
- **Rules/RuleSet.mjs** - Collection of rules for a single property
- **Rules/Parser.mjs** - Rule string parser converting shorthand to Rule objects
- **Errors.mjs** - Custom validation error classes for each rule type
- **Messages.mjs** - Error message templates with token substitution
- **Presets.mjs** - Built-in validation rules (email, phone, postal, types, etc.)
- **ValidationUtil.mjs** - Type checking and utility functions
- **Emitter.mjs** - Lightweight event emitter for validation events

### `/format` - Formatting Layer

String manipulation and data transformation.

- **FormatPipeline.mjs** - Applies formatter expressions sequentially
- **Presets.mjs** - Built-in formatters (digits, phone, currency, etc.)
- **String.mjs** - String utilities (case conversion, padding, splitting)

## Quick Start

### Using Models

```javascript
import Model from "./models/Model.js";
import SQLiteDatabase from "./db/SQLite/Database.js";

// Define a model
class User extends Model {
    static tableName = "users";
    static primaryKey = "id";
    static fields = {
        id: "integer primary key",
        name: "text not null",
        email: "text unique",
        age: "integer"
    };
}

// Setup database
const db = new SQLiteDatabase("./app.db");
db.addModel(User);

// CRUD operations
const user = new User({ name: "John", email: "john@example.com", age: 30 });
await db.insert(User.tableName, user);

const found = await db.first(User.tableName, { email: "john@example.com" });
console.log(found); // { id: 1, name: "John", email: "john@example.com", age: 30 }
```

### Using Validation

```javascript
import { ValidatorInstance } from "./validate/Validator.mjs";

// Create validator
const validator = new ValidatorInstance({
    email: "required|email",
    age: "required|int|min:18|max:120",
    name: "required|string|min:2|max:100"
});

// Validate data
const data = { 
    email: "user@example.com", 
    age: 25, 
    name: "John Doe" 
};

const isValid = validator.validate(data);
console.log(isValid); // true
console.log(validator.errors); // {}
```

### Using Formatting

```javascript
import FormatPipeline from "./format/FormatPipeline.mjs";
import { applyDigitTemplate } from "./format/Presets.mjs";

// Format a phone number
const formatted = applyDigitTemplate("1234567890", "(ddd) ddd-dddd");
console.log(formatted); // "(123) 456-7890"

// Apply multiple formatters
const pipeline = new FormatPipeline();
const result = pipeline.apply("hello_world text", "upper|replace(_,-)|trim");
console.log(result); // "HELLO-WORLD-TEXT"
```

## API Reference

### Models

**Model.js**
- `static create(data)` - Create new instance
- `async save()` - Insert or update the model
- `async delete()` - Delete the model from database
- `isDirty(prop?)` - Check if model has pending changes
- `isValid` - Check if model passes validation
- `emit(event, ...args)` - Emit model events

**Collection.mjs**
- `findBy(prop, value)` - Find by column
- `findIndexBy(prop, value, ...)` - Find index
- `column(prop)` - Get values for property
- `unique(prop)` - Get unique values
- `pluck(prop)` - Get array of values
- `forEach(fn, thisArg)` - Iterate collection
- `map(fn, thisArg)` - Map collection
- `filter(fn, thisArg)` - Filter collection

### Validation

**Validator.mjs**
- `validate(data)` - Validate data object
- `field(prop)` - Validate single field
- `errorsOf(prop)` - Get errors for field
- `messages(prop)` - Get error messages
- `debug` - Enable debug logging

**Available Rules**
- `required` - Field required
- `email` - Valid email
- `phone` - Valid phone number
- `postal` - Valid postal code
- `int|integer` - Integer value
- `string|text` - String type
- `min:n` - Minimum value/length
- `max:n` - Maximum value/length
- `length:n` - Exact length
- `match:pattern` - Regex match
- `in:a,b,c` - Value in set
- `unique:table.column` - Unique in database
- Custom async validation endpoints

### Database

**SQLBuilder.js**
- `table(name)` - Set table
- `select(columns?)` - SELECT query
- `insert(data)` - INSERT query
- `update(data)` - UPDATE query
- `delete()` - DELETE query
- `where(conditions)` - WHERE clause
- `limit(n)` - LIMIT clause
- `orderBy(column, direction?)` - ORDER BY
- `build()` - Get SQL: `{statement, args}`

**Database.js**
- `hasTable(name)` - Check table exists
- `insert(table, data)` - Insert record
- `update(table, data, where)` - Update records
- `delete(table, where)` - Delete records
- `first(table, where)` - Get first record
- `all(table, where)` - Get all records
- `count(table, where)` - Count records

### Formatting

**Presets**
- `applyDigitTemplate(value, template)` - Format with digit mask
- `applyPhoneFormat(value)` - Format as phone (ddd) ddd-dddd
- `applyCurrencyFormat(value)` - Format as currency
- `applyPercentFormat(value)` - Format as percentage

**String utilities**
- `ucwords(string)` - Capitalize words
- `camelCase(string)` - Convert to camelCase
- `snakeCase(string)` - Convert to snake_case
- `pascalCase(string)` - Convert to PascalCase
- `pad(string, length, char?)` - Pad string

## Events

Models emit events for lifecycle tracking:

- `change` - Property changed
- `valid` - Model became valid
- `invalid` - Model became invalid
- `save` - Model saved
- `delete` - Model deleted

Validators emit events:

- `change` - Errors changed
- `valid` - Data became valid
- `invalid` - Data became invalid

## Error Handling

Custom validation error classes:

- `ValueRequiredError` - Required field missing
- `EmailValidationError` - Invalid email
- `PhoneValidationError` - Invalid phone
- `PostalValidationError` - Invalid postal code
- `TypeValidationError` - Type mismatch
- `MinLengthError` - Below minimum
- `MaxLengthError` - Exceeds maximum
- `UniquePropertyError` - Duplicate value
- `InvalidTimestamp` - Invalid date/time

## Performance Tips

1. **Use Collections for bulk operations** - More efficient than individual model saves
2. **Enable migrations** - Automatic schema management with version tracking
3. **Validate early** - Catch errors before database operations
4. **Use validators on models** - Automatic validation on property changes
5. **Batch database operations** - Combine multiple inserts/updates

## Troubleshooting

### Import Paths
All modules use relative paths from `/data` as root:
- From `/data/models/Model.js`: `import ... from "../../juice/..."`
- From `/data/db/Database.js`: `import ... from "../../juice/..."`

### Validation Messages
Custom messages via `Validator.messages()` or set properties in `Messages.mjs`

### Database Connections
Use `SQLiteDatabase` for local SQLite or `RemoteDatabase` for message-based connections

### Type Checking
Use `ValidationUtil.type()` for JS type checking:
```javascript
type(value); // "string", "array", "object", etc.
type(value, "string"); // true if string
type(value, "!string"); // true if not string
```

## Related Modules

- `juice/Event/Emitter.mjs` - Base event emitter class
- `juice/Util/Core.mjs` - Utility functions
- `juice/Util/String.mjs` - String utilities
- `juice/Proxy/Watch.mjs` - Property watching
- `juice/Form/Builder.mjs` - Form integration

## License

Part of js-juice framework. See LICENSE for details.
