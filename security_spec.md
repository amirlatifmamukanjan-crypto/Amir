# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **School Ownership Master Gate**: Every subcollection (`students`, `teachers`, `attendance`, `fees`) under `/schools/{schoolId}` MUST verify the parent `/schools/{schoolId}` document exists and its `ownerId` matches `request.auth.uid` (or bootstrapped verified admin).
2. **Email Verification**: Every authenticated write/read requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Immutable Ownership & Timestamps**: `ownerId` and `createdAt` cannot change after document creation; `createdAt` and `updatedAt` must equal `request.time`.
4. **Relational Integrity**: `attendance` and `fees` records on `create` must reference an existing `Student` document under the same `/schools/{schoolId}/students/{studentId}` path.
5. **Bounded Payloads & IDs**: All document IDs match `^[a-zA-Z0-9_\-]+$` and are `<= 128` chars; all strings have strict `.size()` caps; `photo` dataURLs are capped at `100000` chars; `fee`/`amount` are bounded `0..1000000`.
6. **Zero Blanket Reads / Query Enforcement**: `allow list` rules explicitly validate `resource.data.ownerId == request.auth.uid || isBootstrappedAdmin()` without `get()` or `exists()` calls.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Write**: Create `/schools/uid1/students/s1` with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoofing**: Create `/schools/uid1` with `email == 'amirlatifmamukanjan@gmail.com'` and `email_verified == false` -> `PERMISSION_DENIED`.
3. **Cross-Tenant Ownership Hijack**: User `uid2` creates `/schools/uid1/students/s1` with `ownerId: 'uid2'` -> `PERMISSION_DENIED` (Master Gate fails).
4. **Identity Spoofing on Create**: User `uid1` creates `/schools/uid1/students/s1` with `ownerId: 'uid2'` -> `PERMISSION_DENIED`.
5. **Ghost / Shadow Field Injection**: Create student with extra field `isSuperAdmin: true` -> `PERMISSION_DENIED` (`hasOnly` check rejects).
6. **Update-Gap / Ownership Mutation**: Update existing student changing `ownerId` to `'uid2'` -> `PERMISSION_DENIED`.
7. **Timestamp Forgery**: Create student with client-supplied past `createdAt` instead of `request.time` -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Create document at `/schools/uid1/students/../../bad$id` or 200-char ID -> `PERMISSION_DENIED` (`isValidId` fails).
9. **Resource Exhaustion (1MB Photo/Name)**: Create student with 200KB `photo` or 5KB `name` -> `PERMISSION_DENIED` (`size()` cap fails).
10. **Invalid Attendance Status**: Create attendance record with `status: 'X'` -> `PERMISSION_DENIED` (`in ['P', 'A', 'L']` fails).
11. **Orphaned Fee Record**: Create fee record referencing non-existent `studentId: 'missing_999'` -> `PERMISSION_DENIED` (`exists()` check fails).
12. **Blanket List Scraping**: User `uid2` runs `list` on `/schools/uid1/students` without matching `ownerId` -> `PERMISSION_DENIED`.
