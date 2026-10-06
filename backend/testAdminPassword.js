require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./models/User');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const user = await User.findOne({
            email: 'admin@snapnearn.com'
        }).select('+password');

        if (!user) {
            console.log('ADMIN NOT FOUND');
            return;
        }

        console.log('Admin found');
        console.log('Email:', user.email);
        console.log('Role:', user.role);

        const result = await user.comparePassword('Admin@123456');

        console.log('Password matches:', result);

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.connection.close();
    }
}

test();