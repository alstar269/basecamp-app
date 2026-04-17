// Vercel Serverless 엔트리포인트
// 로컬 개발: server.js (app.listen)
// Vercel 배포: 이 파일이 Express app을 export → Vercel이 요청을 라우팅
import app from '../server.js'
export default app
