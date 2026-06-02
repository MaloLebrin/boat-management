export interface AboutValueItem {
  n: string
  title: string
  desc: string
  extra: string
}

export interface AboutMember {
  n: string
  r: string
  b: string
  emoji: string
  color: string
}

export interface AboutStatItem {
  value: string
  label: string
}

export interface AboutTimelineItem {
  d: string
  t: string
  sub: string
  tone?: string
}

export interface AboutLocation {
  city: string
  addr: string
  role: string
}

export interface AboutOfficeCard {
  city: string
  role: string
  addr: string
  hours: string
  team: string
  hint: string
  gradient: string
}

export interface AboutPageProps {
  t: {
    meta: { title: string; description: string }
    about: {
      hero: {
        line1: string
        line1Highlight: string
        line2: string
        line2Highlight: string
        subtitle: string
      }
      origin: {
        eyebrow: string
        title: string
        paragraphs: string[]
        captionDate: string
        captionSub: string
      }
      values: { eyebrow: string; title: string; titleHighlight: string; items: AboutValueItem[] }
      team: {
        eyebrow: string
        title: string
        titleHighlight: string
        subtitle: string
        members: AboutMember[]
        hiringTitle: string
        hiringSubtitle: string
        hiringCta: string
      }
      numbers: {
        eyebrow: string
        title: string
        titleHighlight: string
        stats: AboutStatItem[]
        investorsLabel: string
        investors: string[]
      }
      timeline: {
        eyebrow: string
        title: string
        titleHighlight: string
        subtitle: string
        items: AboutTimelineItem[]
      }
      office: {
        eyebrow: string
        title: string
        titleHighlight: string
        body: string
        locationLabel: string
        locations: AboutLocation[]
        officeCards: AboutOfficeCard[]
      }
      finalCta: {
        title: string
        titleHighlight: string
        subtitle: string
        primaryCta: string
        secondaryCta: string
      }
    }
  }
}
