const express = require('express');
const dotenv = require('dotenv')
dotenv.config()
const cors = require("cors");
var bodyParser = require('body-parser');

console.log(process.env.NODE_ENV)

const OpenAI = require('openai')
const path = require('path')
const {generateUploadURL} = require('./s3.js')
const { engine } = require('express-handlebars');

const app = express();

//Body parser middleware (for sending back data in html)
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(express.json());

app.use(cors());
// app.use(express.urlencoded({extended: false}));

//Set static folder (since this below the router, the static html will not render)
app.use(express.static(path.join(__dirname,'')))


const nodemailer = require('nodemailer');
app.use('/sendEmail', async(req,res)=>{
    const {params} = req.body

    const to = params.to // This should be an array of addresses ['xyz@gmail.com', "abc@gmail.com"]
    const cc = params.cc || null // This should be an array of addresses ['xyz@gmail.com', "abc@gmail.com"]
    const bcc = params.bcc || null // This should be an array of addresses ['xyz@gmail.com', "abc@gmail.com"]
    const subject = params.subject || "No Subject"
    const message = params.message || null 
    const htmlPage = params.htmlPage || null
    const attachments = params.attachments || null // This should be an array of with file names and path ([filename: "file1.pdf", "documents/pdfFiles/file1.pdf"])

    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Use the email service you prefer (e.g., 'Gmail', 'SendGrid', etc.)
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.GMAIL_USER, // Replace with your email address
            pass: process.env.GMAIL_PASSWORD, // Replace with your email password or an app-specific password
        },
    });

    // Email content
    const mailOptions = {
        from: {
            name: "nlightn labs",
            address: process.env.GMAIL_USER
        },
        to: to, // Recipient's email address
        subject: subject,
        text: message,
        html: htmlPage,
        cc: cc,
        bcc: bcc,
        attachments: attachments
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('Error sending email:', error);
        res.send(false)
    } else {
        console.log('Email sent:', info.response);
        res.send(true)
    }
    });
})


//setup port for server
const port = process.env.PORT || 3001;
app.listen(port, ()=>{
    console.log(`Server is running and listening on port ${port}`);
});