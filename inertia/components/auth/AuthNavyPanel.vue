<script setup lang="ts">
import { useT } from '~/composables/use_t'

const props = defineProps<{
  mode: 'login' | 'register' | 'forgot' | 'reset'
}>()

const { t } = useT()

const stars: [number, number][] = [
  [12, 18],
  [28, 8],
  [42, 22],
  [58, 12],
  [74, 28],
  [88, 16],
  [18, 40],
  [64, 46],
  [84, 42],
  [22, 68],
  [44, 72],
  [72, 64],
  [34, 84],
  [8, 76],
]

const modeKey = {
  login: 'login',
  register: 'signup',
  forgot: 'forgotPassword',
  reset: 'resetPassword',
} as const
</script>

<template>
  <div
    class="relative hidden w-[42%] flex-col overflow-hidden lg:flex"
    style="
      background: linear-gradient(180deg, #0b1d2e 0%, #102a40 60%, #1a3a55 100%);
      color: #faf6ee;
    "
  >
    <!-- Constellation dots -->
    <span
      v-for="([x, y], i) in stars"
      :key="i"
      :style="{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: i % 3 === 0 ? '3px' : '2px',
        height: i % 3 === 0 ? '3px' : '2px',
        borderRadius: '50%',
        background: 'rgba(221,231,240,0.5)',
        pointerEvents: 'none',
        zIndex: 0,
      }"
    />

    <!-- Horizon waves -->
    <svg
      viewBox="0 0 600 120"
      preserveAspectRatio="none"
      class="pointer-events-none absolute bottom-0 left-0 right-0 h-28 w-full opacity-60"
    >
      <path
        d="M0,80 C150,50 300,90 450,70 C540,58 580,72 600,72 L600,120 L0,120 Z"
        fill="rgba(250,246,238,0.04)"
      />
      <path
        d="M0,95 C150,75 280,105 420,90 C520,80 580,92 600,92 L600,120 L0,120 Z"
        fill="rgba(250,246,238,0.06)"
      />
    </svg>

    <div class="relative z-10 flex flex-1 flex-col px-12 py-14">
      <!-- Logo (variation C — aiguille seule, sans cercle) -->
      <a href="/" class="inline-flex items-center gap-2.5">
        <svg width="26" height="26" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <path d="M32 6 L40 32 L32 38 L24 32 Z" fill="#faf6ee" />
          <path d="M32 58 L40 32 L32 26 L24 32 Z" fill="#e2674f" />
          <circle cx="32" cy="32" r="2.6" fill="#0b1d2e" stroke="#faf6ee" stroke-width="1.4" />
        </svg>
        <span class="font-display text-base text-white" style="letter-spacing: -0.025em">
          Fleet<em style="font-style: italic; color: #e2674f">Ai</em>
        </span>
      </a>

      <!-- Headline block -->
      <div
        class="mt-auto flex flex-col justify-center pb-12 md:pb-16 lg:pb-20"
        style="max-width: 480px"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
          {{ t(`auth.${modeKey[mode]}.marketing.eyebrow`) }}
        </p>
        <h1
          class="mt-4 font-display text-white"
          style="font-size: 52px; line-height: 1.04; letter-spacing: -0.02em"
        >
          {{ t(`auth.${modeKey[mode]}.marketing.taglineMain`) }}<br />
          <em style="font-style: italic; color: #e2674f">{{
            t(`auth.${modeKey[mode]}.marketing.taglineAccent`)
          }}</em>
        </h1>
        <p class="mt-4 text-sm leading-relaxed text-white/70" style="max-width: 420px">
          {{ t(`auth.${modeKey[mode]}.marketing.subtitle`) }}
        </p>

        <!-- FleetAi preview card (login + register only) -->
        <div
          v-if="mode === 'login' || mode === 'register'"
          class="mt-9 rounded-xl p-3.5"
          style="
            max-width: 360px;
            background: rgba(250, 246, 238, 0.06);
            border: 1px solid rgba(250, 246, 238, 0.12);
            backdrop-filter: blur(8px);
          "
        >
          <div class="mb-2.5 flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#bcb1e0"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" />
            </svg>
            <span class="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#bcb1e0]"
              >FLEETAI</span
            >
          </div>
          <p class="text-[13px] leading-relaxed" style="color: rgba(250, 246, 238, 0.9)">
            <em class="font-display not-italic text-white" style="font-size: 15px">L'Albatros</em>
            {{ t('auth.aiCard.content') }}
          </p>
          <div class="mt-3 flex gap-1.5">
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
              style="background: #e2674f"
              >{{ t('auth.aiCard.action') }}</span
            >
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style="border: 1px solid rgba(250, 246, 238, 0.2); color: rgba(250, 246, 238, 0.7)"
              >{{ t('auth.aiCard.later') }}</span
            >
          </div>
        </div>
      </div>

      <!-- Bottom: testimonial (login/register) ou security (forgot/reset) -->
      <div class="border-t pt-5" style="border-color: rgba(250, 246, 238, 0.12)">
        <template v-if="mode === 'login' || mode === 'register'">
          <div class="flex items-start gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-lg text-white"
              style="background: #2a527a; font-size: 18px"
            >
              M
            </div>
            <div>
              <p
                class="font-display text-white/88 leading-snug"
                style="font-size: 17px; font-style: italic"
              >
                {{ t('auth.marketing.testimonialQuote') }}
              </p>
              <p class="mt-1.5 text-[12px] text-white/55">
                {{ t('auth.marketing.testimonialAuthor') }}
              </p>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="flex items-center gap-3 text-[12px] text-white/50">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            </svg>
            <span>{{ t('auth.marketing.security') }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
