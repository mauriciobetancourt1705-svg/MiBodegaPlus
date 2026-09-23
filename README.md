# MiBodega+ 📦
App Android offline para una bodega/abasto.

Incluye POS, inventario, clientes, fiado, gastos, reportes, cotizaciones,
catálogo digital, compartir catálogo y preparación para impresión térmica Bluetooth.

## Convertir a APK
Requisitos: Node.js LTS, Android Studio, Android SDK y JDK 17.

En una terminal dentro del proyecto:
```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```
En Android Studio: Run para probar o:
Build > Generate App Bundles or APKs > Generate APKs.

APK debug:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Impresión
La capa está preparada para Bluetooth LE/ESC-POS. Muchas impresoras térmicas
usan Bluetooth Classic/SPP; para esos modelos habrá que usar un transporte SPP
compatible con el modelo concreto.

### Nota fiscal
La facturación fiscal/electrónica depende del país y requiere adaptar impuestos,
numeración y requisitos legales locales.


## 📱 Si NO tienes PC
Puedes compilar la APK desde un teléfono Android usando GitHub:
1. Crea una cuenta gratuita en GitHub desde el navegador del teléfono.
2. Crea un repositorio nuevo.
3. Sube todos los archivos de este ZIP al repositorio.
4. GitHub ejecutará automáticamente `.github/workflows/build-apk.yml`.
5. En el repositorio entra a **Actions**, abre la ejecución y descarga el artefacto `MiBodegaPlus-debug-apk`.
6. Descomprime el artefacto y tendrás `app-debug.apk`.
