# ConsultIA — Plan de Negocio y Ejecución

## Recepcionista AI para PYMEs Españolas

**Autor:** Álvaro  
**Fecha:** Febrero 2026  
**Estado:** Pre-lanzamiento / Validación

---

## 1. Resumen Ejecutivo

ConsultIA es un SaaS B2B que permite a cualquier PYME española tener una recepcionista virtual con inteligencia artificial. El usuario pega la URL de su web, elige una voz y tono, y en 5 minutos recibe un número de teléfono español (+34) que atiende llamadas 24/7 con toda la información de su negocio.

El producto resuelve un problema real y medible: las PYMEs españolas pierden entre un 20-40% de las llamadas entrantes porque están atendiendo a otros clientes, fuera de horario, o simplemente no pueden coger el teléfono. Cada llamada perdida es un cliente que se va a la competencia.

ConsultIA es un "Trillet/Dialzara para España" — tomamos un modelo validado en mercados anglosajones y lo ejecutamos para el mercado español, donde no existe ningún competidor relevante con esta propuesta de valor.

**Stack core**: AWS como infraestructura principal + ElevenLabs (voice AI) + Twilio (telefonía).

---

## 2. El Problema

### Datos del mercado español

- España tiene ~3.2 millones de PYMEs (fuente: INE/Ministerio de Industria)
- El 67% de los españoles prefieren llamar por teléfono para reservar citas (especialmente en salud, estética y hostelería)
- Un estudio de BIA/Kelsey estima que el 85% de los clientes que no consiguen contactar a un negocio por teléfono NO vuelven a llamar
- Las PYMEs de servicios (clínicas, veterinarias, peluquerías, talleres) operan con equipos reducidos donde el profesional ES quien atiende el teléfono

### El dolor específico

El dentista está haciendo un empaste y suena el teléfono. No puede cogerlo. El paciente potencial llama al siguiente dentista de Google. Esto ocurre decenas de veces al día en miles de negocios españoles.

Las soluciones actuales son:

- **Contratar recepcionista**: 1.200-1.800€/mes (salario + SS). Muchas PYMEs no pueden permitírselo o no justifican un puesto completo.
- **Contestador automático**: Los clientes cuelgan. Nadie deja mensajes de voz en 2026.
- **Centralitas virtuales con IVR**: "Pulse 1 para citas, pulse 2 para información..." — experiencia terrible, poco natural.
- **Nada**: La opción más común. Simplemente pierden llamadas.

---

## 3. La Solución

### Propuesta de valor

"Pega tu web. Elige una voz. Tu recepcionista AI empieza a trabajar en 5 minutos."

### Cómo funciona (flujo del usuario)

1. **Registro**: Email + nombre del negocio
2. **Configuración (5 min)**:
   - Introduce la URL de su web
   - El sistema escanea automáticamente: servicios, horarios, precios, ubicación, FAQs
   - El usuario revisa la información extraída y ajusta lo necesario
   - Elige entre voces disponibles (masculina/femenina, formal/cercano)
   - Opcionalmente conecta su calendario (Google Calendar, Calendly, Cal.com)
3. **Activación**:
   - Se le asigna un número +34 (local o nacional)
   - Configura desvío de llamadas desde su número actual (o usa el nuevo número)
4. **Funcionamiento**:
   - Las llamadas entran al número vía Twilio
   - ElevenLabs procesa la conversación en tiempo real
   - La IA atiende: responde preguntas, agenda citas, toma mensajes, filtra spam
   - El dueño recibe resumen por SMS/email + accede al panel con transcripciones

### Stack tecnológico (AWS-first)

| Componente | Tecnología | Justificación |
|---|---|---|
| **Voice AI Engine** | **ElevenLabs** Conversational AI | Mejor calidad de voz en español, integración nativa con Twilio |
| **Telefonía** | **Twilio** (números +34 vía Sales) | Única integración nativa soportada por ElevenLabs |
| **Backend API** | **AWS Lambda** + API Gateway | Serverless, escala automáticamente, pay-per-use, coste mínimo al inicio |
| **Base de datos** | **Amazon DynamoDB** | Serverless, sin gestión, escala perfecta para datos de clientes/llamadas |
| **Base de datos relacional** | **Amazon Aurora Serverless v2** (PostgreSQL) | Para datos que necesiten queries complejas (analytics, billing) |
| **Web Scraping** | **AWS Lambda** + Firecrawl/Crawl4AI | Lambda ejecuta el scraping bajo demanda, Amazon Bedrock (Claude) estructura la info |
| **Estructurar info scraped** | **Amazon Bedrock** (Claude) | Toma el HTML scraped y genera el knowledge base estructurado del negocio |
| **Frontend (Landing)** | **AWS Amplify** | Hosting estático, CI/CD integrado, dominio custom, SSL gratis |
| **Frontend (Dashboard)** | **AWS Amplify** + React | SPA con auth integrada via Cognito |
| **Autenticación** | **Amazon Cognito** | Auth completo (email/password, social login), integrado con el ecosistema AWS |
| **Almacenamiento archivos** | **Amazon S3** | Grabaciones de llamadas, documentos subidos, assets |
| **Cola de mensajes** | **Amazon SQS** | Para procesar scraping, generación de prompts y tareas async |
| **Notificaciones email** | **Amazon SES** | Emails transaccionales (bienvenida, resúmenes, alertas) |
| **SMS post-llamada** | **Twilio SMS** (o Amazon SNS) | Confirmaciones de cita, recordatorios |
| **Calendario** | API de Google Calendar / Cal.com | Integración directa vía API |
| **Pagos** | **Stripe** | Estándar para SaaS, facturación recurrente, SCA/PSD2 para Europa |
| **Monitoring** | **Amazon CloudWatch** | Logs, métricas, alarmas, todo centralizado |
| **CDN** | **Amazon CloudFront** | Cache de la landing y dashboard, latencia baja en España |
| **DNS** | **Amazon Route 53** | Dominio y DNS gestionados en AWS |
| **Secrets** | **AWS Secrets Manager** | API keys de ElevenLabs, Twilio, Stripe seguras |
| **IaC** | **AWS CDK** (Python) | Infraestructura como código, reproducible, versionada |

### Arquitectura de alto nivel

```
[Cliente llama +34] 
    → Twilio 
    → ElevenLabs (conversación AI en tiempo real)
    → Webhook a API Gateway + Lambda (post-call: guardar transcripción, agendar cita, enviar SMS)
    → DynamoDB (datos de llamada)
    → SES/SNS (notificación al dueño)

[Dueño del negocio]
    → Amplify (React Dashboard)
    → Cognito (auth)
    → API Gateway + Lambda (CRUD de su configuración)
    → DynamoDB (config del agente, knowledge base)

[Onboarding - Scraping]
    → Usuario pega URL
    → API Gateway → Lambda (scraping con Firecrawl)
    → SQS → Lambda (Bedrock/Claude estructura la info)
    → DynamoDB (knowledge base generada)
    → Lambda genera system prompt para ElevenLabs
    → ElevenLabs API (actualiza agente)
```

### Costes de infraestructura AWS estimados (primeros meses)

| Servicio | Coste estimado/mes |
|---|---|
| Lambda (API + scraping + webhooks) | ~5-15€ (free tier cubre mucho) |
| API Gateway | ~3-5€ |
| DynamoDB | ~5-10€ (on-demand) |
| Amplify (hosting) | ~0-5€ |
| S3 (grabaciones) | ~2-5€ |
| SES (emails) | ~1€ |
| CloudWatch | ~3-5€ |
| Cognito | ~0€ (free tier: 50K MAU) |
| Route 53 | ~1€ |
| CloudFront | ~1-3€ |
| Secrets Manager | ~1€ |
| Bedrock (Claude, scraping) | ~5-15€ |
| **Total AWS** | **~30-80€/mes** |
| ElevenLabs | ~50-100€/mes (según plan + uso) |
| Twilio (números + minutos) | ~30-50€/mes |
| Stripe | Variable (1.4% + 0.25€/transacción) |
| **Total infraestructura** | **~120-250€/mes** |

La ventaja del stack serverless AWS es que escala a cero cuando no hay uso y crece linealmente con los clientes, sin saltos de coste fijos.

---

## 4. Modelo de Negocio

### Pricing

| Plan | Precio | Minutos | Margen estimado |
|---|---|---|---|
| Starter | 29€/mes | 100 min | ~65% |
| Profesional | 79€/mes | 300 min | ~70% |
| Empresa | 199€/mes | Ilimitado* | ~60% |

*Ilimitado = fair use ~1000 min. Minutos extra: 0.15€/min.

### Unit Economics (por cliente medio - Plan Profesional 79€/mes)

- Ingreso: 79€
- Coste ElevenLabs (~200 min usados): -12€
- Coste Twilio (número + minutos): -5€
- Coste SMS (~20 SMS): -1.20€
- Coste AWS prorrateado: -2€
- **Margen bruto: ~58.80€ (74%)**

### Proyección de ingresos

| Mes | Clientes | MRR | Coste variable | Margen bruto |
|---|---|---|---|---|
| Mes 1-3 | 10 | 790€ | 200€ | 590€ |
| Mes 4-6 | 40 | 3.160€ | 800€ | 2.360€ |
| Mes 7-9 | 100 | 7.900€ | 2.000€ | 5.900€ |
| Mes 10-12 | 200 | 15.800€ | 4.000€ | 11.800€ |

**Break-even operativo** (cubriendo infra + tu tiempo parcial): ~25-30 clientes (~2.000€ MRR).

---

## 5. Mercado Objetivo

### TAM (Total Addressable Market)
- 3.2M PYMEs en España
- ~800K son de servicios que dependen del teléfono (salud, estética, hostelería, reparaciones, legal)
- Si el 1% adoptara a 79€/mes = 632K€ MRR = 7.6M€ ARR

### SAM (Serviceable Addressable Market)
- PYMEs de servicios en ciudades >50K habitantes: ~200K negocios
- A 79€/mes, 1% = 158K€ MRR

### SOM (Serviceable Obtainable Market) — Año 1
- Target: 200 clientes en Bilbao, Madrid y otras ciudades del País Vasco
- 200 × 79€ = 15.800€ MRR = ~190K€ ARR

### Segmentos prioritarios (ordenados por facilidad de venta)

1. **Clínicas dentales y médicas** — Alto valor por cita (50-200€), muchas llamadas, dolor evidente
2. **Veterinarias** — Similar a clínicas, alto volumen de llamadas
3. **Peluquerías y centros de estética** — Muchas citas, operan con 1-3 personas
4. **Talleres mecánicos** — No pueden coger el teléfono con las manos sucias, literalmente
5. **Restaurantes** — Reservas telefónicas siguen siendo el estándar
6. **Despachos de abogados y asesorías** — Valoran la imagen profesional
7. **Inmobiliarias** — Muchas consultas entrantes
8. **Construcción y reformas** — Pierden presupuestos por no contestar

---

## 6. Ventaja Competitiva y Moat

### ¿Por qué nosotros y no Trillet/Dialzara?

| Factor | Trillet/Dialzara | ConsultIA |
|---|---|---|
| Idioma | Inglés (Australia/USA) | Español de España nativo |
| Números | Americanos/Australianos | +34 españoles |
| RGPD | Genérico | Nativo, infraestructura AWS EU |
| Soporte | Inglés | Español, atención directa |
| Ventas | Online only | Online + presencial (Bilbao/Madrid) |
| Integraciones | Calendly, HubSpot | + Doctoralia, sistemas españoles |
| Precio | USD (29-199$) | EUR, factura española con IVA |
| Verticales | Genérico anglosajón | Adaptado a PYMEs españolas |
| Infraestructura | Varía | AWS EU (Irlanda/Frankfurt) |

### Moat a medio plazo

1. **Red de clientes locales**: Relaciones directas con negocios en País Vasco y Madrid
2. **Datos de conversación en español**: Cada llamada mejora la calidad del sistema para el contexto español
3. **Integraciones verticales**: Doctoralia, software de gestión de clínicas españolas
4. **Marca reconocida en el nicho**: "La recepcionista AI española"
5. **Distribución**: Partnerships con asesorías, gestorías, asociaciones de comercio

---

## 7. Go-to-Market

### Fase 1: Validación (Mes 1-2) — AHORA

**Objetivo**: 10 clientes beta reales pagando.

- Construir landing page (usar PRD adjunto)
- Construir MVP funcional (scraping → Bedrock → ElevenLabs → Twilio, todo sobre AWS)
- Contactar con Twilio Sales para provisionar números +34
- Conseguir 10 negocios en Bilbao como beta testers:
  - 3-4 clínicas/veterinarias (tu red o puerta fría)
  - 3-4 peluquerías/centros de estética
  - 2-3 talleres/restaurantes
- **Precio beta**: 19€/mes (descuento early adopter) con compromiso de 3 meses y feedback
- Iterar basándote en feedback real

**Canales de captación beta**:
- Visitas presenciales a negocios en Bilbao (Casco Viejo, Indautxu, Deusto)
- Red personal y familiar
- Grupos de LinkedIn de PYMEs Bilbao/País Vasco
- Grupos de WhatsApp de comerciantes locales

### Fase 2: Lanzamiento (Mes 3-4)

**Objetivo**: 40 clientes pagando.

- Landing page optimizada con testimonios reales de beta
- Google Ads: "recepcionista virtual", "atender llamadas automáticamente", "no perder llamadas"
- SEO: Blog con contenido tipo "Cuántas llamadas pierde tu clínica al mes" / "Alternativas a contratar recepcionista"
- Partnerships con gestorías y asesorías que atienden PYMEs
- Presencia en ferias locales de comercio/emprendimiento

### Fase 3: Crecimiento (Mes 5-12)

**Objetivo**: 200 clientes, expansión nacional.

- Expandir a Madrid, Barcelona, Valencia, Sevilla
- Programa de referidos: "Recomienda ConsultIA, gana 1 mes gratis"
- White-label para agencias de marketing que atienden PYMEs
- Contenido en YouTube/TikTok: demos reales, antes/después
- Partnerships con Doctoralia, Treatwell, TheFork
- Considerar catalán, euskera, gallego como diferenciador

### Fase 4: Escala (Año 2)

- API para integradores
- Plataforma white-label completa
- Verticales especializadas (salud, hostelería, legal)
- Internacionalización: Portugal, LatAm (México, Colombia, Argentina)

---

## 8. Plan de Ejecución Técnica

### Sprint 1 (Semanas 1-2): Foundation

- [ ] Contactar Twilio Sales para números +34 (iniciar proceso, tarda días)
- [ ] Crear cuenta ElevenLabs, testear voces en español, seleccionar las mejores
- [ ] Configurar agente básico de ElevenLabs con prompt genérico de recepcionista
- [ ] Setup cuenta AWS: crear organización, configurar billing alerts, región eu-west-1 (Irlanda)
- [ ] Inicializar proyecto AWS CDK (Python) con stacks base:
  - Stack de Auth (Cognito User Pool)
  - Stack de API (API Gateway + primeras Lambdas)
  - Stack de Data (DynamoDB tables)
  - Stack de Frontend (Amplify app)
- [ ] Crear tablas DynamoDB: `businesses`, `calls`, `agents`, `subscriptions`
- [ ] Deploy Amplify con landing page estática
- [ ] Configurar Route 53 + dominio consultia.es (o .com)
- [ ] Configurar CloudFront para la landing

### Sprint 2 (Semanas 3-4): Core Product

- [ ] Lambda de scraping: input URL → Firecrawl/Crawl4AI → HTML limpio
- [ ] Lambda de procesamiento: HTML → Amazon Bedrock (Claude) → knowledge base estructurado (JSON)
- [ ] Lambda de generación de prompt: knowledge base → system prompt optimizado para ElevenLabs
- [ ] Integración con ElevenLabs API: crear/actualizar agente con el prompt generado
- [ ] Integración Twilio ↔ ElevenLabs (native integration)
- [ ] Lambda webhook post-llamada: Twilio/ElevenLabs → guardar en DynamoDB → notificar vía SES
- [ ] Asignación automática de número Twilio al usuario (vía Twilio API)
- [ ] SQS para procesamiento async de scraping y generación de prompts

### Sprint 3 (Semanas 5-6): Dashboard + Beta

- [ ] React Dashboard en Amplify:
  - Login/registro con Cognito
  - Onboarding wizard: pega URL → preview info → elige voz → activa
  - Lista de llamadas con transcripciones
  - Editar knowledge base / Q&A personalizados
  - Estado del agente (activo/pausado)
  - Consumo de minutos
- [ ] Integración con Google Calendar / Cal.com (Lambda connector)
- [ ] SMS post-llamada vía Twilio (o SNS)
- [ ] CloudWatch dashboards para monitoring interno
- [ ] Testing con 3-5 negocios beta en Bilbao
- [ ] Iteración basada en feedback

### Sprint 4 (Semanas 7-8): Launch Ready

- [ ] Stripe integrado para pagos recurrentes (webhook → Lambda → DynamoDB)
- [ ] Sistema de planes y límites de minutos (Lambda middleware que chequea cuota)
- [ ] Alertas de consumo vía SES (80%, 100% de minutos)
- [ ] Onboarding pulido y testeado
- [ ] FAQ y docs de ayuda (puede ser sección en la landing o Notion público)
- [ ] 10 clientes beta activos y pagando
- [ ] Lanzamiento público

---

## 9. Aspectos Legales

### RGPD / LOPD (Crítico)

- **Consentimiento informado**: La IA debe informar al inicio de la llamada que es un asistente virtual y que la llamada puede ser procesada/grabada. Ejemplo: "Hola, soy el asistente virtual de [Negocio]. Esta llamada puede ser grabada para mejorar nuestro servicio. ¿En qué puedo ayudarle?"
- **Procesamiento de datos**: Necesitas DPA (Data Processing Agreement) con ElevenLabs, Twilio y AWS
- **Servidores en UE**: AWS región eu-west-1 (Irlanda) o eu-central-1 (Frankfurt). Verificar que ElevenLabs y Twilio también procesan en EU
- **Derecho de acceso/supresión**: Los usuarios finales (los que llaman) deben poder solicitar eliminación de sus datos
- **Delegado de protección de datos**: Probablemente necesario si manejas datos de salud (clínicas)
- **S3 encryption**: Activar server-side encryption (SSE-S3 o SSE-KMS) para grabaciones
- **DynamoDB encryption**: Encryption at rest activado por defecto

### Estructura societaria

- SL española (Sociedad Limitada) recomendada
- Capital mínimo: 1€ (nueva ley) o 3.000€ (tradicional)
- Sede: Bilbao (ventajas fiscales País Vasco/Bizkaia)
- **Consultar con tu amigo abogado**: Posible socio para cubrir la parte legal

### Facturación

- Facturación en euros con IVA (21%)
- Verifactu / facturación electrónica obligatoria 2026
- Software de facturación: Holded, Quaderno, o Stripe Tax + Stripe Billing

---

## 10. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| ElevenLabs sube precios drásticamente | Media | Alto | Plan B: Amazon Bedrock Voice (si lanza voice agents), Retell, OpenAI Realtime API |
| Twilio no consigue números +34 a tiempo | Baja | Alto | Backup: Telnyx vía SIP trunking con ElevenLabs |
| Calidad del español no convence | Media | Alto | Testing exhaustivo pre-launch, iterar prompts, probar múltiples voces |
| Competidor grande entra en España | Media | Medio | Speed to market + relaciones locales + verticales |
| Dificultad de ventas a PYMEs | Media | Medio | Empezar presencial, validar messaging, reducir fricción |
| Regulación RGPD complica el modelo | Baja | Alto | Consultoría legal desde el inicio (tu amigo abogado) |
| Churn alto (clientes cancelan) | Media | Alto | Onboarding excepcional, métricas de valor, soporte proactivo |
| Costes AWS se disparan | Baja | Medio | Billing alerts en CloudWatch, arquitectura serverless limita riesgo |

---

## 11. Métricas Clave (KPIs)

### Norte Star Metric
**Llamadas atendidas exitosamente por mes** (la IA resolvió la consulta sin necesidad de callback humano)

### Métricas de negocio
- MRR (Monthly Recurring Revenue)
- Número de clientes activos
- ARPU (Average Revenue Per User)
- Churn mensual (target: <5%)
- CAC (Customer Acquisition Cost)
- LTV (Lifetime Value) — target: LTV/CAC > 3x

### Métricas de producto
- Tiempo de onboarding (target: <5 minutos)
- % de llamadas atendidas vs perdidas
- Satisfacción del llamante (encuesta post-llamada opcional)
- % de citas agendadas automáticamente
- Minutos consumidos por cliente/mes

### Métricas técnicas (CloudWatch)
- Latencia de API Gateway p99
- Lambda errors rate
- DynamoDB consumed capacity
- ElevenLabs API response time
- Twilio call success rate

---

## 12. Presupuesto Inicial

### Inversión necesaria para MVP + 3 meses de operación

| Concepto | Coste |
|---|---|
| AWS (3 meses, mayormente free tier) | 200€ |
| ElevenLabs (plan para desarrollo + beta) | 300€ |
| Twilio (números + testing) | 200€ |
| Dominio (consultia.es + .com) + Route 53 | 50€ |
| Stripe (setup gratis, solo comisiones) | 0€ |
| Marketing inicial (Google Ads test) | 500€ |
| Legal (constitución SL + consultoría RGPD) | 1.000€ |
| Buffer / imprevistos | 500€ |
| **Total** | **~2.750€** |

Esto es asumible como side-project mientras trabajas en Santander. El código lo haces tú. El stack serverless de AWS minimiza costes fijos. Si metes a tu amigo abogado como socio, el coste legal baja.

---

## 13. Próximos Pasos Inmediatos

1. **Hoy**: Verificar disponibilidad de dominio consultia.es / consultia.com y marca en OEPM
2. **Esta semana**: Contactar Twilio Sales para números +34, crear cuenta ElevenLabs business
3. **Esta semana**: Setup cuenta AWS con billing alerts, inicializar proyecto CDK
4. **Semana 1-2**: Desarrollar landing page con Claude Code (usar el PRD adjunto) y desplegar en Amplify
5. **Semana 2-3**: Desarrollar MVP del motor core (Lambda scraping → Bedrock → ElevenLabs → Twilio)
6. **Semana 3-4**: Testear con 2-3 negocios conocidos/cercanos en Bilbao
7. **Semana 4-6**: Iterar, pulir onboarding, conseguir 10 beta testers
8. **Mes 2**: Lanzamiento público con landing + primeros testimonios reales

---

## 14. Resumen del Stack AWS

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  AWS Amplify (Landing + Dashboard React)         │
│  Amazon CloudFront (CDN)                         │
│  Amazon Route 53 (DNS)                           │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                  AUTH & API                       │
│  Amazon Cognito (Auth)                           │
│  Amazon API Gateway (REST API)                   │
│  AWS Lambda (Business logic - Python)            │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                   DATA                           │
│  Amazon DynamoDB (Clientes, llamadas, config)    │
│  Amazon S3 (Grabaciones, assets)                 │
│  AWS Secrets Manager (API keys)                  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│               PROCESSING                         │
│  Amazon SQS (Cola async)                         │
│  Amazon Bedrock / Claude (Estructurar scraping)  │
│  AWS Lambda (Scraping, webhooks, notifications)  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│             COMUNICACIONES                       │
│  Amazon SES (Email transaccional)                │
│  Amazon CloudWatch (Monitoring + Alertas)        │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│           SERVICIOS EXTERNOS                     │
│  ElevenLabs (Voice AI conversacional)            │
│  Twilio (Telefonía +34, SMS)                     │
│  Stripe (Pagos recurrentes)                      │
│  Google Calendar API / Cal.com (Agenda)          │
└─────────────────────────────────────────────────┘
```

---

*"La mejor forma de predecir el futuro es crearlo." — Y en este caso, el futuro habla español y corre sobre AWS.*
