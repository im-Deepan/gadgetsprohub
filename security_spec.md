# Security Specification for Firestore Rules

## 1. Data Invariants
- Each document in `messages` represents a contact query filed by public users or signed-in members.
- Anyone can create a `messages` document if it adheres strictly to the required types and size limits.
- No one except verified administrators (`admin@example.com`) can list, get, update, or delete documents in `messages`.

## 2. Dirty Dozen Payloads (Targeting Vulnerabilities)
1. **Unauthenticated Read / Collection Scraping**: Non-admins attempting to list all submitted messages.
2. **Anonymous/Guest Read**: Unauthenticated clients retrieving specific message documents.
3. **Admin Emulation (Email Spoofing)**: Attacker authenticating with the admin's email but setting `email_verified` to `false` to read messages.
4. **Huge Payload Attack (Denial of Wallet)**: A message body field containing 10MB of structured text.
5. **ID Poisoning / Path Injection**: Injecting bad chars into message doc ID.
6. **Self-Promotion of Privileges**: Attempting to set admin roles or write admin records.
7. **Orphaned Message Entry**: Write with non-existent or malformed properties on submission.
8. **Malicious Field Update**: Modifying existing messages' state or values.
9. **Message Deletion Bypass**: Normal users attempting to erase user-contact histories.
10. **Timestamp Forgery**: Submitting client elapsed timestamps instead of server-verified time.
11. **Type Mismatch Injection**: Setting string fields like `name` or `email` as arrays or booleans.
12. **Foreign Fields Insertion**: Inserting custom parameters like `isVerifiedBySystem: true` in standard payload mappings.
