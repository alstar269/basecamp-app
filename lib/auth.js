import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const STUDENT_TTL = '24h'
const TEACHER_TTL = '30d'
const ADMIN_TTL = '7d'

export function signStudent(student) {
  return jwt.sign(
    { sub: student.id, kind: 'student', retreatId: student.retreatId, nickname: student.nickname },
    SECRET,
    { expiresIn: STUDENT_TTL }
  )
}

export function signTeacher(teacher) {
  return jwt.sign({ sub: teacher.id, kind: 'teacher', churchId: teacher.churchId }, SECRET, { expiresIn: TEACHER_TTL })
}

export function signAdmin(admin) {
  return jwt.sign({ sub: admin.id, kind: 'admin', role: admin.role }, SECRET, { expiresIn: ADMIN_TTL })
}

export function verify(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

// Express 미들웨어 팩토리
export function require_(kind) {
  return (req, res, next) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token
    if (!token) return res.status(401).json({ error: 'unauthorized' })
    const payload = verify(token)
    if (!payload || payload.kind !== kind) return res.status(401).json({ error: 'unauthorized' })
    req.auth = payload
    next()
  }
}
