import { useState } from "react";

// ── Inline styles matching exact Tokko aesthetic ──────────────────────────────
const G = {
  page: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: "#f9f8f6",
    color: "#111",
    minHeight: "100vh",
    overflowX: "hidden",
  },

  // NAV
  navWrap: {
    display: "flex", justifyContent: "center",
    paddingTop: 24, position: "fixed",
    top: 0, left: 0, right: 0, zIndex: 100,
  },
  nav: {
    display: "flex", alignItems: "center",
    background: "#fff",
    borderRadius: 999,
    padding: "7px 7px 7px 20px",
    boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
    gap: 0,
  },
  navLogo: {
    width: 40, height: 40, borderRadius: "50%",
    background: "#e8e0f0",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, marginRight: 16, flexShrink: 0,
  },
  navLinks: {
    display: "flex", gap: 28, marginRight: 24,
    listStyle: "none", padding: 0, margin: 0,
  },
  navLink: {
    color: "#555", fontSize: 14, textDecoration: "none",
    fontWeight: 400, cursor: "pointer",
  },
  navCta: {
    background: "#111", color: "#fff",
    padding: "11px 22px", borderRadius: 999,
    fontSize: 14, fontWeight: 600,
    textDecoration: "none", border: "none",
    cursor: "pointer", letterSpacing: 0.2,
  },

  // HERO
  hero: {
    paddingTop: 130,
    paddingBottom: 0,
    textAlign: "center",
    position: "relative",
    background: "#f9f8f6",
  },

  floatPill: {
    position: "absolute",
    background: "#fff",
    borderRadius: 999,
    padding: "8px 16px",
    display: "flex", alignItems: "center", gap: 7,
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
    fontSize: 14, fontWeight: 600, color: "#111",
    whiteSpace: "nowrap",
  },
  pillDot: {
    width: 8, height: 8, borderRadius: "50%",
  },

  heroTitle: {
    fontSize: "clamp(52px, 8vw, 96px)",
    fontWeight: 800,
    lineHeight: 1.0,
    letterSpacing: "-0.04em",
    color: "#0e0e0e",
    margin: "0 auto 20px",
    maxWidth: 780,
  },
  heroSub: {
    fontSize: 17,
    color: "#666",
    maxWidth: 420,
    margin: "0 auto 36px",
    lineHeight: 1.65,
    fontWeight: 400,
  },
  heroBtns: {
    display: "flex", gap: 10,
    justifyContent: "center",
    marginBottom: 60,
  },
  btnDark: {
    background: "#111", color: "#fff",
    padding: "14px 28px", borderRadius: 999,
    fontSize: 15, fontWeight: 600,
    textDecoration: "none", border: "none",
    cursor: "pointer", transition: "transform 0.2s",
  },
  btnLight: {
    background: "#fff", color: "#111",
    padding: "14px 28px", borderRadius: 999,
    fontSize: 15, fontWeight: 500,
    textDecoration: "none",
    border: "1.5px solid #e0e0e0",
    cursor: "pointer",
  },

  photoStrip: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 0,
    height: 320,
    position: "relative",
    overflow: "visible",
    maxWidth: 860,
    margin: "0 auto",
  },
  photoCard: {
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
    position: "absolute",
    bottom: 0,
    transition: "transform 0.35s ease, z-index 0s",
  },
  photoInner: {
    width: "100%", height: "100%",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "flex-end",
    padding: 16, fontSize: 60,
  },
  photoLabel: {
    color: "#fff", fontWeight: 700,
    fontSize: 13, textAlign: "center",
    textShadow: "0 2px 8px rgba(0,0,0,0.5)",
    marginTop: "auto",
    lineHeight: 1.3,
  },
};

// ── Floating number pills ─────────────────────────────────────────────────────
function FloatPill({ icon, count, color, style }) {
  return (
    <div style={{ ...G.floatPill, ...style }}>
      <span style={{ ...G.pillDot, background: color }} />
      <span style={{ color }}>{icon}</span>
      <span>{count}</span>
    </div>
  );
}

// ── Single tilted photo card ──────────────────────────────────────────────────
function PhotoCard({ emoji, label, bg, width, height, left, rotate, zIndex }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...G.photoCard,
        width, height, left,
        transform: hovered ? "rotate(0deg) scale(1.05)" : `rotate(${rotate}deg)`,
        zIndex: hovered ? 20 : zIndex,
        transformOrigin: "bottom center",
      }}
    >
      <div style={{ ...G.photoInner, background: bg }}>
        <div style={{ fontSize: 64, marginBottom: "auto", paddingTop: 20 }}>{emoji}</div>
        <div style={G.photoLabel}>{label}</div>
      </div>
    </div>
  );
}

// ── Review card ───────────────────────────────────────────────────────────────
function ReviewCard({ text, author, avatar, avatarBg, style, rotate }) {
  return (
    <div
      style={{
        position: "absolute",
        background: "#fff",
        borderRadius: 18,
        padding: "22px 24px",
        maxWidth: 280,
        boxShadow: "0 8px 40px rgba(0,0,0,0.09)",
        transform: `rotate(${rotate}deg)`,
        transition: "transform 0.3s",
        cursor: "default",
        ...style,
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "rotate(0deg) scale(1.03)"}
      onMouseLeave={e => e.currentTarget.style.transform = `rotate(${rotate}deg)`}
    >
      <div style={{ color: "#e8601c", fontSize: 15, marginBottom: 10, letterSpacing: 2 }}>★★★★★</div>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: "#444", marginBottom: 14 }}>{text}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: avatarBg, display: "flex", alignItems: "center",
          justifyContent: "center", color: "#fff",
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>{avatar}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{author}</div>
      </div>
    </div>
  );
}

// ── Feature tag pill ──────────────────────────────────────────────────────────
function FeatureTag({ icon, label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "#f0eee9", borderRadius: 999,
      padding: "10px 20px",
      fontSize: 13, fontWeight: 600, color: "#111",
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: "#111", display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: 14, flexShrink: 0,
      }}>{icon}</div>
      {label}
    </div>
  );
}

// ── Section heading helper ────────────────────────────────────────────────────
function SectionTitle({ children, center }) {
  return (
    <h2 style={{
      fontSize: "clamp(36px, 5vw, 62px)",
      fontWeight: 800, letterSpacing: "-0.04em",
      lineHeight: 1.05, color: "#0e0e0e",
      textAlign: center ? "center" : "left",
      margin: 0,
    }}>{children}</h2>
  );
}

// ── Role card ─────────────────────────────────────────────────────────────────
function RoleCard({ emoji, badge, badgeColor, badgeBg, title, desc, features }) {
  return (
    <div
      style={{
        border: "1.5px solid #e8e8e8", borderRadius: 24,
        padding: "40px 32px", background: "#fff",
        transition: "transform 0.3s, box-shadow 0.3s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow = "0 20px 50px rgba(0,0,0,0.07)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: badgeBg, color: badgeColor,
        border: `1.5px solid ${badgeColor}`,
        borderRadius: 999, padding: "5px 12px",
        fontSize: 11, fontWeight: 700,
        letterSpacing: "0.06em", textTransform: "uppercase",
        marginBottom: 20,
      }}>{emoji} {badge}</div>
      <h3 style={{
        fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em",
        lineHeight: 1.15, marginBottom: 12, color: "#0e0e0e",
      }}>{title}</h3>
      <p style={{ fontSize: 14, color: "#777", lineHeight: 1.7, marginBottom: 24 }}>{desc}</p>
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
        {features.map((f, i) => (
          <li key={i} style={{ fontSize: 13, color: "#666", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#e8601c", fontWeight: 700 }}>→</span> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function PearlHero() {
  return (
    <div style={G.page}>

      {/* ── NAV ── */}
      <div style={G.navWrap}>
        <nav style={G.nav}>
          <div style={G.navLogo}>👁️</div>
          <ul style={G.navLinks}>
            {["Features", "How it Works", "For You", "Reviews"].map(l => (
              <li key={l}>
                <a href={`#${l.toLowerCase().replace(/ /g, "-")}`} style={G.navLink}>{l}</a>
              </li>
            ))}
          </ul>
          <a href="/register" style={G.navCta}>Order Now</a>
        </nav>
      </div>

      {/* ── HERO ── */}
      <section style={G.hero} id="hero">
        {/* Floating pills */}
        <FloatPill icon="🍽️" count="340 orders" color="#4a6cf7"
          style={{ top: 140, left: "12%", animation: "floatY 5s ease-in-out infinite" }} />
        <FloatPill icon="❤️" count="1,200 students" color="#e8601c"
          style={{ top: 220, left: "6%", animation: "floatY 6s ease-in-out infinite 1s" }} />
        <FloatPill icon="⭐" count="4.9 rating" color="#f5a623"
          style={{ top: 140, right: "12%", animation: "floatY 7s ease-in-out infinite 0.5s" }} />
        <FloatPill icon="🚀" count="0 min wait" color="#00b8a9"
          style={{ top: 230, right: "6%", animation: "floatY 5.5s ease-in-out infinite 2s" }} />

        {/* Title */}
        <div style={{ position: "relative", zIndex: 1, padding: "0 24px" }}>
          <h1 style={G.heroTitle}>
            Skip the queue.<br />Order ahead.
          </h1>
          <p style={G.heroSub}>
            Pre-order meals from your university canteen, track them live,
            and pick up when ready — zero waiting, zero stress.
          </p>
          <div style={G.heroBtns}>
            <a href="/register" style={G.btnDark}>Order Now</a>
            <a href="#features" style={G.btnLight}>See Details</a>
          </div>
        </div>

        {/* Photo cards strip */}
        <div style={{ position: "relative", height: 340, maxWidth: 900, margin: "0 auto" }}>
          <div style={{ ...G.photoStrip, position: "absolute", inset: 0 }}>
            <PhotoCard emoji="🍛" label="Rice & Curry" bg="linear-gradient(160deg,#f4a261,#e76f51)" width={190} height={290} left={30}  rotate={-8} zIndex={1} />
            <PhotoCard emoji="🥘" label="Kottu Roti"   bg="linear-gradient(160deg,#2a9d8f,#264653)" width={210} height={310} left={190} rotate={-3} zIndex={2} />
            <PhotoCard emoji="🍜" label="Noodles"      bg="linear-gradient(160deg,#e9c46a,#e8601c)" width={230} height={330} left={370} rotate={1}  zIndex={3} />
            <PhotoCard emoji="🥗" label="Veggie Bowl"  bg="linear-gradient(160deg,#606c38,#283618)" width={200} height={290} left={570} rotate={5}  zIndex={2} />
            <PhotoCard emoji="🧃" label="Fresh Drinks" bg="linear-gradient(160deg,#00b8a9,#007a72)" width={185} height={270} left={740} rotate={9}  zIndex={1} />
          </div>
        </div>
      </section>

      {/* ── FEATURES TAGS ROW ── */}
      <section id="features" style={{ background: "#f9f8f6", padding: "80px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionTitle center>Built for campus life.</SectionTitle>
        </div>
        <div style={{
          display: "flex", flexWrap: "wrap",
          gap: 12, justifyContent: "center", maxWidth: 700, margin: "0 auto",
        }}>
          {[
            ["🗓️", "Pre-Order Meals"], ["⚡", "Real-Time Tracking"], ["🏪", "Multiple Vendors"],
            ["🔔", "Live Notifications"], ["📊", "Vendor Dashboard"], ["🛡️", "Secure Login"],
            ["🎓", "Built for Students"], ["📱", "Mobile Friendly"], ["♻️", "Reusable Orders"],
          ].map(([icon, label]) => <FeatureTag key={label} icon={icon} label={label} />)}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ background: "#fff", padding: "100px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 52 }}>
            <SectionTitle>You'll love<br />using PEARL.</SectionTitle>
            <a href="#roles" style={{ ...G.btnLight, fontSize: 13 }}>For your role →</a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {[
              { emoji: "⚡", tag: "No more waiting", title: "Order on lock", desc: "Pre-order before your break ends. Your meal is ready exactly when you arrive.", bg: "linear-gradient(160deg,#1a1a2e,#16213e)", color: "#fff" },
              { emoji: "📊", tag: "Full visibility",  title: "Track live",    desc: "Real-time order status updates. Know when your food is being prepared and when to pick up.", bg: "linear-gradient(160deg,#0f3460,#533483)", color: "#fff" },
              { emoji: "🍽️", tag: "Never stuck again", title: "Browse smarter", desc: "All canteen menus in one place. Filter by category, vendor, or price.", bg: "linear-gradient(160deg,#e94560,#0f3460)", color: "#fff" },
            ].map(c => (
              <div
                key={c.title}
                style={{
                  borderRadius: 20, overflow: "hidden",
                  background: c.bg, color: c.color,
                  position: "relative",
                  minHeight: 340, display: "flex", flexDirection: "column",
                  justifyContent: "flex-end",
                  transition: "transform 0.3s",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ fontSize: 72, textAlign: "center", paddingTop: 40, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.emoji}</div>
                <div style={{ padding: "24px 28px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6, marginBottom: 6 }}>{c.tag}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>{c.title}</div>
                  <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.6 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── "The system that works" ── */}
      <section style={{ background: "#f9f8f6", padding: "100px 48px", textAlign: "center" }}>
        <SectionTitle center>The system<br />that works.</SectionTitle>
        <p style={{ color: "#777", fontSize: 15, marginTop: 20, marginBottom: 52, lineHeight: 1.7 }}>
          This system works because it replaces guessing with structure —<br />so every order has a purpose and results build over time.
        </p>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3,1fr)",
          gap: 12, maxWidth: 820, margin: "0 auto",
        }}>
          {[
            ["🎯", "Role-Based"],    ["🔄", "No Guesswork"],   ["♻️", "Reusable Orders"],
            ["📱", "Platform Ready"],["📋", "Clear Direction"], ["⚡", "Easy & Fast"],
            ["🏆", "Repeatable"],    ["❤️", "Student-First"],  ["💡", "Smart Ordering"],
          ].map(([icon, label]) => (
            <div
              key={label}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                background: "#fff", borderRadius: 999,
                padding: "14px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                transition: "transform 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "#111", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 16, flexShrink: 0,
              }}>{icon}</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="for-you" style={{ background: "#fff", padding: "100px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <SectionTitle center>What this gives you.</SectionTitle>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            <RoleCard emoji="🎓" badge="Student" badgeColor="#4a6cf7" badgeBg="rgba(74,108,247,0.08)"
              title="Order your meal ahead." desc="Stop wasting your break standing in line. Pre-order, track live, and pick up without the wait."
              features={["Browse all vendor menus", "Pre-order before breaks", "Live order tracking", "Order history", "Push notifications"]} />
            <RoleCard emoji="🍽️" badge="Vendor" badgeColor="#00b8a9" badgeBg="rgba(0,184,169,0.08)"
              title="Manage your stall smartly." desc="A full dashboard to control your menu, accept orders, and run your canteen business efficiently."
              features={["Real-time order management", "Menu & pricing control", "Sales analytics", "Mark orders ready", "Notification system"]} />
            <RoleCard emoji="⚙️" badge="Admin" badgeColor="#e8601c" badgeBg="rgba(232,96,28,0.08)"
              title="Oversee the entire system." desc="Full platform control — manage users, vendors, monitor all activity, and keep everything running."
              features={["User & vendor management", "System-wide analytics", "Monitor all orders", "Approve vendors", "Platform config"]} />
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section id="reviews" style={{ background: "#f9f8f6", padding: "100px 48px 140px" }}>
        <SectionTitle center>Real stories<br />from campus.</SectionTitle>
        <div style={{ position: "relative", height: 460, maxWidth: 940, margin: "60px auto 0" }}>
          <ReviewCard rotate={-6} style={{ left: 0, top: 50 }}
            text="Finally I don't have to rush to the canteen during my 15-minute break. PEARL changed my entire campus routine."
            author="Ashan R. — Engineering Student" avatar="A" avatarBg="linear-gradient(135deg,#4a6cf7,#7a9cf7)" />
          <ReviewCard rotate={-2} style={{ left: 210, top: 10 }}
            text="I finally understand how to manage orders efficiently. PEARL gave me structure without making canteen work feel overwhelming."
            author="Alex R. — Vendor" avatar="A" avatarBg="linear-gradient(135deg,#00b8a9,#00e5d4)" />
          <ReviewCard rotate={4} style={{ left: 430, top: 40 }}
            text="The biggest change for me was the live tracking. I know exactly when to walk over and my food is always ready."
            author="Emily T. — IT Student" avatar="E" avatarBg="linear-gradient(135deg,#e8601c,#f5a623)" />
          <ReviewCard rotate={-4} style={{ left: 120, bottom: 0 }}
            text="PEARL gave me clarity. I don't waste time guessing what's available anymore, and that alone made a huge difference."
            author="Lena M. — Science Student" avatar="L" avatarBg="linear-gradient(135deg,#606c38,#283618)" />
          <ReviewCard rotate={3} style={{ right: 0, top: 120 }}
            text="They helped me stop overthinking and start ordering with confidence. Everything feels much easier to manage now."
            author="Jordan K. — Vendor" avatar="J" avatarBg="linear-gradient(135deg,#bc6c25,#dda15e)" />
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "#111", padding: "100px 48px", textAlign: "center" }}>
        <h2 style={{
          fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 800,
          letterSpacing: "-0.04em", color: "#fff",
          lineHeight: 1.05, marginBottom: 20,
        }}>
          Ready to skip<br />the queue forever?
        </h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, marginBottom: 40, lineHeight: 1.7 }}>
          Join students and vendors already using PEARL to make campus dining faster and stress-free.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <a href="/register" style={{ ...G.navCta, padding: "15px 32px", fontSize: 15, background: "#fff", color: "#111" }}>
            Get Started Free
          </a>
          <a href="/login" style={{ ...G.btnLight, padding: "15px 32px", fontSize: 15, background: "transparent", color: "#fff", border: "1.5px solid rgba(255,255,255,0.2)" }}>
            Sign In
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: "#111", borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "28px 48px", display: "flex",
        justifyContent: "space-between", alignItems: "center",
        color: "rgba(255,255,255,0.35)", fontSize: 13,
      }}>
        <div style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>PEARL.</div>
        <div>© 2026 PEARL Smart Canteen · Built for campus life</div>
      </footer>

      {/* Keyframes */}
      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
        a { transition: opacity 0.2s; }
        a:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}