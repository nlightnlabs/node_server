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


//setup test api
app.get('/api/nodeapitest', async(req, res)=>{ 
        const pghost = process.env.PGHOST
        try{ 
            res.status(200).json({
                response: `server is running with ${pghost}`,
            })      
        }
        catch(error){
        console.log(error);
        }

});

//database query to get a table
app.get("/data/getTable/:table", async (req, res)=>{

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
app.get("/data/getList/:args", async (req, res)=>{

    var args = JSON.parse(req.params.args);

    const table = args.table;
    const field = args.field;

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
app.get("/data/getSubList/:table/:field/:conditionalField/:conditionalValue", async (req, res)=>{

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
app.get("/data/getRecords/:table/:conditionalField/:conditionalValue", async (req, res)=>{

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
app.get("/data/getValue/:table/:lookupField/:conditionalField/:conditionalValue", async (req, res)=>{
    
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


//Add  a user
app.post("/data/addRecord/users",async (req, res)=>{

const first_name = req.body.firstName;
const last_name = req.body.lastName;
const full_name = `${first_name} ${last_name}`;
const company = req.body.company;
const role = req.body.role;
const business_unit = req.body.businessUnit;
const access = "Power User";
const mobile_phone = req.body.mobilePhone;
const email = req.body.email;
const pwd = req.body.pwd;

console.log(req.body)

const query =`INSERT into users (first_name, last_name, full_name, company, role, business_unit, access, mobile_phone, email,pwd) VALUES ('${first_name}','${last_name}', '${full_name}','${company}','${role}','${business_unit}','${access}','${mobile_phone}','${email}',crypt('${pwd}', gen_salt('bf')));`;

console.log(query);

  try {
      //const results = await dbQuery("INSERT INTO users (email, password, first_name, last_name) values ($1, $2, $3, $4)",[req.body.email, req.body.password, req.body.first_name, req.body.last_name]);
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


//Delete User
app.delete("/data/:args", async (req,res)=>{

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
app.get("/data/authenticate/:login", async (req,res)=>{

    const login = JSON.parse(req.params.login)
    const email = login.email;
    const pwd = login.pwd;
    const query = `select ((select pwd from "users" where email='${email}') =crypt('${pwd}',
      (select pwd from "users" where email='${email}'))) as matched;`
      console.log(query);
      try{    
        const result = await dbQuery(query);
        console.log(result)
        res.status(200).json({
            matchResult: result.rows[0].matched
        });
    } catch(err){
        console.log(err)
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
app.use('/getS3FolderUrl/:fileName/:folderList', async (req,res)=>{

    const params = req.params
    
    const numberOfParams = Object.keys(params).length
    console.log(`numberOfParams: ${numberOfParams}`)

    const folderList=JSON.parse(req.params.folderList)
    console.log(`folderList: ${folderList}`)

    const fileName = req.params.fileName
    console.log(`fileName: ${fileName}`)

    let filePath=""
    try{
        let pathName=""
        if(numberOfParams==2){
            
            if (Object.keys(folderList).length>0){
                const folders = folderList.folders
                folders.forEach((item, index)=>{
                    if(index>0){
                        pathName +="/"+item
                    }else{
                        pathName += item
                    }
                })
                filePath = `${pathName}/${fileName}`
            }else{
                filePath = fileName
            }
        }else{
            filePath = fileName
        }
        
        console.log(`pathName: ${pathName}`)
        console.log(`filePath: ${filePath}`)

        const url = await generateUploadURL(filePath);
        console.log(`returned url: ${url}`)
        res.send(url)

    }catch(error){
        console.log(error)
    }
})



// Upload files to AWS s3
app.use('/getS3RootUrl/:fileName/:file', async (req,res)=>{
    console.log("running single argument...")
    console.log(`fileName: ${req.params.fileName}`)

    const fileName = req.params.fileName
    
    if(typeof fileName =="object"){
        app.send()
    }
    try{
        const url = await generateUploadURL(fileName);
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

