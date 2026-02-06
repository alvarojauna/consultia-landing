export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  category: string
  author: string
  date: string
  readTime: string
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'que-es-servicio-recepcionista-ai',
    title: '¿Qué es un Servicio de Recepcionista AI?',
    excerpt: 'Descubre cómo los servicios de recepcionista AI están revolucionando la atención al cliente en pequeñas y medianas empresas españolas.',
    category: 'Guías',
    author: 'María García',
    date: '15 de enero, 2026',
    readTime: '8 min',
  },
  {
    slug: 'consultia-vs-recepcionista-tradicional',
    title: 'ConsultIA vs Recepcionista Tradicional: Comparación 2026',
    excerpt: 'Análisis detallado de costes, disponibilidad y rendimiento entre ConsultIA y servicios de recepción tradicionales.',
    category: 'Comparativas',
    author: 'Carlos Martínez',
    date: '10 de enero, 2026',
    readTime: '10 min',
  },
  {
    slug: 'como-implementar-ia-voz-clinica-dental',
    title: 'Cómo Implementar IA de Voz en Tu Clínica Dental',
    excerpt: 'Guía paso a paso para integrar un sistema de recepcionista AI en clínicas dentales y mejorar la gestión de citas.',
    category: 'Casos de Uso',
    author: 'Laura Sánchez',
    date: '5 de enero, 2026',
    readTime: '12 min',
  },
  {
    slug: 'rgpd-cumplimiento-ia-voz',
    title: 'RGPD y Cumplimiento en Servicios de IA de Voz',
    excerpt: 'Todo lo que necesitas saber sobre protección de datos y cumplimiento legal al implementar recepcionistas AI en España.',
    category: 'Legal',
    author: 'Ana Rodríguez',
    date: '28 de diciembre, 2025',
    readTime: '15 min',
  },
  {
    slug: 'mejores-practicas-configurar-recepcionista-ai',
    title: 'Mejores Prácticas para Configurar Tu Recepcionista AI',
    excerpt: 'Aprende cómo optimizar la configuración de tu recepcionista AI para maximizar la conversión y satisfacción del cliente.',
    category: 'Guías',
    author: 'Miguel Torres',
    date: '20 de diciembre, 2025',
    readTime: '10 min',
  },
  {
    slug: 'roi-recepcionista-ai-pymes',
    title: 'ROI de un Recepcionista AI para PYMEs Españolas',
    excerpt: 'Análisis de retorno de inversión real de negocios que han implementado ConsultIA en diferentes sectores.',
    category: 'Casos de Uso',
    author: 'Patricia López',
    date: '12 de diciembre, 2025',
    readTime: '9 min',
  },
]

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}

export function getAllBlogPostSlugs(): string[] {
  return blogPosts.map((post) => post.slug)
}

export const categories = [
  { id: 'all', name: 'Todos', count: blogPosts.length },
  { id: 'guias', name: 'Guías', count: 2 },
  { id: 'comparativas', name: 'Comparativas', count: 1 },
  { id: 'casos-uso', name: 'Casos de Uso', count: 2 },
  { id: 'legal', name: 'Legal', count: 1 },
]
