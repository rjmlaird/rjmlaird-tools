import type { FC } from "hono/jsx";

export interface CalloutProps {
  appsHref?: string;
  labsHref?: string;
}

const CARDS = [
  {
    key: "apps",
    icon: "A",
    label: "Apps",
    title: "Interactive applications",
    text: "More complete, user-facing experiences for exploring data, solving problems and working with information over time.",
    cta: "Explore apps",
  },
  {
    key: "labs",
    icon: "L",
    label: "Labs",
    title: "Experiments and prototypes",
    text: "Working experiments, research prototypes and interactive explorations across science, data, design and the web.",
    cta: "Explore labs",
  },
] as const;

export const Callout: FC<CalloutProps> = ({
  appsHref = "https://apps.rjmlaird.co.uk/",
  labsHref = "https://labs.rjmlaird.co.uk/",
}) => {
  const hrefs = {
    apps: appsHref,
    labs: labsHref,
  };

  return (
    <section class="apps-labs" aria-labelledby="apps-labs-title">
      <div class="apps-labs__intro">
        <p class="apps-labs__eyebrow">Digital projects</p>
        <h2 id="apps-labs-title">Apps and labs</h2>
        <p>
          Explore practical software alongside working experiments, prototypes
          and interactive explorations.
        </p>
      </div>

      <ul class="apps-labs__grid" role="list">
        {CARDS.map((card) => (
          <li class={`project-card project-card--${card.key}`}>
            <div class="project-card__icon" aria-hidden="true">
              {card.icon}
            </div>

            <div>
              <p class="project-card__label">{card.label}</p>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </div>

            <a class="project-card__link" href={hrefs[card.key]}>
              {card.cta} <span aria-hidden="true">→</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Callout;
