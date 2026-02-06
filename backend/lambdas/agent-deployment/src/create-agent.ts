/**
 * Step 1: Create Agent in ElevenLabs
 */

import axios from 'axios';
import { query, getApiKeys } from 'consultia-shared-nodejs';

interface CreateAgentEvent {
  customer_id: string;
  agent_id: string;
  voice_id: string;
  voice_name: string;
  business: {
    name: string;
    address?: string;
    industry?: string;
    services?: string[];
    hours?: Record<string, string>;
    contacts?: any;
  };
  knowledge_base?: {
    kb_id: string;
    structured_data: any;
  };
}

/**
 * Generate system prompt for ElevenLabs agent
 */
function generateSystemPrompt(
  business: CreateAgentEvent['business'],
  knowledge_base?: CreateAgentEvent['knowledge_base']
): string {
  const kb_data = knowledge_base?.structured_data || {};

  const services_list = kb_data.services?.join(', ') || 'diversos servicios';
  const hours_text =
    kb_data.hours && Object.keys(kb_data.hours).length > 0
      ? Object.entries(kb_data.hours)
          .map(([day, hours]) => `${day}: ${hours}`)
          .join(', ')
      : 'lunes a viernes de 9:00 a 18:00';

  const faqs_text =
    kb_data.faqs && kb_data.faqs.length > 0
      ? kb_data.faqs
          .map((faq: any) => `P: ${faq.question}\nR: ${faq.answer}`)
          .join('\n\n')
      : '';

  const prompt = `Eres la recepcionista virtual de ${business.name}, un negocio de ${business.industry || 'servicios'} ubicado en ${business.address || 'la ciudad'}.

TU MISIÓN PRINCIPAL:
1. Responder preguntas sobre servicios, horarios, ubicación y precios
2. Agendar citas solicitando: nombre completo, teléfono de contacto, fecha y hora preferida
3. Filtrar spam: si detectas vendedores, encuestas o llamadas irrelevantes, finaliza educadamente

INFORMACIÓN DEL NEGOCIO:
- Nombre: ${business.name}
- Servicios principales: ${services_list}
- Horario de atención: ${hours_text}
${business.address ? `- Dirección: ${business.address}` : ''}
${
  kb_data.contacts?.phones?.length > 0
    ? `- Teléfonos de contacto: ${kb_data.contacts.phones.join(', ')}`
    : ''
}
${
  kb_data.contacts?.emails?.length > 0
    ? `- Emails: ${kb_data.contacts.emails.join(', ')}`
    : ''
}

${
  faqs_text
    ? `PREGUNTAS FRECUENTES:
${faqs_text}`
    : ''
}

${
  kb_data.policies && Object.keys(kb_data.policies).length > 0
    ? `POLÍTICAS IMPORTANTES:
${Object.entries(kb_data.policies)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}`
    : ''
}

INSTRUCCIONES DE COMPORTAMIENTO:
- Sé amable, profesional y eficiente
- Usa un tono cálido pero conciso
- Responde en español de España (España, no Latinoamérica)
- Mensajes cortos: máximo 2-3 frases por turno
- Si no sabes algo, ofrece transferir a un humano
- Para agendar citas: confirma TODOS los datos antes de finalizar
- Si detectas spam (vendedores, encuestas, bromas), despídete educadamente

FORMATO DE AGENDAMIENTO:
Cuando el cliente quiera agendar:
1. Pregunta: "¿Qué día le viene bien?" (espera respuesta)
2. Pregunta: "¿A qué hora prefiere?" (espera respuesta)
3. Pregunta: "¿Puede darme su nombre completo?" (espera respuesta)
4. Pregunta: "¿Y un teléfono de contacto?" (espera respuesta)
5. Confirma: "Perfecto, [nombre], le he agendado para el [día] a las [hora]. Le enviaremos un recordatorio."

EJEMPLOS DE INTERACCIÓN:
Cliente: "¿A qué hora abren?"
Tú: "Abrimos ${hours_text}. ¿En qué puedo ayudarle?"

Cliente: "Quiero pedir cita"
Tú: "Por supuesto. ¿Qué día le vendría bien?"

Cliente: "¿Cuánto cuesta [servicio]?"
Tú: "El precio de [servicio] es [precio si lo sabes]. ¿Le gustaría agendar una cita?"

DETECCIÓN DE SPAM:
Si detectas:
- "Estoy haciendo una encuesta..."
- "Le llamo para ofrecerle..."
- "Somos una empresa de marketing..."
- Tono bromista o poco serio
→ Responde: "Disculpe, pero solo atendemos llamadas relacionadas con nuestros servicios. Que tenga buen día." (y finaliza)`;

  return prompt;
}

/**
 * Create agent in ElevenLabs
 */
export async function createAgent(event: CreateAgentEvent): Promise<any> {
  console.log('[Create Agent] Starting', {
    customer_id: event.customer_id,
    agent_id: event.agent_id,
    voice_id: event.voice_id,
  });

  // Get ElevenLabs API key
  const { ELEVENLABS_API_KEY } = await getApiKeys();

  // Generate system prompt
  const systemPrompt = generateSystemPrompt(event.business, event.knowledge_base);

  // Create agent in ElevenLabs
  const response = await axios.post(
    'https://api.elevenlabs.io/v1/convai/agents',
    {
      name: `${event.business.name} - Recepcionista`,
      voice_id: event.voice_id,
      prompt: {
        system: systemPrompt,
      },
      language: 'es',
      conversation_config: {
        turn_timeout: 10, // 10 seconds max per turn
        max_duration: 1800, // 30 minutes max call
        initial_message: `Hola, bienvenido a ${event.business.name}. ¿En qué puedo ayudarle?`,
      },
    },
    {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  const agent_data = response.data;

  console.log('[Create Agent] ElevenLabs agent created', {
    elevenlabs_agent_id: agent_data.agent_id,
    webhook_url: agent_data.inbound_phone_call_webhook_url,
  });

  // Update agent record with ElevenLabs ID
  await query(
    `UPDATE agents
     SET elevenlabs_agent_id = $1,
         webhook_url = $2,
         system_prompt = $3,
         conversation_config = $4
     WHERE agent_id = $5`,
    [
      agent_data.agent_id,
      agent_data.inbound_phone_call_webhook_url,
      systemPrompt,
      JSON.stringify({
        turn_timeout: 10,
        max_duration: 1800,
      }),
      event.agent_id,
    ]
  );

  // Return data for next step
  return {
    ...event,
    elevenlabs_agent_id: agent_data.agent_id,
    webhook_url: agent_data.inbound_phone_call_webhook_url,
  };
}
