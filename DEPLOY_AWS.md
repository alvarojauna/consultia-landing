# 🚀 Deploy de ConsultIA a AWS Amplify

## ✅ Pre-requisitos Completados
- [x] Código listo con configuración de AWS Amplify
- [x] Git repository inicializado con 5 commits
- [x] Archivo `amplify.yml` configurado
- [x] Variables de entorno documentadas en `.env.example`

## 📋 Pasos para Deploy

### Paso 1: Subir Código a GitHub

1. **Crear repositorio en GitHub**:
   - Ve a https://github.com/new
   - Nombre del repositorio: `consultia-landing`
   - Descripción: "Landing page de ConsultIA - Recepcionista AI para PYMEs españolas"
   - Configuración: **Público** o **Privado** (tu elección)
   - **NO** inicialices con README, gitignore o license (ya los tenemos)
   - Click en "Create repository"

2. **Conectar tu repositorio local con GitHub**:
   ```bash
   cd "C:\Users\usuario\Desktop\CLAUDE\nuevo-proyecto"

   # Añade el remote de GitHub (reemplaza TU_USUARIO con tu username de GitHub)
   git remote add origin https://github.com/TU_USUARIO/consultia-landing.git

   # Verifica que se añadió correctamente
   git remote -v

   # Push del código
   git branch -M main
   git push -u origin main
   ```

3. **Verificar en GitHub**:
   - Refresca la página del repositorio en GitHub
   - Deberías ver todos tus archivos y los 5 commits

---

### Paso 2: Configurar AWS Amplify

#### 2.1 Acceder a AWS Console

1. Ve a https://console.aws.amazon.com/
2. Inicia sesión con tu cuenta AWS (o crea una si no tienes)
3. En la barra de búsqueda superior, escribe "Amplify" y selecciona **AWS Amplify**

#### 2.2 Crear Nueva App

1. Click en **"Create new app"** → **"Host web app"**
2. Selecciona **GitHub** como proveedor de código
3. Click en **"Connect to GitHub"** y autoriza AWS Amplify
4. Selecciona el repositorio **`consultia-landing`**
5. Selecciona la branch **`main`**
6. Click en **"Next"**

#### 2.3 Configurar Build Settings

AWS Amplify debería detectar automáticamente que es un proyecto Next.js y usar el archivo `amplify.yml`.

**Verifica que la configuración sea**:
- **App name**: `consultia-landing` (o el que prefieras)
- **Environment**: `production`
- **Build settings**: Debería mostrar el contenido de tu `amplify.yml`

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
```

**IMPORTANTE**: Edita el Build settings y cambia el `baseDirectory`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/.next
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
      - frontend/.next/cache/**/*
```

Esto es necesario porque tu código está en el subdirectorio `frontend/`.

#### 2.4 Variables de Entorno (Opcional por ahora)

Por ahora no necesitas configurar variables de entorno, pero cuando necesites agregar analytics o formularios:

1. Click en **"Advanced settings"**
2. **Environment variables**:
   - `NEXT_PUBLIC_SITE_URL` = `https://tu-dominio.amplifyapp.com` (AWS lo creará)

#### 2.5 Review y Deploy

1. Click en **"Next"**
2. Revisa toda la configuración
3. Click en **"Save and deploy"**

**El deploy tomará 5-10 minutos**. AWS Amplify:
- ✅ Provision (crear recursos)
- ✅ Build (ejecutar `npm run build`)
- ✅ Deploy (subir a CDN)
- ✅ Verify (verificar que funciona)

---

### Paso 3: Verificar el Deploy

1. Una vez completado, verás un **URL público** como:
   ```
   https://main.d1234567890abc.amplifyapp.com
   ```

2. **Abre el URL en tu navegador** y verifica:
   - ✅ Home page carga correctamente
   - ✅ Navegación funciona
   - ✅ Páginas de industries funcionan
   - ✅ /pricing funciona
   - ✅ /enterprise funciona
   - ✅ /blog funciona

3. **Prueba en mobile**:
   - Abre Chrome DevTools (F12)
   - Click en el ícono de dispositivo móvil
   - Prueba diferentes tamaños de pantalla

---

### Paso 4: Configurar Dominio Personalizado (Opcional)

Si quieres usar **consultia.es** o tu propio dominio:

#### Opción A: Comprar dominio en AWS Route 53

1. Ve a **Route 53** en AWS Console
2. Click en **"Register domain"**
3. Busca **`consultia.es`** (o tu dominio preferido)
4. Si está disponible, cómpralo (cuesta ~12€/año para .es)
5. Sigue los pasos de verificación

#### Opción B: Usar dominio existente

Si ya tienes un dominio en otro proveedor (GoDaddy, Namecheap, etc.):

1. En AWS Amplify, ve a tu app
2. En el menú lateral, click en **"Domain management"**
3. Click en **"Add domain"**
4. Introduce tu dominio (ej: `consultia.es`)
5. AWS te dará registros DNS para configurar:
   - **CNAME** para `www.consultia.es`
   - **ANAME/ALIAS** para `consultia.es`
6. Ve al panel de tu proveedor de dominio
7. Añade los registros DNS que AWS te indica
8. Espera 24-48h para propagación DNS

---

### Paso 5: Configurar SSL (Automático)

AWS Amplify configura **SSL/HTTPS automáticamente** con certificados de AWS Certificate Manager.

✅ No necesitas hacer nada, tu sitio estará seguro desde el principio.

---

### Paso 6: Configurar Deploy Automático

AWS Amplify ya está configurado para **deploy automático**:

Cada vez que hagas `git push` a la branch `main`:
1. AWS detecta el cambio
2. Ejecuta el build automáticamente
3. Despliega la nueva versión
4. Tu sitio se actualiza en ~5 minutos

**Workflow de desarrollo**:
```bash
# Haces cambios en local
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main

# AWS Amplify detecta el push y hace deploy automático
# Recibirás un email cuando termine
```

---

## 🎯 Verificación Post-Deploy

### Checklist de Pruebas

- [ ] **Home page** (`/`) carga sin errores
- [ ] **Navegación** funciona (todos los links)
- [ ] **Pricing** (`/pricing`) muestra los 3 planes
- [ ] **Industries** (`/industries`) muestra el directorio
- [ ] **Industry pages** (`/industries/clinicas`) funcionan las 8
- [ ] **Enterprise** (`/enterprise`) carga correctamente
- [ ] **Blog** (`/blog`) muestra los artículos
- [ ] **Mobile responsive** funciona en diferentes tamaños
- [ ] **Animaciones** funcionan suavemente
- [ ] **SSL** está activo (candado verde en navegador)

### Herramientas de Testing

1. **Lighthouse Audit**:
   ```bash
   # En Chrome, abre DevTools (F12)
   # Ve a tab "Lighthouse"
   # Click "Generate report"
   # Target: Performance >80, SEO >90
   ```

2. **Mobile Testing**:
   - https://search.google.com/test/mobile-friendly
   - Introduce tu URL de Amplify

3. **Speed Test**:
   - https://pagespeed.web.dev/
   - Introduce tu URL

---

## 🐛 Troubleshooting

### Error: Build fails con "Module not found"
**Solución**: Verifica que en `amplify.yml` tengas `cd frontend` antes de `npm ci`

### Error: 404 en rutas dinámicas `/industries/[slug]`
**Solución**: Next.js debería generar automáticamente. Verifica que `generateStaticParams` esté en el archivo.

### Error: Animaciones no funcionan
**Solución**: Asegúrate de que Framer Motion esté instalado:
```bash
cd frontend
npm install framer-motion
git add package.json package-lock.json
git commit -m "fix: ensure framer-motion is in dependencies"
git push
```

### Sitio muy lento
**Solución**:
1. Revisa Lighthouse score
2. Optimiza imágenes (cuando las agregues)
3. Verifica que Next.js esté usando ISR correctamente

---

## 📊 Monitoreo

### AWS Amplify Console

En tu dashboard de Amplify verás:
- 📈 **Traffic**: Visitas, páginas vistas
- 🚀 **Deployments**: Historial de deploys
- 📝 **Logs**: Logs de build y runtime
- ⚠️ **Alerts**: Errores y warnings

### Configurar Notificaciones

1. En AWS Amplify, ve a **"Notifications"**
2. Añade tu email para recibir:
   - ✅ Deploy successful
   - ⚠️ Build failed
   - 📊 Weekly report

---

## 💰 Costos Esperados

### AWS Amplify Pricing (Región EU - Frankfurt)

**Free Tier** (suficiente para empezar):
- ✅ 1,000 build minutes/mes
- ✅ 15 GB bandwidth/mes
- ✅ 5 GB storage

**Después del Free Tier**:
- Build: $0.01/minuto (~$0.05 por build)
- Bandwidth: $0.15/GB
- Storage: $0.023/GB

**Estimación para tu sitio**:
- Builds: 20-30/mes = **GRATIS** (dentro de free tier)
- Bandwidth: <1GB/mes (100 visitas/día) = **GRATIS**
- **Total: $0/mes** los primeros meses

Cuando crezcas a 1000+ visitas/día:
- ~10GB bandwidth/mes = **~$1.50/mes**

---

## 🎉 Próximos Pasos

Una vez deployed:

1. ✅ **Comparte el URL** con 5-10 personas para feedback
2. ✅ **Configura Google Analytics** (ver paso en main README)
3. ✅ **Añade formulario de contacto** funcional
4. ✅ **Actualiza meta descriptions** para SEO
5. ✅ **Configura dominio personalizado** (consultia.es)

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los **logs de build** en AWS Amplify Console
2. Busca el error específico en Google/Stack Overflow
3. Revisa la documentación: https://docs.amplify.aws/

---

## 🔄 Comandos Útiles

```bash
# Ver estado de Git
git status

# Ver historial de commits
git log --oneline

# Ver remotes configurados
git remote -v

# Forzar rebuild en AWS Amplify (sin cambios en código)
git commit --allow-empty -m "chore: trigger rebuild"
git push origin main

# Ver branches
git branch -a
```

---

**¡Listo para deploy!** 🚀

Sigue los pasos en orden y en 20-30 minutos tendrás tu sitio en producción.
