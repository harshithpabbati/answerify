import Marquee from 'react-fast-marquee';

const items = [
  'Support Tickets',
  'Workflows',
  'Automation',
  'Integrations',
  'Escalations',
  'Productivity',
];

export function Slider() {
  return (
    <Marquee
      className="font-base z-1 border-y-2 border-y-black bg-white py-3 sm:py-5"
      direction="left"
    >
      {items.map((x) => {
        return (
          <span
            key={x}
            className="font-heading mx-10 text-xl sm:text-2xl lg:text-4xl"
          >
            {x}
          </span>
        );
      })}
    </Marquee>
  );
}
