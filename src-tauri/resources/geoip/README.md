# Bases de MaxMind (GeoLite2)

Estos 3 archivos NO están en el repositorio (ver `.gitignore`) — hay que
colocarlos acá manualmente antes de compilar (`pnpm tauri dev` o
`pnpm tauri build`):

- `resources/geoip/GeoLite2-City.mmdb` — país/ciudad/coordenadas de una IP.
- `resources/geoip/GeoLite2-ASN.mmdb` — número de ASN + organización (ISP) de
  una IP. Usado para el "ISP" del panel de red y la organización de cada
  conexión activa.
- `resources/geoip/GeoLite2-Country.mmdb` — respaldo de país cuando City no
  trae ese dato (algunas IPs de infraestructura/anycast no están
  geolocalizadas a nivel ciudad pero sí a nivel país, o directamente en
  ninguna de las dos — ver hallazgo sobre 1.1.1.1 en `plan_migracion.txt`).

## Cómo conseguirlos

1. Crear cuenta gratuita en https://www.maxmind.com/en/geolite2/signup.
2. En el dashboard, generar una License Key en "Manage License Keys".
3. Descargar las tres ediciones (**GeoLite2 City**, **GeoLite2 ASN**,
   **GeoLite2 Country**) en formato `.mmdb` (Download Files en el dashboard,
   o vía
   `https://download.maxmind.com/app/geoip_download?edition_id=<EDITION_ID>&license_key=TU_LICENSE_KEY&suffix=tar.gz`
   con `EDITION_ID` = `GeoLite2-City` / `GeoLite2-ASN` / `GeoLite2-Country`,
   y descomprimir cada `.tar.gz`).
4. Copiar los tres `.mmdb` resultantes a esta carpeta con sus nombres exactos.

## Por qué no se commitean

La licencia de GeoLite2 exige que cada distribuidor del software lo descargue
con su propia cuenta — no permite redistribuir los archivos "pelados" fuera
del producto empaquetado. Por eso se ignoran en git y se documenta acá cómo
regenerarlos, en vez de versionarlos.

## Actualizarlos

MaxMind actualiza GeoLite2 semanalmente. Repetir el paso 3 y reemplazar los
archivos la próxima vez que se genere un build de release es suficiente — no
hace falta un mecanismo de auto-actualización para la v1.

## Atribución requerida

La licencia de MaxMind exige mostrar este aviso en algún lugar visible de la
app (ya agregado a los créditos del `README.md` del proyecto):

> This product includes GeoLite2 data created by MaxMind, available from
> https://www.maxmind.com.
