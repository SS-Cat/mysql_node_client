import * as mysql from 'mysql2/promise'
import * as readline from 'readline'
import { readFile, writeFile, exists } from 'fs'
import { promisify } from 'util'

const readFilePromisse = promisify(readFile)
const writeFilePromisse = promisify(writeFile)
const existsPromisse = promisify(exists)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'λ '
})

const ask = (question: string): Promise<string> => {
  return new Promise((resolve): void => {
    rl.question(question, (input): void => resolve(input))
  })
}

interface SaveFile {
  user?: string;
  password?: string;
  host?: string;
  port?: number;
}

(async (): Promise<void> => {
  const exists = await existsPromisse('./connection.json')
  let saveResponse = 'no'
  if (exists) { saveResponse = await ask('Read connection saved? [y|n]') }
  let saveFile: SaveFile = {}
  let saveBool = saveResponse.match(/^y(es)?$/i)

  if (saveBool) {
    saveFile = JSON.parse(String(await readFilePromisse('./connection.json', 'utf8'))) as SaveFile
  } else {
    saveFile.user = await ask('User: ')
    saveFile.password = await ask('Password: ')
    saveFile.host = await ask('Host: ')
    saveFile.port = Number(await ask('Port: '))
  }
  if (!saveBool) {
    saveResponse = await ask('Save connection configs? [y|n]')
    saveBool = saveResponse.match(/^y(es)?$/i)
    if (saveBool) {
      await writeFilePromisse('./connection.json', JSON.stringify(saveFile))
    }
  }

  let connection: mysql.Connection
  try {
    connection = await mysql.createConnection({
      host: saveFile.host,
      port: saveFile.port,
      user: saveFile.user,
      password: saveFile.password
    })

    rl.on('SIGINT', (): void => {
      console.log('bye')
      connection.end()
      process.exit(0)
    })

    while (true) {
      try {
        console.log('Enter queries')
        const query = await ask('λ ')
        if (query === 'exit') break
        const [results] = await connection.query(query)
        console.log('The result is: ', results)
      } catch (e) {
        console.error(e)
      }
    }
    rl.close()
  } catch (e) {
    console.error(e)
  } finally {
    connection.end()
  }
})()
