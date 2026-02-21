/**
 * Example: Using Models with ORM
 * 
 * Demonstrates how to create model classes, perform CRUD operations,
 * work with relationships, and use validation.
 */

import Model from "../models/Model.js";
import Collection from "../models/Collection.mjs";
import SQLiteDatabase from "../db/SQLite/Database.js";

// ============================================================================
// 1. Define Models
// ============================================================================

/**
 * User model with posts relationship
 */
class User extends Model {
    static tableName = "users";
    static primaryKey = "id";
    static fields = {
        id: "integer primary key autoincrement",
        name: "text not null",
        email: "text not null unique",
        status: "text default 'active'",
        createdAt: "datetime default current_timestamp"
    };

    // Define relationships
    static relationships = {
        posts: { type: "hasMany", model: "Post", foreignKey: "userId" }
    };

    // Add validation rules
    static validationRules = {
        name: "required|string|min:2|max:100",
        email: "required|email|unique:users.email",
        status: "in:active,inactive,pending"
    };
}

/**
 * Post model with user relationship
 */
class Post extends Model {
    static tableName = "posts";
    static primaryKey = "id";
    static fields = {
        id: "integer primary key autoincrement",
        userId: "integer not null",
        title: "text not null",
        content: "text",
        published: "boolean default 0",
        createdAt: "datetime default current_timestamp"
    };

    static relationships = {
        user: { type: "belongsTo", model: "User", foreignKey: "userId" }
    };

    static validationRules = {
        title: "required|string|min:5|max:200",
        content: "required|string|min:10",
        published: "boolean"
    };
}

// ============================================================================
// 2. Setup Database
// ============================================================================

async function setupDatabase() {
    const db = new SQLiteDatabase("./example.db");
    
    // Register models
    db.addModel(User);
    db.addModel(Post);
    
    // Auto-create tables from model schema
    if (!db.hasTable("users")) {
        db.createTable("users", User.fields);
    }
    if (!db.hasTable("posts")) {
        db.createTable("posts", Post.fields);
    }
    
    return db;
}

// ============================================================================
// 3. Create (INSERT) Operations
// ============================================================================

async function createExamples(db) {
    console.log("\n--- CREATE Operations ---");
    
    // Create user instance
    const user1 = new User({
        name: "Alice Johnson",
        email: "alice@example.com",
        status: "active"
    });
    
    // Validate before saving
    if (user1.isValid) {
        await db.insert("users", user1);
        console.log("Created user:", user1);
    }
    
    // Create another user
    const user2 = new User({
        name: "Bob Smith",
        email: "bob@example.com"
    });
    await db.insert("users", user2);
    console.log("Created user:", user2);
    
    // Create posts
    const post1 = new Post({
        userId: user1.id,
        title: "Getting Started with ORM",
        content: "This is a comprehensive guide to using the ORM framework...",
        published: true
    });
    await db.insert("posts", post1);
    
    const post2 = new Post({
        userId: user1.id,
        title: "Advanced Query Techniques",
        content: "Learn how to optimize your database queries..."
    });
    await db.insert("posts", post2);
    
    return { user1, user2, post1, post2 };
}

// ============================================================================
// 4. Read (SELECT) Operations
// ============================================================================

async function readExamples(db) {
    console.log("\n--- READ Operations ---");
    
    // Get first user
    const user = await db.first("users", { email: "alice@example.com" });
    console.log("Found user:", user);
    
    // Get all users
    const users = await db.all("users");
    console.log("All users:", users);
    
    // Get all posts by user
    const userPosts = await db.all("posts", { userId: user.id });
    console.log("User posts:", userPosts);
    
    // Count users
    const userCount = await db.count("users");
    console.log("Total users:", userCount);
    
    // Count posts by status
    const publishedCount = await db.count("posts", { published: true });
    console.log("Published posts:", publishedCount);
    
    return { user, users };
}

// ============================================================================
// 5. Update (UPDATE) Operations
// ============================================================================

async function updateExamples(db) {
    console.log("\n--- UPDATE Operations ---");
    
    // Update a user
    const user = await db.first("users", { email: "alice@example.com" });
    
    const updatedUser = new User({
        ...user,
        status: "inactive"
    });
    
    await db.update("users", updatedUser, { id: user.id });
    console.log("Updated user status to:", updatedUser.status);
    
    // Update multiple records
    await db.update("posts", { published: true }, { userId: user.id });
    console.log("Marked all user posts as published");
}

// ============================================================================
// 6. Delete (DELETE) Operations
// ============================================================================

async function deleteExamples(db) {
    console.log("\n--- DELETE Operations ---");
    
    // Delete a specific post
    const post = await db.first("posts", { title: "Advanced Query Techniques" });
    
    if (post) {
        await db.delete("posts", { id: post.id });
        console.log("Deleted post:", post.title);
    }
    
    // Delete multiple records (be careful!)
    // await db.delete("posts", { userId: 1 });
}

// ============================================================================
// 7. Collections and Batch Operations
// ============================================================================

async function collectionExamples(db) {
    console.log("\n--- Collection Operations ---");
    
    // Get all users as collection
    const users = await db.all("users");
    const collection = new Collection(...users);
    
    // Map through collection
    const names = collection.map(user => user.name);
    console.log("User names:", names);
    
    // Filter collection
    const activeUsers = collection.filter(u => u.status === "active");
    console.log("Active users:", activeUsers.length);
    
    // Get column values
    const emails = collection.column("email");
    console.log("All emails:", emails);
    
    // Find user by email
    const user = collection.findBy("email", "alice@example.com");
    console.log("Found by email:", user);
}

// ============================================================================
// 8. Event Listening
// ============================================================================

function eventExamples() {
    console.log("\n--- Event Listening ---");
    
    const user = new User({
        name: "Charlie Brown",
        email: "charlie@example.com"
    });
    
    // Listen to property changes
    user.on("change", (prop, value) => {
        console.log(`User.${prop} changed to:`, value);
    });
    
    // Listen to validation state changes
    user.on("valid", () => console.log("User is now valid"));
    user.on("invalid", () => console.log("User is now invalid"));
    
    // Make changes
    user.name = "Charles Brown"; // Triggers change event
    
    // Update and trigger validation
    user.email = "invalid-email"; // May trigger invalid event
}

// ============================================================================
// 9. Main Example Runner
// ============================================================================

async function runExamples() {
    try {
        console.log("====================================");
        console.log("Models & ORM Examples");
        console.log("====================================");
        
        const db = await setupDatabase();
        console.log("✓ Database setup complete");
        
        const data = await createExamples(db);
        const { user, users } = await readExamples(db);
        
        await updateExamples(db);
        await deleteExamples(db);
        await collectionExamples(db);
        
        eventExamples();
        
        console.log("\n====================================");
        console.log("✓ All examples completed successfully!");
        console.log("====================================");
        
    } catch (error) {
        console.error("Error running examples:", error);
    }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runExamples();
}

export { User, Post, setupDatabase, runExamples };
