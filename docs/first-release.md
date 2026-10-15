# PEARL first release

Approved scope: orange reference UI on desktop/mobile, light/dark themes, favourites and reorder, single-use QR pickup, daily portions, meal/vendor search, vendor opening hours/pause and payment/reservation reliability.

Confirmed references: user supplied desktop light/dark dashboard and mobile onboarding, home, vendor menu, orders, profile. Prices use LKR. Existing React/Express/MongoDB structure retained. Main branch stays unchanged; delivery through feature branch and PR.

Tasks:
1. Backend: durable favourites, catalog, reorder, transaction-backed stock/slot reservation and expiration, verified payment callbacks and guarded demo, pickup verification, vendor hours. Backend agent owns backend only.
2. Frontend: responsive orange shell, dashboard/catalog/menu, favourites, checkout, orders/QR, payments/profile/notifications, vendor operations. Root owns frontend only.
3. Integration tests, production build, visual checks and branch review.
4. Commit, push feature branch, PR.

Integration contract: /student/catalog, /student/favourites, /orders/:id/reorder, /orders/:id/pickup-code, /orders/pickup/verify; vendor openingTime/closingTime/openDays/ordersPaused; menu dailyStock/stockDate/stockRemaining. Confirm against backend report.

Decision: real wallet/reviews/loyalty/student cancellation are deferred. Payments navigation shows history rather than fictional stored balance. No fabricated ratings, ETAs or spending statistics. Demo is explicitly identified and never takes card details.

## Vendor redesign
All vendor routes now use the shared PEARL shell, orange styling, persistent light/dark theme and mobile bottom navigation. Dashboard includes paid order search, status filters, live/polled refresh and preparation actions. Ready orders require the existing pickup verification flow. Menu management retains photo upload/URL, price, daily portions, visibility, editing and confirmed deletion. Shop and bank details are on a dedicated profile page; notifications have a vendor destination. Reports use Colombo order-placement dates with 7-day, 30-day and all-time periods, completed paid sales, a daily trend and period-filtered bestsellers. Reports remain sales summaries, not payout statements.

Verification: 10 frontend tests pass including vendor order transition, menu creation, report period filtering and profile-field preservation. Production build passes with existing AuthContext/admin hook warnings. Browser checks with mocked vendor data covered all six vendor routes at 1536px and 390px, meal editor, dark dashboard, no page runtime errors or horizontal overflow. Real vendor account, database persistence and physical QR camera verification still require end-to-end testing.


## Public pages and self-service shops

Landing, sign-in and sign-up now share the orange/navy PEARL design, responsive layouts, light/dark theme and supplied campus illustration. Email/password authentication remains the supported login method. Vendor signup is available directly at `/register?role=vendor`.

Admin UI routes and the `/api/admin` router are no longer mounted. Admin self-registration is rejected, including the former public secret. Vendors may immediately save their shop and menu. Legacy approval fields are retained only for data compatibility and no longer gate active vendor access, catalog discovery, availability or pickup slots. Existing pending/rejected vendors with active accounts can operate without a database migration. Inactive/banned accounts, vendor/student roles and menu ownership checks remain enforced. Hours, pause settings, stock and payment verification still control actual ordering.

Pull this branch and restart both servers to activate the changes. Existing vendors can keep their accounts. For local verification: save shop details, add a meal with stock, sign in as a student, then place and collect a test order.

Validation: 14 frontend tests and production build pass; browser checks cover public desktop/mobile layouts and dark mode. Local MongoDB integration tests were blocked by this host's `open: Operation not permitted` startup error; GitHub CI passed the full 62-test backend suite on Ubuntu with MongoDB 7.0.14.

## Reference-fidelity correction

The landing page is now public at `/` even for signed-in users; login still directs students and vendors to their own dashboards. Its layout restores the reference's navigation/search, food-and-phone hero, campus illustration, feature strip, Why Choose PEARL section, three vendor cards, campus search panel, lower banner and footer. Vendor cards use `/api/public/vendors`, an allowlisted public projection with no account emails, bank details or tokens. Empty/error states replace invented vendors, ratings and testimonials. The demo button opens a keyboard-dismissable walkthrough.

Account pages now use a compact split layout with reference-inspired food/leaves art, illustrated accents, smaller fields, role selection, social-button styling and responsive dark/light themes. Social providers are disabled and explicitly unavailable until OAuth is configured; email/password works. There is no password-reset service or published legal policy, so misleading links are not added.

`public/images/pearl-auth-food.webp` is a transparent high-resolution illustration generated with the built-in image tool from the supplied account-page reference. Prompt: faithfully restore only the black food bowl, colourful noodles/chicken/vegetables, green leaves, dark-blue leaf and orange/peach shapes; transparent background, no UI, text, frame or logo. Original campus artwork remains user supplied.

Validation: 17 frontend tests pass, production build passes, desktop/mobile light/dark screenshots inspected; vendor cards rendered with clearly separate browser test fixtures. New integration coverage checks that public shop responses exclude private data. Real vendor records require the local backend to be running.
