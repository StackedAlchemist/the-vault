# ⚗ The Vault — Personal Finance Dashboard

> *"Every coin tracked. Every debt known. Every goal within reach."*

A full-featured personal finance dashboard built with vanilla HTML, CSS, and JavaScript. The Vault lets you manage multiple accounts, track transactions, set budgets, build savings goals, and monitor recurring bills — all without an account or backend.

**[🔮 View Live Demo](https://stackedalchemist.github.io/stacked-alchemist/the-vault/)**

---

## ✦ Features

- **Multi-Account Tracking** — Create and manage multiple accounts (checking, savings, credit, etc.) with a combined household summary
- **Transaction Management** — Add, edit, delete, search, sort, and filter transactions with full pagination (10 per page)
- **CSV & PDF Import** — Import bank statements directly from Bank of America, Chase, and other major formats
- **Budget Categories** — Set monthly spending limits per category with progress bars and latest transaction previews
- **Saving Pots** — Create savings goals with target amounts, target dates, and add/withdraw funds
- **Recurring Bills** — Track monthly bills with due dates, paid/unpaid status (resets monthly), and days-until-due sorting
- **Analytics Charts** — Income vs. Expenses bar chart (6 or 12 month view), spending pie chart, and top merchants
- **Full Accessibility** — Keyboard navigation, focus trapping in modals, ARIA labels, skip-to-content link, inline validation
- **Data Export** — Export transactions as CSV

---

## 🛠 Tech Stack

| Technology | Usage |
|---|---|
| HTML5 | Structure and semantic markup |
| CSS3 | Custom properties, responsive layout, animations |
| Vanilla JavaScript | All app logic, no frameworks |
| Canvas API | Bar and pie charts |
| localStorage | Data persistence |
| FileReader API | CSV and PDF import |

---

## 🚀 Running Locally

No build tools or dependencies required.

```bash
git clone https://github.com/StackedAlchemist/stacked-alchemist.git
cd Portfolio/the-vault
# Open index.html in your browser
```

Or simply open `index.html` directly in any modern browser.

---

## ⚠ Data Storage Notice

> The archives are bound to this vessel. Data persists in local memory only — switching devices or clearing your browser cache will release the binding.

All data is saved to **localStorage** in the user's browser. This means:
- No account or login required
- Data does not sync across devices or browsers
- Clearing browser cache/cookies will erase all data
- Storage limit is approximately 5MB per origin

For a production version with cloud sync, a backend with a database (e.g. Supabase, Firebase, or a custom Node/Express API) would be needed.

---

## 📁 File Structure

```
the-vault/
├── index.html       # App shell and all view markup
├── vault.css        # All styles
└── vault.js         # All app logic (~800 lines)
```

---

## 🔮 Planned Improvements

- Cloud sync via backend API
- Recurring transaction automation
- Budget rollover month-to-month
- Mobile PWA support

---

*Built by [Billy Williams](https://stackedalchemist.github.io/stacked-alchemist/) — Stacked Alchemist*
