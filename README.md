# HSA ukrán munkavállalók landing

HTML/CSS/JavaScript landing, Netlify Function SMTP-küldéssel.

## Helyi használat

Node.js 22 vagy újabb szükséges.

```sh
npm ci
npm run build
npm run dev
```

A fejlesztői oldal címe: http://localhost:4173

Ez a parancs csak statikus helyi előnézetet indít, e-mailt nem küld. A Netlify Function és az SMTP helyi kipróbálásához másold a `.env.example` fájlt `.env` néven, töltsd ki, majd futtasd: `npx netlify-cli dev`. A Netlify dev szerver által kiírt címet használd.

## Forrásfájlok

- `dist/index.html`, `dist/style.css`, `dist/script.js`: szerkeszthető oldal
- `dist/assets/`: képek, változatlan HSA-logó
- `worker/api.mjs`: jelentkezési végpont
- `worker/application-email.mjs`: levélsablon
- `netlify/functions/apply.mjs`: Netlify belépési pont
- `tests/`: ellenőrzések (`npm test`)

## E-mail küldés

Címzett alapértelmezetten: info@hsa.hu. Az önéletrajz legfeljebb 4 MB lehet, hogy a Netlify kódolt kérésméret-korlátjába is beleférjen.

### Netlify telepítés és SMTP

1. Importáld a GitHub-repót a Netlify felületén. A `netlify.toml` beállítja a build parancsot (`npm run build`), a publikált mappát (`dist`) és az `/api/apply` végpontot. Git-alapú deploy szükséges a Function összeállításához; a `dist` mappa kézi feltöltése önmagában nem elég.
2. A Netlify projekt Environment variables beállításainál add meg az alábbi változókat Functions hatókörrel (vagy All scopes beállítással):

| Változó | Példa / jelentés |
| --- | --- |
| `MAIL_TRANSPORT` | `smtp` |
| `SMTP_HOST` | A szolgáltató SMTP-szervere |
| `SMTP_PORT` | `587` STARTTLS vagy `465` TLS |
| `SMTP_SECURE` | `false` az 587-es, `true` a 465-ös porthoz |
| `SMTP_USER` | SMTP-felhasználónév |
| `SMTP_PASS` | SMTP-jelszó vagy alkalmazásjelszó; titkos változóként tárold |
| `APPLICATION_FROM` | A szolgáltató által engedélyezett feladó, pl. `info@hsa.hu` |
| `APPLICATION_TO` | Opcionális címzett; alapértéke `info@hsa.hu` |

3. Indíts új deployt, majd küldj próba-jelentkezést, melléklettel is. A válaszcím a jelentkező e-mail-címe. A küldés kötelező TLS-t és tanúsítvány-ellenőrzést használ.

A hitelesítési adatok csak a Function környezetében szerepelnek, a böngészőbe nem kerülnek. A `.env` fájl Gitből kizárt. Hiányos SMTP-konfiguráció esetén a Function hibát jelez, nem vált át észrevétlenül másik szolgáltatóra.

Alternatív Resend-küldéshez: `MAIL_TRANSPORT=resend`, `RESEND_API_KEY`, `APPLICATION_FROM`, opcionálisan `APPLICATION_TO`.

A statikus oldal nem igényel csomagolást. Az `npm run build` a Netlify belépési pont szintaxisát ellenőrzi; a Function csomagolását a Netlify végzi.
