# 50 Sample Tenant Inquiries — Training + Eval Set

> Realistic inquiry samples spanning Hallo Theo's actual customer base, age **25 to 100**, tech-affinity from "doesn't own a smartphone" to "writes their own AI agents." Used for:
> 1. **Training data** for the Claude triage classifier
> 2. **Eval set** to measure classification accuracy
> 3. **Demo material** — judges can pick any of these and see how NeoTheo routes them
> 4. **Source material** for the knowledge-base DIY guides
>
> All inquiries are fictional. Names, addresses, and details are illustrative — but situations are based on real property-management patterns Jan @ Hallo Theo described in [JAN_FEEDBACK.md](./JAN_FEEDBACK.md). Apartments span both **WEG** (homeowner-association tenants) and **SEV** (single-rental tenants).
>
> Schema: each row carries the verbatim-ish inquiry, the speaker's profile (age, tech, language), the expected classification, and the expected Standard Action Sequence (SAS) per [CATEGORIES_AND_ACTIONS.md](./CATEGORIES_AND_ACTIONS.md).

---

## How to read the rows

- **Verbatim inquiry** — what the tenant says when the ElevenLabs agent picks up (in their language)
- **Profile** — age, tech-affinity (Low/Med/High), preferred channel, WEG or SEV
- **Urgency** · **Action class** · **Category** → **SAS** (Standard Action Sequence)
- **Expected dispatch** — concrete first 1-2 steps the system will take

---

## The 50 Inquiries

### Group A — Information Requests & Documents (Low/Med, mostly auto-resolvable)

**#1** — *Frau Brigitte Hoffmann, 82, tech: Low, prefers Letter, WEG owner.*
> "Guten Tag, ich habe meine Nebenkostenabrechnung verloren. Können Sie mir bitte eine neue zuschicken? Per Post natürlich, ich nutze kein Internet."
- Urgency: **LOW** · Class: **AUTO_RESOLVE** · Category: `document_request` → **SAS-1**
- Dispatch: Look up `tenant.last_nebenkostenabrechnung_year`, generate PDF, queue postal letter via Letter-API (e.g., Pingen / LetterXpress), notify Servicer dashboard with tracking number.

**#2** — *Max Schreiber, 28, tech: High, prefers Telegram, SEV tenant.*
> "Hey, can you DM me a PDF of my Mietvertrag? I need it for my Anmeldung. Thanks!"
- Urgency: **LOW** · Class: **AUTO_RESOLVE** · Category: `document_request` → **SAS-1**
- Dispatch: Retrieve contract PDF from Supabase Storage, send via Telegram bot to `tenant.telegram_handle`, confirmation in chat within 30s.

**#3** — *Herr Klaus Werner, 71, tech: Low, prefers Phone, WEG owner.*
> "Wann ist eigentlich die nächste Eigentümerversammlung? Ich habe den Brief verlegt."
- Urgency: **LOW** · Class: **AUTO_RESOLVE** · Category: `information_lookup` → **SAS-1**
- Dispatch: Agent looks up `building.next_etv_date`, reads it aloud during the call, then sends a follow-up letter (paper, per preference) as backup.

**#4** — *Anna Kowalski, 34, tech: Med, prefers WhatsApp, SEV tenant.*
> "Hi, eine Frage: kann ich eine Bescheinigung bekommen, dass ich hier wohne? Ich brauche das für die Anmeldung von meinem Kind in der Kita."
- Urgency: **MEDIUM** · Class: **AUTO_RESOLVE** · Category: `document_request` → **SAS-1**
- Dispatch: Generate Wohnungsgeberbescheinigung (legally required form), send PDF via WhatsApp Business, log to compliance audit.

**#5** — *Marcus Bauer, 45, tech: Med, prefers Email, WEG owner.*
> "Können Sie mir bitte die letzten 3 WEG-Beschlüsse zusenden? Ich brauche sie für meine Steuererklärung."
- Urgency: **LOW** · Class: **SERVICER_QUEUE** · Category: `document_request` → **SAS-2**
- Dispatch: Servicer ticket created; PM-eyes-required because Beschlüsse may have confidentiality nuances. ETA 1 business day.

---

### Group B — DIY-able Maintenance Issues

**#6** — *Lisa Berger, 26, tech: High, prefers In-app, SEV tenant.*
> "My kitchen sink is draining super slowly. Is there something I can do before I escalate?"
- Urgency: **LOW** · Class: **AUTO_RESOLVE** · Category: `plumbing` → **SAS-1**
- Dispatch: Vector search → match the `slow_drain` DIY guide (`packages/knowledge-base/plumbing_slow_drain.md`), send via in-app push with YouTube link. 48h follow-up.

**#7** — *Herr Dieter Schäfer, 68, tech: Low, prefers Phone, WEG owner.*
> "Mein Abfluss in der Küche ist verstopft. Ich kann nicht mehr abwaschen."
- Urgency: **MEDIUM** · Class: **SERVICER_QUEUE** · Category: `plumbing` → **SAS-2**
- Dispatch: *Same problem as #6 but different tenant profile.* DIY guide not appropriate (tech: Low, age 68, will frustrate). Route to Servicer to call back; suggest sending a Hausmeister.

**#8** — *Tom Richter, 31, tech: High, prefers SMS, SEV tenant.*
> "Hey, the smoke detector in the hallway is beeping every minute. Battery probably dead. Send me the model number and I'll swap it myself."
- Urgency: **MEDIUM** · Class: **AUTO_RESOLVE** · Category: `electrical` → **SAS-1** (DIY pathway)
- Dispatch: Lookup `apartment.fixtures.smoke_detector_model`, send instructions + Amazon/dm link for battery type. Note in audit: legal requirement is annual check; flag for next Hausmeister round.

**#9** — *Frau Renate Müller, 79, tech: Low, prefers Letter, WEG owner.*
> "Mein Rollladen klemmt seit 3 Tagen. Ich kann ihn nicht mehr hochziehen."
- Urgency: **MEDIUM** · Class: **PROPERTY_MANAGER** · Category: `structural` → **SAS-3**
- Dispatch: PM gets notified; tested-knowledge applies (this Altbau has known Rollladen issues, contractor "Schulz" knows the building); `knowledge_capture_required=true`.

**#10** — *Sven Lange, 38, tech: Med, prefers WhatsApp, SEV tenant.*
> "Lampe im Bad geht nicht mehr. Habe neue Birne probiert, geht trotzdem nicht."
- Urgency: **MEDIUM** · Class: **AUTO_RESOLVE** · Category: `electrical` → **SAS-1**
- Dispatch: Send the "check the fuse box" DIY guide via WhatsApp + photo of the building's Sicherungskasten location. 24h follow-up.

---

### Group C — Heating Issues (winter-sensitive, Berlin context)

**#11** — *Petra Wenzel, 52, tech: Med, prefers Email, WEG owner.*
> "Meine Heizung wird nur lauwarm. Draußen ist es minus 2 Grad. Können Sie sich das bitte ansehen?"
- Urgency: **HIGH** · Class: **PROPERTY_MANAGER** · Category: `heating` → **SAS-4**
- Dispatch: Pull PM for this building. If on-shift, voice-bridge them now with AI summary. SLA: 2h. Notify owner.

**#12** — *Herr Wolfgang Vogt, 87, tech: Low, prefers Phone, WEG owner.*
> "Ich habe keine Heizung mehr. Es ist eiskalt in der Wohnung. Ich friere."
- Urgency: **EMERGENCY** · Class: **EMERGENCY_DISPATCH** · Category: `heating` → **SAS-6**
- Dispatch: **Parallel:** auto-dispatch 24/7 heating-emergency vendor; voice-call PM; voice-call owner; agent stays on line offering "soll ich jemanden vorbeischicken, der nach Ihnen sieht?" (elderly + cold = real safety risk). Skip budget gate. `knowledge_capture_required=true`.

**#13** — *Andreas Beck, 41, tech: High, prefers In-app, SEV tenant.*
> "Heizung ist halb am Funktionieren — Wohnzimmer ja, Schlafzimmer komplett kalt. Wahrscheinlich Luft im System?"
- Urgency: **MEDIUM** · Class: **AUTO_RESOLVE** · Category: `heating` → **SAS-1** (DIY pathway)
- Dispatch: Send "Heizung entlüften" DIY guide + YouTube link via in-app. Note: if this is winter and the tenant is alone, agent should also offer fallback. 48h follow-up.

**#14** — *Familie Aydın, mother 38 tech Med, prefers SMS, SEV tenant. Tenant says (translated from Turkish-accented German):*
> "Bei uns ist die Heizung kaputt. Wir haben zwei kleine Kinder. Bitte schnell."
- Urgency: **HIGH** (escalated by tenant emotional state + children + winter) · Class: **EMERGENCY_DISPATCH** · Category: `heating` → **SAS-6** (downgraded from EMERGENCY only if temperature/severity confirmed manageable; if not, full SAS-6).
- Dispatch: Same as #12. Agent should switch to Turkish if available in ElevenLabs voices, and offer the option.

---

### Group D — Plumbing Emergencies vs. Plumbing Annoyances

**#15** — *Frau Helga Krause, 76, tech: Low, prefers Phone, WEG owner.*
> "Aus meinem Bad kommt Wasser. Es läuft auf den Boden!"
- Urgency: **EMERGENCY** · Class: **EMERGENCY_DISPATCH** · Category: `plumbing` → **SAS-6**
- Dispatch: First instruct tenant to **shut off the main water valve** (location pulled from building data, read aloud). Then dispatch 24/7 plumber + alert PM + alert downstairs neighbour (water-damage cascade). `knowledge_capture_required=true`.

**#16** — *Robert Fuchs, 33, tech: High, prefers Telegram, SEV tenant.*
> "Toilet handle broke. Like literally fell off. I can still flush by lifting the lid but it's annoying."
- Urgency: **LOW** · Class: **AUTO_RESOLVE** · Category: `plumbing` → **SAS-1**
- Dispatch: DIY guide with parts link (Toilettenspülungs-Hebel, common standard). Send to Telegram.

**#17** — *Frau Schulz, 58, tech: Med, prefers WhatsApp, WEG owner.*
> "Mein Wasserdruck ist seit gestern sehr niedrig. Nur in der Dusche. Im Waschbecken normal."
- Urgency: **MEDIUM** · Class: **PROPERTY_MANAGER** · Category: `plumbing` → **SAS-3**
- Dispatch: Likely a Perlator/aerator issue, but localized pressure problems can also indicate building-wide pipe issues. PM should diagnose (tested knowledge: this 1960s building has had calc buildup issues before).

---

### Group E — Locks, Keys, Lockouts

**#18** — *Julia Sommer, 29, tech: High, prefers SMS, SEV tenant, 22:30 on a Friday.*
> "I locked myself out. Coming home from a wedding. Help."
- Urgency: **HIGH** · Class: **EMERGENCY_DISPATCH** · Category: `locks_keys` → **SAS-6** (downgraded)
- Dispatch: Connect to 24/7 Schlüsseldienst from `building.preferred_locksmith`. Disclose price up front (Schlüsseldienst scams are common in Berlin — show a fair price from contracted partner). Owner notified next morning, not woken at 22:30.

**#19** — *Herr Manfred Pohl, 64, tech: Low, prefers Phone, WEG owner.*
> "Ich habe meinen Briefkastenschlüssel verloren. Ich brauche einen neuen."
- Urgency: **LOW** · Class: **AUTO_RESOLVE** · Category: `locks_keys` → **SAS-1**
- Dispatch: Order replacement from contracted Schlüsseldienst (cost: ~€15-30, well within PM discretion budget). Confirmation letter sent (per channel preference).

**#20** — *Frau Yvonne Klein, 43, tech: Med, prefers Email, SEV tenant.*
> "Mein Schloss klemmt, ich bekomme die Tür kaum noch auf. Manchmal eine Minute Gewackel bis es geht."
- Urgency: **MEDIUM** · Class: **PROPERTY_MANAGER** · Category: `locks_keys` → **SAS-3**
- Dispatch: PM call-back. Likely needs lock-cylinder replacement; PM knows the building's standard cylinder type. `knowledge_capture_required=true`.

---

### Group F — Elevator Issues (key Jan example)

**#21** — *Frau Edith Stein, 81, tech: Low, prefers Phone, WEG owner. Lives on 5th floor.*
> "Der Aufzug ist seit gestern kaputt. Ich kann nicht mehr nach Hause kommen mit meinen Einkäufen."
- Urgency: **HIGH** · Class: **PROPERTY_MANAGER** · Category: `elevator` → **SAS-4**
- Dispatch: PM notified immediately (this tenant is 81, on 5th floor — accessibility is now urgent). Tested knowledge: which elevator vendor fixed this building last (per Jan's example). Owner gets courtesy notice.

**#22** — *Tobias Heller, 39, tech: Med, prefers Email, SEV tenant.*
> "Lift ist langsamer als sonst und macht ein neues Geräusch. Funktioniert aber."
- Urgency: **MEDIUM** · Class: **PROPERTY_MANAGER** · Category: `elevator` → **SAS-3**
- Dispatch: PM call-back within 24h. Schedule preventive Aufzug-service call. `knowledge_capture_required=true`.

**#23** — *Marie Dubois, 34, tech: Med, prefers Phone, SEV tenant.*
> "Mein Sohn steckt im Aufzug fest! Er ist 8 Jahre alt!"
- Urgency: **EMERGENCY** · Class: **EMERGENCY_DISPATCH** · Category: `elevator` → **SAS-6**
- Dispatch: **Instruct caller to dial 112 first.** Then auto-dispatch elevator emergency vendor + alert PM + alert building's Hausmeister. Agent stays on line.

---

### Group G — Renovation, Modification, and Owner-Heavy Requests

**#24** — *Daniel Roth, 36, tech: High, prefers In-app, WEG owner.*
> "I want to install a Wallbox for my EV in my parking spot. What's the process?"
- Urgency: **LOW** · Class: **PROPERTY_MANAGER** · Category: `renovation_inquiry` → **SAS-3**
- Dispatch: Wallbox needs WEG approval (it's a shared electrical system modification). PM walks them through Beschluss process, drafts ETV agenda item. `knowledge_capture_required=true`.

**#25** — *Frau Birgit Lehmann, 55, tech: Med, prefers Email, WEG owner.*
> "Wir möchten unseren Balkon mit Sichtschutz nachrüsten. Brauchen wir dafür eine Genehmigung der WEG?"
- Urgency: **LOW** · Class: **SERVICER_QUEUE** · Category: `renovation_inquiry` → **SAS-2**
- Dispatch: Standard answer template ("Yes for visible modifications, here's the Beschluss process"). PM only if escalation. `knowledge_capture_required=false` (this is templated).

**#26** — *Christian Vogel, 49, tech: Med, prefers WhatsApp, WEG owner-rep speaking on behalf of the whole building.*
> "Wir brauchen ein Angebot für die Fassadensanierung. Können Sie das organisieren?"
- Urgency: **LOW** · Class: **OWNER_APPROVAL** · Category: `structural` → **SAS-5**
- Dispatch: This is exactly Theo Negotiates territory. Multi-vendor quote-gathering (currently manual; Phase-2 = auctioned). Owner-approval required given the spend. `knowledge_capture_required=true`.

---

### Group H — Noise, Neighbour & Hausordnung Disputes

**#27** — *Frau Almut Krieger, 67, tech: Low, prefers Phone, SEV tenant.*
> "Mein Nachbar von oben macht jeden Abend laute Musik bis Mitternacht. Was kann ich tun?"
- Urgency: **LOW** · Class: **SERVICER_QUEUE** · Category: `noise_neighbour` → **SAS-2**
- Dispatch: First report — Servicer logs, sends template Hausordnung reminder to other tenant via PM. Tenant gets confirmation. Second report would escalate.

**#28** — *Same tenant, 3 weeks later (4th report).*
> "Ich habe schon dreimal angerufen und nichts ist passiert. Es ist immer noch laut. Ich möchte mit Herrn [PM Name] sprechen."
- Urgency: **MEDIUM** · Class: **PROPERTY_MANAGER** · Category: `noise_neighbour` → **SAS-3**
- Dispatch: Pattern detected (repeat caller, escalation). Auto-route to PM with full history of all 4 calls + previously-sent reminders. PM may need to issue an Abmahnung.

**#29** — *Stefan Junge, 27, tech: High, prefers Telegram, SEV tenant.*
> "Hey, my downstairs neighbour banged on my ceiling at 23:30 because of normal walking. Is that allowed? What are my rights?"
- Urgency: **LOW** · Class: **AUTO_RESOLVE** · Category: `noise_neighbour` → **SAS-1**
- Dispatch: Send Hausordnung quote + Mieterbund link (info-only). No staff action unless escalates.

---

### Group I — Accounting & Payments

**#30** — *Frau Marlies Köhler, 73, tech: Low, prefers Letter, SEV tenant.*
> "Ich habe eine Mahnung bekommen, aber ich habe die Miete bezahlt. Da muss ein Fehler vorliegen."
- Urgency: **MEDIUM** · Class: **SERVICER_QUEUE** · Category: `accounting` → **SAS-2**
- Dispatch: Agent confirms tenant identity, looks up payment history, *if payment confirmed* → flag the false Mahnung for Servicer to retract + apology letter. Otherwise → PM/accounting review.

**#31** — *Niklas Brandt, 31, tech: High, prefers Email, SEV tenant.*
> "I changed banks. Need to update my SEPA mandate for rent. How?"
- Urgency: **LOW** · Class: **AUTO_RESOLVE** · Category: `accounting` → **SAS-1**
- Dispatch: Send DocuSign-style SEPA-mandate update form via email. Auto-update on signed return.

**#32** — *Herr Albert Friedrich, 91, tech: Low, prefers Letter, WEG owner.*
> "Meine Hausgeld-Abbuchung ist diesen Monat höher als sonst. Stimmt das?"
- Urgency: **LOW** · Class: **AUTO_RESOLVE** · Category: `accounting` → **SAS-1**
- Dispatch: Look up recent Hausgeld-Anpassung in WEG protocols. If a recent Beschluss exists explaining the change → letter with explanation. Otherwise → SERVICER_QUEUE.

---

### Group J — Pests, Cleanliness, Common Areas

**#33** — *Anja Vogel, 44, tech: Med, prefers WhatsApp, WEG owner.*
> "Im Keller sind Mäuse. Können Sie einen Kammerjäger schicken?"
- Urgency: **MEDIUM** · Class: **PROPERTY_MANAGER** · Category: `pests` → **SAS-3**
- Dispatch: PM dispatches contracted Schädlingsbekämpfer. Mice in cellar = common area = WEG cost.

**#34** — *Hauptmieter Aboubacar Diallo, 36, tech: Med, prefers WhatsApp, SEV tenant.*
> "Im Treppenhaus ist seit 5 Tagen niemand mehr putzen gekommen. Sieht furchtbar aus."
- Urgency: **LOW** · Class: **SERVICER_QUEUE** · Category: `cleaning_common` → **SAS-2**
- Dispatch: Check Reinigungsdienst-Vertrag schedule. If lapse: contact Dienst + escalate to PM. Inform tenant of action taken.

**#35** — *Frau Ute Brandt, 60, tech: Low, prefers Phone, WEG owner.*
> "In der Tiefgarage stehen kaputte Möbel von einem anderen Eigentümer. Das ist Sperrmüll."
- Urgency: **LOW** · Class: **SERVICER_QUEUE** · Category: `cleaning_common` → **SAS-2**
- Dispatch: PM sends Hausordnung reminder + 14-day removal notice to identified owner. Servicer follows up.

---

### Group K — Appliances (SEV-only typically)

**#36** — *Sandra Pfeiffer, 39, tech: Med, prefers Email, SEV tenant.*
> "Mein Geschirrspüler funktioniert seit gestern nicht mehr. Spült nicht durch."
- Urgency: **MEDIUM** · Class: **PROPERTY_MANAGER** · Category: `appliances` → **SAS-3**
- Dispatch: SEV-only (furnished apartment — appliance is part of the rental). PM dispatches repair from preferred vendor. Tested knowledge: appliance brand for this furnished line.

**#37** — *Frau Erika Sommer, 78, tech: Low, prefers Phone, SEV tenant.*
> "Mein Backofen geht nicht mehr an. Ich kann nichts kochen."
- Urgency: **HIGH** · Class: **PROPERTY_MANAGER** · Category: `appliances` → **SAS-4** (elevated for elderly + sole cooking facility)
- Dispatch: PM is contacted directly. Interim solution: agent asks if tenant has a hot plate / can the building offer one until repair.

---

### Group L — Emergencies (Beyond Heating/Plumbing)

**#38** — *Familie Schneider, husband 41 tech Med, prefers In-app, WEG owners.*
> "ES RIECHT NACH GAS in der Küche!"
- Urgency: **EMERGENCY** · Class: **EMERGENCY_DISPATCH** · Category: `structural` (gas line) → **SAS-6**
- Dispatch: **First message: "Bitte sofort 112 anrufen und die Wohnung verlassen."** Then notify gas utility (Gasag) + PM + owner. Building-wide alert if multiple reports.

**#39** — *Pavel Novak, 53, tech: Med, prefers Phone, WEG owner.*
> "Eine Steckdose hat Funken gesprüht und es hat einen Knall gegeben. Jetzt geht in der Küche kein Strom mehr."
- Urgency: **EMERGENCY** · Class: **EMERGENCY_DISPATCH** · Category: `electrical` → **SAS-6**
- Dispatch: Instruct tenant: do not touch outlet, switch fuse off if safe. Dispatch emergency electrician + PM + owner. Sparking = fire risk.

**#40** — *Anonymous caller, age unknown, prefers Phone.*
> "Eine Dachpfanne ist auf die Straße gefallen und ich glaube es ist Sturm im Anmarsch."
- Urgency: **EMERGENCY** · Class: **EMERGENCY_DISPATCH** · Category: `structural` → **SAS-6**
- Dispatch: Public safety risk. Cordon-off needed + emergency Dachdecker + PM + owner. Liability angle — log everything.

---

### Group M — Edge Cases & Soft Inquiries

**#41** — *Frau Lieselotte Wegner, 88, tech: Low, prefers Phone.*
> "Ich glaube, ich habe heute eine Rechnung verloren. Können Sie nachsehen, ob Sie eine Kopie haben?"
- Urgency: **LOW** · Class: **AUTO_RESOLVE** · Category: `document_request` → **SAS-1**
- Dispatch: Patience. Look up recent invoices, mail copies on paper. Agent should NOT rush this caller.

**#42** — *Lars Petersen, 37, tech: High, prefers In-app, SEV tenant, calling from Spain on vacation.*
> "Hi from Mallorca! My neighbour just texted me there's water leaking from my balcony. Can you get someone in there?"
- Urgency: **HIGH** · Class: **PROPERTY_MANAGER** · Category: `plumbing` → **SAS-4** + special handling
- Dispatch: Tenant is NOT on site. PM needs key access (Hausmeister has master). Verbal authorization recorded. Tenant kept in the loop via in-app + voicemail summary.

**#43** — *Tariq Hassan, 45, tech: Med, prefers WhatsApp, SEV tenant.*
> "There's a stranger sleeping in our staircase the last two nights. I'm a bit worried."
- Urgency: **MEDIUM** · Class: **PROPERTY_MANAGER** · Category: `noise_neighbour` (extended) → **SAS-3**
- Dispatch: PM informed; Sozialarbeiter / non-emergency police-line option offered to caller. Avoid escalation language. Building-wide Hausordnung reminder.

**#44** — *Frau Christa Meier, 70, tech: Low, prefers Phone, WEG owner.*
> "Mein Mann ist gestorben und ich weiß nicht, was ich mit der Wohnung machen soll. Können Sie mir helfen?"
- Urgency: **LOW** *(emotionally HIGH — special handling)* · Class: **PROPERTY_MANAGER** · Category: `administrative` → **SAS-3** with empathy override
- Dispatch: Agent acknowledges loss, offers PM call-back at a time convenient to her, does NOT trigger any automated workflow. PM is briefed: this is a grief-sensitive call. `knowledge_capture_required=true`.

**#45** — *Jakob Hofer, 25, tech: High, prefers In-app, SEV tenant.*
> "Hey can I get a virtual viewing of the apartment 2C — I'm thinking of moving there when my contract ends."
- Urgency: **LOW** · Class: **SERVICER_QUEUE** · Category: `administrative` → **SAS-2**
- Dispatch: Forwards to leasing team (out-of-NeoTheo-scope but handled gracefully — "I'll forward this to the leasing team, they'll reach out within 1 business day").

**#46** — *Verena Lang, 58, tech: Med, prefers Email, WEG owner.*
> "Ich möchte einen Termin mit dem Verwalter persönlich vereinbaren. Wann kann er?"
- Urgency: **LOW** · Class: **PROPERTY_MANAGER** · Category: `administrative` → **SAS-3**
- Dispatch: Look up PM calendar; offer 3 slots; confirm via email. (Calendar integration = Phase 2; for demo, list PM's office hours.)

**#47** — *Frau Helene Adamski, 95, tech: None, prefers Phone (uses a Festnetz).*
> "Mein Sohn hat gesagt ich soll Sie wegen meiner Wohnung anrufen. Ich weiß auch nicht warum. Können Sie mir helfen?"
- Urgency: **LOW** · Class: **SERVICER_QUEUE** · Category: `administrative` → **SAS-2** with empathy override
- Dispatch: Agent does NOT pressure. Gentle: "Ich rufe gleich Ihren Sohn an, dann melden wir uns gemeinsam bei Ihnen. Ist das okay?" Pull `tenant.emergency_contact` (the son) and have PM/Servicer reach out to him directly.

**#48** — *Maximilian Steiner, 22, tech: Very High, prefers In-app, SEV tenant.*
> "Built a script that pulls my monthly water usage from your portal but the API returns 403 for unit 3B. What's the auth flow?"
- Urgency: **LOW** · Class: **SERVICER_QUEUE** · Category: `administrative` → **SAS-2**
- Dispatch: Out-of-scope technical question; route to dev team for in-app data access; tenant gets a meta-acknowledgment ("dev team is reviewing your API question").

**#49** — *Frau Gudrun Weber, 82, tech: Low, prefers Letter, WEG owner.*
> "Ich habe gehört, dass das Dach im nächsten Jahr saniert werden soll. Stimmt das? Was kostet mich das?"
- Urgency: **LOW** · Class: **PROPERTY_MANAGER** · Category: `renovation_inquiry` → **SAS-3**
- Dispatch: PM call-back; explanation in plain language; written summary mailed afterwards. Big-budget topic → owner needs transparency (Jan insight: "valid concern of owners").

**#50** — *Yuki Tanaka, 32, tech: High, prefers Email, speaks limited German, SEV tenant.*
> "Hi, my Heizkostenabrechnung looks wrong. Can you check it and explain in English please?"
- Urgency: **MEDIUM** · Class: **SERVICER_QUEUE** · Category: `accounting` → **SAS-2**
- Dispatch: Servicer queue with `language_preference: en`. PM or accounting reviews; reply in English; agent flags language preference in tenant profile for future calls.

---

## Distribution Summary

| Dimension | Count |
|---|---|
| **Urgency: LOW** | 22 |
| **Urgency: MEDIUM** | 17 |
| **Urgency: HIGH** | 5 |
| **Urgency: EMERGENCY** | 6 |
| **Class: AUTO_RESOLVE** | 14 |
| **Class: SERVICER_QUEUE** | 14 |
| **Class: PROPERTY_MANAGER** | 16 |
| **Class: OWNER_APPROVAL** | 1 |
| **Class: EMERGENCY_DISPATCH** | 6 |
| **Tenants 65+** | 14 (the demographic the auto-tooling must NOT alienate) |
| **Tenants under 35** | 16 |
| **Tech: Low / preferring Letter or Phone** | 17 |
| **Tech: High / preferring in-app / Telegram / API** | 13 |
| **WEG owners** | 26 |
| **SEV tenants** | 24 |
| **Languages other than German** | 5 (Turkish, English, Polish hint, French hint, Japanese-English) |
| **Knowledge-capture-required tickets** | 13 |

---

## How to Use This File

**For training the classifier:**
Feed each inquiry → expected classification JSON into the Claude system-prompt evaluation. Aim for ≥90% accuracy on urgency, ≥85% on action_class.

**For demo:**
Pick 3–5 of these (suggest #6, #12, #18, #38, #44) for the live demo. They span DIY auto-resolve, EMERGENCY dispatch, after-hours lockout (HIGH but not EMERGENCY), gas-leak (true safety), and the grief-sensitive edge case (showing the system has empathy logic).

**For the pitch:**
Use the distribution table above to show judges we understand the customer base. Hallo Theo's actual customers span 25–100 years old. NeoTheo handles all of them.
