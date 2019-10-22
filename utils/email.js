const nodemailer = require('nodemailer')

const sendEmail = async options => {
    // 1. create a transporter

    // example of gmail transporter
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_POST,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }

    });

    // 2. define the email options
    const mailOptions = {
        from: 'Domagoj Bakota',
        to: options.email,
        subject: options.subject,
        text: options.message,

    }

    // 3. actually send the email

    await transporter.sendMail(mailOptions);
}

module.exports = sendEmail;