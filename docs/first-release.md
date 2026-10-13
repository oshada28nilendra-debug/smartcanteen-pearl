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
