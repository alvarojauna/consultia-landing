# Nuevo Proyecto

## Reglas del Proyecto

### Gestión de Progreso
Al trabajar en un item del PRD, sigue este flujo:

1. **Planificar**: Entra en plan mode (Shift+Tab x2 o `claude --permission-mode plan`) para analizar el item y diseñar la implementación
2. **Implementar** el item según los steps definidos
3. **Tests**: Genera tests para la funcionalidad implementada
4. **Verificar**: Ejecuta los tests y asegura que pasen
5. **Commit**: Haz commit con mensaje descriptivo (conventional commits)
6. **Actualizar PRD**: En `planning/prd.json`:
   - Marca `passes: true` en el item completado
   - Actualiza `progress` del item a 100
   - Recalcula `progress.completed`, `progress.total`, y `progress.percentage`
7. **Actualizar Deliverable**: Refleja el avance en `planning/deliverable.md`

Solo marca un item como completado si los tests pasan.

### Documentación Continua
- Mantén `planning/deliverable.md` actualizado con:
  - Descripción actual del proyecto
  - Arquitectura (incluir diagramas ASCII o Mermaid)
  - Estado actual y progreso
  - Decisiones técnicas tomadas y su justificación
- Genera diagramas cuando sea útil:
  - Arquitectura del sistema
  - Flujo de datos
  - Modelos de datos
  - Secuencias de interacción

### Convenciones
- Código limpio y documentado
- Tests para funcionalidad crítica
- Commits descriptivos siguiendo conventional commits
