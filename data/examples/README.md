# Data Module Examples

Comprehensive examples demonstrating all features of the data module including models/ORM, validation, database operations, and formatting.

## Quick Start

Run all examples:
```bash
node examples/index.mjs --all
```

Run specific examples:
```bash
node examples/index.mjs --models      # Models & ORM examples
node examples/index.mjs --validate    # Validation examples
node examples/index.mjs --database    # Database & SQL Builder examples
node examples/index.mjs --format      # Formatting & String utilities examples
```

## Example Files

### models.mjs
Demonstrates ORM capabilities including:
- Model definition with schema
- CRUD operations (Create, Read, Update, Delete)
- Model relationships (hasMany, belongsTo)
- Collections and batch operations
- Model validation
- Event listening and lifecycle

**Key topics:**
- Creating model classes with static schema
- Setting up database connections
- Inserting, querying, updating, and deleting records
- Working with collections
- Listening to model events

### validation.mjs
Demonstrates the validation system:
- Basic validation with rule strings
- Field-level validation
- Custom validation messages
- Common validation rules
- Conditional validation
- Async validation with endpoints
- Debug mode for troubleshooting
- Error handling and reporting

**Key topics:**
- Creating validators with rules
- Validating data objects
- Understanding error types
- Using debug mode to understand validation
- Async validation patterns
- Generating error reports

### database.mjs
Demonstrates database operations:
- Database connection and setup
- Basic CRUD operations
- SQL Builder for query construction
- Complex WHERE clauses
- Aggregation functions (COUNT, SUM, MAX)
- Batch operations
- Transactions
- Query optimization patterns
- Index creation

**Key topics:**
- Creating database connections
- Building SQL queries programmatically
- Handling WHERE clauses and operators
- Using aggregation functions
- Batch insert/update operations
- Transaction management
- Query optimization tips

### formatting.mjs
Demonstrates string formatting and utilities:
- Case conversions (camelCase, snake_case, PascalCase, etc.)
- Digit template formatting (phone, SSN, postal codes)
- Phone number formatting
- Currency and percentage formatting
- String padding and alignment
- String splitting and joining
- Text truncation
- Format pipelines
- Practical real-world examples

**Key topics:**
- Converting between case styles
- Formatting numbers with templates
- Padding and aligning strings
- Chaining formatters with pipelines
- Practical display formatting
- Masking sensitive data

### index.mjs
Main entry point that runs all examples or specific categories.

## Running Individual Examples

You can also run individual example files directly:

```bash
# Run models example only
node examples/models.mjs

# Run validation example only
node examples/validation.mjs

# Run database example only
node examples/database.mjs

# Run formatting example only
node examples/formatting.mjs
```

## Example Structure

Each example file contains:

1. **Documentation comments** - Explaining what's being demonstrated
2. **Example functions** - Focused on single concepts
3. **Main runner** - Orchestrates and runs all functions
4. **Exports** - For importing and reusing examples

## Learning Path

Recommended order for learning:

1. **Start with formatting.mjs** - Simple string utilities to understand basics
2. **Then validation.mjs** - Learn validation rules and error handling
3. **Then database.mjs** - Understand database connections and SQL building
4. **Finally models.mjs** - Bring it all together with ORM

## Common Patterns

### Basic Model Usage
```javascript
class User extends Model {
    static tableName = "users";
    static fields = { id: "integer primary key", name: "text" };
}

const db = new SQLiteDatabase("app.db");
const user = new User({ name: "John" });
await db.insert("users", user);
```

### Basic Validation
```javascript
const validator = new ValidatorInstance({
    email: "required|email",
    age: "required|int|min:18"
});

const isValid = validator.validate(data);
```

### Basic Database Query
```javascript
const builder = new SQLBuilder("users");
const query = builder
    .select("*")
    .where({ status: "active" })
    .orderBy("name")
    .build();
```

### Basic Formatting
```javascript
const formatted = applyDigitTemplate("5551234567", "(ddd) ddd-dddd");
const cased = StringUtils.camelCase("hello-world");
```

## Tips and Tricks

### Debugging Validation
Enable debug mode to see validation:
```javascript
validator.debug = true;
validator.validate(data); // Logs detailed debug info
```

### Checking Query SQL
Use `build()` to see generated SQL:
```javascript
const { statement, args } = builder.select().build();
console.log(statement);
```

### Checking Model Changes
Listen to model events:
```javascript
model.on("change", (prop, value) => {
    console.log(`Changed: ${prop} = ${value}`);
});
```

### Testing Formatters
Run formatting examples to see all available formatters:
```bash
node examples/formatting.mjs
```

## Related Documentation

- See [../README.md](../README.md) for complete API reference
- See individual module files for JSDoc documentation
- See module READMEs in subdirectories for feature guides

## Troubleshooting

### Import Errors
Make sure you're running from the project root:
```bash
node data/examples/index.mjs --all
# or from data folder:
node examples/index.mjs --all
```

### Database Errors
The examples create `./example.db` in the current directory. Make sure the directory is writable.

### Missing Methods
Some examples use simplified patterns. Check the actual implementation files for complete API details.

## Contributing

When adding new examples:
1. Follow the existing structure with numbered sections
2. Add JSDoc comments explaining the example
3. Include working code that can be run standalone
4. Update this README with new example descriptions
5. Ensure examples are educational and self-contained

## License

Part of the js-juice framework. See LICENSE for details.
