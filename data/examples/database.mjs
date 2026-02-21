/**
 * Example: Database Operations and SQL Building
 * 
 * Demonstrates database connections, table management,
 * query building, and migrations.
 */

import SQLiteDatabase from "../db/SQLite/Database.js";
import SQLBuilder from "../db/SQLBuilder.js";
import Model from "../models/Model.js";

// ============================================================================
// Product Model for Examples
// ============================================================================

class Product extends Model {
    static tableName = "products";
    static primaryKey = "id";
    static fields = {
        id: "integer primary key autoincrement",
        name: "text not null",
        price: "real not null",
        quantity: "integer default 0",
        sku: "text unique",
        createdAt: "datetime default current_timestamp"
    };
}

// ============================================================================
// 1. Database Connection and Setup
// ============================================================================

function databaseSetupExample() {
    console.log("\n--- Database Setup ---");
    
    // Create database connection
    const db = new SQLiteDatabase("./example.db");
    console.log("✓ Database connection created");
    
    // Register model (creates table from model schema if needed)
    db.addModel(Product);
    console.log("✓ Products table created from model schema");
    
    return db;
}

// ============================================================================
// 2. Basic CRUD Operations
// ============================================================================

function basicCrudExample(db) {
    console.log("\n--- Basic CRUD Operations ---");
    
    // CREATE - Insert data
    const product = new Product({
        name: "Laptop",
        price: 999.99,
        quantity: 5,
        sku: "LAPTOP-001"
    });
    
    db.insert("products", product);
    console.log("✓ Inserted product:", product);
    
    // READ - Get record
    const found = db.first("products", { sku: "LAPTOP-001" });
    console.log("✓ Found product:", found);
    
    // UPDATE - Modify record
    const updated = { ...found, quantity: 10 };
    db.update("products", updated, { id: found.id });
    console.log("✓ Updated quantity to 10");
    
    // DELETE - Remove record (commented to preserve data)
    // db.delete("products", { id: found.id });
    // console.log("✓ Deleted product");
}

// ============================================================================
// 3. SQL Builder - Basic Queries
// ============================================================================

function sqlBuilderBasicExample() {
    console.log("\n--- SQL Builder - Basic Queries ---");
    
    // SELECT all
    let builder = new SQLBuilder("products");
    let query = builder.select("*").build();
    console.log("SELECT all:");
    console.log(`  SQL: ${query.statement}`);
    console.log(`  Args: ${JSON.stringify(query.args)}\n`);
    
    // SELECT specific columns
    builder = new SQLBuilder("products");
    query = builder.select(["name", "price", "quantity"]).build();
    console.log("SELECT specific columns:");
    console.log(`  SQL: ${query.statement}`);
    console.log(`  Args: ${JSON.stringify(query.args)}\n`);
    
    // INSERT
    builder = new SQLBuilder("products");
    query = builder.insert({
        name: "Mouse",
        price: 29.99,
        quantity: 50,
        sku: "MOUSE-001"
    }).build();
    console.log("INSERT:");
    console.log(`  SQL: ${query.statement}`);
    console.log(`  Args: ${JSON.stringify(query.args)}\n`);
    
    // UPDATE
    builder = new SQLBuilder("products");
    query = builder.update({ quantity: 75 }).where({ sku: "MOUSE-001" }).build();
    console.log("UPDATE:");
    console.log(`  SQL: ${query.statement}`);
    console.log(`  Args: ${JSON.stringify(query.args)}\n`);
    
    // DELETE
    builder = new SQLBuilder("products");
    query = builder.delete().where({ id: 1 }).build();
    console.log("DELETE:");
    console.log(`  SQL: ${query.statement}`);
    console.log(`  Args: ${JSON.stringify(query.args)}`);
}

// ============================================================================
// 4. SQL Builder - WHERE Clauses
// ============================================================================

function sqlBuilderWhereExample() {
    console.log("\n--- SQL Builder - WHERE Clauses ---");
    
    // Simple equality
    let builder = new SQLBuilder("products");
    let query = builder
        .select("*")
        .where({ name: "Laptop" })
        .build();
    console.log("WHERE name = 'Laptop':");
    console.log(`  SQL: ${query.statement}\n`);
    
    // Multiple conditions (AND)
    builder = new SQLBuilder("products");
    query = builder
        .select("*")
        .where({ 
            name: "Laptop",
            quantity: { ">": 5 }
        })
        .build();
    console.log("WHERE name AND quantity > 5:");
    console.log(`  SQL: ${query.statement}\n`);
    
    // LIKE operator
    builder = new SQLBuilder("products");
    query = builder
        .select("*")
        .where({ "name LIKE": "%top%" })
        .build();
    console.log("WHERE name LIKE '%top%':");
    console.log(`  SQL: ${query.statement}\n`);
    
    // IN operator
    builder = new SQLBuilder("products");
    query = builder
        .select("*")
        .where({ "id IN": [1, 3, 5] })
        .build();
    console.log("WHERE id IN (1, 3, 5):");
    console.log(`  SQL: ${query.statement}`);
    console.log(`  Args: ${JSON.stringify(query.args)}`);
}

// ============================================================================
// 5. SQL Builder - Complex Queries
// ============================================================================

function sqlBuilderComplexExample() {
    console.log("\n--- SQL Builder - Complex Queries ---");
    
    // SELECT with WHERE, ORDER BY, LIMIT
    let builder = new SQLBuilder("products");
    let query = builder
        .select(["name", "price", "quantity"])
        .where({ quantity: { ">": 0 } })
        .orderBy("price", "DESC")
        .limit(10)
        .build();
    console.log("Products ordered by price, top 10:");
    console.log(`  SQL: ${query.statement}`);
    console.log(`  Args: ${JSON.stringify(query.args)}\n`);
    
    // COUNT aggregates
    builder = new SQLBuilder("products");
    query = builder.count({ quantity: { ">": 0 } }).build();
    console.log("Count products in stock:");
    console.log(`  SQL: ${query.statement}`);
    console.log(`  Args: ${JSON.stringify(query.args)}\n`);
    
    // SUM aggregation
    builder = new SQLBuilder("products");
    query = builder
        .sum("(price * quantity)")
        .where({ quantity: { ">": 0 } })
        .build();
    console.log("Total inventory value:");
    console.log(`  SQL: ${query.statement}`);
    console.log(`  Args: ${JSON.stringify(query.args)}\n`);
    
    // MAX aggregation
    builder = new SQLBuilder("products");
    query = builder.max("price").build();
    console.log("Highest price:");
    console.log(`  SQL: ${query.statement}`);
    console.log(`  Args: ${JSON.stringify(query.args)}`);
}

// ============================================================================
// 6. Batch Operations
// ============================================================================

function batchOperationsExample(db) {
    console.log("\n--- Batch Operations ---");
    
    // Insert multiple records
    const products = [
        new Product({ name: "Keyboard", price: 79.99, quantity: 20, sku: "KB-001" }),
        new Product({ name: "Monitor", price: 299.99, quantity: 8, sku: "MON-001" }),
        new Product({ name: "Headphones", price: 149.99, quantity: 15, sku: "HP-001" })
    ];
    
    console.log("Inserting batch of products...");
    products.forEach(p => db.insert("products", p));
    console.log("✓ Batch insert completed");
    
    // Get all products (batch read)
    const allProducts = db.all("products");
    console.log("✓ Retrieved all products:", allProducts.length, "items");
    
    // Update multiple records by category
    console.log("Applying 10% discount to all products...");
    // In real scenario: db.update would multiply prices
    
    console.log("✓ Batch update completed");
}

// ============================================================================
// 7. Transactions
// ============================================================================

function transactionExample(db) {
    console.log("\n--- Transactions ---");
    
    try {
        console.log("Starting transaction...");
        
        // Begin transaction
        db.run("BEGIN TRANSACTION");
        
        // Multiple operations in transaction
        const product1 = new Product({ name: "Item A", price: 10, quantity: 100, sku: "A-001" });
        const product2 = new Product({ name: "Item B", price: 20, quantity: 50, sku: "B-001" });
        
        db.insert("products", product1);
        db.insert("products", product2);
        
        console.log("Operations completed, committing...");
        
        // Commit transaction
        db.run("COMMIT");
        console.log("✓ Transaction committed successfully");
        
    } catch (error) {
        console.error("✗ Transaction failed, rolling back...");
        db.run("ROLLBACK");
    }
}

// ============================================================================
// 8. Query Optimization Patterns
// ============================================================================

function optimizationPatternsExample(db) {
    console.log("\n--- Query Optimization Patterns ---");
    
    // 1. Index frequently queried columns
    console.log("1. Creating index on SKU (for fast lookups):");
    db.run("CREATE INDEX IF NOT EXISTS idx_sku ON products(sku)");
    console.log("   ✓ Index created\n");
    
    // 2. Use LIMIT for pagination
    const pageSize = 10;
    const page = 1;
    const offset = (page - 1) * pageSize;
    
    let builder = new SQLBuilder("products");
    let query = builder
        .select("*")
        .limit(pageSize)
        .offset(offset)
        .build();
    console.log("2. Paginated query (page 1, 10 per page):");
    console.log(`   SQL: ${query.statement}\n`);
    
    // 3. Select only needed columns
    console.log("3. Select only needed columns (reduces I/O):");
    builder = new SQLBuilder("products");
    query = builder.select(["id", "name", "price"]).build();
    console.log(`   SQL: ${query.statement}\n`);
    
    // 4. Use WHERE to filter early
    console.log("4. Filter with WHERE clause (reduces processing):");
    builder = new SQLBuilder("products");
    query = builder
        .select("*")
        .where({ quantity: { ">": 0 } })
        .build();
    console.log(`   SQL: ${query.statement}`);
}

// ============================================================================
// 9. Main Example Runner
// ============================================================================

function runExamples() {
    try {
        console.log("====================================");
        console.log("Database & SQL Builder Examples");
        console.log("====================================");
        
        const db = databaseSetupExample();
        basicCrudExample(db);
        sqlBuilderBasicExample();
        sqlBuilderWhereExample();
        sqlBuilderComplexExample();
        batchOperationsExample(db);
        transactionExample(db);
        optimizationPatternsExample(db);
        
        console.log("\n====================================");
        console.log("✓ All database examples completed!");
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
