require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./models/User');

async function resetAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log('MongoDB connected');

        const admin = await User.findOne({
            email: 'admin@snapnearn.com'
        });

        if (!admin) {
            console.log('Admin user not found');
            return;
        }

        admin.password = 'Admin@123456';
        admin.role = 'admin';
        admin.isVerified = true;

        await admin.save();

        console.log('--------------------------------');
        console.log('ADMIN PASSWORD RESET SUCCESSFULLY');
        console.log('Email:', admin.email);
        console.log('Role:', admin.role);
        console.log('Password: Admin@123456');
        console.log('--------------------------------');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

resetAdmin();