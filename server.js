const express = require('express');
const dotenv = require('dotenv')
dotenv.config()
const cors = require("cors");
var bodyParser = require('body-parser');

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
      return console.log(`connected successfuly to database`)
    }
  })
const dbQuery=(text, params) =>pool.query(text, params);


//general database query
app.use("/db/query", async (req, res)=>{
    
    console.log(req.body)
    const {query} = req.body
    console.log(query)
    
    try{
        const result = await dbQuery(query);
        res.json(result.rows);
        console.log(result.rows)
    } catch(err){
        console.log(err)
    }
})

app.post("/db/addRecord",async (req, res)=>{
    const{params} = req.body
    let table = params.table
    let columns = (params.columns).toString()
    let values = params.values
    values.map((item,index)=>{
        values[index] = `'${item}'`
      }).toString()
    
    const query =`INSERT into ${table} (${columns}) VALUES (${values});`;
    try{
        const result = await dbQuery(query);
        res.json(result.rows[0]);
        console.log(result.rows[0])
    } catch(err){
        console.log(err)
    }
})

app.post("/db/updateRecord",async (req, res)=>{
    const{params} = req.body
    const table = params.table
    const fieldsAndValues = params.fieldsAndValues
    //fieldsAndValues should be text string: column_1 = 'value_1', column_1 = 'value_1', etc.

    const query =`UPDATE ${table} set ${fieldsAndValues};`;
    try{
        const result = await dbQuery(query);
        res.json(result.rows[0]);
        console.log(result.rows[0])
    } catch(err){
        console.log(err)
    }
})

//database query to get a table
app.get("/db/table/:table", async (req, res)=>{

    const table = req.params.table;

    try{
        const result = await dbQuery(`SELECT * from ${table};`);
        res.json(result.rows);
        console.log(result.rows)
    } catch(err){
        console.log(err)
    }
})


//database query to get a list from a table
app.get("/db/list/:table/:field", async (req, res)=>{
    const {table, field} = req.params
    try{
        const result = await dbQuery(`SELECT DISTINCT "${field}" from ${table};`)
        const data = result.rows;
        var list = [];
        data.forEach(r=>{
            list.push(Object.values(r)[0]);
        });
        console.log(list);
        res.json(list);
    } catch(err){
        console.log(err)
    }
})

//database query to get a sublist from a table
app.get("/db/subList/:table/:field/:conditionalField/:conditionalValue", async (req, res)=>{

    const table = req.params.table;
    const field = req.params.field;
    const conditionalField = req.params.conditionalField;
    const conditionalValue = req.params.conditionalValue;

    const query = `SELECT DISTINCT ${field} from ${table} where ${conditionalField} = '${conditionalValue}';`

    try{
        const result = await dbQuery(query)
        const data = result.rows;
        var list = [];
        data.forEach(r=>{
            list.push(Object.values(r)[0]);
        });
        console.log(list);
        res.json(list);
    } catch(err){
        console.log(err)
    }
})


//database query to get a record from a table
app.get("/db/records/:table/:conditionalField/:conditionalValue", async (req, res)=>{

    const table = req.params.table;
    const conditionalField = req.params.conditionalField;
    const conditionalValue = req.params.conditionalValue;

    try{
        const result = await dbQuery(`SELECT * from ${table} where ${conditionalField} = ${conditionalValue};`)
        res.json(result.rows);
    } catch(err){
        console.log(err)
    }
})
    

//database query to get a single value from a table
app.get("/db/value/:table/:lookupField/:conditionalField/:conditionalValue", async (req, res)=>{
    
    const table = req.params.table;
    const lookupField = req.params.lookupField;
    const conditionalField = req.params.conditionalField;
    const conditionalValue = req.params.conditionalValue;
    
    try{
        const result = await dbQuery(`SELECT "${lookupField}" from ${table} where "${conditionalField}" = '${conditionalValue}';`)
        res.status(200).json(Object.values(result.rows[0])[0]);
        console.log(Object.values(result.rows[0])[0])
    } catch(err){
        console.log(err)
    }
})


//Add record
app.post("/db/addRecord",async (req, res)=>{
    const{params} = req.body
    
    let table = params.table
    let columns = (params.columns).toString()
    let values = params.values
    values.map((item,index)=>{
        values[index] = `'${item}'`
      }).toString()

    const query =`INSERT into ${table} (${columns}) VALUES (${values});`;
    console.log(query)
    console.log(query);
    
      try {
          const results = await dbQuery(query);
          console.log(results);
          res.status(200).json({
            status: "success",
            data: results.rows[0]
            });
      } catch(err){
          console.log(err)
      }
    })


//Delete Record
app.delete("/db/:args", async (req,res)=>{

    console.log(req.params.args);
    const args = JSON.parse(req.params.args);

    console.log(args);
    const table = args.table;
    const email = args.email;

    try{    
        const result = await dbQuery(`DELETE from ${table} WHERE email = $1 returning *;`,[email])
        console.log(result)
        res.status(200).json({data: result.rows});
    } catch(err){
        console.log(err)
    }
})


// Authenticate user
app.use("/db/authenticateUser", async (req,res)=>{

    const {params} = req.body
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

//add user record
app.post("/db/addUser", async(req, res)=>{

    const{params} = req.body
    let table = params.table.toString()
    let columns = params.columns
    let values = params.values
    values.map((item,index)=>{
        values[index] =`'${item}'`
    }).toString()

    if(table =='users' && columns.includes('pwd')){
        columns.pop(columns.findIndex(str=>str=='pwd'))
        values.pop(columns.findIndex(str=>str=='pwd'))

        // Query 1: Check if user exists
        const query1 = `select ((select email from "users" where email='${email}')) as matched;`
        try {
            const results = await dbQuery(query1);
            console.log(results);
            let matchResult = results.rows[0].matched
            console.log(matchResult)
            //sends back true if user is found.
            res.send(matchResult)

            if (!matchResult){
                // Query 2: remove the pwd field and insert all other fields
                const query2 =`INSERT into ${table} (${columns}) VALUES (${values});`;
                console.log(query2)
                try {
                    const results = await dbQuery(query2);
                    console.log(results);
                    res.status(200).json({
                    status: "success",
                    data: results.rows[0]
                });  
                } catch(err){
                    console.log(err)
                    res.err
                }
            }
        } catch(err){
            console.log(err)
            res.err
        }
    }
})


//get user record
app.use("/db/getUserRecord", async (req, res)=>{
    const {params} = req.body
    const email = params.email
    const query =`select * from "users" where "email"='${email}' limit 1`
    try{
        const results = await dbQuery(query);
        console.log(results);
        res.send(results.rows[0])
    }catch(error){
        res.send(error)
    }
})

const openai = new OpenAI({
    apiKey: "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",
})

//Basic GPT response
app.post("/gpt", async(req,res)=>{

    const {prompt} = req.body;
    console.log(prompt)

    const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
    })
    try{
        const response = await openai.chat.completions.create(
            {
                model: "gpt-3.5-turbo",
                messages: [{"role": "user", "content": prompt}],
                max_tokens: 100,
                temperature: 0
            }
        )
        console.log(response.choices[0].message.content)
        res.json(response.choices[0].message.content)

    }catch(error){
        console.log(error);
    }
});


//GPT classify
app.get("/gptClassify", async(req,res)=>{

    const {text, list} = req.body

    const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
    })

    const prompt = `Which one of the following options in this list: ${list}, does an email subject with the following text: ${text}, best describe?. Just respond with the list item text and it's index number in the list in json format.`
    
    try{
        const response = await openai.chat.completions.create(
            {
                model: "gpt-3.5-turbo",
                messages: [{"role": "user", "content": prompt}],
                temperature: 0
            }
        )
        console.log(response.choices[0].message.content)
        res.json(JSON.parse(response.choices[0].message.content))

    }catch(error){
        console.log(error);
    }
});


// GPT Return List
app.get("/gptReturnList/:prompt", async(req,res)=>{

    const {promptText} = req.body

    const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
    })

    const prompt = `${promptText}. Return only a list with no numbers in json array format.`
    
    try{
        const response = await openai.chat.completions.create(
            {
                model: "gpt-3.5-turbo",
                messages: [{"role": "user", "content": prompt}],
                max_tokens: 400,
                temperature: 0
            }
        )

        console.log(response)
        res.json(JSON.parse(response.choices[0].message.content))

    }catch(error){
        console.log(error);
    }
});


//GPT Return Data
app.get("/gpt/data/:prompt", async(req,res)=>{

    const {promptText} = req.body

    const openai = new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
    })

    const prompt = `${promptText}. Summarize in json object format.`
    
    try{
        const response = await openai.chat.completions.create(
            {
                model: "gpt-3.5-turbo",
                messages: [{"role": "user", "content": prompt}],
                max_tokens: 500,
                temperature: 0
            }
        )

        console.log(response)
        res.json(JSON.parse(response.choices[0].message.content))

    }catch(error){
        console.log(error);
    }
});
    

// Upload files into folder in AWS s3
app.use('/getS3FolderUrl', async (req,res)=>{

    const {filePath} = req.body;
    // console.log(filePath)
    
    try{
        const url = await generateUploadURL(filePath);
        console.log(`returned url: ${url}`)
        res.send(url)
    }catch(error){
        console.log(error)
    }
})
    

//setup port for server
const port = process.env.PORT || 3001;
app.listen(port, ()=>{
    console.log(`Server is running and listening on port ${port}`);
});

