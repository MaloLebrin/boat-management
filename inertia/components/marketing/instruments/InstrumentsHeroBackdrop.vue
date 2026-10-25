<script setup lang="ts">
/**
 * Fond animé du hero « Instruments de bord connectés » (#995) : un réseau de
 * capteurs reliés à deux passerelles Signal K. Les liens sont des pointillés
 * qui défilent (le flux de données), des paquets voyagent le long des liens,
 * et les passerelles émettent des ondes concentriques (façon Wi-Fi).
 *
 * Purement décoratif (`aria-hidden`), masqué vers le centre pour laisser le
 * texte lisible. Couleurs en tons moyens de marque via `currentColor`, donc
 * valides dans les deux thèmes. `prefers-reduced-motion` coupe toute animation.
 */
interface Node {
  x: number
  y: number
  hub?: boolean
  tone: 'sky' | 'coral' | 'mint'
}

const nodes: Node[] = [
  { x: 150, y: 110, tone: 'sky' },
  { x: 330, y: 70, tone: 'mint' },
  { x: 560, y: 60, tone: 'sky' },
  { x: 820, y: 80, tone: 'coral' },
  { x: 1060, y: 120, tone: 'sky' },
  { x: 70, y: 320, tone: 'mint' },
  { x: 260, y: 240, hub: true, tone: 'sky' },
  { x: 940, y: 230, hub: true, tone: 'coral' },
  { x: 1140, y: 350, tone: 'mint' },
  { x: 180, y: 520, tone: 'coral' },
  { x: 430, y: 560, tone: 'sky' },
  { x: 760, y: 550, tone: 'mint' },
  { x: 1020, y: 510, tone: 'sky' },
]

const links: Array<[number, number]> = [
  [0, 6],
  [1, 6],
  [5, 6],
  [9, 6],
  [10, 6],
  [2, 6],
  [2, 7],
  [3, 7],
  [4, 7],
  [8, 7],
  [11, 7],
  [12, 7],
  [6, 7],
]

/** Paquets qui voyagent : indice de lien, durée (s) et départ (s). */
const packets = [
  { link: 0, dur: 4.2, begin: 0 },
  { link: 3, dur: 5.1, begin: 1.3 },
  { link: 6, dur: 6.4, begin: 0.6 },
  { link: 8, dur: 4.8, begin: 2.1 },
  { link: 10, dur: 5.6, begin: 0.9 },
  { link: 12, dur: 7.2, begin: 1.7 },
]

const toneClass: Record<Node['tone'], string> = {
  sky: 'text-sky-300',
  coral: 'text-coral-400',
  mint: 'text-mint-300',
}

const path = (index: number) => {
  const [a, b] = links[index]
  return `M${nodes[a].x} ${nodes[a].y} L${nodes[b].x} ${nodes[b].y}`
}
</script>

<template>
  <div
    class="instruments-backdrop pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden sm:h-[520px] lg:h-[620px]"
    aria-hidden="true"
    data-testid="instruments-hero-backdrop"
  >
    <svg
      class="h-full w-full"
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMin slice"
      fill="none"
    >
      <g class="text-fg-muted" opacity="0.55">
        <line
          v-for="([a, b], index) in links"
          :key="`link-${index}`"
          :x1="nodes[a].x"
          :y1="nodes[a].y"
          :x2="nodes[b].x"
          :y2="nodes[b].y"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-dasharray="4 10"
          class="backdrop-link"
          :style="{ animationDelay: `${(index % 5) * -1.3}s` }"
        />
      </g>

      <g v-for="(node, index) in nodes" :key="`node-${index}`" :class="toneClass[node.tone]">
        <template v-if="node.hub">
          <circle
            v-for="ring in 3"
            :key="`ring-${ring}`"
            :cx="node.x"
            :cy="node.y"
            r="14"
            stroke="currentColor"
            stroke-width="1.5"
            class="backdrop-ring"
            :style="{ animationDelay: `${(ring - 1) * 1.4}s` }"
          />
          <circle :cx="node.x" :cy="node.y" r="9" fill="currentColor" opacity="0.9" />
          <circle :cx="node.x" :cy="node.y" r="4" class="fill-surface" />
        </template>
        <template v-else>
          <circle :cx="node.x" :cy="node.y" r="12" fill="currentColor" opacity="0.14" />
          <circle :cx="node.x" :cy="node.y" r="4" fill="currentColor" />
        </template>
      </g>

      <g class="backdrop-packets">
        <circle
          v-for="(packet, index) in packets"
          :key="`packet-${index}`"
          r="3.5"
          fill="currentColor"
          :class="toneClass[nodes[links[packet.link][1]].tone]"
        >
          <animateMotion
            :dur="`${packet.dur}s`"
            :begin="`${packet.begin}s`"
            repeatCount="indefinite"
            :path="path(packet.link)"
          />
        </circle>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.instruments-backdrop {
  opacity: 0.85;
  /* Le centre s'efface sous le texte, les bords s'estompent vers la section. */
  mask-image:
    radial-gradient(ellipse 42% 55% at 50% 42%, transparent 0%, transparent 35%, black 100%),
    linear-gradient(to bottom, black 0%, black 70%, transparent 100%);
  mask-composite: intersect;
  -webkit-mask-image:
    radial-gradient(ellipse 42% 55% at 50% 42%, transparent 0%, transparent 35%, black 100%),
    linear-gradient(to bottom, black 0%, black 70%, transparent 100%);
  -webkit-mask-composite: source-in;
}

.backdrop-link {
  animation: backdrop-flow 4s linear infinite;
}

.backdrop-ring {
  transform-box: fill-box;
  transform-origin: center;
  animation: backdrop-ping 4.2s cubic-bezier(0.2, 0.6, 0.3, 1) infinite;
}

@keyframes backdrop-flow {
  to {
    stroke-dashoffset: -28;
  }
}

@keyframes backdrop-ping {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(4.5);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .backdrop-link,
  .backdrop-ring {
    animation: none;
  }
  .backdrop-ring {
    opacity: 0.25;
    transform: scale(2);
  }
  .backdrop-packets {
    display: none;
  }
}
</style>
