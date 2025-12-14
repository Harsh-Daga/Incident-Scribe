# Security Guide

## Table of Contents

- [Security Model](#security-model)
- [Authentication & Authorization](#authentication--authorization)
- [Multi-Tenancy](#multi-tenancy)
- [Data Protection](#data-protection)
- [Webhook Security](#webhook-security)
- [Best Practices](#best-practices)
- [Security Testing](#security-testing)
- [Vulnerability Reporting](#vulnerability-reporting)

---

## Security Model

IncidentScribe AI implements a **defense-in-depth** security architecture with multiple layers of protection:

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Next.js Middleware                             │
│ • Validates JWT tokens                                  │
│ • Blocks unauthenticated requests                       │
│ • Auto-refreshes expired sessions                       │
│ • Redirects to login page                               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: API Route Authorization                        │
│ • Extracts user from auth.uid()                         │
│ • Fetches organization from database                    │
│ • Validates RBAC permissions                            │
│ • Organization NEVER from user input                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Row Level Security (RLS)                       │
│ • PostgreSQL enforces data isolation                    │
│ • Policies applied to ALL queries                       │
│ • Users CANNOT access other orgs                        │
│ • Automatic, no bypass possible                         │
└─────────────────────────────────────────────────────────┘
```

---

## Authentication & Authorization

### Supabase Auth

IncidentScribe uses **Supabase Auth** for authentication:

- **JWT Tokens** - Industry-standard JSON Web Tokens
- **httpOnly Cookies** - Tokens stored securely, not accessible via JavaScript
- **Auto-Refresh** - Sessions refreshed automatically before expiration
- **Password Policies** - Enforced by Supabase (min length, complexity)

### Session Management

```typescript
// Server-side session validation (middleware.ts)
const { data: { user } } = await supabase.auth.getUser()

if (!user && !isPublicPath) {
  // Redirect to login
  return NextResponse.redirect('/login')
}
```

### Role-Based Access Control (RBAC)

Four role levels with hierarchical permissions:

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **Platform Admin** | • Create organizations<br>• View all data<br>• Manage system config | • Access without auth |
| **Org Admin** | • Manage org users<br>• Generate invite codes<br>• View webhook keys<br>• All member permissions | • Access other orgs<br>• Create organizations |
| **Member** | • Create/edit incidents<br>• Run AI analysis<br>• View team data | • Manage users<br>• View webhook keys |
| **Viewer** | • Read incidents<br>• View AI analyses | • Modify data<br>• Run analysis |

### RBAC Implementation

```typescript
// Check role in API routes
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins can perform this action
  if (user.role !== 'admin' && !user.is_platform_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Proceed with action
}
```

---

## Multi-Tenancy

### Organization Isolation

**CRITICAL**: Organization is determined by **database lookup**, NEVER by user input.

```typescript
// ✅ SECURE - Organization from auth.uid()
export async function getAuthenticatedOrganizationId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Look up in database based on authenticated user
  const { data } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)  // ← auth.uid(), not user input
    .single()

  return data?.organization_id || null
}
```

```typescript
// ❌ INSECURE - Never do this!
const organizationId = req.query.get('organization_id')  // User can manipulate!
```

### Row Level Security (RLS) Policies

All tables have RLS policies enforcing organization isolation:

```sql
-- Incidents policy
CREATE POLICY incidents_org_isolation ON incidents
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Platform admins can access all orgs
CREATE POLICY incidents_platform_admin ON incidents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_platform_admin = true
    )
  );
```

### What Users CANNOT Do

- ❌ **Select organizations** - No dropdown, determined by account
- ❌ **Switch organizations** - Tied to user account permanently
- ❌ **Access other orgs' data** - RLS prevents at database level
- ❌ **Manipulate org ID** - Not accepted from requests
- ❌ **Bypass RLS** - Applied automatically to ALL queries

---

## Data Protection

### Encryption

| Data Type | Protection Method |
|-----------|-------------------|
| **Passwords** | bcrypt hashing via Supabase Auth |
| **JWT Tokens** | Signed with secret key, httpOnly cookies |
| **API Keys** | Hashed in database, never exposed |
| **Webhook Keys** | UUID v4, unique per organization |
| **In Transit** | HTTPS/TLS 1.3 required |
| **At Rest** | Supabase PostgreSQL encryption |

### Secrets Management

```
Frontend (.env.local):
  ✓ NEXT_PUBLIC_SUPABASE_URL     - Safe to expose
  ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY - Safe (RLS protected)
  ✗ SUPABASE_SERVICE_ROLE_KEY     - NEVER expose to client

Kestra (KV Store):
  ✗ GEMINI_API_KEY               - Stored securely in KV Store
  ✗ SUPABASE_SERVICE_ROLE_KEY    - Server-side only

Database (system_config table):
  ✗ KESTRA_USERNAME              - Encrypted at rest
  ✗ KESTRA_PASSWORD              - Encrypted at rest
```

### Sensitive Data Handling

**Webhook Keys:**
- Unique per organization
- Rotation supported via UI
- Hashed before storage
- Only visible to org admins

**Service Role Key:**
- Used ONLY for:
  - Webhook ingestion (bypasses RLS intentionally)
  - Kestra workflows (trusted environment)
- NEVER exposed to client
- Environment variable, not in code

---

## Webhook Security

### Authentication

Webhooks require organization-specific keys:

```bash
# Via query parameter
POST /api/webhooks/ingest?source=generic&key=YOUR_WEBHOOK_KEY

# Via header (preferred)
POST /api/webhooks/ingest?source=generic
X-Webhook-Key: YOUR_WEBHOOK_KEY
```

### Webhook Key Management

```typescript
// Validate webhook key and get organization
export async function POST(req: NextRequest) {
  const webhookKey =
    req.headers.get('x-webhook-key') ||
    req.nextUrl.searchParams.get('key')

  if (!webhookKey) {
    return NextResponse.json(
      { error: 'Missing webhook key' },
      { status: 401 }
    )
  }

  // Look up organization by webhook key
  const org = await getOrganizationByWebhookKey(webhookKey)

  if (!org) {
    return NextResponse.json(
      { error: 'Invalid webhook key' },
      { status: 401 }
    )
  }

  // Incident auto-assigned to correct org
  await createIncident(incident, webhookKey)
}
```

### Webhook Best Practices

1. **Rotate keys regularly** - Change every 90 days
2. **Use HTTPS only** - Never send keys over HTTP
3. **Monitor usage** - Check audit logs for anomalies
4. **Rate limiting** - Implement per-org limits (future enhancement)
5. **IP allowlisting** - Restrict to known monitoring IPs (future)

---

## Best Practices

### For Developers

1. **Never trust client input**
   ```typescript
   // ❌ Bad
   const orgId = req.body.organization_id

   // ✅ Good
   const orgId = await getAuthenticatedOrganizationId()
   ```

2. **Always use parameterized queries**
   ```typescript
   // Supabase client automatically parameterizes
   await supabase
     .from('incidents')
     .select('*')
     .eq('id', userId)  // ✅ Safe from SQL injection
   ```

3. **Validate all inputs**
   ```typescript
   // Use Zod or similar for validation
   const schema = z.object({
     severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
     service: z.string().min(1).max(100)
   })

   const validated = schema.parse(req.body)
   ```

4. **Check permissions explicitly**
   ```typescript
   if (user.role !== 'admin') {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
   }
   ```

### For Administrators

1. **Enable MFA for admins**
   - Supabase Dashboard → Authentication → Settings → MFA
   - Require for all org admins and platform admins

2. **Review user roles quarterly**
   ```sql
   SELECT email, role, organization_id, created_at
   FROM users
   ORDER BY role DESC, created_at DESC;
   ```

3. **Audit access logs**
   ```sql
   SELECT * FROM audit_log
   WHERE action IN ('user.login.failed', 'webhook.invalid_key')
   ORDER BY timestamp DESC
   LIMIT 100;
   ```

4. **Rotate credentials**
   - Webhook keys: Every 90 days
   - Gemini API key: When team changes
   - Supabase keys: If compromised

5. **Limit invite code validity**
   - Set expiration to 7 days max
   - Single-use codes when possible

### For End Users

1. **Use strong passwords**
   - Min 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - No reuse across sites

2. **Enable MFA** (when available)
   - Adds second factor authentication
   - Protects against password theft

3. **Report suspicious activity**
   - Unknown incidents appearing
   - Unexpected password reset emails
   - Unauthorized team changes

---

## Security Testing

### Manual Testing

1. **Test Organization Isolation**
   ```bash
   # Login as user from Org A
   # Try to access Org B's incidents via API
   curl http://localhost:3000/api/incidents \
     -H "Cookie: sb-xxx-auth-token=..."

   # Should only see Org A incidents
   ```

2. **Test RLS Policies**
   ```sql
   -- Simulate user context
   SET request.jwt.claims.sub = 'user-uuid-from-org-a';

   SELECT * FROM incidents;
   -- Should only return Org A incidents

   SET request.jwt.claims.sub = 'user-uuid-from-org-b';

   SELECT * FROM incidents;
   -- Should only return Org B incidents
   ```

3. **Test Role Permissions**
   ```bash
   # Login as viewer
   # Try to create incident (should fail)
   curl -X POST http://localhost:3000/api/incidents \
     -H "Cookie: sb-xxx-auth-token=..." \
     -d '{"title": "Test"}'

   # Expected: 403 Forbidden
   ```

### Automated Security Checks

```bash
# Run ESLint security rules
npm run lint

# Check for outdated dependencies with vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Scan for secrets in code (future)
git secrets --scan
```

---

## Threat Model

### Threats We Protect Against

| Threat | Protection | Status |
|--------|-----------|--------|
| **SQL Injection** | Parameterized queries via Supabase | ✅ Protected |
| **XSS Attacks** | httpOnly cookies, CSP headers, React escaping | ✅ Protected |
| **CSRF** | SameSite cookies, origin validation | ✅ Protected |
| **Data Leakage** | RLS policies at database level | ✅ Protected |
| **Privilege Escalation** | RBAC in API + RLS | ✅ Protected |
| **Session Hijacking** | httpOnly cookies, secure flag, TLS only | ✅ Protected |
| **Webhook Spoofing** | Unique keys per org | ✅ Protected |
| **Brute Force** | Rate limiting ready | ⏳ Future |
| **DDoS** | CDN + Edge functions | ⏳ Future |

### Known Limitations

1. **No IP allowlisting** - Webhooks accept from any IP
   - **Mitigation**: Unique webhook keys, audit logging
   - **Future**: Add IP allowlisting per organization

2. **No rate limiting** - API calls not throttled
   - **Mitigation**: Monitor usage via logs
   - **Future**: Implement Vercel rate limiting

3. **No 2FA** - MFA not yet implemented
   - **Mitigation**: Strong password requirements
   - **Future**: Add TOTP-based MFA

---

## Vulnerability Reporting

### Reporting a Security Issue

If you discover a security vulnerability, please:

1. **DO NOT** open a public GitHub issue
2. **Email**: harsh.daga@example.com (use subject: "Security Vulnerability Report")
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **24 hours**: Acknowledge receipt
- **7 days**: Initial assessment and response
- **30 days**: Fix deployed (or timeline communicated)
- **After fix**: Public disclosure (with your credit, if desired)

### Security Updates

Subscribe to security advisories:
- **GitHub**: Watch this repo for security advisories
- **Email**: Subscribe to mailing list (future)

---

## Compliance

### Data Privacy

- **GDPR Ready**: User data deletion supported
- **Data Retention**: Configurable per organization
- **Right to Access**: Export API available
- **Data Minimization**: Only collect necessary data

### Audit Logging

All critical actions are logged in `audit_log` table:

```sql
SELECT
  timestamp,
  user_id,
  action,
  resource_type,
  resource_id,
  details
FROM audit_log
WHERE organization_id = 'YOUR_ORG_ID'
ORDER BY timestamp DESC;
```

Logged actions:
- User login/logout
- Failed authentication attempts
- Incident creation/modification
- Webhook ingestion
- Role changes
- Organization config updates

---

## Security Checklist

### Before Deployment

- [ ] Environment variables set correctly
- [ ] HTTPS/TLS enabled
- [ ] Supabase RLS policies enabled on all tables
- [ ] Service role key never exposed to client
- [ ] Webhook keys generated per organization
- [ ] CORS configured for production domain only
- [ ] CSP headers configured
- [ ] Rate limiting enabled (if available)
- [ ] Security headers configured (X-Frame-Options, etc.)
- [ ] Secrets stored in Kestra KV Store
- [ ] Audit logging enabled

### Regular Maintenance

- [ ] Review access logs monthly
- [ ] Rotate webhook keys quarterly
- [ ] Update dependencies monthly (check for CVEs)
- [ ] Review user roles quarterly
- [ ] Test RLS policies after schema changes
- [ ] Backup database weekly
- [ ] Monitor failed login attempts
- [ ] Review Supabase Auth logs

---

## Resources

- **Supabase Security**: https://supabase.com/docs/guides/auth/row-level-security
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Next.js Security**: https://nextjs.org/docs/app/building-your-application/configuring/security-headers
- **JWT Best Practices**: https://tools.ietf.org/html/rfc8725

---

**Last Updated**: December 2024
**Version**: 1.0.0

For questions or concerns, contact: harsh.daga@example.com
