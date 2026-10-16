# Public UI reference update — 16 October 2026

The landing page follows the supplied “PEARL Campus Dining, Zero Queues” reference: orange/navy hero, three benefits, campus vendor cards, illustrated campus section, three ordering steps and peach signup banner. Images are local; the supplied reference is used as a decorative CSS sprite. Vendor names, descriptions and links come from the public API, not the reference's example shops. Location chips and unimplemented legal/contact links are not presented as working features.

Sign-in and signup follow the previously approved four-panel reference with an illustrated left column, compact form card, field icons, orange actions, light/dark themes and stacked mobile layout. Vendor registration remains available without admin approval. Social sign-in remains visibly unavailable because OAuth is not implemented.

Public CSS selectors are scoped beneath public page containers. The approved student Catalog, dashboard styles and dashboard assets were not replaced: they are identical to commit 44d32a19. A Chromium check compared dashboard element geometry, colors, typography, padding and margins with all public styles enabled and removed; they were identical. A remaining visual difference on a user's installation needs a current screenshot and branch/version comparison rather than a speculative dashboard rewrite.

Validation: all 17 frontend tests pass. Production build succeeds with the existing AuthContext hook-dependency warning. Browser checks used fixture API data (not the live database), at 1280, 390 and 320px: landing, sign-in and signup have no horizontal overflow. Light and dark auth rendering was inspected. Real account sign-in/order/payment workflows were not rerun by this visual update.
