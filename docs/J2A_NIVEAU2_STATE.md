# J2A – Niveau 2 state, grading og progression

## Status og afgrænsning

Dette dokument fryser den rene elevstate- og gradingkontrakt for Niveau 2.

J2A indeholder ingen React, CSS, localStorage, sessioncodec, savedAt, browsernavigation, random variantvælger eller deployment. State-laget modtager en allerede eksisterende reference- eller generatorcase som argument.

## Caseautoritet

Facit ligger kun i den injicerede case. State-laget:

- genererer ikke en case
- hardcoder ikke R1 eller generatorfixtures
- genberegner ikke payroll
- gemmer ikke caseSnapshot i student state
- importerer ikke generatorfunktionen

En lille caseadapter giver samme read-only kontrakt for direkte R1-data og generatedCase.derived.

## Progression

Den frosne progression er:

B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8 → B9 → checkpoint → B10 → B11 → B12 → B13 → finalControl → completed

Faserne er en diskrimineret union:

- document med activeDocumentId
- checkpoint
- finalControl
- completed

Kun det aktive bilag kan redigeres. Completed bilag er read-only. Pending bilag kan ikke redigeres.

Ved checkpoint, finalControl og completed er intet bilag aktivt. Juli åbnes først, når checkpointsektion A–E alle er korrekte.

## Student state

Student state indeholder:

- aktuel fase
- B1–B13 med status pending, active eller completed
- elevens posteringsrækker
- gradinggrupper og feedbackstatus
- monotont nextRowId
- checkpointstate
- final-control-state
- completed-flag

Student state indeholder ingen timestamps, storage metadata, variant eller case snapshot.

Alle transitions er rene og returnerer immutable state. Ingen transition muterer tidligere state eller den injicerede case.

## Posteringsrækker

En elevrække indeholder:

- rowId
- documentId
- accountNumber
- side: debit eller credit
- rawAmount som string
- valgfri text

nextRowId starter på 1 og stiger monotont. Der anvendes ingen UUID eller randomness.

Alle 13 konti kan vælges på Debet eller Kredit under det aktive bilag. State-laget begrænser ikke valget til facitkonti. Ukendte kontonumre afvises.

## Beløbsparser

Postingparseren accepterer positive hele kroner:

- 145812
- 145.812
- 145 812
- grouping med NBSP
- grouping med narrow NBSP

Parseren afviser blandt andet:

- 0
- negative eller eksplicit positive fortegn
- komma og decimaler
- valutaord
- eksponentformat
- Infinity og NaN
- forkert eller blandet grouping
- unsafe integers

Blank eller whitespace giver empty og er ikke 0.

Checkpointparseren bruger samme groupingregler, men accepterer 0. Begge parsere returnerer eksplicit empty, valid eller invalid uden fallback.

## Tomme drafts

En række med blank rawAmount og blank text er en helt tom draft. Den prunes ved kontrol.

En række med blank rawAmount og ikke-blank text er meningsfuld, men ufuldstændig. Den gør gruppen incorrect.

## Dokumentgrading og gruppelåsning

Gradingnøglen er:

documentId + accountNumber + side

Facitposteringer og elevrækker grupperes hver for sig. Unionen af expected og student groups grades.

En gruppe er correct kun når:

- alle meningsfulde rækker har gyldige positive beløb
- ingen række er ufuldstændig
- summen af elevrækker er lig expected sum

Flere elevrækker kan tilsammen opfylde én expected gruppe. Splitposteringer accepteres derfor.

Debet og Kredit grades separat. Debet X + 2.000 og Kredit 2.000 kan ikke erstatte expected Debet X.

Unexpected positive grupper bliver incorrect. Manglende expected grupper bliver incorrect med feedbacktypen missing uden facitbeløb.

Status er:

- unchecked
- incorrect
- correct

Lock afledes direkte af status correct. Der findes ikke et separat lock-flag.

Ved kontrol låses alle rækker i en correct gruppe samlet. Incorrect grupper forbliver redigerbare. Edit, add eller remove i en incorrect gruppe nulstiller gruppen til unchecked. Forsøg på at ændre en correct gruppe er no-op.

Et bilag completes kun når alle expected grupper er korrekte, ingen unexpected meningsfulde grupper findes, og ingen invalid eller incomplete rækker findes.

## Elevtotaler

Rene selectors leverer for det aktive bilag:

- samlet gyldig Debet
- samlet gyldig Kredit
- invalid-status pr. side
- balance state: none, balanced eller unbalanced

Hvis en side har invalid meningsfuldt input, er totalen null. 0/0 giver none. Ens positive summer giver balanced. Selectoren bruger aldrig facit.

## Checkpoint A–E

Hver sektion har status unchecked, incorrect eller correct. Lock afledes af correct og gælder hele sektionen. Der findes ingen permanent feltvis lock.

Ved fejl forbliver alle felter i sektionen redigerbare. Edit efter incorrect nulstiller sektionen til unchecked.

A – Bruttoløn ÅTD, timelønnede:

- lønkonto ÅTD
- medarbejderpension ÅTD
- medarbejder-ATP ÅTD
- beregnet bruttoløn ÅTD

B – Bruttoløn ÅTD, månedslønnede:

- samme fire felter for månedslønnede

C – Øvrige lønomkostninger ÅTD:

- arbejdsgiverpension
- arbejdsgiver-ATP
- feriepenge timelønnede
- regulering af feriepengeforpligtelse

D – Samlede lønrelaterede omkostninger ÅTD:

- operatingTotal

E – Balanceposter pr. 30/6:

- 6920 Skyldig A-skat
- 6930 Skyldig AM-bidrag
- 6922 Skyldig pension
- 6921 Skyldig ATP
- 6923 Skyldige nettoferiepenge – FerieKonto
- 6924 Feriepengeforpligtelse

E grades både beløb og side. Sidetypen kan være debit, credit, zero eller blank. Generator v1 har positive Kreditsaldi, men statekontrakten understøtter fremtidig zero.

Expected checkpointværdier læses fra casens checkpoint og checkpointBalances.

## Final control

Efter B13 går state til finalControl.

De seks items er:

- aTax
- amContribution
- pension
- holidayPay
- atp
- holidayLiability

Saldoerne er read-only og kommer fra casens finalBalances. Eleven vælger kun årsagsforklaring.

Stabile reason IDs:

- aTaxJunePaid
- amJunePaid
- pensionJunePaid
- holidayPayJunePaid
- atpQ1PaidQ2Outstanding
- holidayLiabilityRemains

Hvert item grades separat. Correct items låses. Incorrect items kan ændres og nulstilles da til unchecked. Når alle seks er correct, skifter fasen til completed.

## Completed semantics

Ved completed er completed = true og phase = completed.

Alle J2A-writefunktioner er herefter no-op:

- add/edit/remove posting row
- check document
- edit/check checkpoint
- select/check final control

Normal UI-brug udløser ingen exception.

## Reset

resetStudentState(case) er en ren helper, som returnerer samme blanke startstate som createInitialStudentState(case):

- B1 active
- B2–B13 pending
- checkpoint unchecked
- final control unchecked
- nextRowId = 1
- completed = false

Reset genererer ikke en case og ændrer ikke variant/case.

## J2B-forberedende note

J2B skal senere implementere en separat Niveau 2-persistencekontrakt. Niveau 1-storage må aldrig overskrives.

Foreløbig key:

kontering-af-loen-paa-t-konti.level2.session.v1

En persisted session skal senere indeholde:

- schemaVersion
- rulesetYear
- rulesetVersion
- generatorVersion
- variant
- caseSnapshot
- studentState
- savedAt

caseSnapshot skal være autoritativ ved restore, og restore skal udføre 0 generatorcalls.

Ingen af disse persistencefelter eller funktioner er implementeret i J2A.
