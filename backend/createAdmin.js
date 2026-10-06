require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./models/User');

const createAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb://localhost:27017/cache_db'
        );

        console.log('MongoDB connected');

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            email: 'admin@snapnearn.com'
        });

        if (existingAdmin) {
            console.log('Admin already exists.');
            console.log('Email:', existingAdmin.email);
            console.log('Role:', existingAdmin.role);

            await mongoose.connection.close();
            return;
        }

        // Create admin
        const admin = await User.create({
            name: 'SnapNEarn Admin',
            email: 'admin@snapnearn.com',
            phone: '9999999999',
            password: 'Admin@123456',
            role: 'admin',
            isVerified: true
        });

        console.log('--------------------------------');
        console.log('ADMIN CREATED SUCCESSFULLY');
        console.log('--------------------------------');
        console.log('Email:', admin.email);
        console.log('Password: Admin@123456');
        console.log('Role:', admin.role);
        console.log('--------------------------------');

        await mongoose.connection.close();

    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();