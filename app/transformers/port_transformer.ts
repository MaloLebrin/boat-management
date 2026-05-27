import type Port from '#models/port'

export function toPortFormOptions(ports: Port[]) {
  return ports.map((p) => ({
    id: p.id,
    name: p.name,
    pontoons: p.pontoons.map((pt) => ({
      id: pt.id,
      name: pt.name,
      spots: pt.spots.map((s) => ({ id: s.id, name: s.name })),
    })),
    mouillages: p.mouillages.map((m) => ({
      id: m.id,
      name: m.name,
      spots: m.spots.map((s) => ({ id: s.id, name: s.name })),
    })),
  }))
}
