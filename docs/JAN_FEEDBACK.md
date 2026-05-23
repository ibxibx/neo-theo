# Jan @ Hallo Theo — Customer Feedback Session

> Recorded discussion between Ian Baumeister (**neo-theo**) and Jan (Hallo Theo, founding team). May 23, 2026 — during the hackathon. WhatsApp audio recording 15:46:48.
>
> This is the most strategically important input we've received. Jan is **the actual customer**. Every design decision after this point is judged against whether it would make Jan say "yes, that's what we'd want."

---

## TL;DR — The 11 Insights That Should Reshape **neo-theo**

| # | Insight | Direct Impact on the Build |
|---|---|---|
| 1 | **Triage and negotiation are distinct problems.** Jan explicitly warned not to conflate them — "might be a long night otherwise." | Lead the demo with triage. Theo Negotiates becomes a clearly-labeled Phase-2 / aspirational layer. The judging story is "we solve the 70% problem first, here's how the future looks." |
| 2 | **"Peace of mind" is the actual customer value, not speed.** Jan: "I want to know it's being handled, I don't need to chase." | UX language shifts: dashboard says "tracked, owner notified, ETA tomorrow 9am" instead of "ticket created." Tenant-facing messages emphasize visibility, not promises. |
| 3 | **The knowledge lives in property managers' heads** ("tested knowledge"). Veteran Verwalters know which elevator company fixed which building. Extracting this is HalloTheo's strategic priority. | Every staff handoff in the dashboard should have a one-click "capture what you decided + why" field that writes back to the property's knowledge graph. This is the *Hallo-Theo-killer-feature* embedded inside our triage tool. |
| 4 | **Two-tier human structure exists today:** Servicer (generalist, takes all calls) → Property Manager (specialist, per-property). | Our triage tiers should mirror this exactly. New action vocabulary: `AUTO_RESOLVE`, `SERVICER_QUEUE`, `PROPERTY_MANAGER`, `OWNER_APPROVAL`, `EMERGENCY`. |
| 5 | **Budget rules are per-property, per-category.** Some properties say "PM can spend up to €500 without asking", others say "all expenditures need approval", others have category-specific limits. | The `property_policies` table is real, not theoretical. Schema must support per-property + per-category budget thresholds. |
| 6 | **Customer base is age-stratified — from 25 to 100.** 100-year-old wants letters, 25-year-old wants Signal/Telegram/in-app. | DIY dispatch must adapt channel to tenant's age/preference. We need a `tenant.preferred_channel` enum. The same DIY answer renders as a letter PDF for one tenant, a Telegram message for another. |
| 7 | **HalloTheo already triages email via AI in HubSpot.** | We are not introducing the concept of AI triage to them. We are extending it to voice. They will judge us on voice-channel-specific value, not "wow, AI." |
| 8 | **Phone-based identity lookup is essential.** Jan: "It should have all the contacts. I just call and the agent thing knows ah it's so-and-so from this street." | The agent's first action on call pickup: `lookup_tenant_by_phone(from_number)`. If found, agent skips intro and personalizes. If not found, gracefully ask. |
| 9 | **Two business models in property management:** WEG (homeowner-association, building-wide, our default) vs SEV (single-apartment rental management for individual owners). | Schema: `properties.management_type` enum, with different policy shapes per type. The demo can stick to WEG, but the data model must accommodate SEV. |
| 10 | **Walk-in customers exist** in rural offices. Edge case for the demo, but the inquiry pipeline must accept manual entries that didn't come via call. | `inquiries.channel` enum should include `walk_in`. The agent isn't always the entry point. |
| 11 | **DIY-by-AI-link is validated.** Jan: "[Sending a YouTube video for a simple fix] would be imaginable. If it solves the problem fast, why not." | Our LOW dispatch path is on-mission and the customer wants it. No reframing needed. |

---

## The Design Tension Jan Surfaced

> *"How far can you push autonomy in the agent when you want to have a human in the loop?"*

This is **the question** the demo must answer. Our answer:

- **Autonomy is highest for LOW (DIY) and EMERGENCY (when human latency would cause harm).**
- **Autonomy is lowest for OWNER_APPROVAL and PROPERTY_MANAGER (transparency + per-property knowledge matter).**
- **Every autonomous action is logged with a one-click "human override" button on the dashboard.**

This is *exactly* the kind of nuance that distinguishes a thoughtful PropTech build from a generic AI-for-X pitch.

---

## What This Means for Theo Negotiates

Theo Negotiates remains in the architecture and the schema. But the framing changes:

**Before Jan's feedback:** *"**neo-theo** runs parallel auctions to dispatch Handwerker."*

**After Jan's feedback:** *"**neo-theo**'s triage layer handles the 70% of inquiries that don't need humans. For the remaining 30% — particularly HIGH-urgency dispatch — we show what auto-negotiation could look like (Theo Negotiates), with explicit owner-consent and budget guardrails matching HalloTheo's actual approval rules."*

Jan also explicitly noted that "getting offers in" (auction-style dispatch) was *"one thing to look into. That's interesting."* — so it's not dismissed, just sequenced.

---

## Verbatim Transcript

> Source: WhatsApp audio recording, 2026-05-23 15:46:48. Speakers: **J** = Jan (Hallo Theo), **I** = Ian (**neo-theo**). Transcript produced via external AI summarizer; minor recognized errors noted [in brackets]. Original audio is the source of truth.

---

**J:** Once again, the last sentence — I think the triaging problem and the kind of negotiation/getting-offers-in are two distinct issues, and I'm not sure to what extent you want to solve both tonight.

**I:** Mhm.

**J:** Might be a long night otherwise.

**I:** Yeah, no, of course. Focus number one is [triage]. But we're also thinking — super interesting — if we could add a bit more value into the whole thing, if you can add this in and it doesn't kill or break the product. It's going to look nicer. So it's kind of more things thought through.

**J:** Yeah. But of course focus number one is the most tried [important].

**I:** So how do you handle these calls from tenants currently?

**J:** So when somebody calls, there are these people that take the calls and they do this triaging today. They take the call and they will know all the properties that we have. Then they will understand kind of the issue and they will see — ah, this is something I can quickly resolve myself. Maybe if this is something like very common — we need a new key because somebody has lost a key or something — they will know who to call and they can place the order to get the new key by themselves.

If this is something that's more delicate or more complex, then they will call the property manager responsible for that particular property. So the **Servicer** is somebody that is very broad — they take the phone and they act across all properties. And then the **property managers** work on specific properties. They are experts in particular properties, and if it's something more complex the Servicer will call them and say "hey, they might [be needed]" — maybe even forward them right away and see if they're available and forward the call. Or they will say "okay, thank you, I've noted it down, I'll hand it over to the property manager and then they'll get in touch with you."

**I:** Okay, so the whole process is the same but it's done by humans. Yeah. Yeah. There is a process. So we need some layer that has to approve — certain human-in-the-loop should be on certain [actions].

**J:** Yeah, I think that's exactly the thing that's interesting in this case — like, how far can you push autonomy in the agent when you want to have a human in the loop. These are all the nuances.

**I:** But what would you recommend, in the ideal case if it's like a sexy futuristic system? What would you dream of? Like, "oh gosh, I'm so tired of doing this, that's so crazy and so annoying" — so what would you ideally want? Describe the ideal case so we can build something as close as possible to that, technically possible.

**J:** I mean, I think if I look at this from a customer perspective — I know that whenever I call with a very complex problem, like "hey, we need the roof fixed," I can't expect somebody to say "yeah, no problem, we're already on the way." But when I say "hey, I just need access to this or that data" or "I lost the contract for my tenant, I don't remember, I'm on the way, I don't have access to the tenant document, can you just quickly give me details?" — obviously then I want this to be answered right away.

What's important to me as a customer is **peace of mind**. That I know I can call, can put my thing there, and I know it's being handled and I don't need to run after it. I don't need to call two weeks later and say "hey guys, you know I asked you, did you do it?" So from a customer perspective, this whole experience of interacting with my property manager is — whenever I have a problem, I want to be able to place that problem there on whatever channel fits me best. Whether I prefer writing an email or calling, whatever. And I just want it to be taken care of. If it's a complex thing, that's fine. If it's something I expect to be answered quickly, I just want an answer back.

**I:** What are your communication channels? Email and WhatsApp? Slack?

**J:** Currently there's email. We try to push towards email a lot. And there's phone.

**I:** [You have] email addresses of every tenant?

**J:** Emails through tickets — through that, what you call it, customer service ticket system. We use HubSpot as our ticket system. And, yeah, normally they reach out to us and then we know how to reach them again. But we also have the contact details of all the owners.

**I:** So you ask in the call — do you also ask the client's address?

**J:** Ideally we have that information already because we have the contact details. Or they just say "hey, I'm so-and-so from this street," and then we'll figure it out.

**I:** Yeah, because we need to integrate this into our [ElevenLabs agent].

**J:** Ideally, that would be even better — I just call and the agent thing knows "ah, it's so-and-so, I know it's [Friedrichstraße] 22-something." [...] That's smart, futuristic. When it doesn't need to ask, it already knows. It should have all the contacts with my phone.

[Off-topic — they realize they live near each other in Berlin, exchange some small talk about Hamburg.]

**J:** Anyway — yeah, ideally I want this to be resolved directly. Why should I have to say "I'm young, I live here and there, blah blah blah"? That's smart, futuristic — when it doesn't need to, it already knows.

The second communication channel is calls. And the third — not so much here in Berlin, but we have property management companies in more rural areas, and there they have **walk-in customers**.

**I:** Walk-in customers?

**J:** They just walk into the office. They would say "oh I was just passing by anyway" and drop by and say "ah, here, can this be sorted." Obviously that's the less frequent one, but it happens.

**I:** Okay, so most of the time it's email or call.

**J:** Yeah, email or call. If it's urgent — even for myself, like sometimes when I want something, I prefer just calling somebody because it's easier than having to write everything down.

**I:** Okay. And how do you handle [vendor dispatch] — like if you need an elevator repair person, how do you handle that? You have a list of companies and the property manager calls them?

**J:** It depends on the case. But what is generally true is that much of this context will live inside the property manager's head — we call this **"tested knowledge"** — the detailed knowledge that property managers have about the properties they manage. For example, for the elevator case, they might know last time the elevator was broken, company XYZ fixed it for this building. So they know the brand of the elevator, they can work with that brand. Maybe they've done a good job, so you might want to call them again because it's easier. Or they might not be available anymore, so you have to call somebody else — but then you know they might not be familiar with the brand of the elevator, etc.

**I:** So it depends on the person? If you replace that property manager with another one, the decision might be different?

**J:** Exactly. So that's one of the challenges we face today — this is a very people-focused business, especially on the ops side, because a lot of this knowledge of "hey who do I call?" is not generalizable. There are all these nuances you need to be aware of. This is why it's very difficult today to swap property managers around, because they carry so much of the knowledge. So extracting that knowledge from property managers is one thing that we work on a lot, because it's so important.

**I:** So for each area you have a property manager that has, say, 10 properties they manage. You hire those people?

**J:** Yeah, we have the property managers with us and they work with us.

**I:** Because you acquired those companies, right? So they're with you.

**J:** Yeah, yeah.

**I:** And about the financing? How do you manage that? Do you ask the owner "are you agreed with this price to be charged for the elevator"?

**J:** So the property managers are like — you can think of this like accountants and bookkeepers for properties. Similar to an accountant for a company. You can think of every property as like a mini enterprise. Every property has a full book of accounts, and once a year you need to do a report of the finances of the property. It's the task of the property managers to keep track — to do accounting. Depending on the property — and again this is very specific to each property — there might be an agreement that we as a property manager are allowed to do all expenditures until a certain budget, or to approve everything for a particular type of expenditure. And for expenditures above a certain budget, we need to get approval from the owners or from particular owners. This is all defined per property individually. These are rules I as a property manager have to keep in mind if I issue a repair.

That's the legal requirement. But also — I as an owner obviously want transparency of what happens, because at the end of the day it's my money that you as a property manager spend. So that's also important to us — how can we make that process as transparent as possible. That's a valid concern of owners.

**I:** You're also collecting the rents and these kinds of things?

**J:** Yes.

[Brief interruption from another team — someone asking for technical help with copying a key.]

**J:** So there are different business models depending on the service we offer. The bread and butter of a property manager house in Germany is — you have a building, and inside the building you have multiple owners, and these owners need to cooperate in some sort. There are parts of the building that don't belong to a single person but are shared across all, and the house's job is to organize everything related to all of these — walls, etc. We are not in touch with anything behind your apartment door. Your apartment is completely up to you as the [owner]. We only worry about everything that's the **homeowner association** [WEG — Wohnungseigentümergemeinschaft]. So everything of the group. That includes the accounting, decisions for renovation, all these things.

But you can also take care of whatever happens inside the apartment. And that makes more sense when you, for example, rent out your apartment — because then there's additional administration. You need to collect the rent, you need to make the [Nebenkostenabrechnung — annual cost statement] to send to the tenant at the end of the year, all these things. But then that's a second agreement that we have with individual owners.

The first one we call **WEG** [Wohnungseigentümerverwaltung], and the second one — that's where we have contracts with individual owners — is **SEV** [Sondereigentumsverwaltung]. We have a contract with the entire WEG, so with the whole homeowner association.

**I:** Have you also tried these AI agents like voice calling before?

**J:** Voice calling we haven't really played around with much yet. But we use a triage system on our email inbox — there's already AI doing that triage today. And obviously what we're trying to get into now is exactly these individual processes. Like, how can we automate fixing the elevator? And I think this part of "getting offers in" — that might be one thing to look into. That's interesting.

**I:** Yeah. Should we also automate the process of, like, sending a YouTube video if it's that simple [a fix]?

**J:** Not today, but that would be something that's imaginable. Yeah, if it solves the problem fast, then why not? I mean, at the end of the day, you have to look at our customer base, which is very diverse. Homeowners can be anywhere from **25 to 100**. And with that, they have very diverse tech affinity. A 100-year-old babushka is not going to be able [to follow a YouTube link] — she still wants to call.

**I:** She still wants to receive a letter.

**J:** Others — somebody more tech-heavy — it's like "why do you bother sending me a letter, I'll lose it anyway, send it to me via SDK [Signal/messaging app]." [Someone in the team adds:] "So I developed my own agent."

**I:** So I'm thinking — we assume that the person is at least able to open an email.

**J:** Yeah. Yeah, yeah.

**I:** I think that's a good assumption. And it's calling — we handle the call, we triage to the expert that we need to handle that. And what else can we add to this? The negotiation part is a different thing. What do you think makes sense? Imagine yourself in the skin of those people calling or writing emails — different scenarios. What would make you happy as a customer? You paid €300,000 or €500,000 for that apartment, and you have all these problems, and Hallo Theo is so slow — you want to get the most out of it. And imagine being Hallo Theo — what are they meeting when they hear all these customer inquiries? So it's how to marry those worlds and make it all smooth and perfect. It's not easy.

**J:** Okay.

**I:** Let's do that. Thank you so much for the feedback. Very helpful.

**J:** Very excited to see what you come [up with]. Nice. Thank you.

**I:** Will you be here tomorrow?

**J:** Yeah, I'll be here tomorrow as well.

---

## Note on transcript provenance

Produced by an external AI transcription tool from a WhatsApp audio recording. Minor recognized errors (e.g. "SDK" likely "Signal", "the V" → "the WEG") have been noted inline. The original audio is the source of truth, not this document.
