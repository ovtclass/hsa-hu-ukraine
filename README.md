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

## Saját statisztika

A statisztika a meglévő Netlify Functions + Blobs szolgáltatáson fut, külső analitikai fiók nélkül. A Blobs tároló régiója `eu-central-1`. A mérés csak production deployon, kifejezett hozzájárulás után működik; DNT/GPC jelzés mellett kimarad.

A `/statisztika` oldal HTTP Basic belépése: felhasználó `admin`, jelszó a Netlify Functions scope-os `ANALYTICS_ADMIN_PASSWORD` változóban (legalább 24 karakter). Külön `ANALYTICS_HASH_SECRET` szükséges (legalább 32 véletlen karakter). Mindkettőt titkos production változóként tárold, soha ne a repóban. Hiányzó beállításnál a riport zárt marad, a mérés 503-at ad.

Nincs nyers IP-, teljes User-Agent-, URL-paraméter- vagy űrlapadat-tárolás. Napi HMAC-azonosító alapján becsüljük a napi látogatókat; több nap összege látogató-nap, nem időszakos egyedi személyszám. A forrás csak a referrer hostneve; hiányzó referrer közvetlen/ismeretlen. Mobil és böngésző felismerése közelítő.

Az események külön, felülírás nélküli Blob objektumok; párhuzamos megnyitások nem írnak felül számlálót. A riport legfeljebb 50 000 rekordot dolgoz fel, és jelzi a csonkítást. A 30 UTC-napon túli eseményekből személyes azonosítót és részletes bontást nem tartalmazó napi megnyitás/jelentkezés összesítést őriz meg korlátlan ideig, és ezekből all-time összesítést mutat; a részletes adatokat napi feladat (02:17 UTC) törli a régieket, futásonként legfeljebb 2000 rekordot. Törlési hibát vagy torlódást a Netlify function naplókban ellenőrizz. A forgalmi mérés és a riport IP-alapú Netlify rate limitet használ. Botok szűrése korlátozott; a statisztika nem auditált forgalomszámláló.

## Adatvédelmi felület

Az `adatvedelem.html` tájékoztató és a jelentkezési oldal alján újranyitható panel írja le a saját mérést. Az engedélyezés és elutasítás egyformán elérhető; választás nélkül nincs oldalmegnyitás-mérés. A `hsa-privacy-v1` localStorage-bejegyzés 180 napig érvényes. A követősütit nem használó mérés is hozzájárulás alapján indul; a jelentkezéshez nincs analitikai engedélyhez kötött feltétel. Az oldal nem kér be külső Google Fonts stíluslapot, rendszerbetűket használ.

## Nyelvek

A magyar oldal a `/`, az ukrán változat a `/ua` címen érhető el. Az UA / HU váltó aktív nyelve félkövér, mobilon is látható. Az `npm run build` a `dist/index.html` és `locales/uk.json` alapján állítja elő a `dist/ua.html` és `dist/uk.js` fájlokat. Hiányzó szövegfordítás esetén a build hibával leáll. Az ukrán adatvédelmi tájékoztató külön a `dist/adatvedelem-ua.html` fájlban található. A GYIK, az űrlapüzenetek és a hozzájárulási panel is lokalizált. A backend mindkét nyelven magyar állásazonosítókat kap, és változatlanul magyar jelentkezési e-mailt állít elő.
