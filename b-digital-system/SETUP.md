# Setup — B Digital Automated System

One-time setup, ~20–30 minutes. You'll create a few **free** accounts and paste keys into
GitHub. Do the steps in order. ✅ = you'll copy a value you need later.

---

## 1. Notion (your CRM) — ~8 min

1. Create a free Notion account (https://notion.so) if you don't have one.
2. Make an **integration**: https://www.notion.so/my-integrations → **New integration** →
   name it `B Digital System` → submit → copy the **Internal Integration Secret**.
   ✅ This is `NOTION_TOKEN`.
3. Create **two blank databases** — for each: new page → type `/table` → **Table - Full
   page**. Just name them; **don't add columns by hand** — the "Setup Notion schema"
   button (step 6) builds every column for you. Name them:
   - **`B Digital Leads`**
   - **`B Digital Content Calendar`**
4. Share **both** with the integration: open each → top-right **•••** → **Connections**
   (or "Add connections") → add `B Digital System`. *(Do BOTH, or the system can't write.)*
5. Get each database's ID: open it as a full page and copy the link. The ID is the
   32-character chunk before `?`:
   `notion.so/<workspace>/`**`THIS_32_CHAR_PART`**`?v=...`
   ✅ Leads ID = `NOTION_LEADS_DB`, Content ID = `NOTION_CONTENT_DB`.

<details><summary>Columns the button creates (FYI — you don't add these manually)</summary>

**B Digital Leads:** Name(title), Business(text), Phone(phone), Email(email),
WhatsApp(url), Website(url), Website Quality(text), Source(select), Status(select),
AI Score(number), AI Notes(text), Outreach Draft(text), Date(date).

**B Digital Content Calendar:** Name(title), Date(date), Platform(select), Theme(text),
Caption(text), Image(url), Status(select).
</details>

---

## 2. Gemini API key (free AI) — ~2 min
1. Go to https://aistudio.google.com/app/apikey → **Create API key**.
2. Copy it. ✅ This is `GEMINI_API_KEY`. (Free tier is plenty for this system.)

---

## 3. Brevo (free email) — ~5 min
1. Create a free account at https://www.brevo.com.
2. **Senders**: Settings → Senders, Domains & Dedicated IPs → **Add a sender** →
   use your Gmail `brianisaacs533@gmail.com` → confirm via the email Brevo sends.
   ✅ This verified address is `BREVO_SENDER`.
3. **API key**: Settings → SMTP & API → **API Keys** → **Generate a new API key**.
   ✅ This is `BREVO_API_KEY`.

> Free tier = 300 emails/day, which comfortably covers alerts, auto-replies, and the
> capped gentle outreach.

---

## 4. Tally form (inbound lead page) — ~5 min  *(needed for Phase 1)*
1. Create a free account at https://tally.so.
2. New form **"Get a free quote — B Digital"** with fields:
   `Name` (short text, required), `WhatsApp/Phone` (phone), `Email` (email),
   `What do you need?` (multiple choice: Website / Ads / Branding / Not sure),
   `Tell me about your business` (long text).
3. **Integrations → Notion**: connect and map the answers into the **B Digital Leads**
   database. Set a hidden/default value so new rows get **Source = `Website`** and
   **Status = `New`** (use Tally's "Hidden fields" or a Notion default).
4. **Email notifications**: Tally → form **Settings → Emails** →
   - notify **you** (`brianisaacs533@gmail.com`) on every submission, and
   - send the **respondent** an auto-reply — paste the *Inbound auto-reply* text from
     `copy/templates.md`.
5. **Thank-you page**: Settings → "After submit" → add a button/redirect to your WhatsApp:
   `https://wa.me/264814794693?text=Hi%20Brian%2C%20I%20just%20filled%20in%20your%20form`
6. Copy the form's **embed link** — you'll paste it into `../b-digital-lead/index.html`
   (Phase 1).

---

## 5. Add everything to GitHub — ~3 min
In your repo: **Settings → Secrets and variables → Actions → New repository secret**.
Add each (names exactly):

```
NOTION_TOKEN
NOTION_LEADS_DB
NOTION_CONTENT_DB
GEMINI_API_KEY
BREVO_API_KEY
BREVO_SENDER        (brianisaacs533@gmail.com)
WHATSAPP_NUMBER     (+264814794693)
```

Also add one **Variable** (Secrets and variables → Actions → Variables) so you can pause
auto-emailing if needed — optional.

---

## 6. Turn it on
- **Actions**: repo → **Actions** tab → enable workflows if prompted.
- **Build the Notion columns** (one tap): **Actions → "B Digital — Setup Notion schema" →
  Run workflow**. When it finishes green, your two databases will have all their columns.
- **Pages**: repo → **Settings → Pages** → Source = **GitHub Actions** (for the lead page).
- **Test the lead finder**: **Actions → "B Digital — Lead Finder" → Run workflow** (manual).
  Check that your Notion Leads database fills in.

---

## Daily use
- Open the **Notion Leads** database on your phone. New leads appear with an AI score, a
  drafted WhatsApp message, and a tap-to-send **WhatsApp** link. Review → tap → send.
- Gentle first emails go out automatically (capped) to leads with a public email.
- Each week, check **Content Calendar** for ready-to-post captions + images.
- Want better/bespoke copy? In a Claude Code session say:
  *"Use the b-digital-copywriter agent to write WhatsApp openers for today's new leads."*
