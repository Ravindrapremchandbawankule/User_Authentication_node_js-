const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, 'userData.db')
const app = express()
app.use(express.json())
const bcrypt = require('bcrypt')

let db = null

const initializeDbToServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    await db.run(`
      create table if not exists user (
        username text primary key,
        name text,
        password text,
        gender text,
        location text
    )`)
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`Db Error : ${e.message}`)
    process.exit(1)
  }
}

initializeDbToServer()

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const existingUser = await db.get(
    `SELECT * from user WHERE username = '${username}';`,
  )
  if (existingUser !== undefined) {
    response.status(400).send('User already exists')
  } else if (password.length < 5) {
    response.status(400).send('Password is too short')
  } else {
    const hashPassword = await bcrypt.hash(password, 10)
    await db.run(`
      insert into user (username, name, password, gender, location)
      values ('${username}', '${name}', '${hashPassword}', '${gender}', '${location}')
    `)
    response.status(200).send('User created successfully')
  }
})

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const existingUser = await db.get(`
    select * from user where username = '${username}';`)
  if (existingUser === undefined) {
    response.status(400).send('Invalid user')
  } else {
    const isCorrectPassword = await bcrypt.compare(
      password,
      existingUser.password,
    )
    if (isCorrectPassword === true) {
      response.status(200).send('Login success!')
    } else {
      response.status(400).send('Invalid password')
    }
  }
})

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const user = await db.get(`
    select * from user where username = '${username}';`)
  const isOldPassword = await bcrypt.compare(oldPassword, user.password)

  if (isOldPassword !== true) {
    response.status(400).send('Invalid current password')
  } else if (newPassword.length < 5) {
    response.status(400).send('Password is too short')
  } else {
    const hashPassword = await bcrypt.hash(newPassword, 10)
    await db.run(`
      update user set password = '${hashPassword}' where username = '${username}';`)
    response.status(200).send('Password updated')
  }
})
module.exports = app