# Dynexal Certification V1

This branch contains the first implementation plan for the Dynexal Business Central certification module.

## Principles
- Keep the existing Premium Interview Master and Razorpay flow unchanged.
- Never expose answer keys to the browser before exam submission.
- Generate a server-verified attempt and score on submission.
- Issue a unique certificate number only after a passing result.
- Provide a public certificate verification page.
- Reuse the existing Dynexal static-site + Vercel API + Supabase architecture.

## Planned routes
- /certification.html — certification catalogue and exam information
- /certification-exam.html — authenticated exam experience
- /certificate.html?id=... — certificate view
- /verify.html?id=... — public verification

## Planned API
- GET /api/certifications
- POST /api/exam-start
- POST /api/exam-submit
- GET /api/certificate
- GET /api/certificate-verify

## Planned database
- certifications
- certification_questions
- exam_attempts
- exam_answers
- certificates

The implementation should be delivered incrementally and tested before production merge.
