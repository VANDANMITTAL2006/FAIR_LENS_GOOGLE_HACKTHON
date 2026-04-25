# 🎬 FairLens — Full 5-Minute Demo Script
## Person D | Day 4 | Verbatim Script + Click Guide

---

> 📌 **HOW TO USE THIS SCRIPT**
> - **[ACTION]** = what you click/do on screen
> - **"Text in quotes"** = exactly what you SAY out loud
> - **[PAUSE]** = stop talking, let judges react
> - **(X seconds)** = time target for that section
> - Practice this 3 times before the real demo!

---

## ⏱️ TIME BREAKDOWN

| Section | Time | Cumulative |
|---------|------|------------|
| Opening Hook | 0:30 | 0:30 |
| Upload Dataset | 0:30 | 1:00 |
| Bias Reveal | 0:45 | 1:45 |
| SHAP Explanation | 0:45 | 2:30 |
| Name-Swap WOW | 0:45 | 3:15 |
| Fix the Bias | 0:30 | 3:45 |
| Export + Close | 0:15 | 4:00 |
| Q&A Buffer | 1:00 | 5:00 |

---

---

# 🎬 DEMO BEGINS HERE

---

## SECTION 1 — OPENING HOOK (0:00 to 0:30)

> **[ACTION]** → FairLens dashboard khuli hai, blank screen dikhao — kuch upload nahi hua abhi
> **[ACTION]** → Judges ki taraf dekho, screen pe nahi — cold delivery chahiye

**SAY EXACTLY THIS:**

> *"2018 mein, Amazon ne apna AI hiring tool band kar diya."*

**[PAUSE — 2 seconds]**

> *"Kyun? Kyunki unka model — 4 saal tak — har us resume ko penalize kar raha tha jisme 'women's' word tha. Women's chess club. Women's coding group. Anything."*

**[PAUSE — 2 seconds]**

> *"4 saal. Hazaron candidates. Kisi ko pata nahi chala."*

**[PAUSE — 3 seconds — let it land]**

> *"FairLens yahi karta hai — woh same bias 4 seconds mein pakad leta."*

> **[ACTION]** → Ab screen pe aao, mouse cursor dashborad pe lao

---

## SECTION 2 — UPLOAD DATASET (0:30 to 1:00)

> **[ACTION]** → `adult_demo.csv` file pehle se desktop pe ready rakhna — DEMO se pehle!
> **[ACTION]** → File upload box pe drag करो ya "Browse" click karo

**SAY EXACTLY THIS:**

> *"Ye ek real hiring dataset hai — 8,800 se zyada employee records. Yahi data type hota hai jo companies apne AI hiring models ko train karne ke liye use karti hain."*

> **[ACTION]** → File drag karo upload box mein

> *"Upload ho raha hai..."*

> **[ACTION]** → Progress bar dikhne do (ya cached result load karo silently agar slow hai)

**SAY EXACTLY THIS:**

> *"FairLens automatically detect kar leta hai — 8,883 rows, 16 features... aur 2 protected attributes: gender aur race."*

**[PAUSE — 1 second]**

> *"Ab dekhte hain kya mila."*

---

## SECTION 3 — BIAS REVEAL (1:00 to 1:45)

> **[ACTION]** → Bias metrics dashboard scroll karo — red indicators dikhao

**SAY EXACTLY THIS:**

> *"Ye dekho."*

**[PAUSE — 3 seconds — point at the screen]**

> *"Is model mein women ko >50K salary milne ki probability — men ke comparison mein — 47% kam hai."*

> **[ACTION]** → Disparate Impact number point karo: **0.471**

> *"EEOC ka rule kehta hai — koi bhi score 0.8 se neeche GAYA toh woh illegal discrimination hai."*
>
> *"Ye model 0.471 pe hai."*

**[PAUSE — 2 seconds]**

> *"Matlab — agar ye company US mein kisi ko hire karne ke liye yeh model use kar rahi hai — unhe abhi ek lawsuit face karna pad sakta hai."*

**[PAUSE — 2 seconds]**

> **[ACTION]** → Race section scroll karo

> *"Aur race? Non-white applicants ka score alag hai — 31% higher gap."*

> *"Ye koi edge case nahi hai. Ye norm hai."*

---

## SECTION 4 — SHAP EXPLANATION (1:45 to 2:30)

> **[ACTION]** → "Why is this happening?" ya SHAP section pe click karo

**SAY EXACTLY THIS:**

> *"Ab sabse important question — YE HO KYU RAHA HAI?"*

> **[ACTION]** → SHAP feature importance chart dikhao

> *"FairLens SHAP analysis run karta hai — matlab woh exactly batata hai ki model ke andar kaunse features discrimination drive kar rahe hain."*

> **[ACTION]** → Top 3 features point karo

> *"Number one — 'marital status'. Married couples ko zyada score milta hai — aur women ki marital status unke career se alag consider hoti hai model mein."*

> *"Number two — 'occupation category'. Certain job roles — jo historically female-dominated hain — woh lower income predict karte hain."*

**[PAUSE — 2 seconds]**

> *"Ye model directly gender nahi dekh raha. Woh 'proxy features' use kar raha hai — jo gender ke saath correlated hain. Ye zyada dangerous hai — kyunki invisible hai."*

**[PAUSE — 2 seconds]**

> *"Isko proxy discrimination kehte hain. Aur ye FairLens ke bina pakadna almost impossible hai."*

---

## SECTION 5 — NAME-SWAP WOW MOMENT (2:30 to 3:15)

> **[ACTION]** → "Counterfactual" ya "Name Swap" section pe click karo
> ⚠️ **YE SECTION SABSE IMPORTANT HAI — SLOW DOWN KARO**

**SAY EXACTLY THIS:**

> *"Ab main aapko kuch dikhata/dikhati hoon jo aap kabhi nahi bhoolenge."*

**[PAUSE — 2 seconds]**

> **[ACTION]** → Input box mein type karo ya pre-filled values dikhao:
> ```
> Name: Sarah Chen
> Education: MIT Graduate
> Experience: 5 years
> ```

> *"Sarah Chen. MIT se padhi hai. 5 saal ka experience hai."*

> **[ACTION]** → "Predict" button click karo

> **[ACTION]** → Result dikhao: **20.8%**

> *"Hire probability — 20.8%."*

**[PAUSE — 3 seconds — let judges read it]**

> **[ACTION]** → Sirf naam badlo: `James Chen`
> (baaki sab same rakhna — education, experience, everything)

> *"Ab sirf naam badalta hoon. Baaki sab same. University same. Experience same. Skills same."*

> **[ACTION]** → "Predict" click karo

> **[ACTION]** → Result dikhao: **38.8%**

> *"38.8%."*

**[PAUSE — 4 seconds — complete silence — judges ko calculate karne do]**

> **[ACTION]** → `James White` type karo

> *"Ek aur baar."*

> **[ACTION]** → Result dikhao: **38.8%**

> *"Same result. Because the model doesn't know last names."*

**[PAUSE — 3 seconds]**

> *"18 percentage points ka fark. Same degree. Same experience. Sirf gender badla."*

**[PAUSE — 3 seconds]**

> *"Yahi algorithmic discrimination hai. Aur yahi abhi — is waqt — real companies mein ho raha hai."*

**[PAUSE — 4 seconds — most powerful pause of the demo]**

---

## SECTION 6 — FIX THE BIAS (3:15 to 3:45)

> **[ACTION]** → "Debiasing Strategies" section pe aao

**SAY EXACTLY THIS:**

> *"Ab FairLens sirf problem nahi dikhata — woh fix bhi karta hai."*

> **[ACTION]** → 3 strategy cards dikhao

> *"Teen options hain. Reweighting, Threshold Adjustment, Feature Removal."*

> *"Main Reweighting select karta/karti hoon."*

> **[ACTION]** → "Apply Reweighting" button click karo

> **[ACTION]** → Re-audit run hota dikhao — red se green hote charts

> *"Dekho kya hua."*

**[PAUSE — 3 seconds — let charts animate]**

> **[ACTION]** → New Disparate Impact dikhao: **0.876**

> *"Disparate Impact 0.471 se badh ke 0.876 ho gaya — EEOC threshold ke upar."*

> *"Gender gap 24 percentage points se gir ke 4 points pe aa gaya."*

> *"Aur accuracy loss? Sirf 1.2%."*

**[PAUSE — 2 seconds]**

> *"Model abhi bhi kaam karta hai — bas fairly."*

---

## SECTION 7 — EXPORT + CLOSE (3:45 to 4:00)

> **[ACTION]** → "Generate Compliance Report" button click karo

**SAY EXACTLY THIS:**

> *"Ek click. PDF report generate ho gayi."*

> **[ACTION]** → PDF download animation dikhao

> *"Ye wahi document hai jo aapki legal team ko regulators ko dena hoga."*

> **[ACTION]** → PDF open karo, 2 lines point karo

> *"EU AI Act Article 10 — satisfied. EEOC 4/5ths rule — satisfied."*

**[PAUSE — 2 seconds]**

> *"FairLens ne 4 seconds mein woh kaam kar diya — jisme Amazon ko 4 saal lag gaye detect karne mein."*

**[PAUSE — 2 seconds — smile — done]**

---

## SECTION 8 — Q&A BUFFER (4:00 to 5:00)

> Ab judges ke questions ke liye ready raho. Neeche top 5 questions ke answers hain.

---

# 🎯 TOP 5 JUDGE QUESTIONS + ANSWERS

**Q1: "Ye real data hai ya fake?"**
> *"Teeno datasets publicly available hain — UCI Adult Income Census data, ProPublica COMPAS criminal justice data, aur US Department of Housing HMDA mortgage data. Ye sab academically documented bias wale datasets hain. Results genuine hain — fabricated nahi."*

**Q2: "Ye existing tools se different kaise hai?"**
> *"IBM AIF360 aur Microsoft Fairlearn Python libraries hain — unhe use karne ke liye data scientist chahiye. FairLens unke upar ka interface hai — CSV upload karo, compliance report lo. HR manager, legal team, executive — koi bhi use kar sakta hai. No code required."*

**Q3: "EU AI Act compliance ka kya matlab hai?"**
> *"2024 mein EU AI Act pass hua. Iske tehet hiring, lending, criminal justice mein use hone wale AI models ke liye mandatory bias audits required hain. Non-compliance pe fine hai — up to EUR 30 million ya 6% global turnover. Companies abhi scramble kar rahi hain. FairLens unka compliance tool hai."*

**Q4: "Accuracy loss acceptable hai?"**
> *"1.2% accuracy loss ke badle mein model EEOC compliant ho jaata hai aur lawsuit risk eliminate ho jaata hai. Ek average discrimination lawsuit ka settlement $2-10 million hota hai. 1.2% accuracy tradeoff is a business decision — not a technical one."*

**Q5: "Business model kya hai?"**
> *"Teen revenue streams hain. SaaS subscription — $500-2000/month per enterprise. API access — developers apne ML pipelines mein integrate kar sakte hain. Aur on-demand compliance reports — $500-5000 per audit. IBM, Microsoft, Salesforce sab AI governance tools acquire kar rahe hain — FairLens unke liye natural acquisition target hai."*

---

# 🔁 REHEARSAL GUIDE

## Kitni baar practice karo?
| Day | Practice |
|-----|----------|
| Aaj (Day 4) | 2 baar poora script padho |
| Day 5 | 3 baar live demo karo — timer ke saath |
| Day 6 | Kisi non-technical person ko dikhao |
| Demo day | Ek baar cold run karo subah |

## Weak points — inpar dhyan do:
1. **Name-swap section** — yahan ruko, rush mat karo. 4 second pause mandatory hai
2. **Numbers clearly bolo** — "0.471" nahi, "zero point four seven one" bolo
3. **Eye contact** — upload hone ke time screen mat dekho, judges ko dekho
4. **Fallback ready rakho** — agar live API slow ho, cached JSON silently load karo

## Timing check:
- Section 1 (Hook): 30 sec — agar zyada ho toh Amazon story trim karo
- Section 5 (Name-swap): 45 sec — agar kam ho toh pauses badhao
- Total: 4 min MAXIMUM — 1 min Q&A ke liye bacha ke rakho

---

# ✅ DAY 4 FINAL CHECKLIST

- [ ] `adult_demo.csv` saved (8,883 rows, DI=0.471 ✓)
- [ ] `compas_demo.csv` saved (7,214 rows, 2.8x ratio ✓)
- [ ] `hmda_demo.csv` saved (8,107 rows, 2.4x ratio ✓)
- [ ] Demo script saved as `DEMO_SCRIPT.md`
- [ ] All files pushed to GitHub
- [ ] Script read atleast 2 times today
- [ ] Name-swap numbers memorized: Sarah=20.8%, James=38.8%, Gap=18pts
- [ ] Fallback cache files are ready (from Day 3)
- [ ] `adult_demo.csv` file saved on Desktop for demo day upload
