const express = require("express")
const path = require("path")
const {open} = require("sqlite")
const sqlite3 = require("sqlite3").verbose()
const bodyParser = require('body-parser')
const app = express();
const bcrypt = require('bcrypt')
const jwt =  require('jsonwebtoken')
const uuid = require('uuid');
const dbPath = path.join(__dirname,"assignment.db")
const cors = require("cors")
app.use(cors())
app.use(express.json())
app.use(bodyParser.json())
let db = null;

const initializeDbAndServer = async()=>{
    try{
        db= await open({
            filename:dbPath,
            driver:sqlite3.Database
        });
        app.listen(4000,()=>{
            console.log(`Server is listening http://localhost:4000`);
        })
    }
    catch(error){
        console.log(`DB error : ${e.message}`)
        process.exit(1)
    }
}

initializeDbAndServer()

const authenticationToken = (request,response,next)=>{
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if(authHeader !== undefined){
        jwtToken = authHeader.split(" ")[1]
    }
    if(authHeader == undefined){
        response.status(400)
        response.send("No Access Token")
    }
    else{
        jwt.verify(jwtToken,"assigned",(error,payload)=>{
            if(error){
                response.send("Invalid Access Token")
            }
            else{
                next()
            }
        })
    }
}


const assignmentDetails = (eachArray)=>{
    return{
        id:uuid.v4(),
        username:eachArray.username,
        assignment_name:eachArray.assignment_name,
        task_1:eachArray.task_1,
        task_2:eachArray.task_2,
        task_3:eachArray.task_3,
        accomplished:eachArray.accomplished
    }
}

app.get("/",authenticationToken,async(request,response)=>{
    const {username} = request.body 
    const assignmentQuery = `
    SELECT * FROM assignments  WHERE username = "${username}";
    `
    const getUser = await db.get(assignmentQuery)
    if(getUser !== undefined){
        const assignmentArray = await db.all(assignmentQuery)
        response.send(assignmentArray.map(eachArray=> assignmentDetails(eachArray)))
    }
    else{
        const newAssignment = `INSERT INTO assignments (username) VALUES ("${username}");`
        await db.run(newAssignment)
        const newQuery = `SELECT * FROM assignments WHERE username="${username}"`
        const assignment = await db.all(newQuery)
        response.send(assignment.map(eachAssignment => assignmentDetails(eachAssignment)))
    }
})


app.post("/Register",async(request,response)=>{
    const {username,password} = request.body
    const newUserQuery = `SELECT * FROM users WHERE username="${username}";`
    const checkUser = await  db.get(newUserQuery)
    const hashPassword = await bcrypt.hash(password,10)
    if(checkUser === undefined){
        const newUser = `INSERT INTO users(username,password)
        VALUES ("${username}","${hashPassword}")
        `
        await db.run(newUser)
        response.send("User created successfully")
    }
    else{
        response.status(400)
        response.send("User already exits")
    }
})

app.post("/newAssignment",async(request,response)=>{
    const {username,assignment_name,task_1,task_2,task_3,accomplished} = request.body
    const assignmentQuery = `INSERT INTO assignments (username,assignment_name,task_1,task_2,task_3,accomplished)
    VALUES ("${username}","${assignment_name}","${task_1}","${task_2}","${task_3}","${accomplished}");
    `
    await db.run(assignmentQuery)
    const exactQuery = `SELECT * FROM assignment WHERE username="${username}";`
    const successArray = await db.all(exactQuery)
    response.send(successArray.map(eachAssignment=> assignmentDetails(eachAssignment)))
})

app.put("/updateAssignment/:id",async(request,response)=>{
    const {username,assignment_name,task_1,task_2,task_3,accomplished} = request.body
    const {id} = request.params
    const assignmentQuery = `INSERT INTO assignments (username,assignment_name,task_1,task_2,task_3,accomplished)
    VALUES ("${username}","${assignment_name}","${task_1}","${task_2}","${task_3}","${accomplished}") WHERE id=${id};
    `
    await db.run(assignmentQuery)
    const exactQuery = `SELECT * FROM assignment WHERE username="${username}";`
    const successArray = await db.all(exactQuery)
    response.send(successArray.map(eachAssignment=> assignmentDetails(eachAssignment)))
})

app.delete("/deleteAssignment/:id",async(request,response)=>{
    const {id} = request.params 
    const {username} = request.body
    const assignmentQuery = `DELETE FROM assignments WHERE id = ${id};
    `
    await db.run(assignmentQuery)
    const exactQuery = `SELECT * FROM assignment WHERE username="${username}";`
    const successArray = await db.all(exactQuery)
    response.send(successArray.map(eachAssignment => assignmentDetails(eachAssignment)))
})

app.post("/login",async(request,response)=>{
    const {username,password} = request.body
    const userQuery = `
    SELECT * FROM users WHERE username="${username}"
    `
    const dbUser = await db.get(userQuery)
    if(dbUser === undefined){
        response.status(400)
        response.send("Invalid user")
    }
    else{
        const isPasswordMatched = await bcrypt.compare(password,dbUser.password)
        if(isPasswordMatched === true){
            const payload = {username:username}
            const jwtToken = jwt.sign(payload,"assigned")
            response.send({jwtToken,username})
        }
        else{
            response.status(400)
            response.send("Invalid password")
        }
    }

})

module.exports = app