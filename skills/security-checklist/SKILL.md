---
name: ai-factory.security-checklist
description: Security audit checklist based on OWASP Top 10 and best practices. Covers authentication, injection, XSS, CSRF, secrets management, and more. Use when reviewing security, before deploy, asking "is this secure", "security check", "vulnerability".
argument-hint: [auth|injection|xss|csrf|secrets|api|infra]
allowed-tools: Read Glob Grep Bash(npm audit) Bash(grep *)
---

# Security Checklist

Comprehensive security checklist based on OWASP Top 10 (2021) and industry best practices.

## Quick Reference

- `/security-checklist` — Full audit checklist
- `/security-checklist auth` — Authentication & sessions
- `/security-checklist injection` — SQL/NoSQL/Command injection
- `/security-checklist xss` — Cross-site scripting
- `/security-checklist csrf` — Cross-site request forgery
- `/security-checklist secrets` — Secrets & credentials
- `/security-checklist api` — API security
- `/security-checklist infra` — Infrastructure security

## Quick Automated Audit

Run the automated security audit script:

```bash
bash ~/.claude/skills/security-checklist/scripts/audit.sh
```

This checks:
- Hardcoded secrets in code
- .env tracked in git
- .gitignore configuration
- npm audit (vulnerabilities)
- console.log in production code
- Security TODOs

---

## 🔴 Critical: Pre-Deployment Checklist

### Must Fix Before Production
- [ ] No secrets in code or git history
- [ ] All user input is validated and sanitized
- [ ] Authentication on all protected routes
- [ ] HTTPS enforced (no HTTP)
- [ ] SQL/NoSQL injection prevented
- [ ] XSS protection in place
- [ ] CSRF tokens on state-changing requests
- [ ] Rate limiting enabled
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies scanned for vulnerabilities

---

## Authentication & Sessions

### Password Security
```
✅ Requirements:
- [ ] Minimum 12 characters
- [ ] Hashed with bcrypt/argon2 (cost factor ≥ 12)
- [ ] Never stored in plain text
- [ ] Never logged
- [ ] Breach detection (HaveIBeenPwned API)
```

```typescript
// ✅ Good: Secure password hashing
import { hash, verify } from 'argon2';

const hashedPassword = await hash(password, {
  type: argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4
});

// ✅ Good: Timing-safe comparison
const isValid = await verify(hashedPassword, inputPassword);
```

```php
// ✅ Good: PHP password hashing
$hash = password_hash($password, PASSWORD_ARGON2ID, [
    'memory_cost' => 65536,
    'time_cost' => 4,
    'threads' => 3,
]);

// ✅ Good: Timing-safe verification
if (password_verify($inputPassword, $storedHash)) {
    // Valid password
}

// ✅ Laravel: Uses bcrypt by default
$user->password = Hash::make($password);
if (Hash::check($inputPassword, $user->password)) {
    // Valid
}
```

### Session Management
```
✅ Checklist:
- [ ] Session ID regenerated after login
- [ ] Session timeout implemented (idle + absolute)
- [ ] Secure cookie flags set
- [ ] Session invalidation on logout
- [ ] Concurrent session limits (optional)
```

```typescript
// ✅ Good: Secure cookie settings
app.use(session({
  secret: process.env.SESSION_SECRET,
  name: '__Host-session', // __Host- prefix enforces secure
  cookie: {
    httpOnly: true,       // No JS access
    secure: true,         // HTTPS only
    sameSite: 'strict',   // CSRF protection
    maxAge: 3600000,      // 1 hour
    domain: undefined,    // No cross-subdomain
  },
  resave: false,
  saveUninitialized: false,
}));
```

### JWT Security
```
✅ Checklist:
- [ ] Use RS256 or ES256 (not HS256 for distributed systems)
- [ ] Short expiration (15 min access, 7 day refresh)
- [ ] Validate all claims (iss, aud, exp, iat)
- [ ] Store refresh tokens securely (httpOnly cookie)
- [ ] Implement token revocation
- [ ] Never store sensitive data in payload
```

```typescript
// ❌ Bad: Secrets in JWT
{ "userId": 1, "email": "user@example.com", "ssn": "123-45-6789" }

// ✅ Good: Minimal claims
{ "sub": "user_123", "iat": 1699900000, "exp": 1699900900 }
```

---

## Injection Prevention

### SQL Injection
```typescript
// ❌ VULNERABLE: String concatenation
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ❌ VULNERABLE: Template literal
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ SAFE: Parameterized query
const user = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// ✅ SAFE: ORM with proper escaping
const user = await prisma.user.findUnique({
  where: { id: userId }
});
```

```php
// ❌ VULNERABLE: String interpolation
$query = "SELECT * FROM users WHERE email = '$email'";

// ✅ SAFE: PDO prepared statements
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email');
$stmt->execute(['email' => $email]);

// ✅ SAFE: Laravel Eloquent
$user = User::where('email', $email)->first();

// ✅ SAFE: Laravel Query Builder
$user = DB::table('users')->where('email', '=', $email)->first();
```

### NoSQL Injection
```typescript
// ❌ VULNERABLE: Direct user input
const user = await db.users.findOne({ username: req.body.username });
// Attack: { "username": { "$ne": "" } } → Returns first user!

// ✅ SAFE: Type validation
const username = z.string().parse(req.body.username);
const user = await db.users.findOne({ username });

// ✅ SAFE: Explicit string cast
const user = await db.users.findOne({
  username: String(req.body.username)
});
```

### Command Injection
```typescript
// ❌ VULNERABLE: Shell command with user input
exec(`convert ${userFilename} output.png`);
// Attack: filename = "; rm -rf /"

// ✅ SAFE: Use array arguments (no shell)
execFile('convert', [userFilename, 'output.png']);

// ✅ SAFE: Whitelist allowed values
const allowed = ['png', 'jpg', 'gif'];
if (!allowed.includes(format)) {
  throw new Error('Invalid format');
}
```

---

## Cross-Site Scripting (XSS)

### Prevention Checklist
```
- [ ] All user output HTML-encoded by default
- [ ] Content-Security-Policy header configured
- [ ] X-Content-Type-Options: nosniff
- [ ] Sanitize HTML if allowing rich text
- [ ] Validate URLs before rendering links
```

### Output Encoding
```typescript
// ❌ VULNERABLE: Raw HTML insertion
element.innerHTML = userInput;
document.write(userInput);

// React ❌ VULNERABLE: dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SAFE: Text content (auto-encoded)
element.textContent = userInput;

// ✅ SAFE: React default behavior
<div>{userInput}</div>

// ✅ SAFE: If HTML needed, use sanitizer
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

```php
// ❌ VULNERABLE: Raw output
<?php echo $userInput; ?>
<?= $userInput ?>

// ✅ SAFE: Laravel Blade (auto-escaped)
{{ $userInput }}

// ❌ VULNERABLE: Blade raw output
{!! $userInput !!}

// ✅ SAFE: Manual escaping in PHP
<?= htmlspecialchars($userInput, ENT_QUOTES, 'UTF-8') ?>

// ✅ SAFE: Laravel e() helper
<?= e($userInput) ?>
```

### Content Security Policy
```typescript
// ✅ Strict CSP header
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",           // No inline scripts
    "style-src 'self' 'unsafe-inline'", // Or use nonces
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.example.com",
    "frame-ancestors 'none'",      // Clickjacking protection
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  next();
});
```

---

## CSRF Protection

### Checklist
```
- [ ] CSRF tokens on all state-changing requests
- [ ] SameSite=Strict or Lax on cookies
- [ ] Verify Origin/Referer headers
- [ ] Don't use GET for state changes
```

### Implementation
```typescript
// ✅ Token-based CSRF protection
import csrf from 'csurf';

app.use(csrf({ cookie: true }));

// In forms
<input type="hidden" name="_csrf" value={csrfToken} />

// In AJAX
fetch('/api/action', {
  method: 'POST',
  headers: {
    'CSRF-Token': csrfToken,
  },
});
```

```typescript
// ✅ Double-submit cookie pattern (for SPAs)
// 1. Set CSRF token in cookie (readable by JS)
res.cookie('csrf', token, {
  httpOnly: false,  // JS needs to read this
  sameSite: 'strict'
});

// 2. Client sends token in header
// 3. Server compares cookie value with header value
```

---

## Secrets Management

### Never Do This
```
❌ Secrets in code
const API_KEY = "sk_live_abc123";

❌ Secrets in git
.env committed to repository

❌ Secrets in logs
console.log(`Connecting with password: ${password}`);

❌ Secrets in error messages
throw new Error(`DB connection failed: ${connectionString}`);
```

### Checklist
```
- [ ] Secrets in environment variables or vault
- [ ] .env in .gitignore
- [ ] Different secrets per environment
- [ ] Secrets rotated regularly
- [ ] Access to secrets audited
- [ ] No secrets in client-side code
```

### Git History Cleanup
```bash
# If secrets were committed, remove from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/secret-file" \
  --prune-empty --tag-name-filter cat -- --all

# Or use BFG Repo-Cleaner (faster)
bfg --delete-files .env
bfg --replace-text passwords.txt

# Force push (coordinate with team!)
git push origin --force --all

# Rotate ALL exposed secrets immediately!
```

---

## API Security

### Authentication
```
- [ ] API keys not in URLs (use headers)
- [ ] Rate limiting per user/IP
- [ ] Request signing for sensitive operations
- [ ] OAuth 2.0 for third-party access
```

### Input Validation
```typescript
// ✅ Validate all input with schema
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150).optional(),
});

app.post('/users', (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  // result.data is typed and validated
});
```

### Response Security
```typescript
// ✅ Don't expose internal errors
app.use((err, req, res, next) => {
  console.error(err); // Log full error internally

  // Return generic message to client
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id, // For support reference
  });
});

// ✅ Don't expose sensitive fields
const userResponse = {
  id: user.id,
  name: user.name,
  email: user.email,
  // ❌ Never: password, passwordHash, internalId, etc.
};
```

---

## Infrastructure Security

### Headers Checklist
```typescript
app.use(helmet()); // Sets many security headers

// Or manually:
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('X-XSS-Protection', '0'); // Disabled, use CSP instead
res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
```

### Dependency Security
```bash
# Check for vulnerabilities
npm audit
pip-audit
cargo audit

# Auto-fix where possible
npm audit fix

# Keep dependencies updated
npx npm-check-updates -u
```

### Deployment Checklist
```
- [ ] HTTPS only (redirect HTTP)
- [ ] TLS 1.2+ only
- [ ] Security headers configured
- [ ] Debug mode disabled
- [ ] Default credentials changed
- [ ] Unnecessary ports closed
- [ ] File permissions restricted
- [ ] Logging enabled (but no secrets)
- [ ] Backups encrypted
- [ ] WAF/DDoS protection (for public APIs)
```

---

## Quick Audit Commands

```bash
# Find hardcoded secrets
grep -rn "password\|secret\|api_key\|token" --include="*.ts" --include="*.js" .

# Check for vulnerable dependencies
npm audit --audit-level=high

# Find TODO security items
grep -rn "TODO.*security\|FIXME.*security\|XXX.*security" .

# Check for console.log in production code
grep -rn "console\.log" src/
```

---

## Severity Reference

| Issue | Severity | Fix Timeline |
|-------|----------|--------------|
| SQL Injection | 🔴 Critical | Immediate |
| Auth Bypass | 🔴 Critical | Immediate |
| Secrets Exposed | 🔴 Critical | Immediate |
| XSS (Stored) | 🔴 Critical | < 24 hours |
| CSRF | 🟠 High | < 1 week |
| XSS (Reflected) | 🟠 High | < 1 week |
| Missing Rate Limit | 🟡 Medium | < 2 weeks |
| Verbose Errors | 🟡 Medium | < 2 weeks |
| Missing Headers | 🟢 Low | < 1 month |
