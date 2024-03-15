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
app.use(cors());
// app.use(express.urlencoded({extended: false}));

//Body parser middleware (for sending back data in html)
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(express.json());

//Handlebars Middleware
app.engine('handlebars', engine({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');


//Set static folder (since this below the router, the static html will not render)
app.use(express.static(path.join(__dirname,'')))

//Homepage Route
app.get('/test', (req,res)=>{
    res.sendFile(path.join(__dirname, '/', 'test.html'))
})

//Setup database query function
const {Pool} = require("pg");
const pool = new Pool({ ssl: { rejectUnauthorized: false } });
pool.connect((err, release) => {
    if (err) {
      return console.error(`connection error to database`, err.stack)
    } else {
      return console.log(`connected successfuly to database`)
    }
  })
const dbQuery=(text, params) =>pool.query(text, params);

//general general db query
app.use("/test/db/:query", async (req, res)=>{
    
    const query = req.params.query
    console.log(query)
    
    try{
        const result = await dbQuery(query);
        res.json(result.rows);
        console.log(result.rows)
    } catch(err){
        res.send(err)
        console.log(err)
    }
})

// db table query
app.use("/test/dbTable/:tableName", async (req, res)=>{

    console.log(req.params)
    
    const tableName = req.params.tableName
    const query = `SELECT * FROM ${tableName};`
    console.log(query)
    
    try{
        const result = await dbQuery(query);
        res.json(result.rows);
        console.log(result.rows)
    } catch(err){
        res.send(err)
        console.log(err)
    }
})


//Basic GPT response
app.get("/test/getgpt/:prompt", async(req,res)=>{
    const prompt = req.params.prompt
    console.log(prompt)

    const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
    })
    try{
        const response = await openai.chat.completions.create(
            {
                model: "gpt-3.5-turbo",
                messages: [{"role": "user", "content": prompt}],
                max_tokens: 2000,
                temperature: 0
            }
        )
        console.log(response.choices[0].message.content)
        res.json(response.choices[0].message.content)

    }catch(error){
        console.log(error);
    }
});

//setup port for server
const port =9999;
app.listen(port, ()=>{
    console.log(`Server is running and listening on port ${port}`);
});