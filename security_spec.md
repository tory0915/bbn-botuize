# Security Specification: T-Shirt E-Commerce

## 1. Data Invariants
- **Identity Integrity**: Users can only create profiles for their own `uid`.
- **RBAC**: Only users with the `admin` role or the hardcoded admin email (`wedaeho89@gmail.com`) can create, update, or delete products.
- **Order Ownership**: Users can only create orders bound to their own `uid`, and can only read lists of their own orders. Only admins can update the status of existing orders.
- **Temporal Integrity**: `createdAt` and `updatedAt` timestamps must perfectly align with `request.time` during writes.
- **Type/Size Safety**: String allocations are strictly capped to prevent "Denial of Wallet" attacks (e.g. `size() <= 128`).
- **Array Limits**: Order line items are strictly capped at 50 to prevent unbounded execution costs on downstream processing.

## 2. The "Dirty Dozen" Payloads
1. User Creates Profile with Admin Role (Escalation)
2. User Creates Profile for Another UID (Spoofing)
3. User Updates Another User's Profile
4. Admin Updates User's Profile but with a 5MB String (DoW)
5. User Modifies a Product Price (Unauthorized Write)
6. Admin Creates Product but Misses `price` (Schema Bypass)
7. User Fetches List of All Orders (Query Insecurity)
8. User Creates Order with Another User's UID
9. User Updates Order Status to Delivered (State Tampering)
10. Admin Updates Order but Modifies `createdAt` (Temporal Bypass)
11. User Submits 500 Order Items (Array Overflow)
12. User Creates Order without `email_verified` check

## 3. Test Runner
A test runner has been created at `firestore.rules.test.ts` conforming to the Master Gate and 8 Pillars.
