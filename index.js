require('dotenv').config()

const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')

const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h'

const app = express()
const port = 3000
const prisma = new PrismaClient()

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Fada is listening &star;')
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

app.post('/api/signin', async (req, res) => {
  const { email, senha } = req.body

  console.log(email, senha)

  console.log(req.body)

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

    const payload = { sub: usuario.id, email: usuario.email }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    return res.status(200).json({
      mensagem: `Usuário ${usuario.nome} autenticado com sucesso`,
      token, 
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ mensagem: 'Erro ao acessar o banco de dados' })
  }
});

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
      console.log('usuario ja existe')
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