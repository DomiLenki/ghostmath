# 👻 Ghost Math – Drehung

Ein gruseliges Live-Mathe-Quiz (Halloween-Edition) zum Thema **Drehung** für die 8. Klasse.

## So funktioniert's

1. **Lehrer** öffnet die Seite → „Ich bin Lehrer“ → wählt *Nur leiten* oder *Mitspielen* → Raum erstellen.
2. **Schüler** öffnen die Seite (oder scannen den QR-Code) → Code eingeben, Name + Avatar wählen → beitreten.
3. Lehrer startet. Alle bekommen gleichzeitig dieselbe Frage mit Countdown.
4. Schnelle richtige Antworten geben mehr Punkte (bis 1000), falsche Antworten 0. Ab 3 richtigen in Folge gibt's +100 Bonus 🔥.
5. Am Ende: Siegerpodest mit Platz 1–5.

## Level

| Level | Inhalt |
|---|---|
| 🎃 Kürbis | Grundbegriffe: Drehzentrum, Fixpunkt, Drehrichtung, Schreibweise |
| 👻 Geist | Winkel umrechnen (−90° = +270°), Drehrichtung erkennen, Uhrzeiger |
| 🦇 Fledermaus | Selbst machen: Bildpunkt setzen, Drehrad auf den Geister-Schatten, richtiges Bild finden |
| 💀 Endboss | Drehzentrum + Winkel finden (wie S. 37/2), mit dem Geodreieck messen, ohne Schatten drehen |

Die Fragen werden bei jedem Spiel neu zufällig erzeugt.

## Technik

- Reine HTML/CSS/JS-Seite (läuft auf GitHub Pages), keine Installation nötig.
- Live-Räume über **Supabase** (Datenbank + Realtime). Die Punkte werden auf dem Server anhand der Serverzeit berechnet.
- Testmodus ohne Internet: `index.html?local=1` (funktioniert dann nur mit mehreren Tabs im selben Browser).

## Online stellen (GitHub Pages)

Repository → **Settings** → **Pages** → *Source: Deploy from a branch* → Branch `main`, Ordner `/ (root)` → **Save**.
Nach ca. 1 Minute ist die Seite unter `https://<dein-name>.github.io/ghostmath/` erreichbar.
