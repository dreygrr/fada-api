require('dotenv').config()

const bcrypt = require('bcrypt')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const express = require('express')
const { PrismaClient } = require('@prisma/client')

const authMiddleware = require('./authMiddleWare')

const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h'

const app = express()
const port = 3000
const prisma = new PrismaClient()

//#region app.uses
app.use(cookieParser())

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json())
//#endregion

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

//#region get/
app.get('/', (req, res) => {
  res.send('Fada is listening &star;')
})
//#endregion

//#region get/painel
app.get('/api/painel', authMiddleware, async (req, res) => {
  res.json({ mensagem: `Bem-vindo, usuário ${req.userId}` })
})
//#endregion

//#region get/validate
app.get('/api/validate', authMiddleware, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: {
        id: req.userId,
        ativo: true
      },
      select: { email: true }
    })

    if (!usuario) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado' })
    }

    return res.status(200).json({
      mensagem: 'Usuário autenticado com sucesso',
      email: usuario.email,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ mensagem: 'Erro ao acessar o banco de dados' })
  }
})
//#endregion

//#region post/signin
app.post('/api/signin', async (req, res) => {
  const { email, senha } = req.body

  if (email === '' || senha === '') {
    return res.status(400).json({ mensagem: 'Email e senha são obrigatórios' })
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: {
        email: email,
        ativo: true
      }
    })

    if (!usuario) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado' })
    }

    if (!await bcrypt.compare(senha, usuario.senha)) {
      return res.status(401).json({ mensagem: 'Senha incorreta' })
    }

    const token = jwt.sign({ sub: usuario.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 2 // 2h
    })

    return res.status(200).json({ mensagem: `Usuário ${usuario.nome} autenticado com sucesso` })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ mensagem: 'Erro ao acessar o banco de dados' })
  }
});
//#endregion

//#region post/signup
app.post('/api/signup', async (req, res) => {
  const { 
    email, 
    senha,
    dataNascimento,
    telefone,
    cpf,
    nome,
    sexo
  } = req.body

  if (nome === '' || email === '' || senha === '') {
    return res.status(400).json({ mensagem: 'Nome, email e senha são obrigatórios' })
  }

  try {
    const usuarioExistente = await prisma.usuario.findUnique({
      where: {
        email: email
      }
    })

    if (usuarioExistente) {
      return res.status(409).json({ mensagem: 'Usuário já existe' })
    }

    const senhaHash = (await bcrypt.hash(senha, 10)).toString()

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome: nome,
        email: email,
        senha: senhaHash,
        telefone: telefone,
        cpf: cpf,
        dataNascimento: new Date(dataNascimento),
        sexo: sexo,
        idTipo: 2,
      }
    })

    return res.status(201).json({ mensagem: `Usuário ${novoUsuario.nome} criado com sucesso` })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ mensagem: 'Erro ao acessar o banco de dados' })
  }
});
//#endregion

//#region post/signout
app.post('/api/signout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  })

  return res.status(200).json({ mensagem: 'Usuário deslogado com sucesso' })
})
//#endregion