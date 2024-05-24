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
testFunc()

  

      
//setup port for server
const port = process.env.PORT || 3001;
app.listen(port, ()=>{console.log(`Server is running and listening on port ${port}`);});

