export function crearGrupo({ id, nombre, responsable, area }) {
  if (!id) {
    throw new Error('El ID es obligatorio')
  }

  if (!nombre?.trim()) {
    throw new Error('El nombre es obligatorio')
  }

  if (!responsable?.trim()) {
    throw new Error('El responsable es obligatorio')
  }

  if (!area?.trim()) {
    throw new Error('El área es obligatoria')
  }

  return Object.freeze({
    id,
    nombre: nombre.trim(),
    responsable: responsable.trim(),
    area: area.trim(),
  })
}
