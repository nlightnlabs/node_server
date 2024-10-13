// convert "require" to import for ES
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Import Express and create express app
const express = require('express');
const app = express();

const cors = require("cors");
app.use(cors());
app.options('*', cors());

//Import environment evariables
const dotenv = require('dotenv')
dotenv.config();
console.log(process.env.NODE_ENV)

//Create path functions
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory


//Body parser middleware (for sending back data in html)
var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(express.json());
app.use(bodyParser.json());


const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs')


const aws = require('aws-sdk')
const crypto = require('crypto')
const { promisify } =require('util');
const randomBytes = promisify(crypto.randomBytes)


const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;

var FormData = require('form-data');

// import fetch from 'node-fetch'
const multer = require('multer');


const OpenAI = require('openai')

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API_KEY,
})
console.log("OPEN_AI_API_KEY",process.env.OPEN_AI_API_KEY,)


const { engine } = require('express-handlebars');

//Handlebars Middleware
app.engine('handlebars', engine({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');


//Set static folder (since this below the router, the static html will not render)
app.use(express.static(path.join(__dirname,'')))

//Homepage Route
app.get('/', (req,res)=>{
    res.sendFile(path.join(__dirname, '/', 'index.html'))
})

//Setup database query function
const {Pool} = require("pg");
const pool = new Pool({ ssl: { rejectUnauthorized: false } });
pool.connect((err, release) => {
    if (err) {
      return console.error(`connection error to database`, err.stack)
    } else {
      return //console.log(`connected successfuly to database`)
    }
  })
const dbQuery=(text, params) =>pool.query(text, params);


//general database query
app.use("/nlightn/db/query", async (req, res)=>{
    
    const {query} = req.body
    const dbName = req.body.dbName || process.env.PGDATABASE

    const newpool = new Pool({...(pool._clients[0].connectionParameters),...{["database"]:dbName}});
    const dbQuery=(text, params) =>newpool.query(text, params);
    
    try{
        const result = await dbQuery(query);
        res.json(result.rows);
        console.log(result.rows)

    } catch(err){
        res.send(err)
        console.log(err)
    }
})

app.post("/nlightn/db/addRecord",async (req, res)=>{
        // console.log(req)
        const {tableName, formData} = req.body

        console.log("*******running add record query....****")
        console.log("TABLE NAME: ",tableName)
        console.log("FORM DATA: ", formData)
    
        // List of keys to delete
        let keysToDelete = ['id', 'record_created'];
    
        keysToDelete.forEach(key => {
            if (formData.hasOwnProperty(key)) {
                delete formData[key];
            }
        });


    let columns = Object.keys(formData)
    columns.map((item,index)=>{
        columns[index] = `"${item}"`
      }).toString()
    
    let values = Object.values(formData)
    values.map((item,index)=>{
        if(item == "" || item==null){
            values[index]='null'
        }else{
            values[index]=`'${item}'`
        }
      }).toString()

    
    const query =`INSERT into ${tableName} (${columns}) VALUES (${values}) returning *;`;
    console.log(query)

    try{
        const result = await dbQuery(query);
        res.json(result.rows[0]);
    } catch(err){
        console.log(err)
    }
})

app.post("/nlightn/db/updateRecord",async (req, res)=>{
    
    const {tableName, idField,recordId, formData} = req.body
    //console.log(formData)

    let fieldsAndValues = []
    Object.keys(formData).map(field=>{
        //console.log(field)
        if (field!=='id' && field!=='record_created'){
            if(tableName=='users' && field=='pwd'){
                let encryptedPwd = `crypt('${formData[field]}',gen_salt('bf'))`
                fieldsAndValues.push(`"${field}" = ${encryptedPwd}`)
            }else{
                let value=`'${formData[field]}'`
                if(formData[field] ==null || formData[field]=="null" || formData[field]==""){
                    value=null
                }
                fieldsAndValues.push(`"${field}" = ${value}`)
            }
        }
    })
    fieldsAndValues = fieldsAndValues.toString()

    const query =`UPDATE ${tableName} set ${fieldsAndValues} where "${idField}" ='${recordId}' returning *;`;
    console.log(query)

    try{
        const result = await dbQuery(query);
        // console.log(result)
        res.json(result.rows[0]);
    } catch(err){
        console.log(err)
    }
})

app.post("/nlightn/db/getRecord",async (req, res)=>{

    const {tableName,conditionalField,condition} = req.body

    const query =`Select * from ${tableName} where "${conditionalField}"='${condition}' limit '1';`;
    console.log(query)
    try{
        const result = await dbQuery(query);
        console.log(result)
        res.json(result.rows[0]);
    } catch(err){
        // console.log(err)
    }
})

app.post("/nlightn/db/getRecords",async (req, res)=>{

    const {tableName,conditionalField,condition} = req.body

    const query =`Select * from ${tableName} where "${conditionalField}"='${condition}';`;
    //console.log(query)
    try{
        const result = await dbQuery(query);
        res.json(result.rows);
    } catch(err){
        //console.log(err)
    }
})


//Delete Record
app.post("/nlightn/db/deleteRecord", async (req,res)=>{

    const {params} = req.body
    const tableName = params.tableName
    const recordId = params.recordId
    const idField = params.idField

    try{    
        const result = await dbQuery(`DELETE from ${tableName} WHERE "${idField}" = '${recordId}' returning *;`)
        res.status(200).json(result);
    } catch(err){
        //console.log(err)
    }
})

//database query to get a table
app.get("/nlightn/db/table/:table/:dbName?", async (req, res)=>{
    
    const table = req.params.table;
    const dbName = req.params.dbName || process.env.PGDATABASE;
    const newpool = new Pool({...(pool._clients[0].connectionParameters),...{["database"]:dbName}});
    const dbQuery=(text, params) =>newpool.query(text, params);

    try{
        const result1 = await dbQuery(`SELECT * from ${table};`);
        const data = result1.rows

        const result2 = await dbQuery(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`)
        console.log(result2.rows)
        const dataTypes = result2.rows

        res.json({data, dataTypes});

    } catch(err){
        //console.log(err)
    }
})

//database query to get a table
app.post("db/data", async (req, res)=>{

    const tableName = "users";

    try{
        const result1 = await dbQuery(`SELECT * from ${tableName};`);
        //console.log(result1.rows)
        const data = result1.rows

        const result2 = await dbQuery(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`)
        //console.log(result2.rows)
        const dataTypes = result2.rows

        res.json({data, dataTypes});

    } catch(err){
        //console.log(err)
    }
})




//database query to get a list from a table
app.get("/nlightn/db/list/:table/:field", async (req, res)=>{
    const {table, field} = req.params
    try{
        const result = await dbQuery(`SELECT DISTINCT "${field}" from ${table};`)
        const data = result.rows;
        var list = [];
        data.forEach(r=>{
            list.push(Object.values(r)[0]);
        });
        //console.log(list);
        res.json(list);
    } catch(err){
        //console.log(err)
    }
})

//database query to get a sublist from a table
app.get("/nlightn/db/subList/:table/:field/:conditionalField/:conditionalValue", async (req, res)=>{

    const table = req.params.table;
    const field = req.params.field;
    const conditionalField = req.params.conditionalField;
    const conditionalValue = req.params.conditionalValue;

    const query = `SELECT DISTINCT ${field} from ${table} where ${conditionalField} = '${conditionalValue}';`

    //console.log(query)

    try{
        const result = await dbQuery(query)
        const data = result.rows;
        var list = [];
        data.forEach(r=>{
            list.push(Object.values(r)[0]);
        });
        //console.log(list);
        res.json(list);
    } catch(err){
        //console.log(err)
    }
})


//database query to get a record from a table
app.get("/nlightn/db/records/:table/:conditionalField/:conditionalValue", async (req, res)=>{

    const table = req.params.table;
    const conditionalField = req.params.conditionalField;
    const conditionalValue = req.params.conditionalValue;

    try{
        const result = await dbQuery(`SELECT * from ${table} where ${conditionalField} = ${conditionalValue};`)
        res.json(result.rows);
    } catch(err){
        // console.log(err)
    }
})
    

//database query to get a single value from a table
app.get("/nlightn/db/value/:table/:lookupField/:conditionalField/:conditionalValue", async (req, res)=>{
    
    const table = req.params.table;
    const lookupField = req.params.lookupField;
    const conditionalField = req.params.conditionalField;
    const conditionalValue = req.params.conditionalValue;
    
    try{
        const result = await dbQuery(`SELECT "${lookupField}" from ${table} where "${conditionalField}" = '${conditionalValue}';`)
        res.status(200).json(Object.values(result.rows[0])[0]);
        //console.log(Object.values(result.rows[0])[0])
    } catch(err){
        //console.log(err)
    }
})

// Filter Table
app.post("/nlightn/db/filterTable",async (req, res)=>{
    
    const {params} = req.body

    //console.log(params)
    const tableName = params.tableName
    const filterList = params.filterList
    //console.log(filterList)

    let filterString = "" 
    const numberOfFilters = filterList.length

    filterList.map((item,index)=>{  
      if(item.value.length !=0 || item.value !=""){
          let conditionString = `"${item.db_name}"${item.condition}'${item.db_value}'`
          //console.log(index)
          if(index == 0 || index < numberOfFilters-1){
            filterString = `${filterString}${conditionString}`
          }else{
            filterString = `${filterString} and ${conditionString}`
          }
      }      
    })
    let query = ""      
    if(filterString.length>0 && filterString !=""){
      query = `SELECT * FROM ${tableName} WHERE ${filterString};`
      //console.log(query)
    }else{
      query = `SELECT * FROM ${tableName};`
      //console.log(query)
    }

    try{
        const result1 = await dbQuery(query);
        //console.log(result1.rows)
        const data = result1.rows
    
        const result2 = await dbQuery(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`)
        //console.log(result2.rows)
        const dataTypes = result2.rows
    
        res.json({data, dataTypes});

    } catch(err){
        //console.log(err)
        const result1 = await dbQuery(`SELECT * FROM ${tableName}`);
        const data = result1.rows
    
        const result2 = await dbQuery(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`)
        //console.log(result2.rows)
        const dataTypes = result2.rows

        res.json({data, dataTypes});
    }
})


// Authenticate user
app.use("/nlightn/db/authenticateUser", async (req,res)=>{
    
    const params = req.body.params
    const email = params.email
    const pwd = params.pwd

    const query = `select ((select pwd from "users" where email='${email}') =crypt('${pwd}',(select pwd from "users" where email='${email}'))) as matched;`

    console.log(query);

      try{    
        const result = await dbQuery(query);
        console.log(result)
        let matchResult = result.rows[0].matched
        if(matchResult !==true){
            matchResult = false
        }
        console.log(matchResult)
        res.send(matchResult)
    } catch(err){
        console.log(err)
    }
})


//get user record
app.use("/nlightn/db/userRecord", async (req, res)=>{
    const {params} = req.body
    const email = params.email
    const query =`select * from "users" where "email"='${email}' limit 1`
    try{
        const results = await dbQuery(query);
        //console.log(results);
        res.send(results.rows[0])
    }catch(error){
        res.send(error)
    }
})

//add user record
app.post("/nlightn/db/addUser", async(req, res)=>{

    const {params} = req.body
    console.log(params)
    const tableName = params.tableName
    console.log(tableName)

    const formData = params.formData
    console.log(formData)

    let columns = Object.keys(formData)
    let values = Object.values(formData)

    console.log(columns)
    console.log(values)

    if(tableName =='users' && columns.includes('pwd')){

        const emailLoc = columns.findIndex(x=>x==='email')
        const email =values[emailLoc].toString()

        const pwdIndex = columns.findIndex(str=>str=='pwd')
        values[pwdIndex]=`crypt('${values[pwdIndex]}',gen_salt('bf'))`

        columns.map((item,index)=>{
            console.log(`${item}: ${columns[index]}`)
            columns[index] = `"${item}"`
          }).toString()
          console.log(columns)
        

        values.map((item,index)=>{
            console.log(`${item}: ${values[index]}`)
            if(item.includes("pwd")){
                values[index] = item
            }else{
                values[index] = (`'${item}'`).replace("'null'","null")
            }
          }).toString()
        console.log(values)

        // Query 1: check if user exists    
        const query1 =`select "email" from ${tableName} where "email"='${email}' limit 1;`
        console.log(query1)

        try{
            const results = await dbQuery(query1);
            console.log(results)
            const checkExistingUser = results.rows[0]
            console.log(checkExistingUser)

            if(checkExistingUser==null){

                console.log("Existing user not found. Adding new user")
                
                // Query 2 add new user if it doesn't exist
                const query2 =`INSERT into ${tableName} (${columns}) VALUES (${values}) returning *;`;
                console.log(query2)

                try {
                    const results2 = await dbQuery(query2);
                    console.log(results2.rows[0]);
                    if (results2.rows[0]) {
                        res.send("User Added"); // Send response if user was successfully added
                    } else {
                        res.send("Failed to add user"); // Send response if user was not added
                    }
                } catch (error) {
                    console.log(error);
                    res.status(500).send("Internal Server Error"); // Send error response
                }

            }else{
                console.log("User exists")
                res.send("User Exists")
            }
        }catch(error){
            console.log(error)
            res.send(error)
        }
    }else{
        console.log("Query is not for users table with valid password")
    }
})

const nodemailer = require('nodemailer');
const e = require('express');
app.use('/nlightn/sendemail', async(req,res)=>{
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
        //console.log('Email sent:', info.response);
        res.send(true)
    }
    });
})





// Edit user record
app.put("/nlightn/db/editUser", async(req, res)=>{

    const {params} = req.body
    let table = params.table
    let columns = params.columns
    let values = params.values

    if(table =='users' && columns.includes('pwd')){
        const pwdIndex = columns.findIndex(str=>str=='pwd')
        values[pwdIndex]=`crypt('${values[pwdIndex]}',gen_salt('bf'))`

        const emailLoc = columns.findIndex(x=>x==='email')
        const email =values[emailLoc].toString()

        // Query 1: Check if user exists
        const query1 = `select ((select email from "users" where email='${email}')) as matched;`

        try {
            const results = await dbQuery(query1);
            //console.log(results);
            let matchResult = results.rows[0].matched
            //console.log(matchResult)
            //sends back true if user is found.
            res.send(matchResult)

            if (matchResult !=="true"){
                // Query 2: remove the pwd field and insert all other fields
                columns = columns.toString()
                values.map((item,index)=>{
                    values[index] = `'${item}'`
                  }).toString()

                const query2 =`INSERT into ${table} (${columns}) VALUES (${values});`;
                //console.log(query2)
                try {
                    const results = await dbQuery(query2);
                    //console.log(results);
                    res.status(200).json({
                    status: "success",
                    data: results.rows[0]
                });  
                } catch(err){
                    //console.log(err)
                }
            }
        } catch(err){
            console.log(err)
            res.err
        }
    }
})



//Basic GPT response
app.post("/openai/gpt/ask", async(req,res)=>{

    console.log(req.body)

    const {prompt, data, temperature} = req.body;
    console.log(prompt)
    console.log(data)
    console.log(temperature)

    const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
    })
    console.log("OPEN_AI_API_KEY",process.env.OPEN_AI_API_KEY)

    try{
        const response = await openai.chat.completions.create(
            {
                model: "gpt-4o",
                messages: [
                    {"role": "user", "content": prompt},
                    {"role": "system", "content": JSON.stringify(data) || null},
                ],
                max_tokens: 16300,
                temperature: temperature || 0
            }
        )

        // Set CORS headers to allow any origin
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        console.log(response.choices[0].message.content)
        res.json(response.choices[0].message.content)
        

    }catch(error){
        console.log(error);
    }
});


//GPT classify
app.use("/openai/gpt/classify", async(req,res)=>{

    const text = req.body.text;
    const list = req.body.list;
    console.log("text",text)
    console.log("list",list)

    const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
    })

    const prompt = `Which one of the following items in this list: ${list}, does ${text} best fit into?. Respond only with the exact name of the item in the list.`
    
    try{
        const response = await openai.chat.completions.create(
            {
                model: "gpt-4o",
                messages: [{"role": "user", "content": prompt}],
                temperature: 0
            }
        )

        // Set CORS headers to allow any origin
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        console.log(response.choices[0].message.content)
        res.json(response.choices[0].message.content)

    }catch(error){
        console.log(error);
    }
});


// GPT Return List
app.get("/openai/gpt/list/:prompt", async(req,res)=>{

    const promptText= req.params.prompt
    console.log(prompt)

    const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
    })

    const prompt = `${promptText}. Return only a list with no numbers in json array format.`
    
    try{
        const response = await openai.chat.completions.create(
            {
                model: "gpt-4o",
                messages: [{"role": "user", "content": prompt}],
                max_tokens: 400,
                temperature: 0
            }
        )

        // Set CORS headers to allow any origin
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        console.log(response)
        res.json(JSON.parse(response.choices[0].message.content))
    }catch(error){
        console.log(error);
    }
});


//GPT Return Data
app.get("/openai/gpt/data/:prompt", async(req,res)=>{

    const {promptText} = req.body

    const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
    })

    const prompt = `${promptText}. Summarize in json object format.`
    
    try{
        const response = await openai.chat.completions.create(
            {
                model: "gpt-4o",
                messages: [{"role": "user", "content": prompt}],
                max_tokens: 1000,
                temperature: 0
            }
        )

        // Set CORS headers to allow any origin
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        //console.log(response)
        res.json(JSON.parse(response.choices[0].message.content))

    }catch(error){
        //console.log(error);
    }
});

//GPT Image Generation
app.use("/openai/dalle/image", async(req,res)=>{

    const {prompt} = req.body;
    console.log(prompt)
   
    const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
    })

    try {
        const image = await openai.images.generate({ 
            model: "dall-e-3", 
            prompt: prompt,
            size: "1792x1024"
        });

        // Set CORS headers to allow any origin
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        //console.log(image.data);
        res.json(image.data)
    }catch(error){
        //console.log(error)
    }
})



const upload = multer({ dest: "uploads/" });
app.use("/openai/whisper", upload.single("file"), async (req, res) => {
    console.log(req.file);
    const audioFile = req.file;

    try {
        if (!audioFile) {
          return res.status(400).json({ error: 'No audio file provided' });
        }

        // Determine file extension based on MIME type
        let fileExtension = '';
        switch (audioFile.mimetype) {
            case 'audio/wav':
                fileExtension = '.wav';
                break;
            case 'audio/mp3':
                fileExtension = '.mp3';
                break;
            // Add more cases as needed for other audio formats
            default:
                fileExtension = '.unknown'; // Unknown format
        }

        // Rename the uploaded file with the correct file extension
        const audioFilePath = `${audioFile.path}${fileExtension}`;
        fs.renameSync(audioFile.path, audioFilePath);

        const openai = new OpenAI({
            apiKey: process.env.OPEN_AI_API_KEY,
        });
        
        // Transcribe audio using OpenAI Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFilePath), // Pass the file path to fs.createReadStream
            model: 'whisper-1',
        });

        console.log("Transcription:", transcription.text);
        res.json(transcription); 

        // Delete the audio file
        if(transcription !="" || transcription!=null) {
            try {
                setTimeout(()=>{
                    fs.unlinkSync(audioFilePath);
                    console.log('File deleted successfully.');
                },500)
              } catch (error) {
                console.error('Error deleting file:', error);
              }
        }

    } catch (error) {
        console.error('Error transcribing audio:', error);
        res.status(500).json({ error: 'Error transcribing audio' });
    }
});


// AWS S3  access
const region = "us-west-1"
const accessKeyId = process.env.AWS_S3_ACCESS_KEY
const secretAccessKey = process.env.AWS_S3_SECRET_KEY
const s3 = new aws.S3({
    region,
    accessKeyId,
    secretAccessKey,
    signatureVersion: 'v4'
  })

// Upload files into folder in AWS s3
app.use('/aws/getS3FolderUrl', async (req,res)=>{
    
    const {filePath} = req.body;
    console.log(filePath)
    
    const bucketName = "nlightnlabs01"

    async function generateUploadURL(filePath){

          const rawBytes = await randomBytes(16)
          // const fileName = rawBytes.toString('hex')
        
          const params = ({
              Bucket: bucketName,
              Key: filePath,
              Expires: 60
          })
      
          const uploadURL = await s3.getSignedUrlPromise('putObject', params)
          return uploadURL
      
      }
    
    try{
        const url = await generateUploadURL(filePath);
        console.log(`returned url: ${url}`)
        res.send(url)
    }catch(error){
        console.log(error)
    }
})




//Get files from AWS S3
app.use('/aws/getFiles', async (req, res) => {

    try {
        const {bucketName, path} = req.body;
    
        const params = {
          Bucket: bucketName,
          Delimiter: '/',
          Prefix: path + '/'
        };

        console.log("params",params)
    
        const data = await s3.listObjects(params).promise();
        console.log("data",data)
        
        let files = []
        await Promise.all(
            (data.Contents).map(item=>{
                const key = item.Key
                const fileData = s3.getObject({ Bucket: bucketName, Key: key }).promise();
                const metadata = s3.headObject({ Bucket: bucketName, Key: key }).promise();
                const fileUrl = s3.getSignedUrl('getObject', { Bucket: bucketName, Key: key });
                files.push({
                    file: item,
                    url: fileUrl,
                    file_data: fileData,
                    meta_data: metadata
                })
          }))
          console.log("files",files)
          res.json(files);
      } catch (err) {
        console.error(err);
        res.json([])
      }
  });



// Upload files into folder in AWS s3
app.use('/aws/deleteFile', async (req, res) => {
    console.log("Deleting file...");

    const { Bucket, Key } = req.body;
    console.log(Bucket, Key);

    try {
        const params = {
            Bucket: Bucket,
            Key: Key
        };

        // Wait for the deleteObject operation to complete
        const response = await s3.deleteObject(params).promise();
        console.log("Response:", response);

        res.json(response);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send('Error deleting file from S3');
    }
});



app.post('/nlightn/search', async (req, res) => {
    const {keyword} = req.body
    console.log(keyword)

    async function searchKeyword(keyword) {
        
        try {
          // Get list of tables
          const tablesResult = await dbQuery(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' -- Assuming your tables are in the public schema
              AND table_type = 'BASE TABLE';
          `);
      
          const tables = tablesResult.rows.map(row => row.table_name);
      
          let results = [];
      
          // Loop through each table
          for (const table of tables) {
            // Get list of columns for the current table
            const columnsResult = await client.query(`
              SELECT column_name
              FROM information_schema.columns
              WHERE table_name = $1;
            `, [table]);
      
            const columns = columnsResult.rows.map(row => row.column_name);
      
            // Loop through each column
            for (const column of columns) {
              // Search for the keyword in the current column
              const searchQuery = `
                SELECT *
                FROM ${table}
                WHERE ${column} ILIKE $1;
              `;
              const searchResult = await dbQuery(searchQuery, [`%${keyword}%`]);
      
              // Add matching records to results
              results = results.concat(searchResult.rows);
            }
          }
      
          return results;
        } catch (error) {
          console.error('Error searching keyword:', error);
          throw error;
        } finally {
          client.release();
        }
      }
  });

app.post('/nlightn/searchTable', async (req, res) => {
    const { keyword } = req.body;

    const query = `
    SELECT * FROM table1 WHERE column1 ILIKE '%${keyword}%' 
    UNION
    SELECT * FROM table2 WHERE column2 ILIKE '%${keyword}%'
    -- Add more SELECT statements for other tables as needed
    `
    try {
      const result = await dbQuery(query);
      res.json({ success: true, result: result.rows });
    } catch (error) {
      console.error('Error executing search query:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });


  // Call python script or app
  app.post('/nlightn/runPython', async (req, res) => {
     
      const { pythonAppName, args } = req.body;
  
      const filePath = `${pythonAppName}.py`
      console.log("python app file path: ", filePath);
  
      const pythonProcess = spawn('python3', [filePath], {
          maxBuffer: 1024 * 1024 * 100, // 100 MB buffer size (adjust as needed)
      });
  
      // Send the JSON object as a string to the Python script
      pythonProcess.stdin.write(JSON.stringify(args));
      pythonProcess.stdin.end();
  
      let output = '';
  
      // Read the output stream from the Python process
      pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
      });
  
      // Handle stderr if needed
      pythonProcess.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
      });
  
      // Handle process close event
      pythonProcess.on('close', (code) => {
          console.log('Python process closed with code:', code); // Debugging
          if (code !== 0) {
              console.error(`Python process exited with non-zero code: ${code}`);
              // Handle error response
              res.status(500).json({ error: 'An error occurred while executing the Python script.' });
          } else {
              try {
                  console.log('Python process output:', output); // Debugging
                  const result = JSON.parse(output);
                  console.log('Python function result:', result);
                  // Handle success response
                  res.json(result);
              } catch (error) {
                  console.error('Error parsing JSON output:', error);
                  // Handle parsing error
                  res.status(500).json({ error: 'Error parsing JSON output.' });
              }
          }
      });
  });
  

// OATH:
passport.use(new OAuth2Strategy({
    authorizationURL: 'https://provider.com/oauth2/authorize',
    tokenURL: 'https://provider.com/oauth2/token',
    clientID: 'your-client-id',
    clientSecret: 'your-client-secret',
    callbackURL: 'http://localhost:3000/callback'
  }, (accessToken, refreshToken, profile, cb) => {
    // Verify and process user profile
    return cb(null, profile);
  }));
  
  // Initialize Passport
  app.use(passport.initialize());
  
  // Define routes
  app.get('/auth/provider', passport.authenticate('oauth2'));
  app.get('/callback', passport.authenticate('oauth2', { failureRedirect: '/login' }), (req, res) => {
    // Successful authentication, redirect to home page or handle as needed
    res.redirect('/');
  });
  
  // Protected route
  app.get('/protected', (req, res) => {
    // Ensure user is authenticated
    if (req.isAuthenticated()) {
      res.send('Protected resource');
    } else {
      res.redirect('/login');
    }
  });





// Voice to Text converter

const { SpeechClient } = require('@google-cloud/speech');


// Google Cloud Speech client setup
const speechClient = new SpeechClient();

app.post('/nlightn/api/convertAudioToText', upload.single('audio'), async (req, res) => {
    try {
      const [response] = await speechClient.recognize({
        audio: {
          content: req.file,
        },
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US',
        },
      });
  
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      console.log(transcription)

      res.json({ transcription });
    } catch (error) {
      console.error('Error converting audio to text:', error);
      res.status(500).json({ error: 'Failed to convert audio to text' });
    }
  });


// Free agent webook
app.post('/freeAgent/webhook', async(req,res)=>{

    const {params} = req.body
    const webhookURL = params.webhookURL
    const formData = params.formData

    //console.log(webhookURL)
    //console.log(formData)

    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    }
    
    try{
        const send = await fetch(webhookURL, options)
        if(send.ok){
            //console.log("success!")
            res.send("ok")
          }
    }catch(error){
        //console.log(error)
    }   
});

//General Query To FreeAgent
app.post('/freeAgent/query', async (req, res) => {
    const query =req.body
    console.log(query)

    // query needs to look like this.... {
    //     query: 'query{listEntityValues(entity: "icon", limit: 2){ entity_values {id, field_values} } }'
    //   }

    try {
        const fetchAccessToken = async () => {
            try {
              const response = await fetch('https://freeagent.network/oauth/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  grant_type: 'client_credentials',
                  client_id: '5b92a981-fd45-4fe5-a581-085842402ab2', // Your client ID
                  client_secret: 'fa-secret-C745FCC3DB2E5C73828910' // Your client secret
                })
              });
          
              if (!response.ok) {
                throw new Error('Failed to fetch access token');
              }
          
              const data = await response.json();
              console.log("access token: ", data)
              return data.access_token;
            } catch (error) {
              console.error('Error fetching access token from FreeAgent:', error);
              throw error;
            }
          };

          const fetchData = async(query, accessToken)=>{
            
            console.log("access token: ", accessToken)
            console.log("query: ", query)
    
            const url = 'https://freeagent.network/api/graphql';
            axios.post(url, JSON.stringify(query), {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            .then(response => {
                console.log("data fetched from FreeAgent successfully: ",response.data.data);
                res.send(response.data.data); // Send the response back to the client
            })
            .catch(error => {
                console.error('Error with FreeAgent api request:', error);
            }); 
          }
        fetchData(query, await fetchAccessToken())
  
    } catch (error) {
      console.error('Error fetching data from FeeAgent:', error);
      res.status(500).json({ error: 'Error fetching data' }); // Send an error response
    }
});


//General Query To FreeAgent
app.post('/freeAgent/test', async (req, res) => {

    const query = {query: 'query{getTeamMembers(active: true) {agents {id, full_name, teamId, email_address, access_level, status, job_title, roles {id, name, import, export, bulk_edit, bulk_delete, task_delete, is_admin}, subteams {id, name, description}}}}'}
    console.log(query)

    try {
        const fetchAccessToken = async () => {
            try {
              const response = await fetch('https://freeagent.network/oauth/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  grant_type: 'client_credentials',
                  client_id: '5b92a981-fd45-4fe5-a581-085842402ab2', // Your client ID
                  client_secret: 'fa-secret-C745FCC3DB2E5C73828910' // Your client secret
                })
              });
          
              if (!response.ok) {
                throw new Error('Failed to fetch access token');
              }
          
              const data = await response.json();
              console.log("access token: ", data)
              return data.access_token;
            } catch (error) {
              console.error('Error fetching access token from FreeAgent:', error);
              throw error;
            }
          };

          const fetchData = async(query, accessToken)=>{
            
            console.log("access token: ", accessToken)
            console.log("query: ", query)
    
            const url = 'https://freeagent.network/api/graphql';
            axios.post(url, JSON.stringify(query), {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            .then(response => {
                console.log("data fetched from FreeAgent successfully: ",response.data.data.getTeamMembers.agents);
                res.send(response.data.data); // Send the response back to the client
            })
            .catch(error => {
                console.error('Error with FreeAgent api request:', error);
            }); 
          }
        fetchData(query, await fetchAccessToken())
  
    } catch (error) {
      console.error('Error fetching data from FeeAgent:', error);
      res.status(500).json({ error: 'Error fetching data' }); // Send an error response
    }
});

const testFunc = async (req,res)=>{
    const query = {query: 'query{getTeamMembers(active: true) {agents {id, full_name, teamId, email_address, access_level, status, job_title, roles {id, name, import, export, bulk_edit, bulk_delete, task_delete, is_admin}, subteams {id, name, description}}}}'}
    console.log(query)

    try {
        const fetchAccessToken = async () => {
            try {
              const response = await fetch('https://freeagent.network/oauth/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  grant_type: 'client_credentials',
                  client_id: '5b92a981-fd45-4fe5-a581-085842402ab2', // Your client ID
                  client_secret: 'fa-secret-C745FCC3DB2E5C73828910' // Your client secret
                })
              });
          
              if (!response.ok) {
                throw new Error('Failed to fetch access token');
              }
          
              const data = await response.json();
              console.log("access token: ", data)
              return data.access_token;
            } catch (error) {
              console.error('Error fetching access token from FreeAgent:', error);
              throw error;
            }
          };

          const fetchData = async(query, accessToken)=>{
            
            console.log("access token: ", accessToken)
            console.log("query: ", query)
    
            const url = 'https://freeagent.network/api/graphql';
            axios.post(url, JSON.stringify(query), {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            .then(response => {
                console.log("data fetched from FreeAgent successfully: ",response.data.data.getTeamMembers.agents);
            })
            .catch(error => {
                console.error('Error with FreeAgent api request:', error);
            }); 
          }
        fetchData(query, await fetchAccessToken())
  
    } catch (error) {
      console.error('Error fetching data from FeeAgent:', error);
    }
}
// testFunc()


app.post('/python/runApp', async (req, res) => {
    const appName = req.body.appName;
    const args = req.body.args;

    const requestPayload = {
        appName: appName,
        arguments: args
    };

    console.log(requestPayload)

    try {
        // Make a POST request to the Python server
        const redirectedResponse = await axios.post('http://127.0.0.1:8000/python/runApp', requestPayload);
        
        // Send back the response from the Python server to the client
        res.status(200).json(redirectedResponse.data);
    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).json({ error: 'Error occurred', details: error.message });
    }
});

// Google Maps Geolocation Coordinates
app.post("/googlemaps/getGeoCoordinates", async (req, res) => {
    const address = req.body.address; // Accessing zip_code from the POST request body
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${google_maps_api_key}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.status === 200 && data.status === 'OK') {
            const location = data.results[0].geometry.location;
            res.json({ "latitude": location.lat, "longitude": location.lng });
        } else {
            res.json({ "latitude": null, "longitude": null });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while fetching coordinates" });
    }
});
    
      
//setup port for server
const port = process.env.PORT || 3001;
app.listen(port, ()=>{console.log(`Server is running and listening on port ${port}`);});

