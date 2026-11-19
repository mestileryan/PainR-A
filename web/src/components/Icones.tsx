import type { SVGProps } from "react"

type Props = SVGProps<SVGSVGElement> & { taille?: number }

function Icone({ taille = 20, children, ...props }: Props) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconeRetour = (p: Props) => <Icone {...p}><path d="m15 6-6 6 6 6" /></Icone>
export const IconeSuite = (p: Props) => <Icone {...p}><path d="m9 6 6 6-6 6" /></Icone>
export const IconePlus = (p: Props) => <Icone {...p}><path d="M12 5v14M5 12h14" /></Icone>
export const IconeCroix = (p: Props) => <Icone {...p}><path d="M6 6l12 12M18 6 6 18" /></Icone>
export const IconePhoto = (p: Props) => (
  <Icone {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icone>
)
export const IconeEssai = (p: Props) => (
  <Icone {...p}>
    <path d="M9 3h6" />
    <path d="M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" />
    <path d="M7 15h10" />
  </Icone>
)
export const IconeHorloge = (p: Props) => (
  <Icone {...p}>
    <path d="M12 8v4l3 2" />
    <circle cx="12" cy="12" r="9" />
  </Icone>
)
export const IconeCrayon = (p: Props) => (
  <Icone {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icone>
)
export const IconeSortie = (p: Props) => (
  <Icone {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 17l-5-5 5-5M5 12h11" />
  </Icone>
)
