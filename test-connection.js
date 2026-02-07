require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

console.log('📡 Testing MongoDB Connection...');
console.log('Connection String (hidden password):', uri.replace(/:([^@]+)@/, ':****@'));

async function testConnection() {
    try {
        await mongoose.connect(uri);
        console.log('✅ SUCCESS! Connected to MongoDB:', mongoose.connection.name);
        console.log('📊 Connection state:', mongoose.connection.readyState);

        // List databases
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log('📁 Available databases:', dbs.databases.map(db => db.name));

        process.exit(0);
    } catch (err) {
        console.error('❌ FAILED! Error:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    }
}

testConnection();
